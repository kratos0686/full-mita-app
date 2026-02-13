
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, DollarSign, FolderKanban, BarChart3, Settings, ChevronRight, Search, UserCircle, WifiOff, FileText, Droplets, Image, Wind, ListChecks, LogOut } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getProjects } from '../data/mockApi';
import { Project } from '../types';
import ProjectDetails from './ProjectDetails';
import Billing from './Billing';
import DesktopDashboard from './DesktopDashboard';
import Reporting from './Reporting';
import AdminPanel from './AdminPanel';
import PhotoDocumentation from './PhotoDocumentation';
import EquipmentManager from './EquipmentManager';
import TicSheet from './TicSheet';

const DesktopApp: React.FC = () => {
    const { activeTab, setActiveTab, selectedProjectId, setSelectedProjectId, isOnline, currentUser, hasPermission, setAuthentication } = useAppContext();
    const [projects, setProjects] = useState<Project[]>([]);
    
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
        if (activeTab === 'dashboard') return <DesktopDashboard projects={projects} onProjectSelect={handleSelectProject} />;
        if (activeTab === 'reporting') return hasPermission('view_admin') ? <Reporting /> : <AccessDenied />;
        if (activeTab === 'admin' || activeTab === 'settings') return hasPermission('view_admin') ? <AdminPanel /> : <AccessDenied />;
        if (activeTab === 'billing' && !selectedProjectId) return hasPermission('view_billing') ? <div className="p-8"><Billing /></div> : <AccessDenied />;

        if (activeTab === 'losses' || (selectedProjectId && ['loss-detail', 'project', 'equipment', 'tic-sheet', 'photos'].includes(activeTab))) {
            if (!selectedProjectId) return <DesktopDashboard projects={projects} onProjectSelect={handleSelectProject} />;
            if (!selectedProject) return <div className="p-8 text-center text-slate-500">Project not found.</div>;

            return (
                <div className="flex flex-col h-full bg-slate-950">
                    <header className="px-8 py-6 border-b border-white/5 flex-shrink-0 flex justify-between items-start bg-slate-900/50 backdrop-blur-sm">
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">{selectedProject.client}</h2>
                            <p className="text-sm font-medium text-blue-400 mt-1">{selectedProject.address}</p>
                        </div>
                        <div className="flex items-center space-x-1 p-1 bg-black/20 rounded-xl border border-white/5">
                            <ProjectTabButton icon={<FileText size={16} />} label="Details" active={activeTab === 'loss-detail'} onClick={()=>setActiveTab('loss-detail')} />
                            <ProjectTabButton icon={<Image size={16} />} label="Photos" active={activeTab === 'photos'} onClick={()=>setActiveTab('photos')} />
                            <ProjectTabButton icon={<Wind size={16} />} label="Equipment" active={activeTab === 'equipment'} onClick={()=>setActiveTab('equipment')} />
                            <ProjectTabButton icon={<ListChecks size={16} />} label="Scope" active={activeTab === 'tic-sheet'} onClick={()=>setActiveTab('tic-sheet')} />
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'loss-detail' && <ProjectDetails />}
                        {activeTab === 'photos' && <div className="p-8 h-full"><PhotoDocumentation project={selectedProject} onStartScan={()=>{}} /></div>}
                        {activeTab === 'equipment' && <div className="p-8 h-full"><EquipmentManager project={selectedProject} /></div>}
                        {activeTab === 'tic-sheet' && <TicSheet project={selectedProject} />}
                    </div>
                </div>
            );
        }

        return <DesktopDashboard projects={projects} onProjectSelect={handleSelectProject} />;
    }

    return (
        <div className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col overflow-hidden font-sans selection:bg-brand-cyan/30 selection:text-white">
            {!isOnline && (
                <div className="w-full bg-red-600 text-white text-[10px] font-black text-center py-1 z-[100] flex items-center justify-center uppercase tracking-widest shadow-lg">
                    <WifiOff size={12} className="mr-2" /> Offline Mode Active
                </div>
            )}
            <div className="flex-1 flex overflow-hidden">
                {/* Main Navigation Sidebar */}
                <aside className="flex flex-col w-20 bg-slate-950 border-r border-white/5 py-6 items-center z-20">
                    <div className="w-10 h-10 mb-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">R</div>
                    <nav className="flex-1 flex flex-col items-center space-y-6 w-full">
                        <DesktopNavButton label="Dashboard" icon={<LayoutDashboard size={22} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                        {hasPermission('view_projects') && <DesktopNavButton label="Projects" icon={<FolderKanban size={22} />} active={activeTab === 'losses' || (!!selectedProjectId && activeTab !== 'dashboard')} onClick={() => { setSelectedProjectId(null); setActiveTab('losses'); }} />}
                        {hasPermission('view_billing') && <DesktopNavButton label="Billing" icon={<DollarSign size={22} />} active={activeTab === 'billing'} onClick={() => { setSelectedProjectId(null); setActiveTab('billing'); }} />}
                        {hasPermission('view_admin') && <DesktopNavButton label="Reports" icon={<BarChart3 size={22} />} active={activeTab === 'reporting'} onClick={() => setActiveTab('reporting')} />}
                        {hasPermission('view_admin') && <DesktopNavButton label="Admin" icon={<Settings size={22} />} active={activeTab === 'admin' || activeTab === 'settings'} onClick={() => setActiveTab('admin')} />}
                    </nav>
                    <button onClick={() => setAuthentication(false)} className="p-3 text-slate-600 hover:text-red-400 transition-colors mt-auto" title="Sign Out">
                        <LogOut size={20} />
                    </button>
                </aside>

                {/* Secondary Sidebar (Project List) */}
                {(activeTab === 'losses' || !!selectedProjectId) && (
                    <aside className="w-80 bg-slate-900 border-r border-white/5 flex flex-col z-10 animate-in slide-in-from-left duration-300">
                        <div className="p-5 border-b border-white/5 flex-shrink-0">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Active Projects</h2>
                            <div className="relative group">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-cyan transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search..." 
                                    className="w-full bg-slate-950/50 rounded-xl pl-9 pr-3 py-2.5 text-sm border border-white/5 focus:ring-1 focus:ring-brand-cyan/50 focus:border-brand-cyan/50 focus:outline-none placeholder-slate-600 text-white transition-all" 
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {projects.map(p => (
                                <button 
                                    key={p.id} 
                                    onClick={() => handleSelectProject(p.id)} 
                                    className={`w-full text-left p-3 rounded-xl border transition-all group relative overflow-hidden ${selectedProjectId === p.id ? 'bg-brand-cyan/10 border-brand-cyan/30' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}`}
                                >
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`font-bold text-sm ${selectedProjectId === p.id ? 'text-brand-cyan' : 'text-slate-200 group-hover:text-white'}`}>{p.client}</h3>
                                            {selectedProjectId === p.id && <div className="w-1.5 h-1.5 bg-brand-cyan rounded-full shadow-[0_0_5px_rgba(6,182,212,0.8)]" />}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{p.address}</p>
                                        <div className="mt-2 flex items-center space-x-2">
                                            <span className="text-[9px] font-black uppercase bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 border border-white/5">{p.currentStage}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </aside>
                )}
                
                <main className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
                    {/* Background Ambience */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
                    
                    <div className="flex-1 overflow-hidden relative z-0">
                        {renderMainContent()}
                    </div>
                </main>
            </div>
        </div>
    );
}

const DesktopNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick} 
        title={label}
        className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 group relative ${active ? 'bg-brand-cyan text-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
    >
      {icon}
      <div className="absolute left-16 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 border border-white/10 shadow-xl translate-x-2 group-hover:translate-x-0">
          {label}
      </div>
    </button>
);

const ProjectTabButton: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick}) => (
    <button 
        onClick={onClick} 
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all text-xs font-bold ${active ? 'bg-brand-cyan text-slate-900 shadow-lg shadow-brand-cyan/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const AccessDenied = () => (
    <div className="h-full flex flex-col items-center justify-center text-slate-600">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4"><LogOut /></div>
        <p className="font-bold">Access Restricted</p>
    </div>
);

export default DesktopApp;
