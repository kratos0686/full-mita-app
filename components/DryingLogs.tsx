
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Info, ChevronRight, TrendingDown, Thermometer, Droplets, BrainCircuit, Calculator, X, Save, PlusCircle, History, Sparkles, Loader2, Ruler } from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { calculatePsychrometricsFromDryBulb } from '../utils/psychrometrics';

interface DryingLogsProps {
  onOpenAnalysis: () => void;
}

type PsychoLog = {
  day: number;
  ambientGPP?: number;
  dehuGPP?: number;
  outdoorGPP?: number;
};
type MoistureLog = {
  day: number;
  material: string;
  mc: number;
};
type NewReading = {
  temp: string;
  rh: string;
};

const initialPsychoLogs: PsychoLog[] = [
  { day: 1, ambientGPP: 95, dehuGPP: 45, outdoorGPP: 110 },
  { day: 2, ambientGPP: 72, dehuGPP: 38, outdoorGPP: 105 },
];

const initialMoistureLogs: MoistureLog[] = [
    { day: 1, material: 'Drywall', mc: 28 },
    { day: 2, material: 'Drywall', mc: 19 },
];

const DryingLogs: React.FC<DryingLogsProps> = ({ onOpenAnalysis }) => {
  const [selectedRoom, setSelectedRoom] = useState('Living Room');
  const [showAddReading, setShowAddReading] = useState(false);
  const [showAddMoisture, setShowAddMoisture] = useState(false);
  
  const [psychoLogs, setPsychoLogs] = useState<PsychoLog[]>(initialPsychoLogs);
  const [moistureLogs, setMoistureLogs] = useState<MoistureLog[]>(initialMoistureLogs);
  
  const [ambient, setAmbient] = useState<NewReading>({ temp: '75', rh: '60' });
  const [dehu, setDehu] = useState<NewReading>({ temp: '95', rh: '35' });
  const [outdoor, setOutdoor] = useState<NewReading>({ temp: '82', rh: '75' });

  const [newMoisture, setNewMoisture] = useState({ material: 'Drywall', location: 'Wall A', mc: '15', dryGoal: '10' });

  const [aiGuidance, setAiGuidance] = useState<string | null>(null);
  const [isGettingGuidance, setIsGettingGuidance] = useState(false);
  const [aiChartSummary, setAiChartSummary] = useState<string>('GPP levels are trending downwards, indicating effective dehumidification.');
  const [aiMoistureSummary, setAiMoistureSummary] = useState<string>('Drywall moisture content is decreasing steadily and is on track to meet the dry goal.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const calculatedValues = useMemo(() => {
    const amb = calculatePsychrometricsFromDryBulb(parseFloat(ambient.temp), parseFloat(ambient.rh));
    const dehuVal = calculatePsychrometricsFromDryBulb(parseFloat(dehu.temp), parseFloat(dehu.rh));
    const out = calculatePsychrometricsFromDryBulb(parseFloat(outdoor.temp), parseFloat(outdoor.rh));
    return { ambient: amb, dehu: dehuVal, outdoor: out };
  }, [ambient, dehu, outdoor]);

  const handleLogAtmospheric = async () => {
    const newDay = (psychoLogs[psychoLogs.length - 1]?.day || 0) + 1;
    const newLog: PsychoLog = { day: newDay };
    if (calculatedValues.ambient.gpp) newLog.ambientGPP = calculatedValues.ambient.gpp;
    if (calculatedValues.dehu.gpp) newLog.dehuGPP = calculatedValues.dehu.gpp;
    if (calculatedValues.outdoor.gpp) newLog.outdoorGPP = calculatedValues.outdoor.gpp;
    
    setPsychoLogs([...psychoLogs, newLog]);
    setShowAddReading(false);
    
    // Trigger AI analysis
    setIsAnalyzing(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `The latest atmospheric readings are: Ambient GPP ${newLog.ambientGPP}, Dehumidifier GPP ${newLog.dehuGPP}, Outdoor GPP ${newLog.outdoorGPP}. The previous day's ambient was ${psychoLogs[psychoLogs.length - 1]?.ambientGPP}. Provide a one-sentence summary of the drying progress.`
        });
        setAiChartSummary(response.text);
    } catch(err) { console.error(err); }
    finally { setIsAnalyzing(false); }
  };

  const handleLogMoisture = async () => {
    const newDay = (moistureLogs[moistureLogs.length - 1]?.day || 0) + 1;
    const newLog: MoistureLog = {
        day: newDay,
        material: newMoisture.material,
        mc: parseFloat(newMoisture.mc)
    };
    setMoistureLogs([...moistureLogs, newLog]);
    setShowAddMoisture(false);

    setIsAnalyzing(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const history = moistureLogs.map(l => l.mc).join(', ');
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `A material's moisture content (%MC) history is: [${history}, ${newLog.mc}]. The dry goal is ${newMoisture.dryGoal}%. Provide a one-sentence summary of its drying trajectory.`
        });
        setAiMoistureSummary(response.text);
    } catch(err) { console.error(err); }
    finally { setIsAnalyzing(false); }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Field Logs</h2>
        <p className="text-sm text-gray-500 font-medium">Psychrometric & Moisture Data</p>
      </header>

      <div onClick={onOpenAnalysis} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all hover:shadow-md">
        <div className="flex items-center space-x-4"><div className="p-3 bg-blue-50 text-blue-500 rounded-2xl border border-blue-100 group-hover:scale-110 transition-transform"><BrainCircuit size={24} /></div><div><h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600">Predictive Analysis</h3><p className="text-[10px] text-gray-400 mt-1 font-medium">Launch AI drying forecast module.</p></div></div>
        <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-600" />
      </div>

      <section className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex justify-between items-start mb-4">
            <div><h3 className="font-black text-gray-900 tracking-tight">GPP Trend</h3><p className="text-xs text-gray-500 mt-0.5">Grains Per Pound</p></div>
            <button onClick={() => setShowAddReading(true)} className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100"><Plus size={14} /><span>Add Log</span></button>
        </div>
        <div className="h-56 w-full -ml-2 mb-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={psychoLogs}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="day" tickFormatter={d => `Day ${d}`} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} /><YAxis hide domain={[0, 'dataMax + 20']} /><Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
        <Area type="monotone" dataKey="ambientGPP" name="Ambient" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} />
        <Area type="monotone" dataKey="dehuGPP" name="Dehumidifier" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} />
        <Area type="monotone" dataKey="outdoorGPP" name="Outdoor" stroke="#a8a29e" fill="#a8a29e" fillOpacity={0.1} strokeWidth={2} strokeDasharray="3 3" /></AreaChart></ResponsiveContainer></div>
        <div className="bg-blue-50/70 p-3 rounded-xl flex items-start space-x-3 text-xs font-medium text-blue-900 border border-blue-100/80">
          <Sparkles size={24} className="text-blue-500 shrink-0 mt-0.5" />
          <p>{isAnalyzing ? 'Analyzing latest data...' : aiChartSummary}</p>
        </div>
      </section>

      <section className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex justify-between items-start mb-4">
            <div><h3 className="font-black text-gray-900 tracking-tight">Moisture Trajectory</h3><p className="text-xs text-gray-500 mt-0.5">Drywall MC%</p></div>
            <button onClick={() => setShowAddMoisture(true)} className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100"><Ruler size={14} /><span>Log Moisture</span></button>
        </div>
        <div className="h-56 w-full -ml-2 mb-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={moistureLogs}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="day" tickFormatter={d => `Day ${d}`} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} /><YAxis hide domain={[0, 'dataMax + 5']} /><Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}}/>
        <ReferenceLine y={parseFloat(newMoisture.dryGoal)} label={{ value: 'Dry Goal', position: 'insideTopLeft', fontSize: 10, fill: '#ef4444', dy: -5 }} stroke="#ef4444" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="mc" name="Moisture Content" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></div>
        <div className="bg-emerald-50/70 p-3 rounded-xl flex items-start space-x-3 text-xs font-medium text-emerald-900 border border-emerald-100/80">
          <Sparkles size={24} className="text-emerald-500 shrink-0 mt-0.5" />
          <p>{isAnalyzing ? 'Analyzing latest data...' : aiMoistureSummary}</p>
        </div>
      </section>

      {/* Atmospheric Reading Modal */}
      {showAddReading && (
         <div className="fixed inset-0 z-[120] bg-gray-950/80 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300 px-2">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] shadow-2xl p-8 pb-14 animate-in slide-in-from-bottom duration-500 ease-out border-x border-t border-gray-100 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-20 pb-4 pt-2"><div className="flex items-center space-x-4"><div className="p-3.5 bg-blue-600 rounded-[1.5rem] text-white shadow-xl shadow-blue-200 ring-4 ring-blue-50"><Plus size={24} /></div><div><h3 className="font-black text-xl tracking-tight text-gray-900">Log New Readings</h3><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Add to Psychrometric Chart</p></div></div><button onClick={() => setShowAddReading(false)} className="p-3 bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors border border-gray-200"><X size={24} /></button></div>
             <div className="space-y-4">
                {[['Ambient', ambient, setAmbient, calculatedValues.ambient], ['Dehumidifier', dehu, setDehu, calculatedValues.dehu], ['Outdoor', outdoor, setOutdoor, calculatedValues.outdoor]].map(([label, state, setState, calcs]: any) => (
                    <div key={label} className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4">
                        <p className="font-bold text-sm text-gray-800 mb-3">{label} Conditions</p>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div><label className="text-[9px] font-black text-gray-400">Temp (°F)</label><input type="number" value={state.temp} onChange={e => setState({ ...state, temp: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-bold shadow-inner" /></div>
                            <div><label className="text-[9px] font-black text-gray-400">RH (%)</label><input type="number" value={state.rh} onChange={e => setState({ ...state, rh: e.target.value })} className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-bold shadow-inner" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center bg-white p-2 rounded-lg border border-gray-200">
                             <div><div className="text-[9px] font-black text-gray-400">GPP</div><div className="text-sm font-bold text-blue-600">{calcs.gpp}</div></div>
                             <div><div className="text-[9px] font-black text-gray-400">Dew Point</div><div className="text-sm font-bold text-blue-600">{calcs.dewPoint}°</div></div>
                        </div>
                    </div>
                ))}
                <div className="pt-4"><button onClick={handleLogAtmospheric} className="w-full bg-gray-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all"><Save size={20} /><span>Save Log Entry</span></button></div>
             </div>
          </div>
         </div>
      )}

      {/* Moisture Reading Modal */}
      {showAddMoisture && (
          <div className="fixed inset-0 z-[120] bg-gray-950/80 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300 px-2">
            <div className="bg-white w-full max-w-md rounded-t-[3rem] shadow-2xl p-8 pb-14 animate-in slide-in-from-bottom duration-500 ease-out border-x border-t border-gray-100 max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-20 pb-4 pt-2"><div className="flex items-center space-x-4"><div className="p-3.5 bg-emerald-600 rounded-[1.5rem] text-white shadow-xl shadow-emerald-200 ring-4 ring-emerald-50"><Ruler size={24} /></div><div><h3 className="font-black text-xl tracking-tight text-gray-900">Log Moisture Reading</h3><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Add to Material Trajectory</p></div></div><button onClick={() => setShowAddMoisture(false)} className="p-3 bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors border border-gray-200"><X size={24} /></button></div>
               <div className="space-y-4">
                  <div><label className="text-[10px] font-black text-gray-400">Material</label><input type="text" value={newMoisture.material} onChange={e => setNewMoisture(s => ({...s, material: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold shadow-inner" /></div>
                  <div><label className="text-[10px] font-black text-gray-400">Location ID</label><input type="text" value={newMoisture.location} onChange={e => setNewMoisture(s => ({...s, location: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold shadow-inner" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black text-gray-400">Moisture Content (%)</label><input type="number" value={newMoisture.mc} onChange={e => setNewMoisture(s => ({...s, mc: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold shadow-inner" /></div>
                    <div><label className="text-[10px] font-black text-gray-400">Dry Goal (%)</label><input type="number" value={newMoisture.dryGoal} onChange={e => setNewMoisture(s => ({...s, dryGoal: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold shadow-inner" /></div>
                  </div>
                  <div className="pt-4"><button onClick={handleLogMoisture} className="w-full bg-gray-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all"><Save size={20} /><span>Save Reading</span></button></div>
               </div>
            </div>
           </div>
      )}
    </div>
  );
};

export default DryingLogs;
