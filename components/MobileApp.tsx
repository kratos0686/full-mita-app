
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Scan, Droplets, Wind, ClipboardList, Sparkles,
  Terminal as TerminalIcon
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
import { useAppContext, Tab } from '../context/AppContext';
import NewProject from './NewProject';
import { RoomScan } from '../data/mockApi';

const MobileApp: React.FC = () => {
    const { activeTab, setActiveTab, selectedProjectId, addScanToProject } = useAppContext();
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [isCliOpen, setIsCliOpen] = useState(false);

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

    const getTabLabel = (tab: Tab) => {
        switch(tab) {
        case 'dashboard': return 'Command Center';
        case 'scanner': return 'AR Environment Scan';
        case 'logs': return 'Psychrometric Logs';
        case 'equipment': return 'Equipment Tracking';
        case 'photos': return 'Site Documentation';
        case 'analysis': return 'AI Drying Forecast';
        case 'reference': return 'IICRC S500 Field Guide';
        case 'forms': return 'Authorization Forms';
        case 'project': return `Project ${selectedProjectId}`;
        case 'new-project': return 'New Project Intake';
        case 'billing': return 'Billing & Invoicing';
        default: return 'MitigationAI';
        }
    };

    const handleScanComplete = async (scanData: RoomScan) => {
        if (selectedProjectId) {
            await addScanToProject(selectedProjectId, scanData);
        }
        setActiveTab('project');
    };

    const renderContent = () => {
        switch (activeTab) {
        case 'dashboard': return <Dashboard />;
        case 'scanner': return <ARScanner onComplete={handleScanComplete} />;
        case 'logs': return <DryingLogs onOpenAnalysis={() => setActiveTab('analysis')} />;
        case 'equipment': return <EquipmentManager />;
        case 'photos': return <PhotoDocumentation onStartScan={() => setActiveTab('scanner')} />;
        case 'project': return <ProjectDetails />;
        case 'analysis': return <PredictiveAnalysis onBack={() => setActiveTab('logs')} />;
        case 'reference': return <ReferenceGuide onBack={() => setActiveTab('dashboard')} />;
        case 'forms': return <Forms onComplete={() => setActiveTab('project')} />;
        case 'new-project': return <NewProject />;
        case 'billing': return <Billing />;
        default: return <Dashboard />;
        }
    };

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 shadow-2xl overflow-hidden relative border-x border-gray-200">
            <header className="flex items-center justify-between px-5 py-5 bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">R</div>
                    <h1 className="font-black text-xl text-slate-900 tracking-tighter">Mitigation<span className="text-blue-600">AI</span></h1>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setIsCliOpen(true)} className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-600"><TerminalIcon size={18} /></button>
                    <button onClick={() => setIsAiOpen(true)} className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl"><Sparkles size={18} /></button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-32 bg-gray-50/50">
                {renderContent()}
            </main>

            <GeminiAssistant context={getTabLabel(activeTab)} isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
            <CommandCenter isOpen={isCliOpen} onClose={() => setIsCliOpen(false)} />

            <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-gray-100 flex justify-around items-center py-4 z-50 rounded-t-[3rem] shadow-[0_-12px_40px_rgba(0,0,0,0.08)]">
                <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="Home" />
                <MobileNavButton active={activeTab === 'logs' || activeTab === 'analysis'} onClick={() => setActiveTab('logs')} icon={<Droplets size={24} />} label="Metrics" />
                <div className="relative -top-8">
                    <button onClick={() => setActiveTab('scanner')} className={`w-16 h-16 rounded-[2.2rem] flex items-center justify-center shadow-2xl transition-all ${activeTab === 'scanner' ? 'bg-blue-700 scale-110 shadow-blue-500/50' : 'bg-blue-600 shadow-blue-500/40'} text-white ring-8 ring-white active:scale-95`}><Scan size={28} /></button>
                </div>
                <MobileNavButton active={activeTab === 'equipment'} onClick={() => setActiveTab('equipment')} icon={<Wind size={24} />} label="Gear" />
                <MobileNavButton active={activeTab === 'forms'} onClick={() => setActiveTab('forms')} icon={<ClipboardList size={24} />} label="Forms" />
            </nav>
        </div>
    );
};


const MobileNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center space-y-1.5 transition-all duration-300 ${active ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
      <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-blue-50' : 'bg-transparent'}`}>{icon}</div>
      <span className={`text-[8px] font-black uppercase tracking-[0.15em] ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    </button>
);
  
export default MobileApp;
