
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Cpu, Calculator } from 'lucide-react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { useAppContext } from '../context/AppContext';
import { Tab } from '../types';

interface CommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigateToTabDeclaration: FunctionDeclaration = {
  name: 'navigateToTab',
  parameters: {
    type: Type.OBJECT,
    description: 'Changes the application view to a different section.',
    properties: {
      tab: { 
        type: Type.STRING, 
        enum: ['dashboard', 'scanner', 'logs', 'equipment', 'photos', 'project', 'analysis', 'reference', 'forms'],
        description: 'The target tab to navigate to' 
      }
    },
    required: ['tab'],
  },
};

const CommandCenter: React.FC<CommandCenterProps> = ({ isOpen, onClose }) => {
  const { setActiveTab } = useAppContext();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ cmd: string; result: string; type: 'cmd' | 'res' | 'sys' }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  const executeCommand = async () => {
    if (!input.trim()) return;
    const cmd = input;
    setInput('');
    setHistory(prev => [...prev, { cmd, result: '', type: 'cmd' }]);
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: cmd,
        config: {
          systemInstruction: "You are the MitigationAI Field Terminal. Interpret commands to navigate the app or manage project data. Support psychrometric calculation requests by interpreting intent.",
          tools: [{ functionDeclarations: [navigateToTabDeclaration] }],
        }
      });

      if (response.functionCalls) {
        for (const fc of response.functionCalls) {
          if (fc.name === 'navigateToTab') {
            const target = fc.args.tab as Tab;
            setHistory(prev => [...prev, { cmd: '', result: `NAVIGATING: Switching to ${target} module...`, type: 'sys' }]);
            setTimeout(() => {
              setActiveTab(target);
              onClose();
            }, 800);
          }
        }
      }

      if (response.text) {
        setHistory(prev => [...prev, { cmd: '', result: response.text, type: 'res' }]);
      }
    } catch (error) {
      setHistory(prev => [...prev, { cmd: '', result: 'KERNEL_FAULT: OAUTH_OR_CORE_ISSUE', type: 'res' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-gray-950/98 backdrop-blur-xl flex flex-col p-4 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center mb-6 text-indigo-400 font-mono text-[10px] border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3"><div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]"><Cpu size={14} className="animate-pulse" /></div><span className="font-black uppercase tracking-widest">Mitigation_Kernel_v2.3</span></div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"><X size={20} /></button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-[12px] space-y-4 mb-6 no-scrollbar px-2">
        <div className="text-gray-600 italic opacity-60 font-medium tracking-tight">
          // MitigationAI FIELD OS v2.3<br/>
          // Try: "show my photos", "calculate GPP", "navigate to logs"
        </div>
        {history.map((h, i) => (
          <div key={i} className={`flex flex-col space-y-1 ${h.type === 'cmd' ? 'text-indigo-400' : h.type === 'sys' ? 'text-orange-400' : 'text-emerald-400'}`}>
            <div className="flex items-start"><span className="opacity-30 mr-3 shrink-0 font-black">{h.type === 'cmd' ? '>' : '$'}</span><span className="leading-relaxed whitespace-pre-wrap">{h.type === 'cmd' ? h.cmd : h.result}</span></div>
          </div>
        ))}
        {isProcessing && <div className="text-indigo-400 animate-pulse flex items-center space-x-2"><span className="opacity-30 mr-3">$</span><div className="flex space-x-1"><div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" /><div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" /></div></div>}
      </div>

      <div className="relative group"><div className="absolute inset-0 bg-indigo-500/10 blur-xl group-focus-within:bg-indigo-500/20 transition-all rounded-2xl" /><input autoFocus value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && executeCommand()} className="relative w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-6 text-indigo-100 font-mono focus:outline-none focus:border-indigo-500/50 shadow-2xl transition-all" placeholder="Execute system command..."/><div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-white/20 font-black uppercase tracking-tighter">Enter</div></div>

      <div className="mt-6 flex flex-wrap gap-2 pb-4">
        {['dashboard', 'logs', 'photos', 'scanner', 'reference'].map(t => (<button key={t} onClick={() => setInput(`go to ${t}`)} className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-mono text-gray-400 hover:bg-white/10 hover:text-white transition-all">cd {t}</button>))}
        <button onClick={() => setInput('show psychrometric tool')} className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl text-[10px] font-mono text-indigo-400 hover:bg-indigo-500/20 transition-all flex items-center space-x-2"><Calculator size={10} /><span>calc_gpp</span></button>
      </div>
    </div>
  );
};

export default CommandCenter;
