
import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, PlusCircle, Trash2, Send, CheckCircle, User, Building, Home, BarChart2 } from 'lucide-react';
import { getProjectById, Project, LineItem } from '../data/mockApi';
import { useAppContext } from '../context/AppContext';

const Billing: React.FC = () => {
    const { selectedProjectId } = useAppContext();
    const [project, setProject] = useState<Project | null>(null);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [billTo, setBillTo] = useState<'Insurance' | 'Homeowner' | 'HOA'>('Insurance');
    
    useEffect(() => {
        const fetchProject = async () => {
            if (selectedProjectId) {
                const proj = await getProjectById(selectedProjectId);
                setProject(proj);
                setLineItems(proj?.lineItems || []);
            }
        };
        fetchProject();
    }, [selectedProjectId]);
    
    const totalCost = useMemo(() => {
        return lineItems.reduce((acc, item) => acc + item.total, 0);
    }, [lineItems]);

    const handleAddItem = () => {
        setLineItems([...lineItems, { id: `new-${Date.now()}`, description: '', quantity: 1, rate: 0, total: 0 }]);
    };

    const handleItemChange = (id: string, field: keyof LineItem, value: string | number) => {
        setLineItems(lineItems.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'quantity' || field === 'rate') {
                    updatedItem.total = updatedItem.quantity * updatedItem.rate;
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(lineItems.filter(item => item.id !== id));
    };
    
    const handleSendInvoice = () => {
        alert(`Invoice for $${totalCost.toFixed(2)} sent to ${billTo}.`);
    };

    if (!selectedProjectId) {
        return (
            <div className="p-8 h-full flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-full mb-4"><BarChart2 size={32} /></div>
                <h2 className="text-xl font-bold text-gray-800">Billing & Invoicing</h2>
                <p className="text-gray-500 mt-2">Please select a project from the dashboard to view or create an invoice.</p>
            </div>
        )
    }

    if (!project) {
        return <div className="p-8">Loading Project Billing...</div>
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Billing for Project {project.id}</h2>
                <p className="text-sm text-gray-500 font-medium">{project.client} - {project.address}</p>
            </header>

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Invoice Details</h3>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Bill To</label>
                         <div className="flex p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
                             <button onClick={() => setBillTo('Insurance')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${billTo === 'Insurance' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><Building size={14}/><span>{project.insurance}</span></button>
                             <button onClick={() => setBillTo('Homeowner')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${billTo === 'Homeowner' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><User size={14}/><span>{project.client}</span></button>
                             <button onClick={() => setBillTo('HOA')} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${billTo === 'HOA' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><Home size={14}/><span>HOA</span></button>
                         </div>
                    </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Invoice Status</label>
                        <div className={`w-full flex items-center justify-center py-4 rounded-2xl text-sm font-bold ${project.invoiceStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                           {project.invoiceStatus === 'Paid' && <CheckCircle size={16} className="mr-2"/>} {project.invoiceStatus}
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Line Items</label>
                    <div className="space-y-2">
                        {lineItems.map((item) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                <input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="Service Description" className="col-span-6 bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-medium" />
                                <input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="Qty" className="col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-medium" />
                                <input type="number" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', e.target.value)} placeholder="Rate" className="col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-medium" />
                                <span className="col-span-1 text-xs font-bold text-center">${item.total.toFixed(2)}</span>
                                <button onClick={() => handleRemoveItem(item.id)} className="col-span-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleAddItem} className="flex items-center space-x-2 text-blue-600 text-xs font-bold pt-2"><PlusCircle size={14} /><span>Add Line Item</span></button>
                </div>
                
                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end items-center">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</p>
                        <p className="text-3xl font-black text-gray-900">${totalCost.toFixed(2)}</p>
                    </div>
                </div>

            </div>
             <button 
                onClick={handleSendInvoice}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all"
              >
                <Send size={20} />
                <span>Send Invoice to {billTo}</span>
            </button>
        </div>
    );
};

export default Billing;
