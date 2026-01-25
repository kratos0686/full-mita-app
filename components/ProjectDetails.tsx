
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, MapPin, Calendar, ShieldCheck, AlertCircle, Clock,
  BrainCircuit, Printer, Loader2, Scan, Droplets, ClipboardList, Download, Cuboid, Eye
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';
import { getProjectById, Project, AITask, RoomScan } from '../data/mockApi';
import SkeletonLoader from './SkeletonLoader';
import WalkthroughViewer from './WalkthroughViewer';
import ComplianceChecklist from './ComplianceChecklist';

const StatusBadge = ({ status }: { status: string }) => {
  let colorClasses = 'bg-gray-100 text-gray-800';
  let dotClasses = 'bg-gray-400';
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('drying')) { colorClasses = 'bg-blue-100 text-blue-800'; dotClasses = 'bg-blue-500 animate-pulse'; }
  else if (lowerStatus.includes('assessment')) { colorClasses = 'bg-indigo-100 text-indigo-800'; dotClasses = 'bg-indigo-500 animate-pulse'; }
  else if (lowerStatus.includes('completed')) { colorClasses = 'bg-green-100 text-green-800'; dotClasses = 'bg-green-500'; }
  else if (lowerStatus.includes('paid')) { colorClasses = 'bg-emerald-100 text-emerald-800'; dotClasses = 'bg-emerald-500'; }
  return (<div className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${colorClasses}`}><div className={`w-2 h-2 rounded-full mr-2.5 ${dotClasses}`} /><span>{status}</span></div>);
};

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
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Project-Report-${project?.id}.pdf`);
    }
    setIsPrinting(false);
  };
  
  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <SkeletonLoader height="60px" borderRadius="1.5rem" />
        <SkeletonLoader count={3} height="120px" borderRadius="1.5rem" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-8 text-center">Project not found. Please select one from the dashboard.</div>;
  }
  
  if (viewingScan) {
    return <WalkthroughViewer scan={viewingScan} onClose={() => setViewingScan(null)} />;
  }

  return (
    <div id="pdf-content" className="p-4 md:p-8 space-y-6">
      <header className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-bold text-gray-400">{project.id}</p>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{project.client}</h2>
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center space-x-2"><MapPin size={14} className="text-gray-400" /><span className="font-medium text-gray-700">{project.address}</span></div>
          <div className="flex items-center space-x-2"><Calendar size={14} className="text-gray-400" /><span className="font-medium text-gray-700">{project.startDate}</span></div>
          <div className="flex items-center space-x-2"><ShieldCheck size={14} className="text-gray-400" /><span className="font-medium text-gray-700">{project.insurance}</span></div>
          <div className="flex items-center space-x-2"><Clock size={14} className="text-gray-400" /><span className="font-medium text-gray-700">{project.progress}% Complete</span></div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mt-6 overflow-hidden"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${project.progress}%` }} /></div>
      </header>
      
      <ComplianceChecklist project={project} />

      <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100"><Cuboid size={24} /></div>
          <div><h3 className="font-black text-gray-900 tracking-tight">3D Environment Scans</h3><p className="text-xs text-gray-500 mt-0.5">Interactive site walkthroughs.</p></div>
        </div>
        {project.roomScans.length > 0 ? (
          <div className="space-y-3">
            {project.roomScans.map(scan => (
              <div key={scan.scanId} className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 flex justify-between items-center">
                <div><h4 className="font-bold text-sm text-gray-800">{scan.roomName}</h4><p className="text-[10px] text-gray-500 font-medium">{scan.dimensions.sqft.toFixed(1)} sq ft</p></div>
                <button onClick={() => setViewingScan(scan)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-emerald-600 transition-colors"><Eye size={14} /><span>Launch Walkthrough</span></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-100"><p className="text-sm font-bold text-gray-600">No 3D Scans Available</p><p className="text-xs text-gray-400 mt-1">Perform a scan on the mobile app to create a walkthrough.</p></div>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h3 className="font-black text-gray-900 tracking-tight mb-4">Project Milestones</h3>
          <div className="space-y-4">
            {project.milestones.map((m, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${m.status === 'completed' ? 'bg-green-100 text-green-600' : m.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                  {m.status === 'completed' ? <CheckCircle2 size={14} /> : m.status === 'active' ? <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> : <div className="w-2 h-2 bg-gray-400 rounded-full" />}
                </div>
                <div><p className="font-bold text-sm text-gray-800">{m.title}</p><p className="text-xs text-gray-500">{m.date}</p></div>
              </div>
            ))}
          </div>
        </section>
        
        <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4"><h3 className="font-black text-gray-900 tracking-tight">AI Action Items</h3><button onClick={generateTasks} disabled={isGeneratingTasks} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2 border border-blue-100">{isGeneratingTasks ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}<span>{isGeneratingTasks ? 'Thinking' : 'Suggest'}</span></button></div>
          <div className="space-y-3">
            {tasks.map(t => (
              <div key={t.id} onClick={() => toggleTask(t.id)} className={`flex items-start space-x-3 p-3 rounded-xl cursor-pointer ${t.isCompleted ? 'bg-green-50 text-gray-500' : 'bg-gray-50'}`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 ${t.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300'}`}>{t.isCompleted && <CheckCircle2 size={12} />}</div>
                <p className={`text-sm font-medium flex-1 ${t.isCompleted ? 'line-through' : ''}`}>{t.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex space-x-4">
        <button onClick={() => setActiveTab('billing')} className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center space-x-2 border border-gray-200 hover:bg-gray-200 transition-colors"><span>Billing</span></button>
        <button onClick={generatePdf} disabled={isPrinting} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all">{isPrinting ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}<span>{isPrinting ? 'Generating PDF...' : 'Print Report'}</span></button>
      </div>
    </div>
  );
};

export default ProjectDetails;
