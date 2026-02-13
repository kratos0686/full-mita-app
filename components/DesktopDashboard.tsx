
import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { Briefcase, DollarSign, Users, TrendingUp, TrendingDown, ChevronRight, Activity, Radio, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { EventBus, CloudEvent } from '../services/EventBus';

interface DesktopDashboardProps {
    projects: Project[];
    onProjectSelect: (id: string) => void;
}

const DesktopDashboard: React.FC<DesktopDashboardProps> = ({ projects, onProjectSelect }) => {
    const [events, setEvents] = useState<CloudEvent[]>([]);
    
    // Subscribe to the global EventBus to visualize Field Telemetry
    useEffect(() => {
        const handleEvent = (e: CloudEvent) => {
            setEvents(prev => [e, ...prev].slice(0, 15)); // Keep last 15 events
        };
        const unsub = EventBus.on('*', handleEvent);
        return () => unsub();
    }, []);

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status.toLowerCase().includes('active') || p.status.toLowerCase().includes('drying')).length;
    const totalRevenue = projects.reduce((sum, p) => sum + p.totalCost, 0);
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const budgetVariance = totalRevenue - totalBudget;

    const projectsByStatus = projects.reduce((acc, p) => {
        const status = p.currentStage || 'Intake';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const statusChartData = Object.keys(projectsByStatus).map(key => ({ name: key, projects: projectsByStatus[key] }));

    const revenueChartData = [
        { name: 'Aug', revenue: 120450 },
        { name: 'Sep', revenue: 185600 },
        { name: 'Oct', revenue: 157800 },
        { name: 'Nov', revenue: 215000 },
        { name: 'Dec (Proj.)', revenue: 250000 },
    ];

    return (
        <div className="flex h-full">
            {/* Main Dashboard Area */}
            <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                <header>
                    <h1 className="text-3xl font-black text-white tracking-tight">Mission Control</h1>
                    <p className="text-slate-400 font-medium">Field Operations & Financial Intelligence</p>
                </header>

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard icon={<Briefcase />} title="Active Jobs" value={activeProjects.toString()} subtitle={`${totalProjects} total files`} />
                    <KpiCard icon={<DollarSign />} title="Revenue (Q4)" value={`$${(totalRevenue / 1000).toFixed(1)}k`} positive={true} />
                    <KpiCard
                        icon={budgetVariance > 0 ? <TrendingUp /> : <TrendingDown />}
                        title="Budget Delta"
                        value={`$${(Math.abs(budgetVariance) / 1000).toFixed(1)}k`}
                        subtitle={budgetVariance > 0 ? 'Under Budget' : 'Over Budget'}
                        positive={budgetVariance >= 0}
                    />
                    <KpiCard icon={<Users />} title="Field Teams" value="4" subtitle="100% Deployed" />
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/5">
                        <h3 className="font-bold text-white mb-4">Pipeline Status</h3>
                        <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusChartData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={80} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.5rem', color: '#fff' }} />
                                    <Bar dataKey="projects" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="lg:col-span-3 glass-card rounded-2xl p-6 border border-white/5">
                         <h3 className="font-bold text-white mb-4">Revenue Trajectory</h3>
                         <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={revenueChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.5rem', color: '#fff' }} />
                                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6, fill: '#fff'}} />
                                </LineChart>
                            </ResponsiveContainer>
                         </div>
                    </div>
                </section>
            </div>

            {/* Right Sidebar: Live EventArc Feed */}
            <aside className="w-96 border-l border-white/5 bg-slate-950 flex flex-col">
                <div className="p-6 border-b border-white/5 bg-slate-900/50">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Radio size={16} className="text-red-500 animate-pulse" /> Live Telemetry
                    </h2>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">EventArc Stream • {events.length} Events</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {events.length === 0 && (
                        <div className="text-center py-10 opacity-30">
                            <Activity size={32} className="mx-auto mb-2" />
                            <p className="text-xs">Waiting for field signals...</p>
                        </div>
                    )}
                    
                    {events.map((e) => {
                        const isWarning = e.ui?.level === 'warning' || e.ui?.level === 'error';
                        const isSuccess = e.ui?.level === 'success';
                        
                        return (
                            <div key={e.id} className={`p-4 rounded-xl border relative overflow-hidden group animate-in slide-in-from-right duration-300 ${isWarning ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${isWarning ? 'bg-red-500/20 text-red-400' : isSuccess ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {e.type.split('.').pop()}
                                    </span>
                                    <span className="text-[9px] text-slate-600 font-mono">{new Date(e.time).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-xs font-medium text-slate-200 leading-relaxed mb-2">{e.ui?.message || JSON.stringify(e.data)}</p>
                                
                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                    <span className="truncate max-w-[150px]">{e.subject || e.source}</span>
                                    {e.data?.projectId && (
                                        <button onClick={() => onProjectSelect(e.data.projectId)} className="flex items-center text-brand-cyan hover:text-white transition-colors">
                                            View <ChevronRight size={10} />
                                        </button>
                                    )}
                                </div>
                                {isWarning && <div className="absolute top-0 right-0 p-2"><AlertTriangle size={12} className="text-red-500" /></div>}
                            </div>
                        );
                    })}
                </div>
            </aside>
        </div>
    );
};

const KpiCard: React.FC<{ icon: React.ReactNode, title: string, value: string, subtitle?: string, positive?: boolean }> = ({ icon, title, value, subtitle, positive }) => (
    <div className="glass-card rounded-2xl p-5 border border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-slate-900 rounded-lg text-slate-400 border border-white/5">{icon}</div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
        </div>
        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
        {subtitle && <p className={`text-[10px] font-bold mt-1 ${positive === true ? 'text-emerald-400' : positive === false ? 'text-red-400' : 'text-slate-500'}`}>{subtitle}</p>}
    </div>
);

export default DesktopDashboard;
