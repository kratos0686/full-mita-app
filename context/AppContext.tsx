import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { addScanToProject as mockAddScanToProject } from '../data/mockApi';
import { RoomScan, Tab, User, Permission, AppSettings } from '../types';

interface AppContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setAuthentication: (status: boolean) => void;
  accessToken: string;
  setAccessToken: (token: string) => void;
  addScanToProject: (projectId: string, scan: RoomScan) => Promise<void>;
  isOnline: boolean;
  hasPermission: (permission: Permission) => boolean;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'English (US)',
  dateFormat: 'Month/Day/Year',
  timeFormat: 'Twelve Hours (AM/PM)',
  units: {
    temperature: 'Fahrenheit',
    dimension: 'LF Inch',
    humidity: 'Grains / Pound',
    volume: 'Pint',
  },
  copyPhotosToGallery: true,
  defaultView: 'Timeline',
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addScanToProject = async (projectId: string, scan: RoomScan) => {
    await mockAddScanToProject(projectId, scan);
  };

  const hasPermission = (permission: Permission): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === 'SuperAdmin') return true; 
      return currentUser.permissions.includes(permission);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const value = {
    activeTab,
    setActiveTab,
    selectedProjectId,
    setSelectedProjectId,
    currentUser,
    setCurrentUser,
    isAuthenticated,
    setAuthentication: setIsAuthenticated,
    accessToken,
    setAccessToken,
    addScanToProject,
    isOnline,
    hasPermission,
    settings,
    updateSettings,
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