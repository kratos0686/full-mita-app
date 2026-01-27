
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, MapPin, Calendar, ShieldCheck, AlertCircle, Clock,
  BrainCircuit, Printer, Loader2, Scan, Droplets, ClipboardList, Download, Cuboid, Eye,
  User, Mail, Phone, UserSquare, FileText, ListChecks
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';
import { getProjectById } from '../data/mockApi';
import { Project, AITask, RoomScan } from '../types';
import SkeletonLoader from './SkeletonLoader';
import WalkthroughViewer from './WalkthroughViewer';
import ComplianceChecklist from './ComplianceChecklist';

const StatusBadge = ({ status }: { status: string }) => {
  let colorClasses = 'bg-slate-700 text-slate-300';
  let dotClasses = 'bg-slate-400';
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('drying')) { colorClasses = 'bg-blue-500/20 text-blue-300'; dotClasses = 'bg-blue-400 animate-pulse'; }
  else if (lowerStatus.includes('assessment')) { colorClasses = 'bg-indigo-500/20 text-indigo-300'; dotClasses = 'bg-indigo-400 animate-pulse'; }
  else if (lowerStatus.includes('completed')) { colorClasses = 'bg-green-500/20 text-green-300'; dotClasses = 'bg-green-400'; }
  else if (lowerStatus.includes('paid')) { colorClasses = 'bg-emerald-500/20 text-emerald-300'; dotClasses = 'bg-emerald-400'; }
  return (<div className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${colorClasses}`}><div className={`w-2 h-2 rounded-full mr-2.5 ${dotClasses}`} /><span>{status}</span></div>);
};

const ProjectSidebar: React.FC<{ project: Project }> = ({ project }) => (
    <div className="space-y-6">
        <div className="glass-card p-6 rounded-[2.5rem]">
            <h4 className="font-black text-white tracking-tight mb-4">Client Contact</h4>
            <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
                    <div className="w-10 h-10 bg-slate-900/50 rounded-full flex items-center justify-center text-slate-400"><User size={20} /></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Client</p><p className="text-sm font-bold text-white">{project.client}</p></div>
                </div>
                 <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
                    <div className="w-10 h-10 bg-slate-900/50 rounded-full flex items-center justify-center text-slate-400"><Mail size={20} /></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Email</p><p className="text-sm font-bold text-white">{project.clientEmail}</p></div>
                </div>
                 <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
                    <div className="w-10 h-10 bg-slate-900/50 rounded-full flex items-center justify-center text-slate-400"><Phone size={20} /></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Phone</p><p className="text-sm font-bold text-white">{project.clientPhone}</p></div>
                </div>
            </div>
            </div>

            <div className="glass-card p-6 rounded-[2.5rem]">
            <h4 className="font-black text-white tracking-tight mb-4">Insurance Details</h4>
            <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
                    <div className="w-10 h-10 bg-slate-900/50 rounded-full flex items-center justify-center text-slate-400"><ShieldCheck size={20} /></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Carrier</p><p className="text-sm font-bold text-white">{project.insurance}</p></div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
                    <div className="w-10 h-10 bg-slate-900/50 rounded-full flex items-center justify-center text-slate-400"><FileText size={20} /></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Policy #</p><p className="text-sm font-bold text-white">{project.policyNumber}</p></div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
                    <div className="w-10 h-10 bg-slate-900/50 rounded-full flex items-center justify-center text-slate-400"><UserSquare size={20} /></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Adjuster</p><p className="text-sm font-bold text-white">{project.adjuster}</p></div>
                </div>
            </div>
            </div>
    </div>
);


const ProjectDetails: React.FC = () => {
  const { selectedProjectId, setActiveTab } = useAppContext();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [viewingScan, setViewingScan] = useState<RoomScan | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (selectedProjectId) {
        setIsLoading(true);
        const proj = await getProjectById(selectedProjectId);
        setProject(proj);
        setTasks(proj?.tasks || []);
        setIsLoading(false);
      }
    };
    fetchProject();
  }, [selectedProjectId]);

  const generateTasks = async () => {
    if (!project) return;
    setIsGeneratingTasks(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Project status: ${project.status}. Milestones: ${JSON.stringify(project.milestones)}. Create a list of 3 actionable tasks for the technician.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["tasks"]
          }
        }
      });
      const result = JSON.parse(response.text);
      const newTasks: AITask[] = result.tasks.map((t: string, i: number) => ({ id: `ai-${Date.now()}-${i}`, text: t, isCompleted: false }));
      setTasks(prev => [...prev, ...newTasks]);
    } catch (err) { console.error(err); } 
    finally { setIsGeneratingTasks(false); }
  };
  
  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t));
  };
  
  const generatePdf = async () => {
    setIsPrinting(true);
    const input = document.getElementById('pdf-content');
    if (input) {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
      const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff' });
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Project-Report-${project?.id}.pdf`);
    }
    setIsPrinting(false);
  };

  const handleExportXactimate = () => {
    alert("Simulating export of project data to Xactimate (.esx file)...");
  };
  
  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonLoader height="60px" borderRadius="1.5rem" count={1} className="bg-slate-800" />
        <SkeletonLoader count={3} height="120px" borderRadius="1.5rem" className="bg-slate-800" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-8 text-center text-slate-400">Project not found. Please select one from the dashboard.</div>;
  }
  
  if (viewingScan) {
    return <WalkthroughViewer scan={viewingScan} onClose={() => setViewingScan(null)} />;
  }

  return (
    <div className="p-4 md:p-8">
        <div id="pdf-content" className="space-y-6 md:bg-slate-900 text-slate-200 p-1">
            <header className="glass-card md:p-6 p-4 rounded-[2rem] md:rounded-[2.5rem]">
                <div className="flex justify-between items-start">
                  <div>
                      <p className="text-sm font-bold text-slate-400">{project.id}</p>
                      <h2 className="text-2xl font-bold text-white tracking-tight">{project.client}</h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={handleExportXactimate} className="hidden md:flex items-center space-x-2 bg-brand-cyan/10 text-brand-cyan px-4 py-2 rounded-lg text-sm font-bold border border-brand-cyan/20">
                      <Download size={16} />
                      <span>Export to Xactimate</span>
                    </button>
                    <div className="hidden md:block"><StatusBadge status={project.status} /></div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="flex items-center space-x-2"><MapPin size={14} className="text-slate-400" /><span className="font-medium text-slate-300">{project.address}</span></div>
                <div className="flex items-center space-x-2"><Calendar size={14} className="text-slate-400" /><span className="font-medium text-slate-300">{project.startDate}</span></div>
                <div className="flex items-center space-x-2"><ShieldCheck size={14} className="text-slate-400" /><span className="font-medium text-slate-300">{project.insurance}</span></div>
                <div className="flex items-center space-x-2"><Clock size={14} className="text-slate-400" /><span className="font-medium text-slate-300">{project.progress}% Complete</span></div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mt-6 overflow-hidden"><div className="bg-brand-cyan h-2 rounded-full" style={{ width: `${project.progress}%` }} /></div>
            </header>
            
            <div className="grid md:grid-cols-5 gap-6">
                <div className="md:col-span-3 space-y-6">
                    <div className="md:hidden">
                        <button onClick={() => setActiveTab('tic-sheet')} className="w-full glass-card p-5 rounded-[2rem] flex items-center space-x-4">
                            <div className="p-3 bg-brand-indigo/20 text-brand-indigo rounded-2xl border border-brand-indigo/30"><ListChecks size={24} /></div>
                            <div>
                                <h3 className="font-black text-white tracking-tight">Scope & Tic Sheet</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Define work authorization and materials.</p>
                            </div>
                        </button>
                    </div>

                    <div className="md:hidden"><ComplianceChecklist project={project} /></div>
                    <div className="hidden md:block"><ComplianceChecklist project={project} /></div>

                    <section className="glass-card p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem]">
                        <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20"><Cuboid size={24} /></div>
                        <div><h3 className="font-black text-white tracking-tight">3D Environment Scans</h3><p className="text-xs text-slate-400 mt-0.5">Interactive site walkthroughs.</p></div>
                        </div>
                        {project.roomScans.length > 0 ? (
                        <div className="space-y-3">
                            {project.roomScans.map(scan => (
                            <div key={scan.scanId} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                                <div><h4 className="font-bold text-sm text-slate-200">{scan.roomName}</h4><p className="text-[10px] text-slate-400 font-medium">{scan.dimensions.sqft.toFixed(1)} sq ft</p></div>
                                <button onClick={() => setViewingScan(scan)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-emerald-600 transition-colors"><Eye size={14} /><span>Launch</span></button>
                            </div>
                            ))}
                        </div>
                        ) : (
                        <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10"><p className="text-sm font-bold text-slate-300">No 3D Scans Available</p><p className="text-xs text-slate-500 mt-1">Perform a scan to create a walkthrough.</p></div>
                        )}
                    </section>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="hidden md:block"><ProjectSidebar project={project} /></div>
                    <section className="glass-card p-6 rounded-[2.5rem]">
                        <h3 className="font-black text-white tracking-tight mb-4">Project Milestones</h3>
                        <div className="space-y-4">
                            {project.milestones.map((m, i) => (
                            <div key={i} className="flex items-start space-x-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${m.status === 'completed' ? 'bg-green-500/20 text-green-400' : m.status === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                                {m.status === 'completed' ? <CheckCircle2 size={14} /> : m.status === 'active' ? <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" /> : <div className="w-2 h-2 bg-slate-400 rounded-full" />}
                                </div>
                                <div><p className="font-bold text-sm text-slate-200">{m.title}</p><p className="text-xs text-slate-400">{m.date}</p></div>
                            </div>
                            ))}
                        </div>
                    </section>
                    
                    <section className="glass-card p-6 rounded-[2.5rem]">
                        <div className="flex justify-between items-start mb-4"><h3 className="font-black text-white tracking-tight">AI Action Items</h3><button onClick={generateTasks} disabled={isGeneratingTasks} className="bg-brand-indigo/20 text-brand-indigo px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2 border border-brand-indigo/30">{isGeneratingTasks ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}<span>{isGeneratingTasks ? 'Thinking' : 'Suggest'}</span></button></div>
                        <div className="space-y-3">
                            {tasks.map(t => (
                            <div key={t.id} onClick={() => toggleTask(t.id)} className={`flex items-start space-x-3 p-3 rounded-xl cursor-pointer ${t.isCompleted ? 'bg-green-500/10 text-slate-400' : 'bg-white/5'}`}>
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 ${t.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-slate-900 border-slate-600'}`}>{t.isCompleted && <CheckCircle2 size={12} />}</div>
                                <p className={`text-sm font-medium flex-1 ${t.isCompleted ? 'line-through' : 'text-slate-200'}`}>{t.text}</p>
                            </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>

      <div className="flex space-x-4 mt-6 md:hidden">
        <button onClick={() => setActiveTab('billing')} className="w-full py-4 bg-gray-200 text-gray-800 rounded-2xl font-bold flex items-center justify-center space-x-2 border border-gray-300"><span>Billing</span></button>
        <button onClick={generatePdf} disabled={isPrinting} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg">{isPrinting ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}<span>Report</span></button>
      </div>
      <div className="hidden md:flex space-x-4 mt-6">
        <button onClick={generatePdf} disabled={isPrinting} className="w-full py-4 bg-brand-cyan text-slate-900 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all">{isPrinting ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}<span>{isPrinting ? 'Generating PDF...' : 'Print Full Report'}</span></button>
      </div>
    </div>
  );
};

export default ProjectDetails;
