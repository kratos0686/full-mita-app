
import React from 'react';
import MobileApp from './components/MobileApp';
import DesktopApp from './components/DesktopApp';
import { useAppContext } from './context/AppContext';
import OAuthHandler from './components/OAuthHandler';
import LaunchScreen from './components/LaunchScreen';
import { useWindowSize } from './hooks/useWindowSize';

const App: React.FC = () => {
  const { isAuthenticated } = useAppContext();
  const { width } = useWindowSize();

  if (isAuthenticated === null) {
    return <LaunchScreen />;
  }

  if (!isAuthenticated) {
    return <OAuthHandler />;
  }
  
  const isMobile = width !== undefined && width < 768;

  if (isMobile) {
      return <MobileApp />;
  } else {
      return <DesktopApp />;
  }
};

export default App;
