
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Info, ChevronRight, TrendingDown, Thermometer, Droplets, BrainCircuit, Calculator, X, Save, PlusCircle, History, Sparkles, Loader2 } from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { calculatePsychrometricsFromDryBulb } from '../utils/psychrometrics';


interface DryingLogsProps {
  onOpenAnalysis: () => void;
}

const DryingLogs: React.FC<DryingLogsProps> = ({ onOpenAnalysis }) => {
  const [selectedRoom, setSelectedRoom] = useState('Living Room');
  const [showCalculator, setShowCalculator] = useState(false);
  const [showAddReading, setShowAddReading] = useState(false);
  
  const [calcTemp, setCalcTemp] = useState<string>('72');
  const [calcRh, setCalcRh] = useState<string>('65');
  const [readingType, setReadingType] = useState<'Ambient' | 'Dehumidifier' | 'Outdoor'>('Ambient');
  
  const [aiGuidance, setAiGuidance] = useState<string | null>(null);
  const [isGettingGuidance, setIsGettingGuidance] = useState(false);
  const [aiChartSummary, setAiChartSummary] = useState<string>('');

  const [atmosphericData, setAtmosphericData] = useState([
    { time: '16:00', temp: 75, rh: 52, gpp: 68.4, dewPoint: 56.4, type: 'Ambient' },
    { time: '12:00', temp: 74, rh: 58, gpp: 73.1, dewPoint: 58.2, type: 'Ambient' },
    { time: '08:00', temp: 72, rh: 65, gpp: 76.4, dewPoint: 59.4, type: 'Ambient' },
  ]);
  
  useEffect(() => {
      const getInitialAnalysis = async () => {
          if (atmosphericData.length === 0) return;
          try {
              const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
              const latestLog = atmosphericData[0];
              const response = await ai.models.generateContent({
                  model: 'gemini-3-flash-preview',
                  contents: `Latest atmospheric log: ${JSON.stringify(latestLog)}. Provide a 1-sentence summary of the GPP trend shown in this data series: ${JSON.stringify(atmosphericData.map(d => d.gpp))}.`
              });
              setAiChartSummary(response.text || 'Atmospheric conditions are being monitored.');
          } catch (err) {
              setAiChartSummary('Could not connect to AI for analysis.');
          }
      };
      getInitialAnalysis();
  }, [atmosphericData]);


  const psychResults = useMemo(() => {
    return calculatePsychrometricsFromDryBulb(parseFloat(calcTemp), parseFloat(calcRh));
  }, [calcTemp, calcRh]);

  const handleAddReading = () => {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const newEntry = { time: timeStr, temp: parseFloat(calcTemp), rh: parseFloat(calcRh), gpp: psychResults.gpp, dewPoint: psychResults.dewPoint, type: readingType };
    setAtmosphericData([newEntry, ...atmosphericData]);
    setShowAddReading(false);
    setShowCalculator(false);
    setAiGuidance(null);
  };
  
  const getAiStrategy = async () => {
    setIsGettingGuidance(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Current Conditions: Temperature ${calcTemp}°F, RH ${calcRh}%. Calculated GPP is ${psychResults.gpp}. This is an ${readingType} reading. Provide a brief (2 sentences max) S500-compliant drying strategy recommendation.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAiGuidance(response.text);
    } catch (error) {
      setAiGuidance("Unable to connect to MitigationAI core.");
    } finally {
      setIsGettingGuidance(false);
    }
  };

  const moistureData = [
    { day: 'Day 1', value: 28, goal: 12 }, { day: 'Day 2', value: 22, goal: 12 },
    { day: 'Day 3', value: 16, goal: 12 }, { day: 'Day 4', value: 13, goal: 12 },
    { day: 'Day 5', value: 12.1, goal: 12 },
  ];

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex justify-between items-end">
        <div><h2 className="text-2xl font-bold text-gray-900">Field Logs</h2><p className="text-sm text-gray-500 font-medium">Restoration | Mitigation™</p></div>
        <div className="flex space-x-2"><button onClick={() => { setReadingType('Ambient'); setAiGuidance(null); setShowCalculator(true); }} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 flex items-center active:scale-95 transition-transform" title="Psychrometric Calculator"><Calculator size={20} /></button><button onClick={() => setShowAddReading(true)} className="bg-blue-600 text-white rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center active:scale-95 transition-transform"><PlusCircle size={18} className="mr-2" /> Log Data</button></div>
      </header>

      <div onClick={onOpenAnalysis} className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 rounded-[2rem] text-white shadow-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform"><BrainCircuit size={80} /></div>
        <div className="flex items-center space-x-4 relative z-10"><div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md border border-white/20"><BrainCircuit size={24} /></div><div><div className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-0.5">Predictive Core</div><div className="text-sm font-bold">Estimated dry-out: Thursday (Day 4)</div><div className="text-[10px] text-blue-200 mt-1 flex items-center"><TrendingDown size={12} className="mr-1" /> Evaporation efficiency is increasing</div></div></div>
        <ChevronRight size={18} className="text-white opacity-60" />
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">{['Living Room', 'Kitchen', 'Master Bed', 'Basement'].map((room) => (<button key={room} onClick={() => setSelectedRoom(room)} className={`px-6 py-3 rounded-2xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all ${selectedRoom === room ? 'bg-gray-900 text-white shadow-xl' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}>{room}</button>))}</div>

      <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2"><div><h3 className="font-black text-gray-900 tracking-tight">Moisture Trajectory</h3><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Material: Stud • L-14</p></div><div className="flex items-center space-x-1.5 bg-green-50 text-green-700 text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest border border-green-100"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /><span>Optimal</span></div></div>
        <div className="h-44 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={moistureData}><defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 700}} /><YAxis domain={[8, 30]} hide /><Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}/><ReferenceLine y={12} stroke="#2563eb" strokeDasharray="4 4" label={{ position: 'right', value: 'Dry Goal', fill: '#2563eb', fontSize: 8, fontWeight: 900 }} /><Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" /></AreaChart></ResponsiveContainer></div>
        <div className="bg-blue-50/70 border border-blue-100 text-blue-900 p-3 rounded-xl flex items-start space-x-3 text-xs font-medium mt-4"><BrainCircuit size={18} className="text-blue-500 shrink-0 mt-0.5" /><p><span className="font-bold">AI Summary:</span> Material is approaching its dry goal steadily, indicating effective drying conditions.</p></div>
      </section>
      
      <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <div className="flex items-center justify-between"><h3 className="font-black text-gray-900 tracking-tight uppercase text-[11px]">Atmospheric History</h3><button className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest">Full Report</button></div>
            {aiChartSummary && <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 p-3 rounded-xl flex items-start space-x-3 text-xs font-medium mt-4"><BrainCircuit size={18} className="text-indigo-500 shrink-0 mt-0.5" /><p><span className="font-bold">AI Trend Analysis:</span> {aiChartSummary}</p></div>}
        </div>
        <div className="divide-y divide-gray-50">{atmosphericData.map((item, i) => (<div key={i} className="p-5 flex justify-between items-center active:bg-gray-50 transition-colors cursor-pointer group"><div className="flex items-center space-x-5"><div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner"><span className="text-[10px] font-black text-gray-900 uppercase tracking-tighter leading-none">{item.time}</span><span className="text-[8px] font-bold text-gray-400 uppercase mt-1">LOG</span></div><div className="space-y-2"><div className="flex items-center space-x-4"><span className="flex items-center text-base font-black text-gray-900 tracking-tight"><Thermometer size={16} className="mr-1.5 text-orange-500" /> {item.temp}°<span className="text-[10px] ml-0.5 opacity-30 font-bold">F</span></span><span className="flex items-center text-base font-black text-gray-900 tracking-tight"><Droplets size={16} className="mr-1.5 text-blue-500" /> {item.rh}<span className="text-[10px] ml-0.5 opacity-30 font-bold">%</span></span></div><div className="flex space-x-4"><div className="flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100"><span className="text-[9px] font-black mr-1 uppercase">GPP:</span> <span className="text-[11px] font-bold">{item.gpp}</span></div><div className="flex items-center px-2 py-0.5 bg-orange-50 text-orange-700 rounded-lg border border-orange-100"><span className="text-[9px] font-black mr-1 uppercase">DP:</span> <span className="text-[11px] font-bold">{item.dewPoint}°</span></div></div></div></div><ChevronRight size={18} className="text-gray-200 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" /></div>))}</div>
      </section>

      {(showCalculator || showAddReading) && (
        <div className="fixed inset-0 z-[120] bg-gray-950/80 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300 px-2">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] shadow-2xl p-8 pb-14 animate-in slide-in-from-bottom duration-500 ease-out border-x border-t border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-20 pb-4 pt-2"><div className="flex items-center space-x-4"><div className="p-3.5 bg-indigo-600 rounded-[1.5rem] text-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-50">{showAddReading ? <Plus size={24} /> : <Calculator size={24} />}</div><div><h3 className="font-black text-xl tracking-tight text-gray-900">{showAddReading ? 'Add Mitigation Reading' : 'Psychrometric Core'}</h3><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">IICRC S500 Auto-Calculations</p></div></div><button onClick={() => { setShowCalculator(false); setShowAddReading(false); setAiGuidance(null); }} className="p-3 bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors border border-gray-200"><X size={24} /></button></div>
            <div className="space-y-6">
              {showAddReading && (<div className="flex p-1.5 bg-gray-100 rounded-2xl border border-gray-200">{(['Ambient', 'Dehumidifier', 'Outdoor'] as const).map(type => (<button key={type} onClick={() => setReadingType(type)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${readingType === type ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-400'}`}>{type}</button>))}</div>)}
              <div className="grid grid-cols-2 gap-6"><div className="space-y-2.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center pl-1"><Thermometer size={12} className="mr-1 text-orange-500" /> Temperature (°F)</label><input type="number" value={calcTemp} onChange={(e) => setCalcTemp(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-[1.5rem] p-5 text-2xl font-black focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner placeholder:text-gray-200 text-gray-900" placeholder="72"/></div><div className="space-y-2.5"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center pl-1"><Droplets size={12} className="mr-1 text-blue-500" /> Relative Hum. (%)</label><input type="number" value={calcRh} onChange={(e) => setCalcRh(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-[1.5rem] p-5 text-2xl font-black focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner placeholder:text-gray-200 text-gray-900" placeholder="65"/></div></div>
              <div className="bg-indigo-600 rounded-[2.5rem] p-6 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group"><div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700"><Calculator size={160} /></div><div className="relative z-10"><div className="grid grid-cols-3 gap-x-2 text-center divide-x divide-white/10"><div><div className="text-[8px] font-black text-indigo-100 uppercase tracking-widest mb-1 opacity-70">Grains / Pound</div><div className="text-2xl font-black tracking-tighter flex items-baseline justify-center">{psychResults.gpp}<span className="text-xs font-bold ml-1.5 uppercase opacity-40">gpp</span></div></div><div><div className="text-[8px] font-black text-indigo-100 uppercase tracking-widest mb-1 opacity-70">Dew Point</div><div className="text-2xl font-black tracking-tighter flex items-baseline justify-center">{psychResults.dewPoint}°</div></div><div><div className="text-[8px] font-black text-indigo-100 uppercase tracking-widest mb-1 opacity-70">Vapor Pressure</div><div className="text-2xl font-black tracking-tighter flex items-baseline justify-center">{psychResults.vaporPressure}<span className="text-[10px] font-bold ml-1.5 uppercase opacity-40">psi</span></div></div></div></div></div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-5">{aiGuidance ? (<div className="animate-in fade-in duration-500"><div className="flex items-center space-x-2 mb-2"><Sparkles size={16} className="text-indigo-600" /><span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">AI Strategy Recommendation</span></div><p className="text-sm font-bold text-indigo-900 leading-relaxed">{aiGuidance}</p></div>) : (<button onClick={getAiStrategy} disabled={isGettingGuidance} className="w-full flex items-center justify-center space-x-2 py-3 bg-white border border-indigo-200 rounded-xl text-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">{isGettingGuidance ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}<span>{isGettingGuidance ? 'Analyzing Psychrometrics...' : 'Generate Drying Strategy'}</span></button>)}</div>
              <div className="flex space-x-4 pt-2">{showAddReading ? (<button onClick={handleAddReading} className="flex-1 bg-gray-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all hover:bg-black"><Save size={20} /><span>Confirm Log</span></button>) : (<button onClick={() => { setReadingType('Ambient'); setShowAddReading(true); setShowCalculator(false); setAiGuidance(null); }} className="flex-1 bg-gray-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all hover:bg-black"><PlusCircle size={20} /><span>Apply to Job</span></button>)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DryingLogs;
