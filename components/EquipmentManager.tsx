
import React, { useState, useMemo, useEffect } from 'react';
import { Wind, Power, Clock, LayoutGrid, List, Calculator, ChevronRight, LogOut, Plus, AlertTriangle, DollarSign } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useAppContext } from '../context/AppContext';
import { Project, PlacedEquipment } from '../types';
import { EventBus } from '../services/EventBus';

const EQUIPMENT_SPECS: Record<string, { amps: number, volts: number, cfm: number, type: string, dailyRate: number }> = {
  'Phoenix AirMax': { amps: 1.9, volts: 115, cfm: 925, type: 'Air Mover', dailyRate: 35 },
  'LGR 3500i': { amps: 8.3, volts: 115, cfm: 0, type: 'Dehumidifier', dailyRate: 110 },
  'DefendAir HEPA': { amps: 1.9, volts: 115, cfm: 500, type: 'HEPA Scrubber', dailyRate: 85 },
  'Velo Pro': { amps: 1.8, volts: 115, cfm: 885, type: 'Air Mover', dailyRate: 35 },
  'LGR 2800i': { amps: 8.0, volts: 115, cfm: 0, type: 'Dehumidifier', dailyRate: 95 },
};

const CIRCUIT_BREAKER_LIMIT_AMPS = 15;

