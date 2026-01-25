
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, DollarSign, FilePlus2, ChevronRight, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getProjects, Project } from '../data/mockApi';
import Dashboard from './Dashboard';
import Billing from './Billing';
import ProjectDetails from './ProjectDetails';

type DesktopView = 'dashboard' | 'billing';

const DesktopApp: React.FC = () => {
    const { selectedProjectId, setSelectedProjectId } = useAppContext();
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeView, setActiveView] = useState<DesktopView>('dashboard');

    useEffect(() => {
        const loadProjects = async () => {
            const projectData = await getProjects();
            setProjects(projectData);
            if (!selectedProjectId && projectData.length > 0) {
                setSelectedProjectId(projectData[0].id);
            }
        };
        loadProjects();
    }, []);

    const handleSelectProject = (id: string) => {
        setSelectedProjectId(id);
        if (activeView !== 'billing') {
            setActiveView('dashboard'); // Default to dashboard view when a project is clicked, unless already in billing
        }
    }
    
    const renderMainContent = () => {
        if (!selectedProjectId) {
             return <div className="p-8 text-center text-gray-500">Select a project to begin.</div>;
        }
        switch(activeView) {
            case 'dashboard':
                return <ProjectDetails />; // ProjectDetails is more suitable for the main view
            case 'billing':
                return <Billing />;
            default:
                return <ProjectDetails />;
        }
    }

    return (
        <div className="h-screen w-full bg-gray-50 text-gray-900 flex">
            {/* Main Navigation Sidebar */}
            <aside className="flex flex-col w-20 bg-white border-r border-gray-100 p-3 items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">R</div>
                <nav className="flex-1 flex flex-col items-center space-y-4 mt-10">
                    <DesktopNavButton label="Dashboard" icon={<LayoutDashboard />} active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
                    <DesktopNavButton label="Billing" icon={<DollarSign />} active={activeView === 'billing'} onClick={() => setActiveView('billing')} />
                </nav>
            </aside>

            {/* Project List */}
            <aside className="w-80 bg-white border-r border-gray-100 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold">Projects</h2>
                    <div className="relative mt-2">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search projects..." className="w-full bg-gray-50 rounded-lg pl-9 pr-3 py-2 text-sm" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {projects.map(p => (
                        <button key={p.id} onClick={() => handleSelectProject(p.id)} className={`w-full text-left p-4 border-l-4 ${selectedProjectId === p.id ? 'bg-blue-50 border-blue-600' : 'border-transparent hover:bg-gray-50'}`}>
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-sm">{p.client}</h3>
                                {selectedProjectId === p.id && <ChevronRight size={16} className="text-blue-600" />}
                            </div>
                            <p className="text-xs text-gray-500">{p.address}</p>
                        </button>
                    ))}
                </div>
            </aside>
            
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-gray-50/50">
                 {renderMainContent()}
            </main>
        </div>
    );
}

const DesktopNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center space-y-1 p-2 rounded-xl w-full ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}>
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
);

export default DesktopApp;
