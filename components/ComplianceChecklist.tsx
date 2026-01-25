
import React, { useState } from 'react';
import { Project, ComplianceCheck } from '../data/mockApi';
// FIX: Import the missing FileText icon.
import { User, ShieldCheck, Mail, Phone, UserSquare, Microscope, CheckCircle2, AlertTriangle, Clock, BrainCircuit, Loader2, FileText } from 'lucide-react';

interface ComplianceChecklistProps {
    project: Project;
}

const AsbestosStatusBadge: React.FC<{ status: Project['complianceChecks']['asbestos'] }> = ({ status }) => {
    const statusMap = {
        not_tested: { text: 'Testing Required', icon: <AlertTriangle size={14} />, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        pending: { text: 'Lab Results Pending', icon: <Clock size={14} />, color: 'bg-blue-100 text-blue-800 border-blue-200' },
        clear: { text: 'No Asbestos Detected', icon: <CheckCircle2 size={14} />, color: 'bg-green-100 text-green-800 border-green-200' },
        abatement_required: { text: 'Abatement Required', icon: <AlertTriangle size={14} />, color: 'bg-red-100 text-red-800 border-red-200' },
    };
    const current = statusMap[status];
    return (
        <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold border ${current.color}`}>
            {current.icon}
            <span>{current.text}</span>
        </div>
    );
};

const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({ project }) => {
    const [checklist, setChecklist] = useState<ComplianceCheck[]>(project.complianceChecks.aiChecklist);
    
    const toggleCheck = (checkId: string) => {
        setChecklist(prev => 
            prev.map(c => c.id === checkId ? { ...c, isCompleted: !c.isCompleted } : c)
        );
    };

    return (
        <div className="grid md:grid-cols-5 gap-6">
            {/* Main Checklist */}
            <section className="md:col-span-3 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100"><AlertTriangle size={24} /></div>
                    <div>
                        <h3 className="font-black text-gray-900 tracking-tight">Compliance & Safety</h3>
                        <p className="text-xs text-gray-500 mt-0.5">AI-generated IICRC S-500 checklist.</p>
                    </div>
                </div>
                
                <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-3">
                        <Microscope size={18} className="text-gray-500" />
                        <h4 className="font-bold text-sm text-gray-800">Asbestos Protocol</h4>
                    </div>
                    <AsbestosStatusBadge status={project.complianceChecks.asbestos} />
                </div>
                
                <div className="space-y-3">
                    {checklist.map(item => (
                        <div key={item.id} onClick={() => toggleCheck(item.id)} className={`flex items-start space-x-3 p-3 rounded-xl cursor-pointer transition-colors ${item.isCompleted ? 'bg-green-50/50 text-gray-500' : 'bg-gray-50/70 hover:bg-gray-100/50'}`}>
                            <div className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center border-2 shrink-0 ${item.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300'}`}>
                                {item.isCompleted && <CheckCircle2 size={12} />}
                            </div>
                            <p className={`text-sm font-medium flex-1 ${item.isCompleted ? 'line-through' : ''}`}>{item.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Info Cards */}
            <div className="md:col-span-2 space-y-6">
                 <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><User size={24} /></div>
                        <div><h3 className="font-black text-gray-900 tracking-tight">Customer Information</h3></div>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center"><Mail size={14} className="text-gray-400 mr-3" /><span className="font-medium text-gray-700">{project.clientEmail}</span></div>
                        <div className="flex items-center"><Phone size={14} className="text-gray-400 mr-3" /><span className="font-medium text-gray-700">{project.clientPhone}</span></div>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                     <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100"><ShieldCheck size={24} /></div>
                        <div><h3 className="font-black text-gray-900 tracking-tight">Insurance Details</h3></div>
                    </div>
                     <div className="space-y-3 text-sm">
                        <div className="flex items-center"><UserSquare size={14} className="text-gray-400 mr-3" /><span className="font-medium text-gray-700">Adjuster: {project.adjuster}</span></div>
                        <div className="flex items-center"><FileText size={14} className="text-gray-400 mr-3" /><span className="font-medium text-gray-700">Policy #: {project.policyNumber}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplianceChecklist;