const EquipmentManager: React.FC<{isMobile?: boolean, project: Project, onUpdate?: (updates: Partial<Project>) => void}> = ({ isMobile = false, project, onUpdate }) => {
  const { isOnline } = useAppContext();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [equipment, setEquipment] = useState<PlacedEquipment[]>(project.equipment || []);
  
  useEffect(() => { setEquipment(project.equipment || []); }, [project]);

  const stats = useMemo(() => {
    const rooms: Record<string, { equipment: typeof equipment, totalAmps: number }> = {};
    let dailyBurnRate = 0;
    
    equipment.filter(e => e.status === 'Running').forEach(item => {
        if (!rooms[item.room]) rooms[item.room] = { equipment: [], totalAmps: 0 };
        rooms[item.room].equipment.push(item);
        const specs = EQUIPMENT_SPECS[item.model];
        if (specs) {
            rooms[item.room].totalAmps += specs.amps;
            dailyBurnRate += specs.dailyRate;
        }
    });
    return { rooms, dailyBurnRate };
  }, [equipment]);

  useEffect(() => {
    if (isCalculatorOpen && isOnline) {
      const getSuggestions = async () => {
        const suggestions: Record<string, string> = {};
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        for (const room in stats.rooms) {
          const data = stats.rooms[room];
          if (data.totalAmps > CIRCUIT_BREAKER_LIMIT_AMPS * 0.8) {
              // Publish Warning Event
              EventBus.publish(
                'com.restorationai.safety.warning',
                { room, load: data.totalAmps },
                project.id,
                `Circuit Warning: ${room} load at ${data.totalAmps.toFixed(1)}A.`,
                'warning'
              );
          }
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Analyze load: ${data.totalAmps.toFixed(1)}A on 15A breaker. Equipment: ${JSON.stringify(data.equipment.map(e => e.model))}. Concise safety check.`
            });
            suggestions[room] = response.text || "Load Check Complete";
          } catch (err) { suggestions[room] = "AI unavailable"; }
        }
        setAiSuggestions(suggestions);
      };
      getSuggestions();
    }
  }, [isCalculatorOpen, isOnline, stats]);
  
  const handleToggleStatus = (id: string) => {
    const updated = equipment.map(item =>
        item.id === id ? { ...item, status: item.status === 'Running' ? 'Off' : 'Running' } as PlacedEquipment : item
    );
    const item = updated.find(e => e.id === id);
    if (item) {
        EventBus.publish(
            'com.restorationai.equipment.state.changed',
            { equipmentId: item.id, model: item.model, status: item.status },
            project.id,
            `${item.type} (${item.model}) switched ${item.status}.`,
            'info'
        );
    }
    setEquipment(updated);
    if (onUpdate) onUpdate({ equipment: updated });
  };

  const handleAddEquipment = (model: string) => {
      const specs = EQUIPMENT_SPECS[model];
      const newItem: PlacedEquipment = {
          id: `EQ-${Date.now().toString().slice(-4)}`,
          type: specs.type as any,
          model: model,
          status: 'Running',
          hours: 0,
          room: 'General'
      };
      const updated = [...equipment, newItem];
      
      EventBus.publish(
          'com.restorationai.equipment.deployed',
          { equipmentId: newItem.id, model: newItem.model, room: newItem.room },
          project.id,
          `Deployed ${model} to General.`,
          'success'
      );

      setEquipment(updated);
      if (onUpdate) onUpdate({ equipment: updated });
      setShowAddMenu(false);
  };

  const theme = {
    bg: isMobile ? 'bg-gray-50 text-gray-900' : 'bg-slate-900 text-white',
    card: isMobile ? 'bg-white border border-gray-100 shadow-sm' : 'glass-card',
    text: isMobile ? 'text-gray-900' : 'text-white',
    subtext: isMobile ? 'text-blue-600' : 'text-blue-400',
  };

  return (
    <div className={`space-y-6 ${theme.bg}`}>
      <header className="flex justify-between items-end">
        <div><h2 className={`text-2xl font-bold ${theme.text}`}>Equipment</h2><p className={`text-sm ${theme.subtext}`}>Runtime & Inventory Tracking</p></div>
        <div className={`flex p-1 rounded-lg ${isMobile ? 'bg-gray-100' : 'bg-slate-800'}`}>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-slate-700 text-blue-400' : 'text-blue-600'}`}><LayoutGrid size={18} /></button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-slate-700 text-blue-400' : 'text-blue-600'}`}><List size={18} /></button>
        </div>
      </header>

      {/* Burn Rate Card */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border border-emerald-500/20 rounded-[1.5rem] p-5 flex justify-between items-center">
          <div>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Daily Burn Rate</p>
              <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-white">${stats.dailyBurnRate}</span>
                  <span className="text-xs text-slate-400">/ day</span>
              </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400"><DollarSign size={24} /></div>
      </div>

      <div onClick={() => setIsCalculatorOpen(!isCalculatorOpen)} className={`${theme.card} p-5 rounded-[2rem] flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all hover:bg-white/5`}>
        <div className="flex items-center space-x-4"><div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400"><Calculator size={24} /></div><div><h3 className={`text-sm font-bold ${theme.text}`}>Load Calculator</h3><p className={`text-[10px] ${theme.subtext}`}>AI Circuit Analysis</p></div></div>
        <ChevronRight size={18} className="text-blue-300" />
      </div>

      {isCalculatorOpen && Object.keys(stats.rooms).length > 0 && (
          <div className="mb-6 space-y-2 animate-in slide-in-from-top-2">
              {Object.entries(stats.rooms).map(([room, data]: [string, any]) => (
                  <div key={room} className="p-3 bg-black/5 rounded-xl border border-white/5">
                      <div className="flex justify-between mb-1"><span className={`text-xs font-bold ${theme.text}`}>{room}</span><span className={`text-xs font-mono ${data.totalAmps > 12 ? 'text-red-500' : 'text-green-500'}`}>{data.totalAmps.toFixed(1)}A</span></div>
                      <p className="text-[10px] text-slate-500">{aiSuggestions[room] || "Load OK"}</p>
                  </div>
              ))}
          </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
             <h3 className={`text-xs font-bold uppercase ${theme.subtext}`}>Deployed Assets</h3>
             <div className="relative">
                <button onClick={() => setShowAddMenu(!showAddMenu)} className="text-[10px] bg-blue-500 text-white px-3 py-1.5 rounded-full font-bold shadow-sm flex items-center gap-1 active:scale-95 transition-transform">
                    <Plus size={12} /> Add Device
                </button>
                {showAddMenu && (
                    <div className="absolute right-0 top-8 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-2 bg-slate-950 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Model</div>
                        <div className="max-h-64 overflow-y-auto no-scrollbar">
                            {Object.entries(EQUIPMENT_SPECS).map(([model, specs]) => (
                                <button key={model} onClick={() => handleAddEquipment(model)} className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors border-b border-white/5 last:border-0">
                                    <span className="block font-bold">{model}</span>
                                    <span className="text-[10px] text-slate-500">{specs.type} • {specs.amps}A</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
             </div>
        </div>
        
        <div className="space-y-4">
            {equipment.filter(e => e.status !== 'Removed').map((item) => (
              <div key={item.id} className={`${theme.card} p-4 rounded-2xl relative overflow-hidden group`}>
                {item.status === 'Running' && (<div className="absolute top-0 right-0 w-16 h-16"><div className="absolute transform rotate-45 bg-green-500 text-white text-[8px] font-bold py-1 px-8 top-3 -right-6 text-center uppercase">Active</div></div>)}
                <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl ${item.status === 'Running' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-500'}`}><Wind size={24} /></div>
                    <div className="flex-1">
                        <div className="flex justify-between"><h3 className={`font-bold ${theme.text}`}>{item.model}</h3><span className={`text-[10px] font-bold ${theme.subtext}`}>{item.id}</span></div>
                        <div className={`text-xs ${theme.subtext} mt-0.5`}>{item.type} • {item.room}</div>
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4"><div className={`flex items-center text-sm ${theme.subtext}`}><Clock size={14} className="mr-1" /> {item.hours}h</div></div>
                            <div className="flex space-x-2">
                                <button onClick={() => handleToggleStatus(item.id)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${item.status === 'Running' ? 'border-red-500/20 text-red-400 bg-red-500/10' : 'border-green-500/20 text-green-400 bg-green-500/10'}`}>
                                    <Power size={14} /><span>{item.status === 'Running' ? 'Stop' : 'Start'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default EquipmentManager;
