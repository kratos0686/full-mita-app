
import React, { useEffect, useState } from 'react';
import MobileApp from './components/MobileApp';
import DesktopApp from './components/DesktopApp';
import { useAppContext } from './context/AppContext';
import OAuthHandler from './components/OAuthHandler';
import LaunchScreen from './components/LaunchScreen';
import { useWindowSize } from './hooks/useWindowSize';
import CommandCenter from './components/CommandCenter';
import EventToast from './components/EventToast';

const App: React.FC = () => {
  const { isAuthenticated, isOnline } = useAppContext();
  const { width } = useWindowSize();
  const [isCliOpen, setIsCliOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsCliOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAuthenticated === null) {
    return <LaunchScreen />;
  }

  if (!isAuthenticated) {
    return <OAuthHandler />;
  }
  
  const isMobile = width !== undefined && width < 768;

  return (
    <>
      {isMobile ? <MobileApp /> : <DesktopApp />}
      <EventToast />
      <CommandCenter isOpen={isCliOpen} onClose={() => setIsCliOpen(false)} />
      {!isOnline && (
          <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black text-center py-1 z-[9999] tracking-widest uppercase shadow-lg">
              Field Protocol: Offline Mode Active • Data Saved Locally
          </div>
      )}
    </>
  );
};

export default App;
