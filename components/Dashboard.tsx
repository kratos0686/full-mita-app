
import React, { useState, useEffect } from 'react';
import { ChevronRight, MapPin, PlusCircle, Search, BrainCircuit, TrendingDown, Sparkles, Info, CheckCircle2, AlertTriangle, ShieldCheck, BookOpen, Focus, Navigation } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { useAppContext } from '../context/AppContext';
import { getProjects, AIProjectData } from '../data/mockApi';
import SkeletonLoader from './SkeletonLoader';

const Dashboard: React.FC = () => {
  const { setSelectedProjectId, setActiveTab, selectedProjectId } = useAppContext();
  const [aiBriefing, setAiBriefing] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [aiProjects, setAiProjects] = useState<AIProjectData[]>([]);
  const [nearbyResources, setNearbyResources] = useState<any[]>([]);
  const [isFindingResources, setIsFindingResources] = useState(false);

  useEffect(() => {
    const fetchProjectsAndAnalysis = async () => {
      setIsLoading(true);
      const initialProjects = await getProjects();
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyze: ${JSON.stringify(initialProjects.map(p => ({id: p.id, progress: p.progress})))}. Provide brief overallBriefing and analyzedProjects array.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallBriefing: { type: Type.STRING },
                analyzedProjects: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, aiSummary: { type: Type.STRING }, aiAlert: { type: Type.OBJECT, properties: { isAlert: { type: Type.BOOLEAN }, reason: { type: Type.STRING } } }, priority: { type: Type.NUMBER } } } }
              },
              required: ['overallBriefing', 'analyzedProjects']
            }
          }
        });
        const result = JSON.parse(response.text);
        setAiBriefing(result.overallBriefing);
        setAiProjects(initialProjects.map(p => ({ ...p, ...result.analyzedProjects.find((ap: any) => ap.id === p.id) })).sort((a,b) => b.priority - a.priority));
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };
    fetchProjectsAndAnalysis();
  }, [selectedProjectId]);

  const findNearbySuppliers = async () => {
    setIsFindingResources(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Find 3 hardware stores and water damage equipment rental centers nearby.",
        config: { tools: [{ googleMaps: {} }] }
      });
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setNearbyResources(chunks.filter((c: any) => c.maps).map((c: any) => c.maps));
    } catch (err) { console.error(err); } finally { setIsFindingResources(false); }
  };

  return (
    <div className="p-4 space-y-6">
      <section className="bg-white rounded-[2.5rem] p-6 border border-blue-100 shadow-sm relative overflow-hidden">
        <div className="flex items-center space-x-2 mb-3"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><BrainCircuit size={18} /></div><span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">AI Technical Briefing</span></div>
        {isLoading ? <SkeletonLoader count={2} /> : <p className="text-gray-800 text-sm leading-relaxed font-bold">"{aiBriefing}"</p>}
      </section>

      <section className="bg-gray-900 text-white p-6 rounded-[2.5rem] relative overflow-hidden">
        <div className="flex items-center space-x-2 mb-4"><Navigation size={14} className="text-emerald-400" /><span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Grounding Active</span></div>
        <h3 className="text-xl font-black mb-4">Nearby Support</h3>
        {nearbyResources.length > 0 ? (
          <div className="space-y-3">
            {nearbyResources.map((res, i) => (
              <a key={i} href={res.uri} target="_blank" className="flex items-center justify-between bg-white/10 p-4 rounded-2xl hover:bg-white/20">
                <span className="text-xs font-bold">{res.title}</span>
                <ChevronRight size={14} />
              </a>
            ))}
          </div>
        ) : (
          <button onClick={findNearbySuppliers} className="w-full py-4 bg-white text-gray-900 rounded-2xl font-black text-xs uppercase" disabled={isFindingResources}>
            {isFindingResources ? 'Locating Field Assets...' : 'Find Suppliers & Labs'}
          </button>
        )}
      </section>

      <div className="bg-gray-900 text-white p-6 rounded-[2.5rem] relative overflow-hidden border border-white/5 shadow-2xl">
        <div className="absolute -right-4 -top-4 opacity-20 rotate-12"><ShieldCheck size={120} /></div>
        <div className="flex items-center space-x-2 mb-4"><div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/30"><CheckCircle2 size={14} className="text-white" /></div><span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Project Authorized</span></div>
        <h3 className="text-xl font-black mb-1 tracking-tight">Enterprise API Active</h3>
        <p className="text-gray-400 text-xs font-medium leading-relaxed">Connected to a paid Google Cloud project.</p>
      </div>

      <section className="pb-4">
        <div className="flex items-center justify-between mb-4 px-1"><h2 className="font-black text-gray-900 tracking-tight">AI Prioritized Portfolio</h2></div>
        {isLoading ? <SkeletonLoader height="150px" count={3} borderRadius="2rem"/> : (
          <div className="space-y-4">
            {aiProjects.map((p) => (
              <div key={p.id} onClick={() => { setSelectedProjectId(p.id); setActiveTab('project'); }} className={`bg-white p-5 rounded-[2rem] border ${p.id === selectedProjectId ? 'border-blue-500' : 'border-gray-100'} shadow-sm transition-all cursor-pointer group`}>
                <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{p.client}</h3>
                <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">{p.address}</div>
                <div className="mt-4 bg-gray-50 p-3 rounded-xl text-[10px] font-bold text-gray-600">{p.aiSummary}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
