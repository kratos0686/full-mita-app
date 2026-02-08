
import React, { useState } from 'react';
import { Square, CheckSquare, Download as DownloadIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Downloads: React.FC = () => {
    const { setActiveTab } = useAppContext();
    const [items, setItems] = useState([
        { id: '1', label: 'Forms', desc: "All of your company's digital form templates", checked: false },
        { id: '2', label: 'Line Items', desc: "Line item codes and descriptions for building scope sheets", checked: false },
        { id: '3', label: 'User Profile', desc: "Your user profile settings", checked: false },
        { id: '4', label: 'Equipment', desc: "Your company's generic equipment that can be added to projects", checked: false },
        { id: '5', label: 'Third Party Equipment', desc: "Inventory equipment from other systems (i.e. DASH)", checked: false },
        { id: '6', label: 'Rules and Alerts', desc: "System rules and alerts for tasks and S500 guidance", checked: false },
        { id: '7', label: 'Custom Pricelist', desc: "Your company's custom pricelist for building scope sheets", checked: false },
    ]);

    const toggle = (id: string) => {
        setItems(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
    };

    return (
        <div className="bg-[#0078d4] h-full flex flex-col">
            <div className="px-4 py-4 flex justify-between items-center text-white">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white text-[#0078d4] rounded-full flex items-center justify-center font-bold text-lg">RM</div>
                    <h1 className="text-xl font-bold">Restoration</h1>
                </div>
            </div>

            <div className="bg-white flex-1 rounded-t-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Download</h2>
                    <button className="flex items-center space-x-2 border border-blue-100 rounded px-3 py-1.5 text-[#0078d4] font-bold text-sm bg-blue-50">
                        <DownloadIcon size={16} />
                        <span>Download All</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {items.map((item) => (
                        <div key={item.id} onClick={() => toggle(item.id)} className="flex items-start p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="pt-1 mr-4 text-gray-400">
                                {item.checked ? <CheckSquare className="text-[#0078d4]" size={24} /> : <Square size={24} />}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">{item.label}</h3>
                                <p className="text-gray-500 text-xs mt-0.5 leading-snug">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Downloads;
