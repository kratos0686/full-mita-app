
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  BrainCircuit,
  Printer,
  Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../context/AppContext';
import { getProjectById, Project } from '../data/mockApi';
import SkeletonLoader from './SkeletonLoader';

const ProjectDetails: React.FC = () => {
  const { selectedProjectId, setActiveTab } = useAppContext();
  const [project, setProject] = useState<Project | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [aiSummary, setAiSummary] = useState("");
  const [aiNextStep, setAiNextStep] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const formatDateTime = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    setCurrentDateTime(formatDateTime());
    const interval = setInterval(() => setCurrentDateTime(formatDateTime()), 60000);

    const loadProjectData = async () => {
      if (!selectedProjectId) {
        setIsLoading(false);
        return;
      };
      setIsLoading(true);
      const projectData = await getProjectById(selectedProjectId);
      setProject(projectData);

      if (projectData) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Project Milestones: ${JSON.stringify(projectData.milestones)}.
            Analyze this water mitigation project's progress.
            1. Provide a concise, 1-sentence 'summary' of the current project status based on the active milestone.
            2. Provide a clear, actionable 'nextStep' for the technician based on the active milestone.
          `;
          const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
          
          const text = response.text || "";
          const summaryMatch = text.match(/summary'?:? "([^"]+)"/i);
          const nextStepMatch = text.match(/nextStep'?:? "([^"]+)"/i);

          setAiSummary(summaryMatch ? summaryMatch[1] : "Project is currently in the active drying phase.");
          setAiNextStep(nextStepMatch ? nextStepMatch[1] : "Submit daily atmospheric logs for IICRC compliance.");

        } catch (error) {
          console.error("AI Insight fetch failed:", error);
          setAiSummary("Could not connect to AI. Project is in 'Drying Monitoring' phase.");
          setAiNextStep("Submit daily atmospheric logs to maintain IICRC compliance for this project.");
        }
      }
      setIsLoading(false);
    };

    loadProjectData();
    return () => clearInterval(interval);
  }, [selectedProjectId]);

  const handleGeneratePdf = async () => {
    if (!project) return;
    setIsGeneratingPdf(true);
    const pdfElement = document.getElementById('pdf-content');
    if (!pdfElement) {
        console.error("PDF content element not found!");
        setIsGeneratingPdf(false);
        return;
    }

    try {
        const canvas = await html2canvas(pdfElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps= pdf.getImageProperties(imgData);
        const ratio = imgProps.width / imgProps.height;
        let finalImgWidth = pdfWidth - 20;
        let finalImgHeight = finalImgWidth / ratio;
        if (finalImgHeight > pdfHeight - 20) {
            finalImgHeight = pdfHeight - 20;
            finalImgWidth = finalImgHeight * ratio;
        }
        const x = (pdfWidth - finalImgWidth) / 2;
        pdf.addImage(imgData, 'PNG', x, 10, finalImgWidth, finalImgHeight);
        pdf.save(`Project-Report-${project.id}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 space-y-6"><SkeletonLoader height="180px" borderRadius="1.5rem" /><SkeletonLoader height="250px" borderRadius="1.5rem" /><SkeletonLoader height="100px" borderRadius="1.5rem" /></div>;
  }
  
  if (!project) {
    return <div className="p-8 text-center"><p className="text-gray-600">No project selected. Please choose a project from the dashboard.</p><button onClick={() => setActiveTab('dashboard')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Go to Dashboard</button></div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4"><div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{project.id}</div></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{project.client}</h2>
        <div className="flex items-center text-gray-500 text-sm mb-2"><MapPin size={16} className="mr-1.5 text-blue-500" />{project.address}</div>
        <div className="flex items-center text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6"><Clock size={12} className="mr-1.5 text-blue-400" />{currentDateTime}</div>
        <div className="grid grid-cols-2 gap-4"><div className="flex items-center space-x-3"><div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Calendar size={18} /></div><div><div className="text-[10px] text-gray-400 font-bold uppercase">Start Date</div><div className="text-sm font-bold text-gray-700">{project.startDate}</div></div></div><div className="flex items-center space-x-3"><div className="p-2 bg-gray-50 rounded-lg text-gray-400"><ShieldCheck size={18} /></div><div><div className="text-[10px] text-gray-400 font-bold uppercase">Insurance</div><div className="text-sm font-bold text-gray-700">{project.insurance}</div></div></div></div>
      </div>

      <section className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-start space-x-4 mb-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><BrainCircuit size={24}/></div><div><h3 className="font-black text-gray-900 tracking-tight">AI Project Summary</h3>{isLoading ? <SkeletonLoader width="200px" /> : <p className="text-xs text-gray-600 mt-0.5 font-medium">{aiSummary}</p>}</div></div>
        <div className="relative pl-1"><div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" /><div className="space-y-6">{project.milestones.map((m, i) => (<div key={i} className="flex items-start relative pl-10"><div className={`absolute left-2.5 -translate-x-1/2 w-3.5 h-3.5 rounded-full z-10 border-2 border-white ${m.status === 'completed' ? 'bg-green-500' : m.status === 'active' ? 'bg-blue-500 ring-4 ring-blue-100' : 'bg-gray-200'}`} /><div className="flex-1"><div className={`text-sm font-bold ${m.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>{m.title}</div><div className="text-xs text-gray-500">{m.date}</div></div>{m.status === 'completed' && <CheckCircle2 size={16} className="text-green-500" />}</div>))}</div></div>
      </section>

      <section className="space-y-3"><h3 className="font-bold text-gray-800">Field Documents</h3><div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50"><DocumentRow title="Contract for Services" signed={true} /><DocumentRow title="Scope of Work" signed={true} /><DocumentRow title="Anti-Microbial Release" signed={false} /><DocumentRow title="Final Completion" signed={false} /></div></section>

      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-start space-x-3"><AlertCircle size={20} className="text-orange-500 shrink-0" /><div className="text-sm"><p className="font-bold text-orange-900">AI Task Pending</p>{isLoading ? <SkeletonLoader width="250px" /> : <p className="text-orange-700">{aiNextStep}</p>}</div></div>

      <div className="flex items-center space-x-3">
        <button onClick={() => setActiveTab('logs')} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all"><span>Continue to Monitoring</span><ChevronRight size={20} /></button>
        <button onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="w-16 h-[56px] bg-gray-100 text-gray-600 rounded-2xl font-bold flex items-center justify-center shadow-sm active:scale-[0.98] transition-all border border-gray-200 disabled:opacity-50" title="Generate PDF Report">{isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}</button>
      </div>
      
      <div className="absolute -left-[9999px] top-auto w-[800px] bg-white p-10 font-sans" id="pdf-content">
          <div className="border-b-2 border-gray-200 pb-6 mb-6"><h1 className="text-4xl font-black text-gray-900">Project Field Report</h1><p className="text-gray-500 mt-2">Generated on: {new Date().toLocaleDateString()}</p></div>
          <div className="grid grid-cols-2 gap-8 text-sm mb-8"><div><p className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-1">Project ID</p><p className="font-bold text-gray-800">{project.id}</p></div><div><p className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-1">Client</p><p className="font-bold text-gray-800">{project.client}</p></div><div><p className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-1">Property</p><p className="font-bold text-gray-800">{project.address}</p></div><div><p className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-1">Start Date</p><p className="font-bold text-gray-800">{project.startDate}</p></div></div>
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8"><h3 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-2">AI Summary</h3><p className="text-blue-800 text-sm leading-relaxed">{aiSummary}</p></div>
          <div><h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">Project Milestones</h3><div className="space-y-4 relative pl-1"><div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />{project.milestones.map((m, i) => (<div key={i} className="flex items-start relative pl-6"><div className={`absolute left-0 top-1 w-4 h-4 rounded-full z-10 border-4 border-white ${m.status === 'completed' ? 'bg-green-500' : m.status === 'active' ? 'bg-blue-500' : 'bg-gray-300'}`} /><div className="flex-1"><p className="font-bold text-gray-800 text-sm">{m.title}</p><p className="text-xs text-gray-500">{m.date}</p></div></div>))}</div></div>
          <div className="mt-12 text-center text-xs text-gray-400"><p>Restoration | Mitigation™ - CONFIDENTIAL</p></div>
      </div>
    </div>
  );
};

const DocumentRow = ({ title, signed }: { title: string, signed: boolean }) => (
  <div className="p-4 flex items-center justify-between active:bg-gray-50">
    <div className="flex items-center space-x-3"><div className="p-2 bg-gray-50 rounded-lg text-gray-500"><FileText size={18} /></div><span className="text-sm font-medium text-gray-700">{title}</span></div>
    <div className="flex items-center space-x-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${signed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{signed ? 'Signed' : 'Needed'}</span><ChevronRight size={16} className="text-gray-300" /></div>
  </div>
);

export default ProjectDetails;
