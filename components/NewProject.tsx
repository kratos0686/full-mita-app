
import React, { useState } from 'react';
import { FilePlus2, User, MapPin, ShieldCheck, Check, Loader2, Navigation, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { addProject } from '../data/mockApi';
import { GoogleGenAI } from '@google/genai';

const NewProject: React.FC = () => {
    const { setActiveTab, setSelectedProjectId } = useAppContext();
    const [client, setClient] = useState('');
    const [address, setAddress] = useState('');
    const [insurance, setInsurance] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{ status: 'success' | 'error', message: string } | null>(null);

    const handleAddressBlur = async () => {
        if (!address.trim()) return;
        setIsVerifying(true);
        setVerificationResult(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Verify and format this address: ${address}`,
                config: { tools: [{ googleMaps: {} }] }
            });
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const mapInfo = groundingChunks.find((c: any) => c.maps)?.maps;

            if (mapInfo && mapInfo.title) {
                setAddress(mapInfo.title);
                setVerificationResult({ status: 'success', message: 'Address verified via Google Maps.' });
            } else {
                 setVerificationResult({ status: 'error', message: 'Could not verify address. Please check and try again.' });
            }
        } catch (err) {
            console.error(err);
            setVerificationResult({ status: 'error', message: 'AI verification service failed.' });
        } finally {
            setIsVerifying(false);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client || !address || !insurance) return;
        setIsSubmitting(true);
        
        const newProjectData = {
            client,
            address,
            insurance,
            status: 'Initial Assessment',
            startDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            logs: 'No logs yet.',
            clientEmail: 'TBD',
            clientPhone: 'TBD',
            policyNumber: 'TBD',
            adjuster: 'TBD',
            estimate: 'TBD'
        };

        try {
            const createdProject = await addProject(newProjectData);
            setSelectedProjectId(createdProject.id);
            setActiveTab('project');
        } catch (error) {
            console.error("Failed to create project", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isFormValid = client.trim() && address.trim() && insurance.trim();

    return (
        <div className="p-4 space-y-6 animate-in fade-in duration-500">
            <header className="flex items-center space-x-3">
                <button onClick={() => setActiveTab('dashboard')} className="p-2 -ml-2 text-gray-400 hover:text-gray-900"><ArrowLeft size={24} /></button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">New Project Intake</h2>
                    <p className="text-sm text-gray-500">Create a new mitigation file.</p>
                </div>
            </header>
            
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center pl-1 mb-2"><User size={12} className="mr-1" /> Client Name</label>
                    <input type="text" value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g., John Doe" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-inner" />
                </div>

                <div className="relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center pl-1 mb-2"><MapPin size={12} className="mr-1" /> Property Address</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} onBlur={handleAddressBlur} placeholder="e.g., 123 Main St, Anytown, USA" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-inner" />
                    <div className="absolute right-3 top-10">
                        {isVerifying ? <Loader2 size={16} className="text-gray-400 animate-spin" /> : <Navigation size={16} className="text-gray-400" />}
                    </div>
                     {verificationResult && (
                        <div className={`mt-2 flex items-center text-xs font-bold ${verificationResult.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                           {verificationResult.status === 'success' ? <Check size={14} className="mr-1.5" /> : <AlertCircle size={14} className="mr-1.5" />}
                           {verificationResult.message}
                        </div>
                    )}
                </div>

                 <div className="relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center pl-1 mb-2"><ShieldCheck size={12} className="mr-1" /> Insurance Carrier</label>
                    <input type="text" value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="e.g., State Farm" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-inner" />
                </div>
            </form>
            
            <button 
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                <span>{isSubmitting ? 'Creating Project File...' : 'Create & Open Project'}</span>
            </button>
        </div>
    );
};

export default NewProject;
