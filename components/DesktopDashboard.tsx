
import React from 'react';
import { Project } from '../types';
import { Briefcase, DollarSign, Users, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

interface DesktopDashboardProps {
    projects: Project[];
    onProjectSelect: (id: string) => void;
}

const DesktopDashboard: React.FC<DesktopDashboardProps> = ({ projects, onProjectSelect }) => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status.toLowerCase().includes('drying') || p.status.toLowerCase().includes('assessment')).length;
    const totalRevenue = projects.reduce((sum, p) => sum + p.totalCost, 0);
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const budgetVariance = totalRevenue - totalBudget;

    const projectsByStatus = projects.reduce((acc, p) => {
        const status = p.status.split(' - ')[0];
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
        <div className="p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white">Manager's Dashboard</h1>
                <p className="text-slate-400">High-level overview of field operations and financials.</p>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard icon={<Briefcase />} title="Active Projects" value={activeProjects.toString()} subtitle={`${totalProjects} total`} />
                <KpiCard icon={<DollarSign />} title="Billed Revenue (Q4)" value={`$${(totalRevenue / 1000).toFixed(1)}k`} />
                <KpiCard
                    icon={budgetVariance > 0 ? <TrendingUp /> : <TrendingDown />}
                    title="Budget Variance"
                    value={`$${(Math.abs(budgetVariance) / 1000).toFixed(1)}k`}
                    subtitle={budgetVariance > 0 ? 'Under Budget' : 'Over Budget'}
                    positive={budgetVariance >= 0}
                />
                <KpiCard icon={<Users />} title="Teams Deployed" value="4" />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4">Projects by Status</h3>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusChartData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.1)" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }} />
                                <Bar dataKey="projects" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="lg:col-span-3 glass-card rounded-2xl p-6">
                     <h3 className="font-bold text-white mb-4">Monthly Revenue Projection</h3>
                     <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val/1000}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }} />
                                <Line type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                            </LineChart>
                        </ResponsiveContainer>
                     </div>
                </div>
            </section>
        </div>
    );
};

const KpiCard: React.FC<{ icon: React.ReactNode, title: string, value: string, subtitle?: string, positive?: boolean }> = ({ icon, title, value, subtitle, positive }) => (
    <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-white/5 rounded-lg text-slate-300">{icon}</div>
            <h4 className="text-sm font-bold text-slate-400">{title}</h4>
        </div>
        <p className="text-3xl font-bold text-white">{value}</p>
        {subtitle && <p className={`text-xs font-bold ${positive === true ? 'text-green-400' : positive === false ? 'text-red-400' : 'text-slate-500'}`}>{subtitle}</p>}
    </div>
);

export default DesktopDashboard;
