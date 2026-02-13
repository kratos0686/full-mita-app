
import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, Activity, Zap, ArrowRight, Plus, FileDown, Loader2, Thermometer, BrainCircuit, ScanLine, FileText, Image as ImageIcon, BookOpen, AlertCircle, TrendingUp, CheckSquare, Pencil, Share2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getProjectById, updateProjectStage, updateProject } from '../data/mockApi';
import { Project, ProjectStage, RoomScan } from '../types';
import { jsPDF } from "jspdf";
import { EventBus } from '../services/EventBus';

// Import sub-components
import PhotoDocumentation from './PhotoDocumentation';
import DryingLogs from './DryingLogs';
import ComplianceChecklist from './ComplianceChecklist';
import WalkthroughViewer from './WalkthroughViewer';
import SmartDocumentation from './SmartDocumentation';
import PredictiveAnalysis from './PredictiveAnalysis';
import Forms from './Forms';
import ReferenceGuide from './ReferenceGuide';
import TicSheet from './TicSheet';

interface ProjectDetailsProps {
    isMobile?: boolean;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ isMobile = false }) => {
    const { selectedProjectId, setActiveTab, currentUser, isOnline } = useAppContext();
    const [project, setProject] = useState<Project | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'overview' | 'scope' | 'drying' | 'photos' | 'forms' | 'predictive' | 'reference'>('overview');
    const [showWalkthrough, setShowWalkthrough] = useState<RoomScan | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            if (selectedProjectId) {
                const p = await getProjectById(selectedProjectId);
                setProject(p);
            }
        };
        fetchProject();
    }, [selectedProjectId]);

    const handleStageUpdate = async (newStage: ProjectStage) => {
        if (project) {
            const updated = await updateProjectStage(project.id, newStage);
            if (updated) setProject(updated);
        }
    };

    const handleGenerateReport = async () => {
        setIsGeneratingReport(true);
        // Simulate PDF Generation
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsGeneratingReport(false);
        EventBus.publish('com.restorationai.report.generated', { projectId: project?.id }, project?.id, 'Final Report PDF Generated', 'success');
        alert("Report generated! (Simulated)");
    };

    const handleUpdateProject = (updates: Partial<Project>) => {
        if (project) {
             const updated = { ...project, ...updates };
             setProject(updated);
             updateProject(project.id, updates);
        }
    }

    if (!project) return <div className="p-8 text-center text-slate-500 flex flex-col items-center"><Loader2 className="animate-spin mb-2"/> Loading Project...</div>;

    // --- MOBILE VIEW ---
    if (isMobile) {
        return (
            <div className="flex flex-col h-full bg-slate-950 text-slate-200">
                {/* Mobile Header */}
                <header className="p-4 bg-slate-900 border-b border-white/5 sticky top-0 z-20">
                    <div className="flex items-center space-x-3 mb-2">
                        <button onClick={() => setActiveTab('losses')}><ArrowLeft size={24} /></button>
                        <div>
                            <h2 className="font-black text-white text-lg leading-none">{project.client}</h2>
                            <p className="text-xs text-slate-400 mt-1">{project.currentStage}</p>
                        </div>
                    </div>
                    {/* Horizontal Scrollable Tabs */}
                    <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
                        {['Overview', 'Drying', 'Scope', 'Photos'].map((tab) => (
                            <button 
                                key={tab}
                                onClick={() => setActiveSubTab(tab.toLowerCase() as any)}
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeSubTab === tab.toLowerCase() ? 'bg-brand-cyan text-slate-900' : 'bg-white/5 text-slate-400'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Render Content Based on Mobile Tab */}
                    {activeSubTab === 'overview' && (
                        <>
                             {/* Narrative Feed (Smart Doc) */}
                             <div className="h-[400px]">
                                <SmartDocumentation project={project} onUpdate={handleUpdateProject} />
                             </div>
                             
                             {/* Quick Stats Cards */}
                             <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Risk Level</div>
                                    <div className={`text-xl font-black ${project.riskLevel === 'high' ? 'text-red-500' : 'text-green-500'}`}>{project.riskLevel.toUpperCase()}</div>
                                </div>
                                <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Equipment</div>
                                    <div className="text-xl font-black text-brand-cyan">{project.equipment?.length || 0} Units</div>
                                </div>
                             </div>

                             {/* Compliance */}
                             <ComplianceChecklist project={project} onUpdate={handleUpdateProject} />
                        </>
                    )}

                    {activeSubTab === 'drying' && <DryingLogs project={project} onOpenAnalysis={() => {}} onUpdate={handleUpdateProject} />}
                    
                    {activeSubTab === 'scope' && <TicSheet project={project} embedded={true} />}
                    
                    {activeSubTab === 'photos' && <PhotoDocumentation project={project} onStartScan={() => setActiveTab('scanner')} />}
                </div>
                
                {/* Floating Action Button for Mobile */}
                <div className="absolute bottom-6 right-6 z-30">
                     <button onClick={() => setActiveTab('scanner')} className="w-14 h-14 bg-brand-cyan rounded-full flex items-center justify-center text-slate-900 shadow-lg shadow-brand-cyan/30">
                        <ScanLine size={24} />
                     </button>
                </div>
            </div>
        );
    }

    // --- DESKTOP VIEW ---
    return (
        <div className="flex h-full bg-slate-950">
            {/* Left Context Sidebar (Desktop) */}
            <aside className="w-64 border-r border-white/5 bg-slate-950 flex flex-col p-4 space-y-2">
                <div className="mb-6 px-2">
                    <div className="flex items-center space-x-2 text-slate-500 mb-2 cursor-pointer hover:text-white transition-colors" onClick={() => setActiveTab('losses')}>
                        <ArrowLeft size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Back to List</span>
                    </div>
                    <h1 className="text-xl font-black text-white leading-tight">{project.client}</h1>
                    <p className="text-xs text-slate-400 mt-1">{project.address}</p>
                    <div className="mt-3 flex items-center space-x-2">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${project.riskLevel === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{project.riskLevel} Risk</span>
                         <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/20 text-blue-400">{project.waterCategory}</span>
                    </div>
                </div>

                <NavButton label="Overview" icon={<Activity size={18} />} active={activeSubTab === 'overview'} onClick={() => setActiveSubTab('overview')} />
                <NavButton label="Scope & Estimate" icon={<FileText size={18} />} active={activeSubTab === 'scope'} onClick={() => setActiveSubTab('scope')} />
                <NavButton label="Psychrometrics" icon={<Thermometer size={18} />} active={activeSubTab === 'drying'} onClick={() => setActiveSubTab('drying')} />
                <NavButton label="Documentation" icon={<ImageIcon size={18} />} active={activeSubTab === 'photos'} onClick={() => setActiveSubTab('photos')} />
                <NavButton label="Predictive Analysis" icon={<BrainCircuit size={18} />} active={activeSubTab === 'predictive'} onClick={() => setActiveSubTab('predictive')} />
                <NavButton label="Forms & Signatures" icon={<Pencil size={18} />} active={activeSubTab === 'forms'} onClick={() => setActiveSubTab('forms')} />
                <NavButton label="Reference Guide" icon={<BookOpen size={18} />} active={activeSubTab === 'reference'} onClick={() => setActiveSubTab('reference')} />

                <div className="mt-auto pt-4 border-t border-white/5">
                    <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors">
                        {isGeneratingReport ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                        <span>Generate Report</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-8 relative">
                 {activeSubTab === 'overview' && (
                     <div className="grid grid-cols-12 gap-6">
                         {/* Left Column: Smart Doc & Compliance */}
                         <div className="col-span-8 space-y-6">
                             <div className="h-[500px] border border-white/5 rounded-[2.5rem] overflow-hidden">
                                 <SmartDocumentation project={project} onUpdate={handleUpdateProject} />
                             </div>
                             <ComplianceChecklist project={project} onUpdate={handleUpdateProject} />
                         </div>

                         {/* Right Column: 3D Scans & Quick Actions */}
                         <div className="col-span-4 space-y-6">
                             <div className="glass-card p-6 rounded-[2rem]">
                                 <h3 className="font-bold text-white mb-4">Room Scans</h3>
                                 <div className="space-y-3">
                                     {project.roomScans.length > 0 ? project.roomScans.map(scan => (
                                         <div key={scan.scanId} onClick={() => setShowWalkthrough(scan)} className="group cursor-pointer bg-slate-900 border border-white/5 rounded-xl p-3 flex items-center justify-between hover:border-brand-cyan/50 transition-all">
                                             <div className="flex items-center space-x-3">
                                                 <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-brand-cyan transition-colors"><ScanLine size={20} /></div>
                                                 <div>
                                                     <h4 className="font-bold text-sm text-slate-200">{scan.roomName}</h4>
                                                     <p className="text-[10px] text-slate-500">{scan.dimensions.sqft.toFixed(0)} SQFT</p>
                                                 </div>
                                             </div>
                                             <ArrowRight size={16} className="text-slate-600 group-hover:text-white" />
                                         </div>
                                     )) : (
                                         <div className="text-center py-6 text-slate-500 text-xs">No 3D scans yet. Use mobile app to scan.</div>
                                     )}
                                 </div>
                             </div>

                             <div className="bg-gradient-to-br from-indigo-900/50 to-blue-900/50 p-6 rounded-[2rem] border border-indigo-500/20">
                                 <h3 className="font-bold text-white mb-2 flex items-center"><Zap size={18} className="mr-2 text-yellow-400"/> AI Actions</h3>
                                 <div className="space-y-2">
                                     <button onClick={() => setActiveSubTab('scope')} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-left px-3 text-indigo-200 transition-colors">Auto-Generate Scope</button>
                                     <button onClick={() => setActiveSubTab('predictive')} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-left px-3 text-indigo-200 transition-colors">Predict Dryout Date</button>
                                     <button onClick={() => handleGenerateReport()} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-left px-3 text-indigo-200 transition-colors">Compile Final Report</button>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}

                 {activeSubTab === 'drying' && <DryingLogs project={project} onOpenAnalysis={() => setActiveSubTab('predictive')} onUpdate={handleUpdateProject} />}
                 {activeSubTab === 'scope' && <TicSheet project={project} />}
                 {activeSubTab === 'photos' && <PhotoDocumentation project={project} onStartScan={() => {}} />}
                 {activeSubTab === 'predictive' && <PredictiveAnalysis onBack={() => setActiveSubTab('overview')} />}
                 {activeSubTab === 'forms' && <Forms onComplete={() => setActiveSubTab('overview')} />}
                 {activeSubTab === 'reference' && <ReferenceGuide onBack={() => setActiveSubTab('overview')} />}
            </main>

            {/* Modal for Walkthrough */}
            {showWalkthrough && (
                <WalkthroughViewer scan={showWalkthrough} onClose={() => setShowWalkthrough(null)} />
            )}
        </div>
    );
};

const NavButton: React.FC<{ label: string, icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ label, icon, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-brand-cyan text-slate-900 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
        {icon}
        <span className="text-sm font-medium">{label}</span>
    </button>
);

export default ProjectDetails;
