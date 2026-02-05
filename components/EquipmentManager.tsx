
import React, { useState, useMemo, useEffect } from 'react';
import { Wind, Power, Clock, RefreshCcw, LayoutGrid, List, Plus, X, Save, Box, Tag, Home, Calculator, Zap, AlertTriangle, CheckCircle2, ChevronRight, BrainCircuit, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useAppContext } from '../context/AppContext';
import { Project, PlacedEquipment } from '../types';

const EQUIPMENT_SPECS: Record<string, { amps: number, volts: number, cfm: number }> = {
  'Phoenix AirMax': { amps: 1.9, volts: 115, cfm: 925 },
  'LGR 3500i': { amps: 8.3, volts: 115, cfm: 0 },
  'DefendAir HEPA': { amps: 1.9, volts: 115, cfm: 500 },
  'Velo Pro': { amps: 1.8, volts: 115, cfm: 885 },
  'LGR 2800i': { amps: 8.0, volts: 115, cfm: 0 },
};

const CIRCUIT_BREAKER_LIMIT_AMPS = 15;

const EquipmentManager: React.FC<{isMobile?: boolean, project: Project}> = ({ isMobile = false, project }) => {
  const { isOnline } = useAppContext();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  
  const [equipment, setEquipment] = useState<PlacedEquipment[]>(project.equipment || []);
  
  useEffect(() => {
    setEquipment(project.equipment || []);
  }, [project]);

  const calculationsByRoom = useMemo(() => {
    const rooms: Record<string, { equipment: typeof equipment, totalAmps: number, totalCfm: number }> = {};
    const runningEquipment = equipment.filter(e => e.status === 'Running');
    runningEquipment.forEach(item => {
        if (!rooms[item.room]) rooms[item.room] = { equipment: [], totalAmps: 0, totalCfm: 0 };
        rooms[item.room].equipment.push(item);
        const specs = EQUIPMENT_SPECS[item.model];
        if (specs) {
            rooms[item.room].totalAmps += specs.amps;
            if (item.type === 'Air Mover' || item.type === 'HEPA Scrubber') {
                rooms[item.room].totalCfm += specs.cfm;
            }
        }
    });
    return rooms;
  }, [JSON.stringify(equipment.map(e => ({ model: e.model, room: e.room, status: e.status, type: e.type })))]);

  useEffect(() => {
    if (isCalculatorOpen) {
      const getSuggestions = async () => {
        if (!isOnline) {
            const offlineSuggestions: Record<string, string> = {};
            for (const room in calculationsByRoom) {
                const totalAmps = calculationsByRoom[room].totalAmps;
                offlineSuggestions[room] = `Offline Calculation: ${totalAmps.toFixed(1)}A on circuit. Verify breaker limits manually.`;
            }
            setAiSuggestions(offlineSuggestions);
            return;
        }

        setIsFetchingSuggestions(true);
        const suggestions: Record<string, string> = {};
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        for (const room in calculationsByRoom) {
          const data = calculationsByRoom[room];
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Analyze the equipment load in this room: Total Amps: ${data.totalAmps.toFixed(1)}A on a ${CIRCUIT_BREAKER_LIMIT_AMPS}A breaker. Equipment: ${JSON.stringify(data.equipment.map(e => e.model))}. Is this load safe and efficient? Provide a concise, actionable suggestion (1-2 sentences).`
            });
            suggestions[room] = response.text || "Analysis complete. Load appears nominal.";
          } catch (err) {
            suggestions[room] = "AI analysis unavailable. Manually verify circuit safety.";
          }
        }
        setAiSuggestions(suggestions);
        setIsFetchingSuggestions(false);
      };
      getSuggestions();
    }
  }, [isCalculatorOpen, calculationsByRoom, isOnline]);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setEquipment(prevEquipment =>
        prevEquipment.map(item =>
          item.status === 'Running'
            ? { ...item, hours: parseFloat((item.hours + 0.1).toFixed(1)) }
            : item
        )
      );
    }, 6000); 

    return () => clearInterval(timer);
  }, []);
  
  const handleToggleStatus = (id: string) => {
    setEquipment(prevEquipment =>
      prevEquipment.map(item =>
        item.id === id
          ? { ...item, status: item.status === 'Running' ? 'Off' : 'Running' }
          : item
      )
    );
  };
  
  const theme = {
    bg: isMobile ? 'bg-gray-50 text-gray-900' : 'bg-slate-900 text-white',
    card: isMobile ? 'bg-white border border-gray-100 shadow-sm' : 'glass-card',
    text: isMobile ? 'text-gray-900' : 'text-white',
    subtext: isMobile ? 'text-blue-600' : 'text-blue-400',
    itemBg: isMobile ? 'bg-white' : 'bg-white/5',
    itemBorder: isMobile ? 'border-gray-100' : 'border-white/10'
  };

  return (
    <div className={`space-y-6 ${theme.bg}`}>
      <header className="flex justify-between items-end">
        <div>
          <h2 className={`text-2xl font-bold ${theme.text}`}>Equipment</h2>
          <p className={`text-sm ${theme.subtext}`}>Runtime & Inventory Tracking</p>
        </div>
        <div className={`flex p-1 rounded-lg ${isMobile ? 'bg-gray-100' : 'bg-slate-800'}`}>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? `${isMobile ? 'bg-white shadow-sm' : 'bg-slate-700'} text-blue-600` : 'text-blue-400'}`}><LayoutGrid size={18} /></button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? `${isMobile ? 'bg-white shadow-sm' : 'bg-slate-700'} text-blue-600` : 'text-blue-400'}`}><List size={18} /></button>
        </div>
      </header>

      <div onClick={() => setIsCalculatorOpen(true)} className={`${theme.card} p-5 rounded-[2rem] flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all hover:bg-white/5`}>
        <div className="flex items-center space-x-4"><div className={`p-3 rounded-2xl border group-hover:scale-110 transition-transform ${isMobile ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}><Calculator size={24} /></div><div><h3 className={`text-sm font-bold ${theme.text} group-hover:text-brand-indigo`}>Load Calculator</h3><p className={`text-[10px] ${theme.subtext} mt-1 font-medium`}>AI-powered circuit load and CFM analysis.</p></div></div>
        <ChevronRight size={18} className="text-blue-300 group-hover:text-brand-indigo" />
      </div>

      {isCalculatorOpen && Object.keys(calculationsByRoom).length > 0 && (
          <div className={`mb-6 p-4 rounded-2xl ${isMobile ? 'bg-white border border-gray-100' : 'bg-white/5 border border-white/10'}`}>
              <h3 className={`font-bold mb-3 ${theme.text}`}>Circuit Analysis</h3>
              <div className="space-y-4">
                  {Object.entries(calculationsByRoom).map(([room, data]: [string, any]) => (
                      <div key={room} className="p-3 bg-black/5 rounded-xl">
                          <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs font-bold ${theme.text}`}>{room}</span>
                              <span className={`text-xs font-mono ${data.totalAmps > 12 ? 'text-red-500' : 'text-green-500'}`}>{data.totalAmps.toFixed(1)}A</span>
                          </div>
                          <p className="text-[10px] text-blue-500">{aiSuggestions[room] || (isFetchingSuggestions ? "Analyzing..." : "Analysis pending")}</p>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div>
        {viewMode === 'grid' ? (
          <div className="space-y-4">
            {equipment.map((item) => (
              <div key={item.id} className={`${theme.card} p-4 rounded-2xl relative overflow-hidden`}>
                {item.status === 'Running' && (<div className="absolute top-0 right-0 w-16 h-16"><div className="absolute transform rotate-45 bg-green-500 text-white text-[8px] font-bold py-1 px-8 top-3 -right-6 text-center uppercase">Active</div></div>)}
                <div className="flex items-start space-x-4"><div className={`p-3 rounded-xl ${item.status === 'Running' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-500'}`}><Wind size={24} /></div><div className="flex-1"><div className="flex justify-between"><h3 className={`font-bold ${theme.text}`}>{item.model}</h3><span className={`text-[10px] font-bold ${theme.subtext}`}>{item.id}</span></div><div className={`text-xs ${theme.subtext} mt-0.5`}>{item.type} • {item.room}</div><div className="mt-4 flex items-center justify-between"><div className="flex items-center space-x-4"><div className={`flex items-center text-sm ${theme.subtext}`}><Clock size={14} className="mr-1" /> {item.hours}h</div></div><button onClick={() => handleToggleStatus(item.id)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${item.status === 'Running' ? 'border-red-500/20 text-red-400 bg-red-500/10' : 'border-green-500/20 text-green-400 bg-green-500/10'}`}><Power size={14} /><span>{item.status === 'Running' ? 'Turn Off' : 'Turn On'}</span></button></div></div></div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${theme.card} p-4 rounded-2xl`}>
            {equipment.map((item, index) => (
              <div key={item.id} className={`flex justify-between items-center py-3 ${index < equipment.length - 1 ? `border-b ${theme.itemBorder}` : ''}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${item.status === 'Running' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Wind size={16} />
                  </div>
                  <div>
                    <p className={`font-bold ${theme.text} text-sm`}>{item.model}</p>
                    <p className={`text-xs ${theme.subtext}`}>{item.id} &bull; {item.room}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`text-xs font-bold ${theme.subtext} w-12 text-right`}>{item.hours}h</span>
                  <button onClick={() => handleToggleStatus(item.id)} className={`w-16 text-center px-2 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${item.status === 'Running' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                    {item.status === 'Running' ? 'Stop' : 'Start'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentManager;