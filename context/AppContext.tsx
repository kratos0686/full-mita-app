
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { addScanToProject as mockAddScanToProject } from '../data/mockApi';
import { RoomScan, Tab } from '../types';

interface AppContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  isAuthenticated: boolean | null;
  setAuthentication: (status: boolean) => void;
  addScanToProject: (projectId: string, scan: RoomScan) => Promise<void>;
  isOnline: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const timer = setTimeout(() => {
      // Simulate auth check
      setIsAuthenticated(false);
    }, 1500); 

    return () => {
        clearTimeout(timer);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const setAuthentication = (status: boolean) => {
    setIsAuthenticated(status);
  }
  
  const addScanToProject = async (projectId: string, scan: RoomScan) => {
    await mockAddScanToProject(projectId, scan);
  };

  const value = {
    activeTab,
    setActiveTab,
    selectedProjectId,
    setSelectedProjectId,
    isAuthenticated,
    setAuthentication,
    addScanToProject,
    isOnline,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
