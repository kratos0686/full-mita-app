
import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import { addScanToProject as mockAddScanToProject, getProjects } from '../data/mockApi';
import { RoomScan, Tab, User, Permission, UserRole, AppSettings } from '../types';

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
  const [activeTab, _setActiveTab] = useState<Tab>('dashboard');
  const [selectedProjectId, _setSelectedProjectId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Flag to block pushing state when reacting to popstate (back button)
  const isPopState = useRef(false);

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

  // --- Router Logic ---

  useEffect(() => {
    const handlePopState = () => {
      isPopState.current = true;
      const path = window.location.pathname;
      const parts = path.split('/').filter(Boolean);

      // Default
      if (parts.length === 0) {
        _setActiveTab('dashboard');
        _setSelectedProjectId(null);
        return;
      }

      // /projects...
      if (parts[0] === 'projects') {
          if (parts[1] === 'new') {
             _setActiveTab('new-loss');
             _setSelectedProjectId(null);
          } else {
             _setActiveTab('losses');
             _setSelectedProjectId(null);
          }
          return;
      }

      // /project/:id...
      if (parts[0] === 'project' && parts[1]) {
          const id = parts[1];
          _setSelectedProjectId(id);
          
          if (parts[2] === 'equipment') _setActiveTab('equipment');
          else if (parts[2] === 'scope') _setActiveTab('tic-sheet');
          else if (parts[2] === 'photos') _setActiveTab('photos');
          else if (parts[2] === 'logs') _setActiveTab('losses'); // Desktop logs are usually handled in tabs, handled below
          else _setActiveTab('loss-detail');
          return;
      }

      // /admin, /settings...
      if (parts[0] === 'admin') _setActiveTab('admin');
      if (parts[0] === 'settings') _setActiveTab('settings');
      if (parts[0] === 'reporting') _setActiveTab('reporting');
      if (parts[0] === 'billing') _setActiveTab('billing');
      if (parts[0] === 'downloads') _setActiveTab('downloads');
      if (parts[0] === 'scanner') _setActiveTab('scanner');
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState(); // Handle initial load

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync State to URL
  useEffect(() => {
    if (isPopState.current) {
        isPopState.current = false;
        return;
    }

    let path = '/';
    
    switch (activeTab) {
        case 'dashboard': path = '/'; break;
        case 'losses': path = '/projects'; break;
        case 'new-loss': 
        case 'new-project': path = '/projects/new'; break;
        case 'settings': path = '/settings'; break;
        case 'admin': path = '/admin'; break;
        case 'reporting': path = '/reporting'; break;
        case 'billing': path = '/billing'; break;
        case 'downloads': path = '/downloads'; break;
        case 'scanner': path = '/scanner'; break;
        
        case 'loss-detail':
        case 'project':
             if (selectedProjectId) path = `/project/${selectedProjectId}`;
             else path = '/projects';
             break;
        case 'equipment':
             if (selectedProjectId) path = `/project/${selectedProjectId}/equipment`;
             break;
        case 'tic-sheet':
        case 'line-items':
             if (selectedProjectId) path = `/project/${selectedProjectId}/scope`;
             break;
        case 'photos':
             if (selectedProjectId) path = `/project/${selectedProjectId}/photos`;
             break;
        default: path = '/';
    }

    if (window.location.pathname !== path) {
        window.history.pushState(null, '', path);
    }

  }, [activeTab, selectedProjectId]);

  const setActiveTab = (tab: Tab) => _setActiveTab(tab);
  const setSelectedProjectId = (id: string | null) => _setSelectedProjectId(id);

  // --------------------

  const setAuthentication = (status: boolean) => {
    setIsAuthenticated(status);
  }
  
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
    setAuthentication,
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
