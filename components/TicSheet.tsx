
import React, { useState, useEffect, useMemo } from 'react';
import { Project, TicSheetItem } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { BrainCircuit, Loader2, Plus, Trash2, CheckSquare, Square, Bot, User, ListChecks, ArrowLeft, Save, Download, WifiOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface TicSheetProps {
    project: Project;
    isMobile?: boolean;
    onBack?: () => void;
}

const TicSheet: React.FC<TicSheetProps> = ({ project, isMobile = false, onBack }) => {
    const { isOnline } = useAppContext();
    const [items, setItems] = useState<TicSheetItem[]>(project.ticSheet || []);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateAIScope = async () => {
        if (!isOnline) return;
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            // Added optional chaining for rooms and fallback string
            const roomsList = project.rooms?.map(r => r.name).join(', ') || 'No rooms listed';
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `You are an expert water mitigation project estimator using Xactimate standards. Based on the following project data, generate a list of standard line items for a tic sheet. Project Summary: ${project.summary}. Water is ${project.waterCategory}, ${project.lossClass}. Affected rooms include: ${roomsList}. For each item, provide a 'category' (e.g., Water Extraction, Demolition, Equipment, Containment), a brief 'description', a standard 'uom' (Unit of Measure), and an estimated 'quantity'. Respond ONLY with a valid JSON object.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            items: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        category: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        uom: { type: Type.STRING },
                                        quantity: { type: Type.NUMBER }
                                    },
                                    required: ["category", "description", "uom", "quantity"]
                                }
                            }
                        },
                        required: ["items"]
                    }
                }
            });
            
            // Safe parsing of AI response
            const text = response.text || '{"items":[]}';
            const parsed = JSON.parse(text);
            // Ensure result is treated as any to avoid 'unknown' type issues, then access items safely
            const resultItems = (parsed as any).items || [];
            
            if (Array.isArray(resultItems)) {
                const newAiItems: TicSheetItem[] = resultItems.map((item: any) => ({
                    ...item,
                    id: `ai-${Date.now()}-${Math.random()}`,
                    included: true,
                    source: 'ai'
                }));
                const manualItems = items.filter(i => i.source === 'manual');
                setItems([...newAiItems, ...manualItems]);
            }
        } catch (err) {
            console.error("AI Scope Generation Failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleItemChange = (id: string, field: keyof TicSheetItem, value: any) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleAddItem = () => {
        const newItem: TicSheetItem = {
            id: `manual-${Date.now()}`,
            category: 'Miscellaneous',
            description: '',
            uom: 'EA',
            quantity: 1,
            included: true,
            source: 'manual'
        };
        setItems(prev => [...prev, newItem]);
    };
    
    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleExportXactimate = () => {
        alert("Simulating export of Tic Sheet data to Xactimate (.esx file)...");
    };

    const groupedItems = useMemo(() => {
        return items.reduce((acc, item) => {
            const category = item.category || 'Uncategorized';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {} as Record<string, TicSheetItem[]>);
    }, [items]);
    
    const theme = {
        bg: isMobile ? 'bg-gray-50' : 'bg-slate-900',
        card: isMobile ? 'bg-white' : 'glass-card',
        text: isMobile ? 'text-gray-900' : 'text-white',
        subtext: isMobile ? 'text-gray-500' : 'text-slate-400',
        input: isMobile ? 'bg-gray-100 border-gray-200' : 'bg-white/5 border-white/10 text-white',
        headerIconBg: isMobile ? 'bg-indigo-50 text-indigo-600' : 'bg-brand-indigo/20 text-brand-indigo',
    };

    return (
        <div className={`p-4 md:p-8 space-y-6 ${theme.bg}`}>
            <header className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    {isMobile && onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900">
                            <ArrowLeft size={24} />
                        </button>
                    )}
                    <div>
                        <h2 className={`text-2xl font-bold ${theme.text}`}>Project Tic Sheet</h2>
                        <p className={`text-sm ${theme.subtext}`}>{project.address}</p>
                    </div>
                </div>
                 <button onClick={handleExportXactimate} className="flex items-center space-x-2 bg-brand-cyan/10 text-brand-cyan px-4 py-2 rounded-lg text-sm font-bold border border-brand-cyan/20">
                    <Download size={16} />
                    <span>Export to Xactimate</span>
                </button>
            </header>

            <div className={`${theme.card} p-6 rounded-[2rem]`}>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-2xl ${theme.headerIconBg}`}><ListChecks size={24} /></div>
                        <div>
                            <h3 className={`font-black tracking-tight ${theme.text}`}>Scope of Work</h3>
                            <p className={`text-xs mt-0.5 ${theme.subtext}`}>Generated by MitigationAI</p>
                        </div>
                    </div>
                    {isOnline ? (
                        <button onClick={handleGenerateAIScope} disabled={isGenerating} className="flex items-center space-x-2 bg-brand-indigo/80 text-white px-4 py-3 rounded-lg text-sm font-bold border border-brand-indigo/30 hover:bg-brand-indigo disabled:opacity-50">
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                            <span>{isGenerating ? 'Analyzing...' : 'Generate Scope'}</span>
                        </button>
                    ) : (
                        <div className="flex items-center space-x-2 px-4 py-3 rounded-lg bg-gray-200 text-gray-500 text-xs font-bold">
                            <WifiOff size={14} />
                            <span>AI Offline</span>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {Object.entries(groupedItems).map(([category, catItems]: [string, TicSheetItem[]]) => (
                        <div key={category}>
                            <h4 className={`text-xs font-black uppercase tracking-widest mb-3 ${theme.subtext}`}>{category}</h4>
                            <div className="space-y-2">
                                {catItems.map(item => (
                                    <div key={item.id} className={`grid grid-cols-12 items-center gap-2 p-2 rounded-lg ${item.included ? 'bg-white/5' : 'bg-transparent'}`}>
                                        <div className="col-span-1 flex items-center">
                                            <button onClick={() => handleItemChange(item.id, 'included', !item.included)} className={item.included ? 'text-brand-cyan' : theme.subtext}>
                                                {item.included ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </button>
                                        </div>
                                        <div className="col-span-6">
                                            <input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className={`w-full text-sm font-medium p-2 rounded-md border ${theme.input}`} />
                                            <div className={`flex items-center space-x-1 mt-1 ml-1 ${theme.subtext}`}>
                                                {item.source === 'ai' ? <Bot size={12} className="text-brand-indigo"/> : <User size={12} />}
                                                <span className="text-[10px] font-mono">{item.source}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))} className={`w-full text-sm font-medium p-2 rounded-md border ${theme.input}`} />
                                        </div>
                                        <div className="col-span-2">
                                             <input type="text" value={item.uom} onChange={e => handleItemChange(item.id, 'uom', e.target.value)} className={`w-full text-sm font-medium p-2 rounded-md border ${theme.input}`} />
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <button onClick={() => handleRemoveItem(item.id)} className={`${theme.subtext} hover:text-red-500`}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-between">
                     <button onClick={handleAddItem} className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold ${isMobile ? 'bg-gray-100 text-blue-600' : 'bg-white/10 text-brand-cyan'}`}>
                        <Plus size={16} /><span>Add Manual Item</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-brand-cyan text-slate-900 px-6 py-3 rounded-lg font-bold">
                        <Save size={18} />
                        <span>Save & Authorize</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default TicSheet;
