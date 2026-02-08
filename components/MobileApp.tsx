
import React, { useState, useEffect } from 'react';
import { 
  Home, DownloadCloud, Bell, Grid, Plus, Terminal as TerminalIcon, Sparkles
} from 'lucide-react';
import Dashboard from './Dashboard'; // Acts as Loss List
import NewProject from './NewProject'; // Acts as New Loss
import ProjectDetails from './ProjectDetails'; // Acts as Loss Report
import TicSheet from './TicSheet'; // Acts as Line Items
import Settings from './Settings';
import Downloads from './Downloads';
import ARScanner from './ARScanner';
import EquipmentManager from './EquipmentManager';
import { useAppContext } from '../context/AppContext';
import { RoomScan, Project } from '../types';
import { getProjectById } from '../data/mockApi';
import GeminiAssistant from './GeminiAssistant';
import CommandCenter from './CommandCenter';

const MobileApp: React.FC = () => {
    const { activeTab, setActiveTab, selectedProjectId, addScanToProject, isOnline, hasPermission } = useAppContext();
    const [project, setProject] = useState<Project | null>(null);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [isCliOpen, setIsCliOpen] = useState(false);

    // Sync selected project data
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
        setActiveTab('loss-detail'); // Go back to details
    };

    // --- Navigation Logic ---
    // The "Mitigate" app has a bottom bar and drill-down pages.
    // We map `activeTab` to these views.

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': 
            case 'losses': 
                return <Dashboard />; // Loss List
            case 'downloads':
                return <Downloads />;
            case 'new-loss':
            case 'new-project':
                return <NewProject />;
            case 'loss-detail':
            case 'project':
                return <ProjectDetails />;
            case 'line-items':
            case 'tic-sheet':
                return project ? <TicSheet project={project} isMobile={true} onBack={() => setActiveTab('loss-detail')} /> : <div className="p-4">Loading...</div>;
            case 'settings':
                return <Settings />;
            case 'scanner':
                return <ARScanner onComplete={handleScanComplete} />;
            case 'equipment':
                return project ? <EquipmentManager isMobile={true} project={project} /> : <div className="p-4">Select a loss first.</div>;
            default:
                return <Dashboard />;
        }
    };

    // Hide Bottom Nav on deep drill-down screens to match typical native app behavior
    // or keep it if it acts as a global switcher. Screenshot implies it might hide on details.
    // We will hide it on Scanner and New Loss for focus.
    const hideBottomNav = ['scanner', 'new-loss', 'new-project', 'settings'].includes(activeTab);

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-100 shadow-2xl overflow-hidden relative font-sans">
            {/* System Status Bar Simulation */}
            {!isOnline && (
                <div className="bg-red-600 text-white text-[10px] font-bold text-center py-1 z-[60]">
                    OFFLINE MODE
                </div>
            )}

            {/* Main Content Area */}
            <main className={`flex-1 overflow-y-auto ${!hideBottomNav ? 'pb-24' : ''}`}>
                {renderContent()}
            </main>

            {/* Floating Tools (AI/CLI) */}
            <div className="fixed bottom-24 right-4 flex flex-col space-y-2 z-40">
                {hasPermission('use_ai_tools') && activeTab !== 'scanner' && (
                    <button onClick={() => setIsAiOpen(true)} className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-600 border border-blue-100 active:scale-90 transition-transform">
                        <Sparkles size={24} />
                    </button>
                )}
                {activeTab !== 'scanner' && (
                    <button onClick={() => setIsCliOpen(true)} className="w-12 h-12 bg-slate-800 rounded-full shadow-lg flex items-center justify-center text-white active:scale-90 transition-transform">
                        <TerminalIcon size={20} />
                    </button>
                )}
            </div>

            {/* AI Modals */}
            {isOnline && <GeminiAssistant context={activeTab} isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />}
            <CommandCenter isOpen={isCliOpen} onClose={() => setIsCliOpen(false)} />

            {/* Bottom Navigation - Symbol Only */}
            {!hideBottomNav && (
                <>
                    {/* More Menu Popover */}
                    {showMoreMenu && (
                        <div className="absolute bottom-24 right-4 w-48 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 z-50 animate-in slide-in-from-bottom-2">
                            <button onClick={() => { setActiveTab('settings'); setShowMoreMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl flex items-center"><Grid size={18} className="mr-3"/> Settings</button>
                            <button onClick={() => { setActiveTab('equipment'); setShowMoreMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl flex items-center"><TerminalIcon size={18} className="mr-3"/> Equipment</button>
                        </div>
                    )}
                    {/* More Menu Backdrop */}
                    {showMoreMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />}

                    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-gray-200 flex justify-between items-end px-6 py-4 z-50 pb-safe shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)]">
                        <NavButton active={activeTab === 'dashboard' || activeTab === 'losses'} onClick={() => setActiveTab('losses')} icon={<Home size={28} strokeWidth={2} />} />
                        <NavButton active={activeTab === 'downloads'} onClick={() => setActiveTab('downloads')} icon={<DownloadCloud size={28} strokeWidth={2} />} />
                        
                        <div className="relative -top-6">
                            <button onClick={() => setActiveTab('new-loss')} className="w-16 h-16 bg-[#0078d4] rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/30 ring-4 ring-white active:scale-95 transition-transform">
                                <Plus size={32} strokeWidth={3} />
                            </button>
                        </div>

                        <NavButton active={false} onClick={() => {}} icon={<Bell size={28} strokeWidth={2} />} count={2} />
                        <NavButton active={showMoreMenu} onClick={() => setShowMoreMenu(!showMoreMenu)} icon={<Grid size={28} strokeWidth={2} />} />
                    </nav>
                </>
            )}
        </div>
    );
};

// Symbol-Only Nav Button
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; count?: number }> = ({ active, onClick, icon, count }) => (
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 active:scale-90 ${active ? 'text-[#0078d4] bg-blue-50' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
        <div className="relative">
            {icon}
            {count && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold border-2 border-white">{count}</div>}
        </div>
    </button>
);

export default MobileApp;
