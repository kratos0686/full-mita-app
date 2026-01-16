
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

export type Tab = 'dashboard' | 'scanner' | 'logs' | 'equipment' | 'photos' | 'project' | 'analysis' | 'reference' | 'forms';

interface AppContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  isAuthenticated: boolean | null;
  setAuthentication: (status: boolean) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      // Short delay to allow splash screen to show
      await new Promise(resolve => setTimeout(resolve, 1200)); 
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsAuthenticated(hasKey);
      } else {
        // Fallback for non-AI Studio environments
        setIsAuthenticated(true); // Default to authenticated for local dev
      }
    };
    checkAuthStatus();
  }, []);
  
  const setAuthentication = (status: boolean) => {
    setIsAuthenticated(status);
  }

  const value = {
    activeTab,
    setActiveTab,
    selectedProjectId,
    setSelectedProjectId,
    isAuthenticated,
    setAuthentication
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
