
import React, { useState, useEffect } from 'react';
import { ChevronRight, BrainCircuit, Navigation, FilePlus2, WifiOff } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { useAppContext } from '../context/AppContext';
import { getProjects } from '../data/mockApi';
import { AIProjectData } from '../types';
import SkeletonLoader from './SkeletonLoader';

const Dashboard: React.FC = () => {
  const { setSelectedProjectId, setActiveTab, isOnline } = useAppContext();
  const [aiBriefing, setAiBriefing] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [aiProjects, setAiProjects] = useState<AIProjectData[]>([]);
  const [nearbyResources, setNearbyResources] = useState<any[]>([]);
  const [isFindingResources, setIsFindingResources] = useState(false);

  useEffect(() => {
    const fetchProjectsAndAnalysis = async () => {
      setIsLoading(true);
      const initialProjects = await getProjects();
      
      if (isOnline) {
          try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            // Using gemini-3-flash-preview for fast AI responses
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
            const result = JSON.parse(response.text || '{}');
            setAiBriefing(result.overallBriefing || "Overview ready.");
            setAiProjects(initialProjects.map(p => ({ ...p, ...result.analyzedProjects?.find((ap: any) => ap.id === p.id) } as AIProjectData)).sort((a,b) => (b.priority || 0) - (a.priority || 0)));
          } catch (err) { 
              console.error(err); 
              // Fallback for AI failure but online
              setAiBriefing("System operational. AI analysis temporarily unavailable.");
              setAiProjects(initialProjects.map(p => ({...p, aiSummary: 'Analysis pending...', aiAlert: {isAlert: false, reason: ''}, priority: 1} as AIProjectData)));
          } finally { 
              setIsLoading(false); 
          }
      } else {
          // Offline Fallback
          setAiBriefing("Offline Mode Active. Displaying locally cached project data.");
          setAiProjects(initialProjects.map(p => ({...p, aiSummary: 'Local Data Only', aiAlert: {isAlert: false, reason: ''}, priority: 1} as AIProjectData)));
          setIsLoading(false);
      }
    };
    fetchProjectsAndAnalysis();
  }, [isOnline]);

  const findNearbySuppliers = async () => {
    if (!isOnline) return;
    setIsFindingResources(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Maps Grounding using gemini-2.5-flash
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Find 3 hardware stores and water damage equipment rental centers nearby.",
        config: { tools: [{ googleMaps: {} }] }
      });
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setNearbyResources(chunks.filter((c: any) => c.maps).map((c: any) => c.maps));
    } catch (err) { console.error(err); } finally { setIsFindingResources(false); }
  };
  
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('project');
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <section className="glass-card p-6 rounded-[2.5rem] relative overflow-hidden">
        <div className="flex items-center space-x-2 mb-3"><div className={`w-8 h-8 ${isOnline ? 'bg-brand-indigo' : 'bg-blue-600'} rounded-xl flex items-center justify-center text-white shadow-lg`}><BrainCircuit size={18} /></div><span className={`text-[10px] font-black ${isOnline ? 'text-brand-indigo' : 'text-blue-700'} uppercase tracking-widest`}>AI Technical Briefing</span></div>
        {isLoading ? <SkeletonLoader count={2} /> : <p className="text-blue-300 text-sm leading-relaxed font-bold">"{aiBriefing}"</p>}
      </section>

      <section className="glass-panel text-white p-6 rounded-[2.5rem] relative overflow-hidden">
        <div className="flex items-center space-x-2 mb-4"><Navigation size={14} className={isOnline ? 'text-emerald-400' : 'text-blue-700'} /><span className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-400' : 'text-blue-700'}`}>{isOnline ? 'Grounding Active' : 'Grounding Offline'}</span></div>
        <h3 className="text-xl font-black text-white mb-4">Nearby Support</h3>
        {nearbyResources.length > 0 ? (
          <div className="space-y-3">
            {nearbyResources.map((res, i) => (
              <a key={i} href={res.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-white/10 p-4 rounded-2xl hover:bg-white/20 transition-colors">
                <span className="text-xs font-bold">{res.title}</span>
                <ChevronRight size={14} />
              </a>
            ))}
          </div>
        ) : (
          <button onClick={findNearbySuppliers} className={`w-full py-4 rounded-2xl font-black text-xs uppercase transition-colors ${isOnline ? 'bg-white text-gray-900 hover:bg-slate-200' : 'bg-gray-700 text-blue-600 cursor-not-allowed'}`} disabled={isFindingResources || !isOnline}>
            {!isOnline ? 'Unavailable Offline' : isFindingResources ? 'Locating Field Assets...' : 'Find Suppliers & Labs'}
          </button>
        )}
      </section>

      <section className="pb-4">
        <div className="flex items-center justify-between mb-4 px-1"><h2 className="font-black text-white tracking-tight">AI Prioritized Portfolio</h2><button onClick={() => setActiveTab('new-project')} className="flex items-center space-x-2 bg-brand-cyan/10 text-brand-cyan px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-brand-cyan/20"><FilePlus2 size={12}/><span>New</span></button></div>
        {isLoading ? <SkeletonLoader height="150px" count={3} borderRadius="2rem"/> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiProjects.map((p) => (
              <div key={p.id} onClick={() => handleProjectSelect(p.id)} className="glass-card p-5 rounded-[2rem] transition-all cursor-pointer group hover:border-brand-cyan/50 hover:ring-4 hover:ring-brand-cyan/10 hover:scale-[1.02] hover:bg-white/5">
                <h3 className="font-black text-white group-hover:text-brand-cyan transition-colors">{p.client}</h3>
                <div className="text-[10px] text-blue-600 mt-1 uppercase font-bold tracking-widest">{p.address}</div>
                <div className="mt-4 bg-white/5 p-3 rounded-xl text-[10px] font-bold text-blue-400">{p.aiSummary}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
