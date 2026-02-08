
import React, { useState } from 'react';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { addProject } from '../data/mockApi';
import { WaterCategory, LossClass } from '../types';

const NewProject: React.FC = () => {
    const { setActiveTab, setSelectedProjectId, currentUser } = useAppContext();
    const [isSaving, setIsSaving] = useState(false);
    const [lossInfo, setLossInfo] = useState({
        location: '',
        lossDate: new Date().toISOString().slice(0, 16),
        clientName: '',
        claimNumber: '',
        insurance: '',
        jobType: 'Water'
    });

    const handleSubmit = async () => {
        if (!currentUser?.companyId || !lossInfo.clientName || !lossInfo.location) {
            alert("Please fill in required fields (Location, Client Name).");
            return;
        }
        
        setIsSaving(true);
        const newLoss = await addProject({
            client: lossInfo.clientName,
            address: lossInfo.location,
            lossDate: lossInfo.lossDate,
            insurance: lossInfo.insurance,
            claimNumber: lossInfo.claimNumber,
            status: 'New Intake',
            currentStage: 'Intake',
            waterCategory: WaterCategory.CAT_1, // Default to clean water
            lossClass: LossClass.CLASS_1, // Default to least affected
        }, currentUser.companyId);

        setSelectedProjectId(newLoss.id);
        setActiveTab('loss-detail');
        setIsSaving(false);
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <header className="bg-[#0078d4] text-white py-4 px-4 flex justify-between items-center shadow-md">
                <div className="flex items-center space-x-4">
                    <button onClick={() => setActiveTab('losses')}><ArrowLeft size={24} /></button>
                    <h1 className="text-xl font-bold">New Loss Intake</h1>
                </div>
                <button 
                    onClick={handleSubmit} 
                    disabled={isSaving}
                    className="bg-white text-[#0078d4] px-4 py-1.5 rounded-full text-sm font-bold flex items-center space-x-2 disabled:opacity-70"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    <span>{isSaving ? 'Creating...' : 'Start Job'}</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Loss Information */}
                <div>
                    <h3 className="text-[#0078d4] font-bold text-lg mb-2">Essential Information</h3>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                            <label className="block text-xs font-bold text-red-500 mb-1">Risk Address*</label>
                            <input 
                                value={lossInfo.location}
                                onChange={e => setLossInfo({...lossInfo, location: e.target.value})}
                                className="w-full text-base border-b border-gray-300 pb-1 focus:outline-none focus:border-[#0078d4]" 
                                placeholder="123 Example St" 
                            />
                        </div>
                        <div className="p-4 border-b border-gray-100">
                            <label className="block text-xs font-bold text-red-500 mb-1">Loss Date*</label>
                            <input 
                                type="datetime-local"
                                value={lossInfo.lossDate}
                                onChange={e => setLossInfo({...lossInfo, lossDate: e.target.value})}
                                className="w-full text-base bg-transparent focus:outline-none" 
                            />
                        </div>
                        <div className="p-4 border-b border-gray-100">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Client Name*</label>
                            <input 
                                value={lossInfo.clientName}
                                onChange={e => setLossInfo({...lossInfo, clientName: e.target.value})}
                                className="w-full text-base border-b border-gray-300 pb-1 focus:outline-none focus:border-[#0078d4]" 
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div className="flex">
                            <div className="flex-1 p-4 border-r border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Insurance Carrier</label>
                                <input 
                                    value={lossInfo.insurance}
                                    onChange={e => setLossInfo({...lossInfo, insurance: e.target.value})}
                                    className="w-full text-base border-b border-gray-300 pb-1 focus:outline-none" 
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="flex-1 p-4">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Claim #</label>
                                <input 
                                    value={lossInfo.claimNumber}
                                    onChange={e => setLossInfo({...lossInfo, claimNumber: e.target.value})}
                                    className="w-full text-base border-b border-gray-300 pb-1 focus:outline-none" 
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                        <div className="flex p-4">
                             <div className="flex-1 pr-2">
                                <label className="block text-xs font-bold text-blue-500 mb-1">Loss Type</label>
                                <select className="w-full font-bold text-gray-900 bg-transparent border-b border-gray-300 pb-1">
                                    <option>Water</option>
                                    <option>Fire</option>
                                    <option>Mold</option>
                                </select>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewProject;
