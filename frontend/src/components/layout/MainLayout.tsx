import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Player from '../player/Player';
import BottomNavigation from './BottomNavigation';
import ToastContainer from '../ToastContainer';
import { useToast } from '../../contexts/ToastContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { toasts, removeToast } = useToast();

  // Set CSS custom properties for mobile viewport height on mount
  React.useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  return (
    <div className="flex flex-col bg-black overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - hidden on mobile */}
        <Sidebar />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - hidden on mobile */}
          <div className="hidden md:block">
            <Header />
          </div>
          
          {/* Page content */}
          <main className="flex-1 overflow-auto bg-gradient-to-b from-gray-900 to-black p-6 pb-20 md:pb-6">
            <div className="max-w-screen-2xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
      
      {/* Bottom player - adjust bottom spacing for mobile */}
      <div className="mb-16 md:mb-0">
        <Player />
      </div>

      {/* Bottom navigation - mobile only */}
      <BottomNavigation />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default MainLayout;