
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Info, ChevronRight, TrendingDown, Thermometer, Droplets, BrainCircuit, Calculator, X, Save, PlusCircle, History, Sparkles, Loader2, Ruler, Download } from 'lucide-react';
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
import { Project, Reading } from '../types';

interface DryingLogsProps {
  onOpenAnalysis: () => void;
  isMobile?: boolean;
  project: Project;
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

const DryingLogs: React.FC<DryingLogsProps> = ({ onOpenAnalysis, isMobile = false, project }) => {
  const [showAddReading, setShowAddReading] = useState(false);
  const [showAddMoisture, setShowAddMoisture] = useState(false);
  
  const [psychoLogs, setPsychoLogs] = useState<PsychoLog[]>([]);
  const [moistureLogs, setMoistureLogs] = useState<MoistureLog[]>([]);
  
  const [ambient, setAmbient] = useState<NewReading>({ temp: '75', rh: '60' });
  const [dehu, setDehu] = useState<NewReading>({ temp: '95', rh: '35' });
  const [outdoor, setOutdoor] = useState<NewReading>({ temp: '82', rh: '75' });

  const [newMoisture, setNewMoisture] = useState({ material: 'Drywall', location: 'Wall A', mc: '15', dryGoal: '10' });

  const [aiChartSummary, setAiChartSummary] = useState<string>('GPP levels are trending downwards, indicating effective dehumidification.');
  const [aiMoistureSummary, setAiMoistureSummary] = useState<string>('Drywall moisture content is decreasing steadily and is on track to meet the dry goal.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (project && project.rooms) {
      const allReadings = project.rooms.flatMap(r => r.readings);

      const readingsByDay = allReadings.reduce((acc, reading) => {
          const date = new Date(reading.timestamp).toLocaleDateString();
          if (!acc[date]) acc[date] = [];
          acc[date].push(reading);
          return acc;
      }, {} as Record<string, Reading[]>);

      const sortedDays = Object.keys(readingsByDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      const newPsychoLogs = sortedDays.map((date, index) => {
          const dayReadings = readingsByDay[date];
          const avgGpp = dayReadings.reduce((sum, r) => sum + r.gpp, 0) / dayReadings.length;
          return {
              day: index + 1,
              ambientGPP: isNaN(avgGpp) ? 0 : Math.round(avgGpp),
          };
      });
      setPsychoLogs(newPsychoLogs);

      const newMoistureLogs = sortedDays.flatMap((date, index) => {
          const dayReadings = readingsByDay[date];
          const mcReading = dayReadings.find(r => r.mc > 0);
          if (mcReading) {
              return [{
                  day: index + 1,
                  material: 'Drywall', // Assumption
                  mc: mcReading.mc,
              }];
          }
          return [];
      });
      setMoistureLogs(newMoistureLogs);
    }
  }, [project]);

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
        setAiChartSummary(response.text || "Analysis complete.");
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
        setAiMoistureSummary(response.text || "Analysis complete.");
    } catch(err) { console.error(err); }
    finally { setIsAnalyzing(false); }
  };

  const handleExportCSV = () => {
    const headers = ['Day', 'Ambient GPP', 'Dehumidifier GPP', 'Outdoor GPP'];
    const rows = psychoLogs.map(log => [
        log.day,
        log.ambientGPP || '',
        log.dehuGPP || '',
        log.outdoorGPP || ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `drying_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const theme = {
    bg: isMobile ? 'bg-gray-50' : 'bg-slate-900',
    card: isMobile ? 'bg-white shadow-sm border border-gray-100' : 'glass-card',
    text: isMobile ? 'text-gray-900' : 'text-white',
    subtext: isMobile ? 'text-blue-800' : 'text-blue-600',
    gridStroke: isMobile ? '#93c5fd' : 'rgba(37, 99, 235, 0.2)',
    tickFill: isMobile ? '#2563eb' : '#3b82f6',
    tooltipStyle: isMobile 
        ? { borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#111827' }
        : { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc' }
  };

  return (
    <div className={`space-y-6 ${theme.bg}`}>
      <header className="flex items-center justify-between">
        <div>
            <h2 className={`text-2xl font-bold ${theme.text} tracking-tight`}>Field Logs</h2>
            <p className={`text-sm ${theme.subtext} font-medium`}>Psychrometric & Moisture Data</p>
        </div>
        <button onClick={handleExportCSV} className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isMobile ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-white/5 text-blue-500 hover:bg-white/10'}`}>
            <Download size={14} />
            <span>Export CSV</span>
        </button>
      </header>

      <section className={`${theme.card} p-5 rounded-[2.5rem]`}>
        <div className="flex justify-between items-start mb-4">
            <div><h3 className={`font-black ${theme.text} tracking-tight`}>GPP Trend</h3><p className={`text-xs ${theme.subtext} mt-0.5`}>Grains Per Pound</p></div>
            <button onClick={() => setShowAddReading(true)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold ${isMobile ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20'}`}><Plus size={14} /><span>Add Log</span></button>
        </div>
        <div className="h-56 w-full -ml-2 mb-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={psychoLogs}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} /><XAxis dataKey="day" tickFormatter={d => `Day ${d}`} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: theme.tickFill}} /><YAxis hide domain={[0, 'dataMax + 20']} /><Tooltip contentStyle={theme.tooltipStyle} />
        <Area type="monotone" dataKey="ambientGPP" name="Ambient" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="dehuGPP" name="Dehumidifier" stroke="#059669" fill="#059669" fillOpacity={0.1} strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="outdoorGPP" name="Outdoor" stroke="#78716c" fill="#78716c" fillOpacity={0.1} strokeWidth={2} strokeDasharray="3 3" activeDot={{ r: 6, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer></div>
        <div className={`p-3 rounded-xl flex items-start space-x-3 text-xs font-medium ${isMobile ? 'bg-blue-100/70 border-blue-200/80 text-blue-900' : 'bg-blue-600/10 border-blue-600/20 text-blue-500'} border`}>
          <Sparkles size={24} className={isMobile ? 'text-blue-700' : 'text-blue-600'} shrink-0 mt-0.5" />
          <p>{isAnalyzing ? 'Analyzing latest data...' : aiChartSummary}</p>
        </div>
      </section>

      <section className={`${theme.card} p-5 rounded-[2.5rem]`}>
        <div className="flex justify-between items-start mb-4">
            <div><h3 className={`font-black ${theme.text} tracking-tight`}>Moisture Trajectory</h3><p className={`text-xs ${theme.subtext} mt-0.5`}>Drywall MC%</p></div>
            <button onClick={() => setShowAddMoisture(true)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold ${isMobile ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-emerald-600/10 text-emerald-500 border border-emerald-600/20'}`}><Ruler size={14} /><span>Log Moisture</span></button>
        </div>
        <div className="h-56 w-full -ml-2 mb-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={moistureLogs}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} /><XAxis dataKey="day" tickFormatter={d => `Day ${d}`} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: theme.tickFill}} /><YAxis hide domain={[0, 'dataMax + 5']} /><Tooltip contentStyle={theme.tooltipStyle} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: theme.subtext}}/>
        <ReferenceLine y={parseFloat(newMoisture.dryGoal)} label={{ value: 'Dry Goal', position: 'insideTopLeft', fontSize: 10, fill: '#dc2626', dy: -5 }} stroke="#dc2626" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="mc" name="Moisture Content" stroke="#059669" strokeWidth={4} dot={{ r: 6, fill: '#059669', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></div>
         <div className={`p-3 rounded-xl flex items-start space-x-3 text-xs font-medium ${isMobile ? 'bg-emerald-100/70 border-emerald-200/80 text-emerald-900' : 'bg-emerald-600/10 border-emerald-600/20 text-emerald-500'} border`}>
          <Sparkles size={24} className={isMobile ? 'text-emerald-700' : 'text-emerald-600'} shrink-0 mt-0.5" />
          <p>{isAnalyzing ? 'Analyzing latest data...' : aiMoistureSummary}</p>
        </div>
      </section>
    </div>
  );
};

export default DryingLogs;
