
import React, { useState } from 'react';
import { Settings, UserPlus, Shield, Bell, Save } from 'lucide-react';

const mockUsers = [
    { id: 1, name: 'Admin User', role: 'Admin', email: 'admin@restoration.ai' },
    { id: 2, name: 'John Manager', role: 'Manager', email: 'j.manager@restoration.ai' },
    { id: 3, name: 'Jane Technician', role: 'Technician', email: 'j.tech@restoration.ai' },
    { id: 4, name: 'Bill Payer', role: 'Billing', email: 'b.payer@restoration.ai' },
];

const AdminPanel: React.FC = () => {
    const [aiMonitoring, setAiMonitoring] = useState(true);
    const [autoReporting, setAutoReporting] = useState(false);

    return (
        <div className="p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white">Administrator Panel</h1>
                <p className="text-slate-400">Manage users, system settings, and integrations.</p>
            </header>

            <section className="glass-card rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">User Management</h3>
                    <button className="flex items-center space-x-2 bg-brand-cyan/10 text-brand-cyan px-4 py-2 rounded-lg text-sm font-bold border border-brand-cyan/20">
                        <UserPlus size={16} />
                        <span>Invite User</span>
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase">
                            <tr>
                                <th className="p-3">Name</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Email</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {mockUsers.map(user => (
                                <tr key={user.id} className="hover:bg-white/5">
                                    <td className="p-3 font-medium text-white">{user.name}</td>
                                    <td className="p-3"><span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">{user.role}</span></td>
                                    <td className="p-3 text-slate-300">{user.email}</td>
                                    <td className="p-3 text-right font-bold text-brand-cyan"><button>Edit</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            
            <section className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">System Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-300 border-b border-white/10 pb-2">AI & Automation</h4>
                        <SettingToggle
                            icon={<Shield />}
                            label="AI Compliance Monitoring"
                            description="Automatically flag deviations from IICRC S-500 standards."
                            enabled={aiMonitoring}
                            onToggle={() => setAiMonitoring(!aiMonitoring)}
                        />
                         <SettingToggle
                            icon={<Bell />}
                            label="Automated Client Reporting"
                            description="Send daily progress summary emails to homeowners."
                            enabled={autoReporting}
                            onToggle={() => setAutoReporting(!autoReporting)}
                        />
                    </div>
                     <div className="space-y-4">
                        <h4 className="font-bold text-slate-300 border-b border-white/10 pb-2">Integrations</h4>
                        <p className="text-sm text-slate-400">Manage connections to external services like accounting software and insurance portals.</p>
                         <button className="bg-white/5 px-4 py-2 rounded-lg text-sm font-bold border border-white/10">Connect to QuickBooks</button>
                    </div>
                </div>
                 <div className="mt-8 flex justify-end">
                    <button className="flex items-center space-x-2 bg-brand-cyan text-slate-900 px-6 py-3 rounded-lg font-bold">
                        <Save size={18} />
                        <span>Save Settings</span>
                    </button>
                </div>
            </section>
        </div>
    );
};

interface SettingToggleProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ icon, label, description, enabled, onToggle }) => (
    <div className="flex items-start space-x-4">
        <div className="p-2 bg-white/5 rounded-lg text-slate-300 mt-1">{icon}</div>
        <div className="flex-1">
            <label className="flex items-center justify-between cursor-pointer">
                <span className="font-bold text-white">{label}</span>
                <div onClick={onToggle} className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors ${enabled ? 'bg-brand-cyan justify-end' : 'bg-slate-700 justify-start'}`}>
                    <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </div>
            </label>
            <p className="text-xs text-slate-400 pr-12">{description}</p>
        </div>
    </div>
);


export default AdminPanel;
