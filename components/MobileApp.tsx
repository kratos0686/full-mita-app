
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Scan, Droplets, Wind, ClipboardList, Sparkles,
  Terminal as TerminalIcon, WifiOff
} from 'lucide-react';
import Dashboard from './Dashboard';
import ARScanner from './ARScanner';
import DryingLogs from './DryingLogs';
import EquipmentManager from './EquipmentManager';
import PhotoDocumentation from './PhotoDocumentation';
import ProjectDetails from './ProjectDetails';
import PredictiveAnalysis from './PredictiveAnalysis';
import GeminiAssistant from './GeminiAssistant';
import CommandCenter from './CommandCenter';
import ReferenceGuide from './ReferenceGuide';
import Forms from './Forms';
import Billing from './Billing';
import { useAppContext } from '../context/AppContext';
import { Tab, RoomScan, Project } from '../types';
import NewProject from './NewProject';
import TicSheet from './TicSheet';
import { getProjectById } from '../data/mockApi';


const MobileApp: React.FC = () => {
    const { activeTab, setActiveTab, selectedProjectId, addScanToProject, isOnline } = useAppContext();
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [isCliOpen, setIsCliOpen] = useState(false);
    const [project, setProject] = useState<Project | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsCliOpen(prev => !prev);
        }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    useEffect(() => {
        const fetchProject = async () => {
            if (selectedProjectId) {
                const p = await getProjectById(selectedProjectId);
                setProject(p);
            }
        };
        fetchProject();
    }, [selectedProjectId]);


    const handleScanComplete = async (scanData?: RoomScan) => {
        if (selectedProjectId && scanData) {
            await addScanToProject(selectedProjectId, scanData);
        }
        setActiveTab('project');
    };

    const renderContent = () => {
        if (!project && ['logs', 'equipment', 'photos', 'tic-sheet'].includes(activeTab)) {
            return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
        }

        switch (activeTab) {
        case 'dashboard': return <Dashboard />;
        case 'scanner': return <ARScanner onComplete={handleScanComplete} />;
        case 'logs': return <DryingLogs onOpenAnalysis={() => setActiveTab('analysis')} isMobile={true} project={project!} />;
        case 'equipment': return <EquipmentManager isMobile={true} project={project!} />;
        case 'photos': return <PhotoDocumentation onStartScan={() => setActiveTab('scanner')} isMobile={true} project={project!} />;
        case 'project': return <ProjectDetails />;
        case 'analysis': return <PredictiveAnalysis onBack={() => setActiveTab('logs')} />;
        case 'reference': return <ReferenceGuide onBack={() => setActiveTab('dashboard')} />;
        case 'forms': return <Forms onComplete={() => setActiveTab('project')} />;
        case 'new-project': return <NewProject />;
        case 'billing': return <Billing />;
        case 'tic-sheet': return <TicSheet project={project!} isMobile={true} onBack={() => setActiveTab('project')} />;
        default: return <Dashboard />;
        }
    };

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-900 shadow-2xl overflow-hidden relative">
            <header className="flex items-center justify-between px-5 py-5 bg-slate-900/70 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">M</div>
                    <h1 className="font-black text-xl text-white tracking-tighter">Mitigation<span className="text-brand-cyan">AI</span></h1>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setIsCliOpen(true)} className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-blue-500"><TerminalIcon size={18} /></button>
                    <button onClick={() => setIsAiOpen(true)} disabled={!isOnline} className={`w-10 h-10 bg-gradient-to-tr rounded-xl flex items-center justify-center text-white shadow-xl transition-opacity ${!isOnline ? 'from-gray-700 to-gray-600 opacity-50 cursor-not-allowed' : 'from-blue-500 to-indigo-600'}`}><Sparkles size={18} /></button>
                </div>
            </header>
            
            {!isOnline && (
                <div className="bg-orange-500/90 backdrop-blur-sm text-white text-[10px] font-bold text-center py-1.5 flex items-center justify-center uppercase tracking-widest animate-in slide-in-from-top">
                    <WifiOff size={12} className="mr-2" /> Offline Mode • Changes saved locally
                </div>
            )}

            <main className={`flex-1 overflow-y-auto bg-gray-50 text-gray-900 ${activeTab === 'scanner' ? '' : 'pb-32'}`}>
                {renderContent()}
            </main>

            {isOnline && <GeminiAssistant context={activeTab} isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />}
            <CommandCenter isOpen={isCliOpen} onClose={() => setIsCliOpen(false)} />

            {(activeTab as string) !== 'scanner' && (
                <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/80 backdrop-blur-xl border-t border-white/10 flex justify-around items-center py-4 z-50 rounded-t-[3rem] shadow-[0_-12px_40px_rgba(0,0,0,0.2)]">
                    <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="Home" />
                    <MobileNavButton active={activeTab === 'logs' || activeTab === 'analysis'} onClick={() => setActiveTab('logs')} icon={<Droplets size={24} />} label="Metrics" />
                    <div className="relative -top-8">
                        <button onClick={() => setActiveTab('scanner')} className={`w-16 h-16 rounded-[2.2rem] flex items-center justify-center shadow-2xl transition-all ${activeTab === 'scanner' ? 'bg-blue-700 scale-110 shadow-blue-500/50' : 'bg-blue-600 shadow-blue-500/40'} text-white ring-8 ring-slate-800 active:scale-95`}><Scan size={28} /></button>
                    </div>
                    <MobileNavButton active={activeTab === 'equipment'} onClick={() => setActiveTab('equipment')} icon={<Wind size={24} />} label="Gear" />
                    <MobileNavButton active={activeTab === 'forms'} onClick={() => setActiveTab('forms')} icon={<ClipboardList size={24} />} label="Forms" />
                </nav>
            )}
        </div>
    );
};


const MobileNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center space-y-1.5 transition-all duration-300 ${active ? 'text-brand-cyan scale-105' : 'text-blue-600 hover:text-blue-400'}`}>
      <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-brand-cyan/10' : 'bg-transparent'}`}>{icon}</div>
      <span className={`text-[8px] font-black uppercase tracking-[0.15em] ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    </button>
);
  
export default MobileApp;
