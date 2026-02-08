
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ArrowLeft, CheckCircle2, Circle, ChevronRight, 
    Camera, Scan, Wind, Droplets, DollarSign, 
    ShieldCheck, AlertTriangle, FileText, ArrowRight, XCircle,
    Maximize2, Layout, Plus
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getProjectById, updateProjectStage, updateProject } from '../data/mockApi';
// Added WaterCategory to imports to fix type comparison error on line 186
import { Project, ProjectStage, RoomScan, WaterCategory } from '../types';

// Import sub-components for each step
import PhotoDocumentation from './PhotoDocumentation';
import ComplianceChecklist from './ComplianceChecklist';
import EquipmentManager from './EquipmentManager';
import DryingLogs from './DryingLogs';
import Billing from './Billing';
import TicSheet from './TicSheet';
import WalkthroughViewer from './WalkthroughViewer';

const STAGES: { id: ProjectStage; label: string; icon: React.ReactNode }[] = [
    { id: 'Intake', label: 'Intake', icon: <FileText size={20} /> },
    { id: 'Inspection', label: 'Inspection', icon: <Camera size={20} /> },
    { id: 'Scope', label: 'Scope', icon: <Scan size={20} /> },
    { id: 'Stabilize', label: 'Stabilize', icon: <Wind size={20} /> },
    { id: 'Monitor', label: 'Monitor', icon: <Droplets size={20} /> },
    { id: 'Closeout', label: 'Closeout', icon: <DollarSign size={20} /> },
];

