
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, DollarSign, FolderKanban, BarChart3, Settings, ChevronRight, Search, UserCircle, ChevronDown, WifiOff, FileText, Droplets, Image, Wind, ListChecks } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getProjects } from '../data/mockApi';
import { Project, UserRole, Tab } from '../types';
import ProjectDetails from './ProjectDetails';
import Billing from './Billing';
import DesktopDashboard from './DesktopDashboard';
import Reporting from './Reporting';
import AdminPanel from './AdminPanel';
import DryingLogs from './DryingLogs';
import PhotoDocumentation from './PhotoDocumentation';
import EquipmentManager from './EquipmentManager';
import TicSheet from './TicSheet';

const DesktopApp: React.FC = () => {
    const { activeTab, setActiveTab, selectedProjectId, setSelectedProjectId, isOnline, currentUser, hasPermission } = useAppContext();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
    
    // Derived state for sub-navigation within a project
    // Maps activeTab to a sub-view when in project context
    const getProjectSubTab = (): 'details' | 'billing' | 'logs' | 'photos' | 'equipment' | 'tic-sheet' => {
        if (activeTab === 'equipment') return 'equipment';
        if (activeTab === 'tic-sheet' || activeTab === 'line-items') return 'tic-sheet';
        if (activeTab === 'photos') return 'photos';
        // 'logs' isn't a direct tab in types, but could be mapped if we added it. For now desktop defaults DryingLogs inside details or we can add logic.
        // Actually DryingLogs is rendered below if activeTab matches, let's map it.
        // If we want a specific 'Logs' tab on desktop, we should add 'logs' to Tab type. 
        // For now, let's use 'loss-detail' as base and switching tabs changes activeTab.
        return 'details';
    };

    useEffect(() => {
        const loadProjects = async () => {
            if (currentUser?.companyId) {
                const projectData = await getProjects(currentUser.companyId);
                setProjects(projectData);
            }
        };
        loadProjects();
    }, [currentUser]);
    
    const handleSelectProject = (id: string) => {
        setSelectedProjectId(id);
        setActiveTab('loss-detail');
    }

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    
    const renderMainContent = () => {
        // High Level Views
        if (activeTab === 'dashboard') return <DesktopDashboard projects={projects} onProjectSelect={handleSelectProject} />;
        if (activeTab === 'reporting') return hasPermission('view_admin') ? <Reporting /> : <div>Access Denied</div>;
        if (activeTab === 'admin' || activeTab === 'settings') return hasPermission('view_admin') ? <AdminPanel /> : <div>Access Denied</div>;
        // Billing as a main tab (Global Billing)
        if (activeTab === 'billing' && !selectedProjectId) return hasPermission('view_billing') ? <div className="p-4 md:p-8 bg-slate-900"><Billing /></div> : <div>Access Denied</div>;

        // Project Context Views
        if (activeTab === 'losses' || (selectedProjectId && ['loss-detail', 'project', 'equipment', 'tic-sheet', 'photos'].includes(activeTab))) {
            if (!selectedProjectId) {
                // List view handled by sidebar mostly, but we can show a placeholder or grid here
                return <DesktopDashboard projects={projects} onProjectSelect={handleSelectProject} />;
            }
            if (!selectedProject) return <div className="p-8 text-center text-blue-500">Project not found.</div>;

            const subTab = getProjectSubTab(); // This helps for UI highlighting, but render logic is below

            return (
                <div className="flex flex-col h-full">
                    <header className="p-6 border-b border-white/10 flex-shrink-0 flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedProject.client}</h2>
                            <p className="text-sm text-blue-400">{selectedProject.address}</p>
                        </div>
                        <div className="flex items-center space-x-2 border border-white/10 rounded-xl p-1 bg-slate-950/30">
                            <ProjectTabButton icon={<FileText size={18} />} label="Details" active={activeTab === 'loss-detail'} onClick={()=>setActiveTab('loss-detail')} />
                            {hasPermission('view_billing') && <ProjectTabButton icon={<DollarSign size={18} />} label="Billing" active={false} onClick={()=>{/* Billing is component inside details or separate? For now keep simple */}} />}
                            <ProjectTabButton icon={<Image size={18} />} label="Photos" active={activeTab === 'photos'} onClick={()=>setActiveTab('photos')} />
                            <ProjectTabButton icon={<Wind size={18} />} label="Equipment" active={activeTab === 'equipment'} onClick={()=>setActiveTab('equipment')} />
                            <ProjectTabButton icon={<ListChecks size={18} />} label="Scope" active={activeTab === 'tic-sheet'} onClick={()=>setActiveTab('tic-sheet')} />
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto bg-slate-900">
                        {activeTab === 'loss-detail' && <ProjectDetails />}
                        {/* Note: Billing is currently a sub-component of ProjectDetails in the original flow, but we can expose it if we add 'billing' to project tabs */}
                        {activeTab === 'photos' && <div className="p-4 md:p-8 bg-slate-900"><PhotoDocumentation project={selectedProject} onStartScan={()=>{}} /></div>}
                        {activeTab === 'equipment' && <div className="p-4 md:p-8 bg-slate-900"><EquipmentManager project={selectedProject} /></div>}
                        {activeTab === 'tic-sheet' && <TicSheet project={selectedProject} />}
                    </div>
                </div>
            );
        }

        return <DesktopDashboard projects={projects} onProjectSelect={handleSelectProject} />;
    }

    return (
        <div className="h-screen w-full bg-slate-950 text-blue-200 flex flex-col">
            {!isOnline && (
                <div className="w-full bg-red-600/90 text-white text-xs font-bold text-center py-2 z-50 flex items-center justify-center uppercase tracking-widest shadow-lg backdrop-blur-sm">
                    <WifiOff size={14} className="mr-2" /> 
                    System Offline • Data Sync Paused • Changes Saved Locally
                </div>
            )}
            <div className="flex-1 flex overflow-hidden">
                {/* Main Navigation Sidebar */}
                <aside className="flex flex-col w-20 bg-slate-950/70 backdrop-blur-lg border-r border-white/10 p-2 items-center">
                    <div className="w-10 h-10 mb-8 mt-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">R</div>
                    <nav className="flex-1 flex flex-col items-center space-y-4 w-full">
                        <DesktopNavButton label="Dashboard" icon={<LayoutDashboard size={24} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                        {hasPermission('view_projects') && <DesktopNavButton label="Projects" icon={<FolderKanban size={24} />} active={activeTab === 'losses' || (!!selectedProjectId && activeTab !== 'dashboard')} onClick={() => { setSelectedProjectId(null); setActiveTab('losses'); }} />}
                        {hasPermission('view_billing') && <DesktopNavButton label="Billing" icon={<DollarSign size={24} />} active={activeTab === 'billing'} onClick={() => { setSelectedProjectId(null); setActiveTab('billing'); }} />}
                        {hasPermission('view_admin') && <DesktopNavButton label="Reporting" icon={<BarChart3 size={24} />} active={activeTab === 'reporting'} onClick={() => setActiveTab('reporting')} />}
                        {hasPermission('view_admin') && <DesktopNavButton label="Admin" icon={<Settings size={24} />} active={activeTab === 'admin' || activeTab === 'settings'} onClick={() => setActiveTab('admin')} />}
                    </nav>
                </aside>

                {/* Project List / Contextual Sidebar */}
                {(activeTab === 'losses' || !!selectedProjectId) && (
                    <aside className="w-80 bg-slate-900/50 backdrop-blur-md border-r border-white/10 flex flex-col">
                        <div className="p-4 border-b border-white/10 flex-shrink-0">
                            <h2 className="text-lg font-bold text-white mb-3">All Projects</h2>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                                <input type="text" placeholder="Search..." className="w-full bg-slate-800/50 rounded-lg pl-9 pr-3 py-2 text-sm border border-white/10 focus:ring-1 focus:ring-brand-cyan focus:outline-none placeholder-blue-500/50 text-blue-100" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {projects.map(p => (
                                <button key={p.id} onClick={() => handleSelectProject(p.id)} className={`w-full text-left p-4 border-l-2 transition-all group ${selectedProjectId === p.id ? 'bg-white/5 border-brand-cyan' : 'border-transparent hover:bg-white/5'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className={`font-bold text-sm ${selectedProjectId === p.id ? 'text-brand-cyan' : 'text-white group-hover:text-blue-200'}`}>{p.client}</h3>
                                        {selectedProjectId === p.id && <ChevronRight size={14} className="text-brand-cyan" />}
                                    </div>
                                    <p className="text-xs text-blue-400 truncate">{p.address}</p>
                                </button>
                            ))}
                        </div>
                    </aside>
                )}
                
                <main className="flex-1 flex flex-col bg-slate-900">
                    <header className="flex items-center justify-end p-4 bg-slate-950/30 border-b border-white/10 relative z-10">
                        <div className="relative">
                            <button onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)} className="flex items-center space-x-2 text-sm font-bold text-blue-300 bg-white/5 pl-3 pr-4 py-2 rounded-full hover:bg-white/10 transition-colors">
                                <UserCircle size={20} />
                                <span>{currentUser?.name}</span>
                            </button>
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto">{renderMainContent()}</div>
                </main>
            </div>
        </div>
    );
}

const DesktopNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick} 
        title={label}
        className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 group relative ${active ? 'bg-brand-cyan text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-blue-400 hover:bg-white/10 hover:text-white'}`}
    >
      {icon}
      <div className="absolute left-14 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-white/10">
          {label}
      </div>
    </button>
);

const ProjectTabButton: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick}) => (
    <button 
        onClick={onClick} 
        title={label}
        className={`p-3 rounded-lg transition-all ${active ? 'bg-brand-cyan text-slate-900 shadow-md' : 'text-blue-400 hover:bg-white/5 hover:text-white'}`}
    >
        {icon}
    </button>
);

export default DesktopApp;
