
import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, List, MoreVertical, CheckSquare, Square, FileSpreadsheet, Tag, BookOpen, Zap } from 'lucide-react';
import { LossFile, LineItem } from '../types';
import { useAppContext } from '../context/AppContext';

interface TicSheetProps {
    project: LossFile;
    isMobile?: boolean;
    onBack?: () => void;
    embedded?: boolean;
}

// Mock categories based on IICRC
const CATEGORIES = [
    { id: 'bath', label: 'BATH CLEAN', items: [
        { code: 'CLN [AC]', desc: 'Clean acoustic ceiling (popcorn) texture' },
        { code: 'CLN [AV]', desc: 'Clean {V}' },
        { code: 'CLN [B]', desc: 'Clean baseboard' },
        { code: 'CLN [BAC]', desc: 'Clean bath accessory' },
        { code: 'CLN [BAR]', desc: 'Clean light bar' },
    ]},
    { id: 'water', label: 'WATER EXTRACTION', items: [
        { code: 'WTR [EXT]', desc: 'Water extraction from floor' },
        { code: 'WTR [DRY]', desc: 'Tear out wet drywall' },
    ]}
];

const TicSheet: React.FC<TicSheetProps> = ({ project, onBack, embedded = false }) => {
    const { setActiveTab } = useAppContext();
    const [selectedCategory, setSelectedCategory] = useState('Bath Clean');
    const [viewMode, setViewMode] = useState<'worksheet' | 'category' | 'reference' | 'macro'>('macro');

    const VIEWS = [
        { id: 'worksheet', icon: <FileSpreadsheet size={20} />, label: 'Sheet' },
        { id: 'category', icon: <Tag size={20} />, label: 'Cats' },
        { id: 'reference', icon: <BookOpen size={20} />, label: 'Ref' },
        { id: 'macro', icon: <Zap size={20} />, label: 'Macro' },
    ] as const;

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {!embedded && (
                <header className="bg-[#0078d4] text-white pt-4 pb-2 shadow-md z-10">
                    <div className="flex items-center px-4 mb-2">
                        <button onClick={onBack} className="mr-4"><ArrowLeft size={24} /></button>
                        <div>
                            <h1 className="text-lg font-bold leading-tight">{project.client}</h1>
                            <h2 className="text-base font-normal leading-tight">Line Items</h2>
                        </div>
                    </div>
                </header>
            )}

            {/* Symbol-Based Filter Bar */}
            <div className="bg-white px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[#0078d4] font-bold text-lg">All</h3>
                    <ChevronDown className="text-[#0078d4]" size={20} />
                </div>
                
                <div className="flex justify-between items-center px-2">
                    {VIEWS.map(v => (
                        <button 
                            key={v.id} 
                            onClick={() => setViewMode(v.id as any)}
                            className={`flex flex-col items-center space-y-1 transition-colors ${viewMode === v.id ? 'text-[#0078d4]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <div className={`p-2 rounded-xl ${viewMode === v.id ? 'bg-blue-50' : 'bg-transparent'}`}>
                                {v.icon}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{v.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Macro Selector */}
            <div className="px-4 py-3 bg-white border-b border-gray-200">
                <div className="relative border border-gray-300 rounded-md p-2 flex justify-between items-center bg-white">
                    <span className="text-xs text-[#0078d4] absolute -top-2 left-2 bg-white px-1 font-bold">Macro</span>
                    <span className="font-bold text-gray-900">{selectedCategory}</span>
                    <ChevronDown size={16} className="text-[#0078d4]" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
                <div className="flex justify-between items-center px-2 mb-2">
                    <span className="font-bold text-gray-700 uppercase">{selectedCategory}</span>
                    <button className="text-[#0078d4] font-bold text-sm">Select All</button>
                </div>

                <div className="space-y-2">
                    {CATEGORIES[0].items.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex items-start">
                            <div className="pt-1 mr-3 text-gray-400">
                                <List size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-900">{item.code}</h4>
                                    <ChevronDown size={16} className="text-[#0078d4]" />
                                </div>
                                <p className="text-sm text-gray-600 font-medium leading-snug mt-1">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TicSheet;
