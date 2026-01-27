
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, DollarSign, FolderKanban, BarChart3, Settings, ChevronRight, Search, UserCircle, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getProjects } from '../data/mockApi';
import { Project, UserRole } from '../types';
import ProjectDetails from './ProjectDetails';
import Billing from './Billing';
import DesktopDashboard from './DesktopDashboard';
import Reporting from './Reporting';
import AdminPanel from './AdminPanel';
import DryingLogs from './DryingLogs';
import PhotoDocumentation from './PhotoDocumentation';
import EquipmentManager from './EquipmentManager';
import TicSheet from './TicSheet';

type MainView = 'dashboard' | 'projects' | 'reporting' | 'admin' | 'billing';
type ProjectTab = 'overview' | 'billing' | 'logs' | 'photos' | 'equipment' | 'tic-sheet';

const ROLES: UserRole[] = ['Admin', 'Manager', 'Technician', 'Billing'];

const NAV_CONFIG: Record<UserRole, MainView[]> = {
    'Admin': ['dashboard', 'projects', 'reporting', 'billing', 'admin'],
    'Manager': ['dashboard', 'projects', 'reporting', 'billing'],
    'Technician': ['projects'],
    'Billing': ['projects', 'billing'],
};

const DesktopApp: React.FC = () => {
    const { selectedProjectId, setSelectedProjectId } = useAppContext();
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Manager');
    const [mainView, setMainView] = useState<MainView>('dashboard');
    const [projectTab, setProjectTab] = useState<ProjectTab>('overview');
    const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
    
    useEffect(() => {
        const loadProjects = async () => {
            const projectData = await getProjects();
            setProjects(projectData);
            if (!selectedProjectId && projectData.length > 0) {
                setSelectedProjectId(projectData[0].id);
            }
        };
        loadProjects();
    }, [setSelectedProjectId]);
    
    useEffect(() => {
        // When role changes, switch to a view that role has access to
        if (!NAV_CONFIG[currentUserRole].includes(mainView)) {
            setMainView(NAV_CONFIG[currentUserRole][0] || 'projects');
        }
    }, [currentUserRole]);

    const handleSelectProject = (id: string) => {
        setSelectedProjectId(id);
        setMainView('projects');
        setProjectTab('overview');
    }

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    
    const renderMainContent = () => {
        switch(mainView) {
            case 'dashboard': return <DesktopDashboard projects={projects} onProjectSelect={handleSelectProject} />;
            case 'reporting': return <Reporting />;
            case 'admin': return <AdminPanel />;
            case 'billing': return <div className="p-4 md:p-8 bg-slate-900"><Billing /></div>;
            case 'projects':
                if (!selectedProject) return <div className="p-8 text-center text-slate-500">Select a project to begin.</div>;
                return (
                    <div className="flex flex-col h-full">
                        <header className="p-6 border-b border-white/10 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white">{selectedProject.client}</h2>
                            <p className="text-sm text-slate-400">{selectedProject.address}</p>
                            <div className="mt-4 flex items-center space-x-1 border border-white/10 rounded-lg p-1 bg-slate-950/30 w-min overflow-x-auto no-scrollbar">
                                <ProjectTabButton label="Overview" active={projectTab==='overview'} onClick={()=>setProjectTab('overview')} />
                                <ProjectTabButton label="Tic Sheet" active={projectTab==='tic-sheet'} onClick={()=>setProjectTab('tic-sheet')} />
                                <ProjectTabButton label="Billing" active={projectTab==='billing'} onClick={()=>setProjectTab('billing')} />
                                <ProjectTabButton label="Logs" active={projectTab==='logs'} onClick={()=>setProjectTab('logs')} />
                                <ProjectTabButton label="Photos" active={projectTab==='photos'} onClick={()=>setProjectTab('photos')} />
                                <ProjectTabButton label="Equipment" active={projectTab==='equipment'} onClick={()=>setProjectTab('equipment')} />
                            </div>
                        </header>
                        <div className="flex-1 overflow-y-auto bg-slate-900">
                           {projectTab === 'overview' && <ProjectDetails />}
                           {projectTab === 'tic-sheet' && <TicSheet project={selectedProject} />}
                           {projectTab === 'billing' && <div className="p-4 md:p-8 bg-slate-900"><Billing /></div>}
                           {projectTab === 'logs' && <div className="p-4 md:p-8 bg-slate-900"><DryingLogs onOpenAnalysis={()=>{}} /></div>}
                           {projectTab === 'photos' && <div className="p-4 md:p-8 bg-slate-900"><PhotoDocumentation onStartScan={()=>{}} /></div>}
                           {projectTab === 'equipment' && <div className="p-4 md:p-8 bg-slate-900"><EquipmentManager /></div>}
                        </div>
                    </div>
                );
            default: return <DesktopDashboard projects={projects} onProjectSelect={handleSelectProject} />;
        }
    }

    return (
        <div className="h-screen w-full bg-slate-950 text-slate-200 flex">
            {/* Main Navigation Sidebar */}
            <aside className="flex flex-col w-24 bg-slate-950/70 backdrop-blur-lg border-r border-white/10 p-4 items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">R</div>
                <nav className="flex-1 flex flex-col items-center space-y-2 mt-10 w-full">
                    {NAV_CONFIG[currentUserRole].includes('dashboard') && <DesktopNavButton label="Dashboard" icon={<LayoutDashboard />} active={mainView === 'dashboard'} onClick={() => setMainView('dashboard')} />}
                    {NAV_CONFIG[currentUserRole].includes('projects') && <DesktopNavButton label="Projects" icon={<FolderKanban />} active={mainView === 'projects'} onClick={() => setMainView('projects')} />}
                    {NAV_CONFIG[currentUserRole].includes('billing') && <DesktopNavButton label="Billing" icon={<DollarSign />} active={mainView === 'billing'} onClick={() => setMainView('billing')} />}
                    {NAV_CONFIG[currentUserRole].includes('reporting') && <DesktopNavButton label="Reporting" icon={<BarChart3 />} active={mainView === 'reporting'} onClick={() => setMainView('reporting')} />}
                    {NAV_CONFIG[currentUserRole].includes('admin') && <DesktopNavButton label="Admin" icon={<Settings />} active={mainView === 'admin'} onClick={() => setMainView('admin')} />}
                </nav>
            </aside>

            {/* Project List / Contextual Sidebar */}
            {mainView === 'projects' && (
                <aside className="w-96 bg-slate-900/50 backdrop-blur-md border-r border-white/10 flex flex-col">
                    <div className="p-4 border-b border-white/10 flex-shrink-0">
                        <h2 className="text-lg font-bold text-white">All Projects</h2>
                        <div className="relative mt-2">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search client or address..." className="w-full bg-slate-800/50 rounded-lg pl-9 pr-3 py-2 text-sm border border-white/10 focus:ring-1 focus:ring-brand-cyan focus:outline-none" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {projects.map(p => (
                            <button key={p.id} onClick={() => handleSelectProject(p.id)} className={`w-full text-left p-4 border-l-4 transition-colors ${selectedProjectId === p.id ? 'bg-brand-cyan/10 border-brand-cyan' : 'border-transparent hover:bg-white/5'}`}>
                                <div className="flex justify-between items-center">
                                    <h3 className={`font-bold text-sm ${selectedProjectId === p.id ? 'text-brand-cyan' : 'text-white'}`}>{p.client}</h3>
                                    {selectedProjectId === p.id && <ChevronRight size={16} className="text-brand-cyan" />}
                                </div>
                                <p className="text-xs text-slate-400">{p.address}</p>
                                <div className="mt-2 w-full bg-white/10 h-1 rounded-full"><div className="bg-brand-cyan h-1 rounded-full" style={{width: `${p.progress}%`}}></div></div>
                            </button>
                        ))}
                    </div>
                </aside>
            )}
            
            <main className="flex-1 flex flex-col bg-slate-900">
                 <header className="flex items-center justify-end p-4 bg-slate-950/30 border-b border-white/10 relative z-10">
                    <div className="relative">
                        <button onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)} className="flex items-center space-x-2 text-sm font-bold text-slate-300 bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10">
                            <UserCircle size={18} />
                            <span>{currentUserRole}</span>
                            <ChevronDown size={14} className={`transition-transform ${isRoleMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isRoleMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-2xl border border-white/10 p-1">
                                {ROLES.map(role => (
                                    <button key={role} onClick={() => { setCurrentUserRole(role); setIsRoleMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm font-bold hover:bg-brand-indigo rounded-md">
                                        {role}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                 </header>
                 <div className="flex-1 overflow-y-auto">{renderMainContent()}</div>
            </main>
        </div>
    );
}

const DesktopNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center space-y-1 py-3 rounded-xl w-full transition-colors ${active ? 'bg-brand-cyan/10 text-brand-cyan' : 'text-slate-400 hover:bg-white/10'}`}>
      {icon}
      <span className="text-[10px] font-bold tracking-wider">{label}</span>
    </button>
);

const ProjectTabButton: React.FC<{ label: string, active: boolean, onClick: () => void }> = ({ label, active, onClick}) => (
    <button onClick={onClick} className={`px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap ${active ? 'bg-brand-cyan text-slate-900 shadow-md' : 'text-slate-300 hover:bg-white/10'}`}>
        {label}
    </button>
);


export default DesktopApp;
