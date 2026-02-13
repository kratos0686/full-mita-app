
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Thermometer, Droplets, BrainCircuit, X, Zap, Layers, CheckCircle2, ArrowUpRight, TrendingDown, TrendingUp, AlertCircle, Wind } from 'lucide-react';
import { calculatePsychrometricsFromDryBulb } from '../utils/psychrometrics';
import { useAppContext } from '../context/AppContext';
import { Project, DailyNarrative, TrackedMaterial } from '../types';
import { IntelligenceRouter } from '../services/IntelligenceRouter';
import { EventBus } from '../services/EventBus';

interface DryingLogsProps {
  onOpenAnalysis: () => void;
  isMobile?: boolean;
  project: Project;
  onUpdate?: (updates: Partial<Project>) => void;
}

const DryingLogs: React.FC<DryingLogsProps> = ({ project, onUpdate }) => {
  const { isOnline, currentUser } = useAppContext();
  const [showAddReading, setShowAddReading] = useState(false);
  const [trackedMaterials, setTrackedMaterials] = useState<TrackedMaterial[]>(project.dryingMonitor || []);
  
  // Real-time sensor states (defaults)
  const [affected, setAffected] = useState({ temp: '75', rh: '60' });
  const [dehu, setDehu] = useState({ temp: '95', rh: '35' });
  
  // Material Inputs
  const [materialName, setMaterialName] = useState('Drywall');
  const [materialReading, setMaterialReading] = useState('');
  const [materialGoal, setMaterialGoal] = useState('12');

  useEffect(() => {
      setTrackedMaterials(project.dryingMonitor || []);
  }, [project]);

  // Physics Engine
  const physics = useMemo(() => {
    const aff = calculatePsychrometricsFromDryBulb(parseFloat(affected.temp), parseFloat(affected.rh));
    const deh = calculatePsychrometricsFromDryBulb(parseFloat(dehu.temp), parseFloat(dehu.rh));
    const vpDiff = Math.max(0, aff.vaporPressure - deh.vaporPressure);
    // Drying Score (0-100) based on VP Diff. > 0.25 is excellent (100). < 0.05 is poor (0).
    const score = Math.min(100, Math.max(0, (vpDiff / 0.25) * 100));
    return { aff, deh, vpDiff: vpDiff.toFixed(3), score: Math.round(score) };
  }, [affected, dehu]);

  const handleSaveLog = () => {
      // 1. Build Narrative for UI display
      let narrative = `Atmospherics: Affected ${affected.temp}°F/${affected.rh}%, Dehu Output ${dehu.temp}°F/${dehu.rh}%. `;
      narrative += `Effective Drying Force (ΔVP): ${physics.vpDiff} PSI. `;
      
      const newMaterials = [...trackedMaterials];
      if (materialReading) {
          const readingVal = parseFloat(materialReading);
          // Check if material exists
          const existingIdx = newMaterials.findIndex(m => m.name === materialName);
          if (existingIdx >= 0) {
              newMaterials[existingIdx].readings.push({ timestamp: Date.now(), value: readingVal, dateStr: new Date().toLocaleDateString(undefined, {weekday:'short'}) });
              newMaterials[existingIdx].status = readingVal <= newMaterials[existingIdx].dryGoal ? 'Dry' : 'Wet';
              narrative += `Monitor: ${materialName} reading ${readingVal}%.`;
          } else {
              newMaterials.push({
                  id: `mat-${Date.now()}`,
                  name: materialName,
                  location: 'General',
                  type: materialName,
                  dryGoal: parseFloat(materialGoal),
                  initialReading: readingVal,
                  readings: [{ timestamp: Date.now(), value: readingVal, dateStr: 'Start' }],
                  status: readingVal <= parseFloat(materialGoal) ? 'Dry' : 'Wet'
              });
              narrative += `New Monitor: ${materialName} starting at ${readingVal}%.`;
          }
      }

      // 2. Publish CloudEvent (Eventarc)
      EventBus.publish(
          'com.restorationai.drying.recorded',
          {
              projectId: project.id,
              affected,
              dehu,
              physics,
              materials: newMaterials
          },
          project.id,
          narrative, // This narrative will be picked up by SmartDocumentation via the event listener
          'success'
      );
      
      // 3. Update Project State
      const updates: Partial<Project> = {
          dryingMonitor: newMaterials,
          // We also push to local narrative for immediate UI feedback before sync
          dailyNarratives: [{
              id: `log-${Date.now()}`,
              date: new Date().toLocaleDateString(),
              timestamp: Date.now(),
              content: narrative,
              author: currentUser?.name || 'Tech',
              tags: ['Psychrometrics'],
              generated: false
          }, ...(project.dailyNarratives || [])]
      };
      
      if (onUpdate) onUpdate(updates);
      setShowAddReading(false);
      setMaterialReading('');
  };

  return (
    <div className="space-y-4">
      {/* Drying Score Card */}
      <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 relative overflow-hidden">
          {/* Background Gradient based on Score */}
          <div className={`absolute inset-0 opacity-20 transition-colors duration-1000 ${physics.score > 70 ? 'bg-gradient-to-r from-emerald-500 to-transparent' : physics.score > 40 ? 'bg-gradient-to-r from-yellow-500 to-transparent' : 'bg-gradient-to-r from-red-500 to-transparent'}`} />
          
          <div className="relative z-10 flex justify-between items-center">
              <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Drying Efficiency Score</h3>
                  <div className="flex items-baseline space-x-1">
                      <span className="text-5xl font-black text-white">{physics.score}</span>
                      <span className="text-sm font-bold text-slate-500">/100</span>
                  </div>
              </div>
              <div className="text-right">
                  <div className="bg-black/40 backdrop-blur rounded-xl px-4 py-2 border border-white/5">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vapor Pressure</div>
                      <div className="text-xl font-bold text-brand-cyan">{physics.vpDiff} <span className="text-[10px] text-slate-500">PSI</span></div>
                  </div>
              </div>
          </div>

          <div className="relative z-10 mt-6 flex space-x-2">
              <div className="flex-1 bg-black/20 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center space-x-2 text-slate-400 mb-1"><Thermometer size={12} /><span className="text-[9px] font-bold uppercase">Affected</span></div>
                  <div className="font-mono text-sm text-white">{affected.temp}°F / {affected.rh}%</div>
              </div>
              <div className="flex-1 bg-black/20 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center space-x-2 text-brand-cyan mb-1"><Wind size={12} /><span className="text-[9px] font-bold uppercase">Dehu Exh.</span></div>
                  <div className="font-mono text-sm text-white">{dehu.temp}°F / {dehu.rh}%</div>
              </div>
          </div>
          
          {/* Action Recommendation */}
          {physics.score < 50 && (
              <div className="relative z-10 mt-4 flex items-center space-x-2 text-orange-400 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                  <AlertCircle size={16} />
                  <span className="text-xs font-bold">Low Evaporation. Add heat or more dehumidification.</span>
              </div>
          )}
      </div>

      {/* Materials List */}
      <div className="grid grid-cols-2 gap-3">
          {trackedMaterials.map(mat => {
              const current = mat.readings[mat.readings.length-1].value;
              const isDry = mat.status === 'Dry';
              return (
                  <div key={mat.id} className={`p-4 rounded-2xl border flex flex-col justify-between ${isDry ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-slate-900 border-white/10'}`}>
                      <div>
                          <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-white truncate">{mat.name}</span>
                              {isDry && <CheckCircle2 size={14} className="text-emerald-500" />}
                          </div>
                          <span className="text-[10px] text-slate-500">{mat.location}</span>
                      </div>
                      <div className="mt-3 flex justify-between items-end">
                          <div className="text-2xl font-black text-white">{current}<span className="text-[10px] font-medium text-slate-500">%</span></div>
                          <div className="text-[9px] font-mono text-slate-500">Goal: {mat.dryGoal}%</div>
                      </div>
                  </div>
              )
          })}
          
          <button onClick={() => setShowAddReading(true)} className="p-4 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-500 hover:text-brand-cyan hover:border-brand-cyan/50 transition-colors">
              <Plus size={24} />
              <span className="text-[10px] font-bold uppercase mt-2 tracking-widest">Log Reading</span>
          </button>
      </div>

      {/* Slide-Up Drawer */}
      {showAddReading && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end">
              <div className="bg-slate-950 w-full rounded-t-[2rem] border-t border-white/10 p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
                  <div className="flex justify-between items-center">
                      <h3 className="text-lg font-black text-white uppercase tracking-widest">Daily Log</h3>
                      <button onClick={() => setShowAddReading(false)} className="p-2 bg-white/10 rounded-full"><X size={20}/></button>
                  </div>

                  <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase">Atmospherics</h4>
                          <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                  <label className="text-[9px] text-slate-500 font-bold uppercase">Affected Temp/RH</label>
                                  <div className="flex space-x-2">
                                      <input type="number" value={affected.temp} onChange={e => setAffected({...affected, temp: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-center" placeholder="°F" />
                                      <input type="number" value={affected.rh} onChange={e => setAffected({...affected, rh: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-center" placeholder="%" />
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[9px] text-slate-500 font-bold uppercase">Dehu Output Temp/RH</label>
                                  <div className="flex space-x-2">
                                      <input type="number" value={dehu.temp} onChange={e => setDehu({...dehu, temp: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-center" placeholder="°F" />
                                      <input type="number" value={dehu.rh} onChange={e => setDehu({...dehu, rh: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-center" placeholder="%" />
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="p-4 bg-white/5 rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase">Material Monitor</h4>
                          <select value={materialName} onChange={e => setMaterialName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm font-bold">
                              <option value="Drywall">Drywall (Gypsum)</option>
                              <option value="Baseboard">Baseboard</option>
                              <option value="Hardwood">Hardwood Floor</option>
                              <option value="Concrete">Concrete Slab</option>
                              <option value="Carpet Pad">Carpet Pad</option>
                          </select>
                          <div className="flex space-x-3">
                              <div className="flex-1">
                                  <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Current Reading</label>
                                  <input type="number" value={materialReading} onChange={e => setMaterialReading(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm font-bold" placeholder="%" />
                              </div>
                              <div className="w-1/3">
                                  <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Dry Goal</label>
                                  <input type="number" value={materialGoal} onChange={e => setMaterialGoal(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm font-bold" placeholder="%" />
                              </div>
                          </div>
                      </div>
                  </div>

                  <button onClick={handleSaveLog} className="w-full py-4 bg-brand-cyan text-slate-900 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all">Save Entry</button>
                  <div className="h-4" />
              </div>
          </div>
      )}
    </div>
  );
};

export default DryingLogs;
