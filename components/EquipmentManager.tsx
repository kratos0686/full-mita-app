
import React, { useState, useMemo, useEffect } from 'react';
import { Wind, Power, Clock, RefreshCcw, LayoutGrid, List, Plus, X, Save, Box, Tag, Home, Calculator, Zap, AlertTriangle, CheckCircle2, ChevronRight, BrainCircuit, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- Equipment Specification Database ---
const EQUIPMENT_SPECS: Record<string, { amps: number, volts: number, cfm: number }> = {
  'Phoenix AirMax': { amps: 1.9, volts: 115, cfm: 925 },
  'LGR 3500i': { amps: 8.3, volts: 115, cfm: 0 }, // Dehumidifiers process air, but aren't counted for air changes in the same way.
  'DefendAir HEPA': { amps: 1.9, volts: 115, cfm: 500 },
  'Velo Pro': { amps: 1.8, volts: 115, cfm: 885 },
  'LGR 2800i': { amps: 8.0, volts: 115, cfm: 0 },
};

const CIRCUIT_BREAKER_LIMIT_AMPS = 15;

const EquipmentManager: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  
  const [newEquipment, setNewEquipment] = useState({
    id: '',
    type: 'Air Mover' as 'Air Mover' | 'Dehumidifier' | 'HEPA Scrubber',
    model: '',
    room: ''
  });

  const [equipment, setEquipment] = useState([
    { id: 'AM-4022', type: 'Air Mover', model: 'Phoenix AirMax', status: 'Running', hours: 42.5, room: 'Living Room' },
    { id: 'DH-1102', type: 'Dehumidifier', model: 'LGR 3500i', status: 'Running', hours: 42.5, room: 'Living Room' },
    { id: 'AM-4023', type: 'Air Mover', model: 'Phoenix AirMax', status: 'Off', hours: 12.0, room: 'Kitchen' },
    { id: 'HE-9001', type: 'HEPA Scrubber', model: 'DefendAir HEPA', status: 'Running', hours: 24.8, room: 'Master Bedroom' },
    { id: 'AM-4024', type: 'Air Mover', model: 'Velo Pro', status: 'Running', hours: 3.2, room: 'Living Room' },
  ]);

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
  }, [equipment]);

  useEffect(() => {
    if (isCalculatorOpen) {
      const getSuggestions = async () => {
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
  }, [isCalculatorOpen, calculationsByRoom]);
  
  // Auto-increments hours for running equipment
  useEffect(() => {
    const timer = setInterval(() => {
      setEquipment(prevEquipment =>
        prevEquipment.map(item =>
          item.status === 'Running'
            // Increment by 0.1 to simulate an hour passing every ~minute (for demo purposes)
            ? { ...item, hours: parseFloat((item.hours + 0.1).toFixed(1)) }
            : item
        )
      );
    }, 6000); // Update every 6 seconds

    return () => clearInterval(timer); // Cleanup on component unmount
  }, []);

  const handleInputChange = (field: keyof typeof newEquipment, value: string) => {
    setNewEquipment(prev => ({ ...prev, [field]: value }));
  };
  
  const handleTypeSelect = (type: 'Air Mover' | 'Dehumidifier' | 'HEPA Scrubber') => {
    setNewEquipment(prev => ({ ...prev, type }));
  };

  const handleDeploy = () => {
    if (!newEquipment.id || !newEquipment.model || !newEquipment.room) return;
    const newItem = { ...newEquipment, status: 'Running' as 'Running' | 'Off', hours: 0 };
    setEquipment([newItem, ...equipment]);
    setIsAddModalOpen(false);
    setNewEquipment({ id: '', type: 'Air Mover', model: '', room: '' });
  };
  
  const handleToggleStatus = (id: string) => {
    setEquipment(prevEquipment =>
      prevEquipment.map(item =>
        item.id === id
          ? { ...item, status: item.status === 'Running' ? 'Off' : 'Running' }
          : item
      )
    );
  };

  return (
    <div className="p-4 space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Equipment</h2>
          <p className="text-sm text-gray-500">Runtime & Inventory Tracking</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button className="p-1.5 bg-white shadow-sm rounded-md text-blue-600"><LayoutGrid size={18} /></button>
          <button className="p-1.5 text-gray-400"><List size={18} /></button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 p-3 rounded-2xl text-center"><div className="text-[10px] text-blue-600 font-bold uppercase mb-1">Total</div><div className="text-xl font-bold text-blue-800">{equipment.length}</div></div>
        <div className="bg-green-50 p-3 rounded-2xl text-center"><div className="text-[10px] text-green-600 font-bold uppercase mb-1">Running</div><div className="text-xl font-bold text-green-800">{equipment.filter(e => e.status === 'Running').length}</div></div>
        <div className="bg-gray-100 p-3 rounded-2xl text-center"><div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Inactive</div><div className="text-xl font-bold text-gray-700">{equipment.filter(e => e.status === 'Off').length}</div></div>
      </div>

      <div onClick={() => setIsCalculatorOpen(true)} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all hover:shadow-md">
        <div className="flex items-center space-x-4"><div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl border border-indigo-100 group-hover:scale-110 transition-transform"><Calculator size={24} /></div><div><h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600">Load Calculator</h3><p className="text-[10px] text-gray-400 mt-1 font-medium">AI-powered circuit load and CFM analysis.</p></div></div>
        <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-600" />
      </div>

      <div className="space-y-4">
        {equipment.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
            {item.status === 'Running' && (<div className="absolute top-0 right-0 w-16 h-16"><div className="absolute transform rotate-45 bg-green-500 text-white text-[8px] font-bold py-1 px-8 top-3 -right-6 text-center uppercase">Active</div></div>)}
            <div className="flex items-start space-x-4"><div className={`p-3 rounded-xl ${item.status === 'Running' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}><Wind size={24} /></div><div className="flex-1"><div className="flex justify-between"><h3 className="font-bold text-gray-900">{item.model}</h3><span className="text-[10px] font-bold text-gray-400">{item.id}</span></div><div className="text-xs text-gray-500 mt-0.5">{item.type} • {item.room}</div><div className="mt-4 flex items-center justify-between"><div className="flex items-center space-x-4"><div className="flex items-center text-gray-600 text-sm"><Clock size={14} className="mr-1" /> {item.hours}h</div><button className="text-blue-600 text-[10px] font-bold uppercase flex items-center"><RefreshCcw size={10} className="mr-1" /> Reset</button></div><button onClick={() => handleToggleStatus(item.id)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${item.status === 'Running' ? 'border-red-200 text-red-600 bg-red-50' : 'border-green-200 text-green-600 bg-green-50'}`}><Power size={14} /><span>{item.status === 'Running' ? 'Turn Off' : 'Turn On'}</span></button></div></div></div>
          </div>
        ))}
      </div>

      <button onClick={() => setIsAddModalOpen(true)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center space-x-2 active:scale-[0.98] transition-all">
        <Power size={20} />
        <span>Deploy New Equipment</span>
      </button>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] bg-gray-950/80 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300 px-2">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] shadow-2xl p-8 pb-14 animate-in slide-in-from-bottom duration-500 ease-out border-x border-t border-gray-100 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-20 pb-4 pt-2">
              <div className="flex items-center space-x-4"><div className="p-3.5 bg-blue-600 rounded-[1.5rem] text-white shadow-xl shadow-blue-200 ring-4 ring-blue-50"><Plus size={24} /></div><div><h3 className="font-black text-xl tracking-tight text-gray-900">Deploy New Equipment</h3><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Add to Project Inventory</p></div></div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors border border-gray-200"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center pl-1 mb-2">Equipment Type</label><div className="flex p-1.5 bg-gray-100 rounded-2xl border border-gray-200">{(['Air Mover', 'Dehumidifier', 'HEPA Scrubber'] as const).map(type => (<button key={type} onClick={() => handleTypeSelect(type)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newEquipment.type === type ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-400'}`}>{type}</button>))}</div></div>
              <div className="relative"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center pl-1 mb-2">Equipment ID Tag</label><Tag size={16} className="absolute left-4 top-[46px] text-gray-400 pointer-events-none" /><input type="text" placeholder="e.g., AM-4024" value={newEquipment.id} onChange={(e) => handleInputChange('id', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-inner" /></div>
              <div className="relative"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center pl-1 mb-2">Model Name</label><Box size={16} className="absolute left-4 top-[46px] text-gray-400 pointer-events-none" /><input type="text" placeholder="e.g., Phoenix AirMax" value={newEquipment.model} onChange={(e) => handleInputChange('model', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-inner" /></div>
              <div className="relative"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center pl-1 mb-2">Deployment Room</label><Home size={16} className="absolute left-4 top-[46px] text-gray-400 pointer-events-none" /><input type="text" placeholder="e.g., Living Room" value={newEquipment.room} onChange={(e) => handleInputChange('room', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-inner" /></div>
              <div className="pt-4"><button onClick={handleDeploy} className="w-full bg-gray-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all hover:bg-black disabled:opacity-50" disabled={!newEquipment.id || !newEquipment.model || !newEquipment.room}><Save size={20} /><span>Confirm Deployment</span></button></div>
            </div>
          </div>
        </div>
      )}

      {isCalculatorOpen && (
         <div className="fixed inset-0 z-[120] bg-gray-950/80 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300 px-2">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] shadow-2xl p-8 pb-14 animate-in slide-in-from-bottom duration-500 ease-out border-x border-t border-gray-100 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-20 pb-4 pt-2"><div className="flex items-center space-x-4"><div className="p-3.5 bg-indigo-600 rounded-[1.5rem] text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50"><Calculator size={24} /></div><div><h3 className="font-black text-xl tracking-tight text-gray-900">Load Calculator</h3><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Energy & Air Movement Analysis</p></div></div><button onClick={() => setIsCalculatorOpen(false)} className="p-3 bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors border border-gray-200"><X size={24} /></button></div>
            <div className="space-y-6">
              {Object.keys(calculationsByRoom).length > 0 ? (Object.keys(calculationsByRoom).map((room) => {const data = calculationsByRoom[room]; const isOverLimit = data.totalAmps > CIRCUIT_BREAKER_LIMIT_AMPS; return (<div key={room} className="bg-gray-50/70 border border-gray-100 rounded-3xl p-5"><h4 className="font-black text-gray-800 tracking-tight">{room}</h4><div className="grid grid-cols-2 gap-4 mt-4 mb-5"><div className={`p-4 rounded-2xl border ${isOverLimit ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}><div className="flex items-center space-x-2"><Zap size={16} className={isOverLimit ? 'text-orange-500' : 'text-green-500'} /><span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Load</span></div><p className={`text-2xl font-black tracking-tighter mt-2 ${isOverLimit ? 'text-orange-600' : 'text-gray-900'}`}>{data.totalAmps.toFixed(1)} <span className="text-sm font-bold opacity-50">Amps</span></p></div><div className="bg-white p-4 rounded-2xl border border-gray-200"><div className="flex items-center space-x-2"><Wind size={16} className="text-blue-500" /><span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Airflow</span></div><p className="text-2xl font-black tracking-tighter mt-2 text-gray-900">{data.totalCfm.toLocaleString()} <span className="text-sm font-bold opacity-50">CFM</span></p></div></div>
              
              <div className={`p-4 rounded-xl flex items-start space-x-3 text-xs font-medium mb-4 ${isOverLimit ? 'bg-orange-100/80 border-orange-200 text-orange-900' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                <BrainCircuit size={24} className={`shrink-0 mt-0.5 ${isOverLimit ? 'text-orange-500' : 'text-indigo-500'}`} />
                <div>
                  <span className="font-bold">AI Suggestion:</span>{' '}
                  {isFetchingSuggestions ? <span className="italic">Analyzing...</span> : aiSuggestions[room]}
                </div>
              </div>

              <div className="space-y-2"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Running Equipment</p>{data.equipment.map(item => (<div key={item.id} className="bg-white p-3 rounded-lg flex justify-between items-center text-xs border border-gray-100"><div><p className="font-bold text-gray-800">{item.model}</p><p className="text-[10px] text-gray-400">{item.id}</p></div><p className="font-bold text-gray-600">{EQUIPMENT_SPECS[item.model]?.amps || 0} A</p></div>))}</div></div>)})) : (<div className="text-center py-12 bg-gray-50 rounded-2xl"><p className="font-bold text-gray-600">No Running Equipment</p><p className="text-xs text-gray-400 mt-1">Turn on equipment to calculate energy load.</p></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentManager;
