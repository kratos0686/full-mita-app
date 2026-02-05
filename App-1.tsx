
import React, { useState, useEffect } from 'react';
// Fix: Use types-1.ts which contains ViewState and correct Project definition
import { Project, ViewState, Reading, WaterCategory, LossClass } from './types-1';
import { ProjectDetail } from './components/ProjectDetail';
// Fix: ARScanner and CommandCenter are default exports
import ARScanner from './components/ARScanner';
import CommandCenter from './components/CommandCenter';
import { JobIntake } from './components/JobIntake';
import { consultExpert } from './services/aiService';
import { LayoutDashboard, Plus, AlertCircle, Search } from 'lucide-react';

// Mock Data
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    address: '1240 Ocean Drive',
    customerName: 'Sarah Connor',
    startDate: '2023-10-24',
    status: 'active',
    riskLevel: 'high',
    waterCategory: WaterCategory.CAT_3,
    lossClass: LossClass.CLASS_3,
    summary: 'Class 3 Water Loss. Overhead pipe burst affecting kitchen and living room.',
    rooms: [
      {
        id: 'r1',
        name: 'Kitchen',
        dimensions: { length: 14, width: 12, height: 9 },
        status: 'wet',
        photos: [{ id: 'p1', url: 'https://picsum.photos/800/600', timestamp: Date.now(), tags: ['drywall', 'cabinetry'], notes: 'Standing water' }],
        readings: [
          { timestamp: Date.now() - 86400000, temp: 72, rh: 85, gpp: 98, mc: 45 },
          { timestamp: Date.now() - 43200000, temp: 75, rh: 60, gpp: 78, mc: 35 },
          { timestamp: Date.now(), temp: 78, rh: 45, gpp: 62, mc: 28 },
        ]
      }
    ]
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [consultation, setConsultation] = useState<string | null>(null);

  const handleCommand = async (cmd: string) => {
    // Simple command parser
    const lower = cmd.toLowerCase();
    
    if (lower.includes('create project') || lower.includes('new job')) {
      setView('job-intake');
    } else if (lower.includes('scan') || lower.includes('photo')) {
      setView('ar-scan');
    } else if (lower.includes('dashboard') || lower.includes('home')) {
      setView('dashboard');
    } else {
      // Default to Expert Consult
      const answer = await consultExpert(cmd);
      setConsultation(answer);
    }
  };

  const handleCapture = (img: string) => {
    // In a real app, we'd attach this to the active room/project
    console.log("Captured image", img.length);
    setView(selectedProjectId ? 'project' : 'dashboard');
  };

  const handleProjectCreated = (project: Project) => {
    setProjects([project, ...projects]);
    setSelectedProjectId(project.id);
    setView('project');
  };

  const renderContent = () => {
    if (view === 'job-intake') {
      return <JobIntake onComplete={handleProjectCreated} onCancel={() => setView('dashboard')} />;
    }

    if (view === 'ar-scan') {
      return <ARScanner onComplete={() => setView(selectedProjectId ? 'project' : 'dashboard')} />;
    }

    if (view === 'project' && selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        return (
          <ProjectDetail 
            project={project} 
            onBack={() => setView('dashboard')}
            onAddPhoto={() => setView('ar-scan')}
          />
        );
      }
    }

    return (
      <div className="h-full flex flex-col p-6 overflow-y-auto pb-24">
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-brand-indigo rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <h1 className="text-xl font-bold tracking-tight text-white">Mitigation<span className="text-brand-cyan">AI</span></h1>
          </div>
          <p className="text-slate-400 text-sm">System Status: <span className="text-green-400">Operational</span> • Gemini 2.5 Flash Active</p>
        </header>

        {/* Consultation Result Overlay */}
        {consultation && (
          <div className="mb-6 glass-panel p-4 rounded-xl border-l-4 border-brand-indigo animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-brand-indigo font-semibold text-sm">Expert Consult</h3>
              <button onClick={() => setConsultation(null)} className="text-slate-500 hover:text-white"><AlertCircle size={16} /></button>
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{consultation}</p>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Projects</h2>
            <button 
              onClick={() => setView('job-intake')}
              className="p-2 bg-brand-indigo/20 text-brand-indigo rounded-lg hover:bg-brand-indigo/30 transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <Plus size={14} /> NEW JOB
            </button>
          </div>
          
          {projects.map(p => (
            <div 
              key={p.id}
              onClick={() => { setSelectedProjectId(p.id); setView('project'); }}
              className="glass-card p-5 rounded-xl hover:bg-white/5 transition-all cursor-pointer group border-l-4 border-l-transparent hover:border-l-brand-cyan"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg text-white group-hover:text-brand-cyan transition-colors">{p.address}</h3>
                <span className="text-xs font-mono text-slate-500">{p.startDate.split('T')[0]}</span>
              </div>
              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{p.summary}</p>
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">
                  <LayoutDashboard size={12} /> {p.rooms.length} Rooms
                </div>
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                  p.waterCategory === WaterCategory.CAT_3 ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  <AlertCircle size={12} /> {p.waterCategory.split(' ')[0]} {p.waterCategory.split(' ')[1]}
                </div>
                <div className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                  {p.lossClass.split(' ')[0]} {p.lossClass.split(' ')[1]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full max-w-md mx-auto bg-slate-900 shadow-2xl relative overflow-hidden">
      {renderContent()}
      
      {view !== 'ar-scan' && view !== 'job-intake' && (
        <CommandCenter 
          isOpen={isListening} 
          onClose={() => setIsListening(false)} 
        />
      )}
    </div>
  );
};

export default App;