const ProjectDetails: React.FC = () => {
  const { setActiveTab, selectedProjectId } = useAppContext();
  const [loss, setLoss] = useState<Project | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [selectedScan, setSelectedScan] = useState<RoomScan | null>(null);

  useEffect(() => {
    const load = async () => {
        if (selectedProjectId) {
            const data = await getProjectById(selectedProjectId);
            setLoss(data as Project);
            // Initialize stage index based on project data
            const stageIdx = STAGES.findIndex(s => s.id === (data?.currentStage || 'Intake'));
            setCurrentStageIndex(stageIdx >= 0 ? stageIdx : 0);
        }
    };
    load();
  }, [selectedProjectId]);

  const handleUpdateProject = async (updates: Partial<Project>) => {
      if (!loss) return;
      const updatedLoss = await updateProject(loss.id, updates);
      if (updatedLoss) {
          setLoss(updatedLoss);
      }
  };

  const handleNextStage = async () => {
      if (currentStageIndex < STAGES.length - 1 && loss) {
          const nextStage = STAGES[currentStageIndex + 1].id;
          await updateProjectStage(loss.id, nextStage);
          
          setLoss(prev => prev ? { ...prev, currentStage: nextStage } : null);
          setCurrentStageIndex(prev => prev + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleStageSelect = (index: number) => {
      setCurrentStageIndex(index);
  };

  // Stage Validation Logic
  const stageRequirements = useMemo(() => {
      if (!loss) return [];
      const reqs = [];
      
      switch (STAGES[currentStageIndex].id) {
          case 'Intake':
              reqs.push({ label: 'Verify Address', valid: !!loss.address });
              reqs.push({ label: 'Assign Category', valid: !!loss.waterCategory });
              break;
          case 'Inspection':
              const hasPhotos = loss.rooms.some(r => r.photos.length > 0) || (loss.roomScans?.length ?? 0) > 0;
              const hasCompliance = loss.complianceChecks.aiChecklist.some(c => c.isCompleted);
              reqs.push({ label: 'Capture Site Photos', valid: hasPhotos });
              reqs.push({ label: 'Complete Compliance Check', valid: hasCompliance });
              break;
          case 'Stabilize':
              const hasEquipment = (loss.equipment?.length ?? 0) > 0;
              reqs.push({ label: 'Place Equipment', valid: hasEquipment });
              break;
          default:
              break;
      }
      return reqs;
  }, [loss, currentStageIndex]);

  const canAdvance = stageRequirements.every(r => r.valid);

  if (!loss) return <div className="p-8 text-center text-gray-500">Loading Workflow...</div>;

  const currentStage = STAGES[currentStageIndex];

  return (
    <div className="flex flex-col h-full bg-gray-50">
        {/* Workflow Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center px-4 py-3">
                <button onClick={() => setActiveTab('losses')} className="mr-3 text-gray-500 hover:text-gray-900"><ArrowLeft size={20} /></button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold text-gray-900 truncate">{loss.client}</h1>
                    <p className="text-xs text-gray-500 truncate">{loss.address}</p>
                </div>
            </div>

            {/* Symbol-Based Progress Navigation */}
            <div className="px-6 pb-4 pt-2 bg-white">
                <div className="relative flex items-center justify-between">
                    {/* Connecting Line Background */}
                    <div className="absolute left-2 right-2 top-1/2 h-1 bg-gray-100 -z-10 rounded-full" />
                    
                    {/* Active Progress Line */}
                    <div 
                        className="absolute left-2 top-1/2 h-1 bg-[#0078d4] -z-10 transition-all duration-500 rounded-full" 
                        style={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }} 
                    />

                    {STAGES.map((stage, idx) => {
                        const isActive = idx === currentStageIndex;
                        const isCompleted = idx < currentStageIndex;
                        const isFuture = idx > currentStageIndex;
                        
                        return (
                            <button 
                                key={stage.id} 
                                onClick={() => handleStageSelect(idx)}
                                className={`relative group flex flex-col items-center justify-center transition-all duration-300 outline-none focus:outline-none`}
                            >
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center border-4 shadow-sm transition-all duration-300 z-10
                                    ${isActive 
                                        ? 'bg-[#0078d4] border-white ring-4 ring-[#0078d4]/20 text-white scale-110' 
                                        : isCompleted 
                                            ? 'bg-white border-[#0078d4] text-[#0078d4]' 
                                            : 'bg-white border-gray-200 text-gray-300'}
                                `}>
                                    {isCompleted ? <CheckCircle2 size={24} strokeWidth={3} /> : stage.icon}
                                </div>
                                
                                {/* Floating Label for Active/Hover */}
                                <div className={`
                                    absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg pointer-events-none transition-all duration-300
                                    ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
                                `}>
                                    {stage.label}
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </header>

        {/* Dynamic Content Area based on Stage */}
        <div className="flex-1 overflow-y-auto pb-32">
            
            {/* Stage: INTAKE */}
            {currentStage.id === 'Intake' && (
                <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 text-lg mb-4">Job Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="block text-xs text-gray-400 font-bold uppercase">Loss Date</span>{loss.lossDate?.replace('T', ' ') || 'N/A'}</div>
                            <div><span className="block text-xs text-gray-400 font-bold uppercase">Claim #</span>{loss.claimNumber || 'N/A'}</div>
                            <div><span className="block text-xs text-gray-400 font-bold uppercase">Adjuster</span>{loss.adjuster || 'Unassigned'}</div>
                            <div><span className="block text-xs text-gray-400 font-bold uppercase">Policy</span>{loss.policyNumber || 'N/A'}</div>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100">
                        <h3 className="font-bold text-blue-900 mb-2 flex items-center"><AlertTriangle size={16} className="mr-2"/> Initial Risk Assessment</h3>
                        <p className="text-sm text-blue-800 mb-4">{loss.summary}</p>
                        <div className="flex space-x-2">
                            {/* Updated comparison to use WaterCategory enum instead of string literal to fix type error */}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${loss.waterCategory === WaterCategory.CAT_3 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{loss.waterCategory?.replace('_', ' ')}</span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-gray-200 text-gray-700 border border-gray-300">{loss.lossClass?.replace('_', ' ')}</span>
                        </div>
                    </div>

                    <button className="w-full py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl flex justify-between items-center px-6 hover:bg-gray-50 transition-colors">
                        <span>View Work Authorization</span>
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Stage: INSPECTION */}
            {currentStage.id === 'Inspection' && (
                <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
                    <ComplianceChecklist project={loss} onUpdate={handleUpdateProject} />
                    
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2 px-1">Initial Photos</h3>
                        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                            <PhotoDocumentation onStartScan={() => setActiveTab('scanner')} project={loss} isMobile={true} />
                        </div>
                    </div>
                </div>
            )}

            {/* Stage: SCOPE */}
            {currentStage.id === 'Scope' && (
                <div className="p-4 space-y-8 animate-in slide-in-from-right duration-300">
                    
                    {/* Spatial Intelligence Section */}
                    <div>
                        <div className="flex justify-between items-center px-1 mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg flex items-center">
                                    <Scan className="mr-2 text-indigo-600" size={20} />
                                    Spatial Intelligence
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">LiDAR mapping & AI dimensioning</p>
                            </div>
                            {loss.roomScans && loss.roomScans.length > 0 && (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                    {loss.roomScans.length} Scans Active
                                </span>
                            )}
                        </div>

                        <div className="flex overflow-x-auto gap-4 pb-2 -mx-4 px-4 no-scrollbar">
                            {/* New Scan Action Card */}
                            <button 
                                onClick={() => setActiveTab('scanner')} 
                                className="flex-shrink-0 w-40 h-56 rounded-[2rem] border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 flex flex-col items-center justify-center space-y-4 active:scale-95 transition-all group"
                            >
                                <div className="w-14 h-14 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform group-hover:shadow-lg border border-indigo-100">
                                    <Plus size={28} strokeWidth={3} />
                                </div>
                                <div className="text-center px-2">
                                    <span className="block text-sm font-bold text-indigo-900 mb-1">New Room Scan</span>
                                    <span className="text-[10px] text-indigo-400 font-medium leading-tight block">LiDAR • Photogrammetry • Splats</span>
                                </div>
                            </button>

                            {/* Captured Scans */}
                            {loss.roomScans?.map((scan) => (
                                <button 
                                    key={scan.scanId}
                                    onClick={() => setSelectedScan(scan)}
                                    className="flex-shrink-0 w-40 h-56 rounded-[2rem] bg-white border border-gray-100 shadow-sm flex flex-col overflow-hidden relative active:scale-95 transition-all group"
                                >
                                    <div className="h-32 bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                                        {scan.floorPlanSvg ? (
                                            <div className="w-full h-full drop-shadow-md transform group-hover:scale-110 transition-transform duration-500" dangerouslySetInnerHTML={{ __html: scan.floorPlanSvg }} />
                                        ) : (
                                            <Layout className="text-gray-300" size={40} />
                                        )}
                                        <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-full border border-gray-100 shadow-sm">
                                            <Maximize2 size={12} className="text-gray-600" />
                                        </div>
                                    </div>
                                    <div className="p-4 text-left flex-1 flex flex-col justify-between bg-white relative z-10">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm truncate mb-0.5">{scan.roomName}</h4>
                                            <div className="flex items-center space-x-1">
                                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">{scan.dimensions.sqft.toFixed(0)} sq ft</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-1.5 text-[10px] text-indigo-500 font-medium pt-2 border-t border-gray-50 mt-2">
                                            <Camera size={12} />
                                            <span>{scan.placedPhotos.length} photos</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scope Sheet Section */}
                    <div>
                        <div className="flex justify-between items-center px-1 mb-3">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Scope of Work</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Line items & estimations</p>
                            </div>
                            <button className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 uppercase tracking-wide hover:bg-indigo-100 transition-colors">
                                Export Xactimate
                            </button>
                        </div>
                        <div className="h-[500px] border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm bg-white relative">
                            <TicSheet project={loss} isMobile={true} embedded={true} />
                        </div>
                    </div>
                </div>
            )}

            {/* Stage: STABILIZE */}
            {currentStage.id === 'Stabilize' && (
                <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
                    <EquipmentManager isMobile={true} project={loss} onUpdate={handleUpdateProject} />
                </div>
            )}

            {/* Stage: MONITOR */}
            {currentStage.id === 'Monitor' && (
                <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
                    <DryingLogs onOpenAnalysis={() => {}} isMobile={true} project={loss} />
                </div>
            )}

            {/* Stage: CLOSEOUT */}
            {currentStage.id === 'Closeout' && (
                <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="bg-green-50 p-6 rounded-3xl border border-green-100 text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-green-900">Ready for Completion</h3>
                        <p className="text-sm text-green-700 mt-1">All drying goals met. Equipment demobilized.</p>
                    </div>
                    <Billing />
                </div>
            )}

        </div>

        {/* Walkthrough Viewer Modal */}
        {selectedScan && (
            <WalkthroughViewer 
                scan={selectedScan} 
                onClose={() => setSelectedScan(null)} 
            />
        )}

        {/* Floating Action Button - Workflow Advancement */}
        <div className="fixed bottom-24 left-4 right-4 z-30 flex flex-col space-y-2">
            {stageRequirements.length > 0 && (
                <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl p-3 shadow-lg">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Stage Requirements</p>
                    <div className="space-y-1">
                        {stageRequirements.map((req, i) => (
                            <div key={i} className="flex items-center space-x-2">
                                {req.valid ? <CheckCircle2 size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                                <span className={`text-xs font-bold ${req.valid ? 'text-gray-700' : 'text-gray-500'}`}>{req.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button 
                onClick={handleNextStage}
                disabled={!canAdvance || currentStageIndex === STAGES.length - 1}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-2xl flex items-center justify-center space-x-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:bg-gray-400"
            >
                <span>Complete {currentStage.label}</span>
                <ArrowRight size={20} />
            </button>
        </div>
    </div>
  );
};

export default ProjectDetails;
