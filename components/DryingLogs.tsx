
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Info, ChevronRight, TrendingDown, Thermometer, Droplets, BrainCircuit, Calculator, X, Save, PlusCircle, History, Sparkles, Loader2, Ruler, Download, Wifi, Gauge, Activity, Bluetooth } from 'lucide-react';
import { Type } from "@google/genai";
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
import { calculatePsychrometricsFromDryBulb } from '../utils/psychrometrics';
import { useAppContext } from '../context/AppContext';
import { Project, Reading } from '../types';
import { IntelligenceRouter } from '../services/IntelligenceRouter';

interface DryingLogsProps {
  onOpenAnalysis: () => void;
  isMobile?: boolean;
  project: Project;
}

type PsychoLog = {
  day: number;
  affectedGPP?: number;
  unaffectedGPP?: number;
  dehuGPP?: number;
  outdoorGPP?: number;
  readings?: {
      affected?: { temp: number; rh: number };
      unaffected?: { temp: number; rh: number };
      dehu?: { temp: number; rh: number };
      outdoor?: { temp: number; rh: number };
  }
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

const CustomTooltip = ({ active, payload, label, isMobile }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`${isMobile ? 'bg-white text-gray-900 shadow-xl border-gray-100' : 'bg-slate-800 text-slate-200 border-slate-700'} border p-3 rounded-xl text-xs shadow-lg z-50`}>
          <p className="font-bold mb-2 opacity-70">{label}</p>
          {payload.map((entry: any, index: number) => {
            // Map dataKey to readings key (e.g. affectedGPP -> affected)
            const keyMap: Record<string, keyof PsychoLog['readings']> = {
                'affectedGPP': 'affected',
                'unaffectedGPP': 'unaffected',
                'dehuGPP': 'dehu',
                'outdoorGPP': 'outdoor'
            };
            const readingKey = keyMap[entry.dataKey];
            const details = entry.payload.readings?.[readingKey];
            
            return (
              <div key={index} className="flex flex-col mb-2 last:mb-0">
                <div className="flex items-center space-x-2" style={{ color: entry.color }}>
                    <span className="font-bold">{entry.name}:</span>
                    <span className="font-mono">{entry.value} GPP</span>
                </div>
                {details && (
                    <div className={`ml-2 pl-2 border-l-2 ${isMobile ? 'border-gray-200 text-gray-500' : 'border-slate-600 text-slate-400'} text-[10px] space-x-2`}>
                        <span>{details.temp}°F</span>
                        <span>{details.rh}% RH</span>
                    </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

const DryingLogs: React.FC<DryingLogsProps> = ({ onOpenAnalysis, isMobile = false, project }) => {
  const { isOnline, accessToken } = useAppContext();
  const [showAddReading, setShowAddReading] = useState(false);
  const [showAddMoisture, setShowAddMoisture] = useState(false);
  
  const [psychoLogs, setPsychoLogs] = useState<PsychoLog[]>([]);
  const [moistureLogs, setMoistureLogs] = useState<MoistureLog[]>([]);
  
  // State for specific environmental readings
  const [affected, setAffected] = useState<NewReading>({ temp: '75', rh: '60' });
  const [unaffected, setUnaffected] = useState<NewReading>({ temp: '72', rh: '45' });
  const [dehu, setDehu] = useState<NewReading>({ temp: '95', rh: '35' });
  const [outdoor, setOutdoor] = useState<NewReading>({ temp: '82', rh: '75' });

  const [newMoisture, setNewMoisture] = useState({ material: 'Drywall', location: 'Wall A', mc: '15', dryGoal: '10' });

  const [aiChartSummary, setAiChartSummary] = useState<string>('GPP levels are trending downwards, indicating effective dehumidification.');
  const [aiMoistureSummary, setAiMoistureSummary] = useState<string>('Drywall moisture content is decreasing steadily and is on track to meet the dry goal.');
  const [aiEfficiencyScore, setAiEfficiencyScore] = useState<string>('High');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReadingSensors, setIsReadingSensors] = useState(false);
  const [isConnectingProtimeter, setIsConnectingProtimeter] = useState(false);

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
          // For existing data mock, we don't have temp/rh in `Reading` type aggregated this way easily without refactor
          // So we leave readings details undefined for historical mock data
          return {
              day: index + 1,
              affectedGPP: isNaN(avgGpp) ? 0 : Math.round(avgGpp),
              unaffectedGPP: 45, // Mock baseline for existing data
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

  useEffect(() => {
      if (!isOnline) {
          setAiChartSummary("Offline Mode - AI Analysis Unavailable. Data cached locally.");
          setAiMoistureSummary("Offline Mode - AI Analysis Unavailable. Data cached locally.");
      }
  }, [isOnline]);

  const calculatedValues = useMemo(() => {
    const aff = calculatePsychrometricsFromDryBulb(parseFloat(affected.temp), parseFloat(affected.rh));
    const unaff = calculatePsychrometricsFromDryBulb(parseFloat(unaffected.temp), parseFloat(unaffected.rh));
    const dehuVal = calculatePsychrometricsFromDryBulb(parseFloat(dehu.temp), parseFloat(dehu.rh));
    const out = calculatePsychrometricsFromDryBulb(parseFloat(outdoor.temp), parseFloat(outdoor.rh));
    return { affected: aff, unaffected: unaff, dehu: dehuVal, outdoor: out };
  }, [affected, unaffected, dehu, outdoor]);

  const handleReadSensors = async () => {
    setIsReadingSensors(true);
    // Simulate connecting to Bluetooth/Wi-Fi Hygrometer (e.g., Phoenix/Kestrel)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock live sensor data for Affected (Wet) Area
    setAffected({ 
      temp: (72 + Math.random() * 5).toFixed(1), 
      rh: (55 + Math.random() * 10).toFixed(1) 
    });

    // Mock live sensor data for Unaffected (Dry) Area
    setUnaffected({
      temp: (70 + Math.random() * 2).toFixed(1),
      rh: (40 + Math.random() * 5).toFixed(1)
    });
    
    setIsReadingSensors(false);
  };

  const handleProtimeterConnect = async () => {
      setIsConnectingProtimeter(true);
      // Simulate Web Bluetooth connection to Protimeter MMS3
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock Data received from Device
      const mockMC = (Math.random() * (18 - 8) + 8).toFixed(1);
      setNewMoisture(prev => ({ ...prev, mc: mockMC }));
      
      setIsConnectingProtimeter(false);
  };

  const handleLogAtmospheric = async () => {
    const newDay = (psychoLogs[psychoLogs.length - 1]?.day || 0) + 1;
    const newLog: PsychoLog = { 
        day: newDay,
        affectedGPP: calculatedValues.affected.gpp || 0,
        unaffectedGPP: calculatedValues.unaffected.gpp || 0,
        dehuGPP: calculatedValues.dehu.gpp || 0,
        outdoorGPP: calculatedValues.outdoor.gpp || 0,
        readings: {
            affected: { temp: parseFloat(affected.temp), rh: parseFloat(affected.rh) },
            unaffected: { temp: parseFloat(unaffected.temp), rh: parseFloat(unaffected.rh) },
            dehu: { temp: parseFloat(dehu.temp), rh: parseFloat(dehu.rh) },
            outdoor: { temp: parseFloat(outdoor.temp), rh: parseFloat(outdoor.rh) }
        }
    };
    
    setPsychoLogs([...psychoLogs, newLog]);
    setShowAddReading(false);
    
    // Trigger AI analysis using OAuth Token
    if (isOnline) {
      setIsAnalyzing(true);
      try {
          const router = new IntelligenceRouter(accessToken);
          
          // Calculate Metrics
          const grainDepression = (newLog.affectedGPP || 0) - (newLog.dehuGPP || 0);
          const vpDifferential = (calculatedValues.affected.vaporPressure || 0) - (calculatedValues.dehu.vaporPressure || 0);
          
          // Router Choice: DEEP_REASONING (Gemini 3 Pro) - for complex logic
          const response = await router.execute('DEEP_REASONING', 
              `Analyze these psychrometric conditions for water mitigation per IICRC S500 standards:
              
              **Affected Area (Wet Zone):**
              - GPP: ${newLog.affectedGPP} grains/lb
              - Vapor Pressure: ${calculatedValues.affected.vaporPressure} PSI
              - Dew Point: ${calculatedValues.affected.dewPoint}°F

              **Dehumidifier Output:**
              - GPP: ${newLog.dehuGPP} grains/lb
              - Vapor Pressure: ${calculatedValues.dehu.vaporPressure} PSI

              **Calculated Metrics:**
              - Grain Depression: ${grainDepression.toFixed(1)} grains
              - Vapor Pressure Differential: ${vpDifferential.toFixed(3)} PSI

              **Task:**
              1. Evaluate the drying potential. Is the Vapor Pressure Differential sufficient for evaporation?
              2. Determine if the environment is conducive to drying or if it has stalled.
              3. Assign an "Efficiency Score" (Low, Medium, High, Optimal).
              4. Provide one specific, technical recommendation (e.g., "Increase air flow to break boundary layer", "Check dehu filter").

              Return JSON: { "summary": string, "efficiency": string, "recommendation": string }`,
              {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          summary: { type: Type.STRING },
                          efficiency: { type: Type.STRING },
                          recommendation: { type: Type.STRING }
                      },
                      required: ["summary", "efficiency", "recommendation"]
                  }
              }
          );
          
          const result = JSON.parse(response.text || '{}');
          setAiChartSummary(`${result.summary} Recommendation: ${result.recommendation}`);
          setAiEfficiencyScore(result.efficiency);

      } catch(err) { console.error(err); }
      finally { setIsAnalyzing(false); }
    } else {
        setAiChartSummary("Log saved locally. AI analysis requires internet connection.");
    }
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

    if (isOnline) {
      setIsAnalyzing(true);
      try {
          const router = new IntelligenceRouter(accessToken);
          const history = moistureLogs.map(l => l.mc).join(', ');
          
          // Router Choice: FAST_ANALYSIS (Gemini 3 Flash)
          const response = await router.execute('FAST_ANALYSIS', 
              `Analyze this material moisture content (%MC) history for ${newMoisture.material}: [${history}, ${newLog.mc}]. 
              The Dry Standard Goal is ${newMoisture.dryGoal}%. 
              Provide a 1-sentence summary of the trajectory. Mention if the material is "Drying", "Stalled", or "Dry".`
          );
          setAiMoistureSummary(response.text || "Analysis complete.");
      } catch(err) { console.error(err); }
      finally { setIsAnalyzing(false); }
    } else {
        setAiMoistureSummary("Reading saved. Connect to internet for trajectory analysis.");
    }
  };

  const handleExportCSV = () => {
    const headers = ['Day', 'Affected GPP', 'Unaffected GPP', 'Dehumidifier GPP', 'Outdoor GPP'];
    const rows = psychoLogs.map(log => [
        log.day,
        log.affectedGPP || '',
        log.unaffectedGPP || '',
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
        
        {/* Add Reading Modal/Inline */}
        {showAddReading && (
            <div className="mb-4 p-4 bg-black/20 rounded-xl space-y-3 animate-in slide-in-from-top-2 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">New Atmospheric Entry</h4>
                    <button onClick={handleReadSensors} disabled={isReadingSensors} className="text-[9px] text-brand-cyan flex items-center space-x-1 hover:text-white transition-colors disabled:opacity-50">
                        {isReadingSensors ? <Loader2 size={10} className="animate-spin"/> : <Wifi size={10} />}
                        <span>{isReadingSensors ? 'Scanning Sensors...' : 'Auto-Read Sensors'}</span>
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-white">
                    <div className="space-y-1 p-2 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold uppercase text-blue-400">Affected Area (Wet)</label>
                            <span className="text-[8px] font-mono text-slate-400">
                                {calculatedValues.affected.gpp} GPP • {calculatedValues.affected.dewPoint}°DP
                            </span>
                        </div>
                        <div className="flex space-x-1">
                            <input type="number" inputMode="decimal" className="w-full bg-slate-800 rounded p-1.5 text-xs" placeholder="Temp" value={affected.temp} onChange={e => setAffected(p => ({...p, temp: e.target.value}))} />
                            <input type="number" inputMode="decimal" className="w-full bg-slate-800 rounded p-1.5 text-xs" placeholder="RH%" value={affected.rh} onChange={e => setAffected(p => ({...p, rh: e.target.value}))} />
                        </div>
                    </div>
                    <div className="space-y-1 p-2 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold uppercase text-emerald-400">Unaffected (Control)</label>
                            <span className="text-[8px] font-mono text-slate-400">
                                {calculatedValues.unaffected.gpp} GPP • {calculatedValues.unaffected.dewPoint}°DP
                            </span>
                        </div>
                        <div className="flex space-x-1">
                            <input type="number" inputMode="decimal" className="w-full bg-slate-800 rounded p-1.5 text-xs" placeholder="Temp" value={unaffected.temp} onChange={e => setUnaffected(p => ({...p, temp: e.target.value}))} />
                            <input type="number" inputMode="decimal" className="w-full bg-slate-800 rounded p-1.5 text-xs" placeholder="RH%" value={unaffected.rh} onChange={e => setUnaffected(p => ({...p, rh: e.target.value}))} />
                        </div>
                    </div>
                    <div className="space-y-1 p-2 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold uppercase text-orange-400">Dehu Output</label>
                            <span className="text-[8px] font-mono text-slate-400">
                                {calculatedValues.dehu.gpp} GPP • {calculatedValues.dehu.vaporPressure} PSI
                            </span>
                        </div>
                         <div className="flex space-x-1">
                            <input type="number" inputMode="decimal" className="w-full bg-slate-800 rounded p-1.5 text-xs" placeholder="Temp" value={dehu.temp} onChange={e => setDehu(p => ({...p, temp: e.target.value}))} />
                            <input type="number" inputMode="decimal" className="w-full bg-slate-800 rounded p-1.5 text-xs" placeholder="RH%" value={dehu.rh} onChange={e => setDehu(p => ({...p, rh: e.target.value}))} />
                        </div>
                    </div>
                    <div className="space-y-1 p-2 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold uppercase text-gray-400">Outdoor</label>
                            <span className="text-[8px] font-mono text-slate-400">
                                {calculatedValues.outdoor.gpp} GPP
                            </span>
                        </div>
                         <div className="flex space-x-1">
                            <input type="number" inputMode="decimal" className="w-full bg-slate-800 rounded p-1.5 text-xs" placeholder="Temp" value={outdoor.temp} onChange={e => setOutdoor(p => ({...p, temp: e.target.value}))} />
                            <input type="number" inputMode="decimal" className="w-full bg-slate-800 rounded p-1.5 text-xs" placeholder="RH%" value={outdoor.rh} onChange={e => setOutdoor(p => ({...p, rh: e.target.value}))} />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <button onClick={() => setShowAddReading(false)} className="text-xs text-gray-400 font-bold px-3">Cancel</button>
                    <button onClick={handleLogAtmospheric} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors">Calculate & Save</button>
                </div>
            </div>
        )}

        <div className="h-56 w-full -ml-2 mb-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={psychoLogs}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} /><XAxis dataKey="day" tickFormatter={d => `Day ${d}`} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: theme.tickFill}} /><YAxis hide domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin - 10)), (dataMax: number) => Math.ceil(dataMax + 10)]} />
        <Tooltip content={<CustomTooltip isMobile={isMobile} />} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: theme.subtext}}/>
        <Area type="monotone" dataKey="affectedGPP" name="Affected Area" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="unaffectedGPP" name="Unaffected (Control)" stroke="#10b981" fill="transparent" strokeDasharray="3 3" strokeWidth={2} activeDot={{ r: 4 }} />
        <Area type="monotone" dataKey="dehuGPP" name="Dehumidifier" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} activeDot={{ r: 4 }} />
        <Area type="monotone" dataKey="outdoorGPP" name="Outdoor" stroke="#78716c" fill="#78716c" fillOpacity={0.05} strokeWidth={1} strokeDasharray="5 5" />
        </AreaChart></ResponsiveContainer></div>
        
        {/* AI Insight Card */}
        <div className={`p-4 rounded-xl border ${isMobile ? 'bg-blue-100/70 border-blue-200/80' : 'bg-blue-600/10 border-blue-600/20'}`}>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                    {isAnalyzing ? <Loader2 size={16} className="text-blue-500 animate-spin" /> : <BrainCircuit size={16} className={isMobile ? 'text-blue-700' : 'text-blue-500'} />}
                    <h4 className={`text-xs font-black uppercase tracking-widest ${isMobile ? 'text-blue-900' : 'text-white'}`}>Psychrometric Analyst</h4>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    aiEfficiencyScore === 'High' || aiEfficiencyScore === 'Optimal' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'
                }`}>
                    {aiEfficiencyScore} Efficiency
                </div>
            </div>
            <p className={`text-xs leading-relaxed ${isMobile ? 'text-blue-900' : 'text-blue-200'}`}>
                {isAnalyzing ? 'Calculating vapor pressure differential and evaporation potential...' : aiChartSummary}
            </p>
        </div>
      </section>

      <section className={`${theme.card} p-5 rounded-[2.5rem]`}>
        <div className="flex justify-between items-start mb-4">
            <div><h3 className={`font-black ${theme.text} tracking-tight`}>Moisture Trajectory</h3><p className={`text-xs ${theme.subtext} mt-0.5`}>Drywall MC%</p></div>
            <button onClick={() => setShowAddMoisture(true)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold ${isMobile ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-emerald-600/10 text-emerald-500 border border-emerald-600/20'}`}><Ruler size={14} /><span>Log Moisture</span></button>
        </div>

        {showAddMoisture && (
            <div className="mb-4 p-4 bg-black/20 rounded-xl space-y-3 animate-in slide-in-from-top-2 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-gray-400">Manual Entry</span>
                    <button 
                        onClick={handleProtimeterConnect} 
                        disabled={isConnectingProtimeter}
                        className="flex items-center space-x-1 text-[9px] font-bold uppercase text-brand-cyan bg-brand-cyan/10 px-2 py-1 rounded border border-brand-cyan/20 hover:bg-brand-cyan/20 transition-colors disabled:opacity-50"
                    >
                        {isConnectingProtimeter ? <Loader2 size={10} className="animate-spin" /> : <Bluetooth size={10} />}
                        <span>{isConnectingProtimeter ? 'Scanning BLE...' : 'Scan Protimeter'}</span>
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-white">
                    <input className="bg-slate-800 rounded p-2 text-xs" placeholder="Material (e.g. Drywall)" value={newMoisture.material} onChange={e => setNewMoisture(p => ({...p, material: e.target.value}))} />
                    <input className="bg-slate-800 rounded p-2 text-xs" placeholder="Location" value={newMoisture.location} onChange={e => setNewMoisture(p => ({...p, location: e.target.value}))} />
                    <input type="number" inputMode="decimal" className="bg-slate-800 rounded p-2 text-xs font-bold" placeholder="MC%" value={newMoisture.mc} onChange={e => setNewMoisture(p => ({...p, mc: e.target.value}))} />
                </div>
                <div className="flex justify-end space-x-2 mt-2">
                    <button onClick={() => setShowAddMoisture(false)} className="text-xs text-gray-400 font-bold px-3">Cancel</button>
                    <button onClick={handleLogMoisture} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Save Reading</button>
                </div>
            </div>
        )}

        <div className="h-56 w-full -ml-2 mb-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={moistureLogs}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} /><XAxis dataKey="day" tickFormatter={d => `Day ${d}`} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: theme.tickFill}} /><YAxis hide domain={[0, 'dataMax + 5']} /><Tooltip contentStyle={isMobile ? { borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#111827' } : { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc' }} />
        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: theme.subtext}}/>
        <ReferenceLine y={parseFloat(newMoisture.dryGoal)} label={{ value: 'Dry Goal', position: 'insideTopLeft', fontSize: 10, fill: '#dc2626', dy: -5 }} stroke="#dc2626" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="mc" name="Moisture Content" stroke="#059669" strokeWidth={4} dot={{ r: 6, fill: '#059669', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></div>
         <div className={`p-3 rounded-xl flex items-start space-x-3 text-xs font-medium ${isMobile ? 'bg-emerald-100/70 border-emerald-200/80 text-emerald-900' : 'bg-emerald-600/10 border-emerald-600/20 text-emerald-500'} border`}>
          {isAnalyzing ? <Loader2 size={20} className="text-emerald-500 animate-spin" /> : <Sparkles size={24} className={isMobile ? 'text-emerald-700' : 'text-emerald-600'} shrink-0 mt-0.5" />}
          <p className="leading-relaxed">{isAnalyzing ? 'Analyzing drying trajectory...' : aiMoistureSummary}</p>
        </div>
      </section>
    </div>
  );
};

export default DryingLogs;
