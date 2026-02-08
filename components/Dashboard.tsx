
import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, MapPin, Calendar, Circle, Filter, Clock, CloudOff, FolderOpen } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getProjects } from '../data/mockApi';
import { LossFile } from '../types'; // Updated type import

const Dashboard: React.FC = () => {
  const { setSelectedProjectId, setActiveTab, currentUser } = useAppContext();
  const [losses, setLosses] = useState<LossFile[]>([]);
  const [filter, setFilter] = useState<'Recent' | 'Not Exported' | 'All'>('Recent');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLosses = async () => {
      if (currentUser?.companyId) {
          const data = await getProjects(currentUser.companyId);
          setLosses(data as LossFile[]);
      }
    };
    fetchLosses();
  }, [currentUser]);

  const handleSelectLoss = (id: string) => {
    setSelectedProjectId(id);
    setActiveTab('loss-detail');
  };

  const filteredLosses = losses.filter(l => {
      const matchesSearch = l.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            l.address.toLowerCase().includes(searchTerm.toLowerCase());
      if (filter === 'Recent') return matchesSearch; // Simply return all for recent in mock
      return matchesSearch;
  });

  const FILTER_TABS = [
      { id: 'Recent', icon: <Clock size={20} />, label: 'Recent' },
      { id: 'Not Exported', icon: <CloudOff size={20} />, label: 'Pending' },
      { id: 'All', icon: <FolderOpen size={20} />, label: 'All' }
  ] as const;

  return (
    <div className="bg-[#0078d4] min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#0078d4] text-white px-4 pt-4 pb-2 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <div className="w-10 h-10 bg-white text-[#0078d4] rounded-full flex items-center justify-center font-bold text-lg shadow-sm">RM</div>
            <h1 className="text-xl font-semibold">Restoration</h1>
            <button className="p-2 text-white/90 hover:bg-white/10 rounded-full"><MoreVertical size={20} /></button>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Filter size={16} /></button>
        </div>

        {/* Symbol-Based Filter Navigation */}
        <div className="flex justify-center space-x-8 pb-2">
            {FILTER_TABS.map(t => (
                <button 
                    key={t.id} 
                    onClick={() => setFilter(t.id as any)}
                    className={`flex flex-col items-center space-y-1 group relative`}
                    title={t.label}
                >
                    <div className={`p-3 rounded-2xl transition-all duration-300 ${filter === t.id ? 'bg-white text-[#0078d4] shadow-lg scale-110' : 'bg-white/10 text-blue-100 hover:bg-white/20'}`}>
                        {t.icon}
                    </div>
                    <div className={`absolute -bottom-4 text-[9px] font-bold uppercase tracking-widest transition-opacity duration-300 ${filter === t.id ? 'opacity-100 text-white' : 'opacity-0'}`}>
                        {t.label}
                    </div>
                </button>
            ))}
        </div>
      </header>

      {/* List Content */}
      <div className="flex-1 bg-gray-100 p-2 overflow-y-auto pb-24 pt-4">
        {filteredLosses.map((loss) => (
            <div key={loss.id} onClick={() => handleSelectLoss(loss.id)} className="bg-white rounded-lg shadow-sm mb-2 overflow-hidden active:scale-[0.99] transition-transform">
                <div className="flex">
                    {/* Thumbnail Image */}
                    <div className="w-24 h-24 bg-gray-200 relative shrink-0">
                        {loss.rooms[0]?.photos[0] ? (
                            <img src={loss.rooms[0].photos[0].url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400"><MapPin /></div>
                        )}
                        <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white text-[9px] px-1 py-0.5 font-bold uppercase tracking-wider truncate flex justify-center">
                            {loss.currentStage || 'Intake'}
                        </div>
                    </div>
                    
                    {/* Details */}
                    <div className="p-3 flex-1 flex flex-col justify-center min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">{loss.client}</h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">Client Display Name #: {loss.id}</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">Claim #: {loss.policyNumber}</p>
                        <p className="text-xs text-gray-600 mt-1 truncate">{loss.address}</p>
                        <div className="mt-2 text-[10px] text-gray-400 flex items-center">
                            Last Update: {new Date().toLocaleDateString()}
                        </div>
                    </div>
                    
                    {/* Chevron */}
                    <div className="flex items-center justify-center px-2 text-blue-400">
                        <div className="bg-blue-50 p-1 rounded-full"><MoreVertical size={16} /></div>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
