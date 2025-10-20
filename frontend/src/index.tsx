import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';
import { loadConfig } from './config/config';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            // Define default options
            className: '',
            duration: 4000,
            style: {
              background: 'rgba(30, 30, 30, 0.95)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
            },
            // Default options for specific types
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
            loading: {
              duration: Infinity,
              iconTheme: {
                primary: '#82AAF2',
                secondary: '#fff',
              },
            },
          }}
        />
      </BrowserRouter>
    </React.StrictMode>
  );
};

// Add debugging for webpack hot reload events
if ((module as any).hot) {
  console.log('🔥 Hot reload is enabled');
  
  // Log when hot reload accepts updates
  (module as any).hot.accept(() => {
    console.log('🔥 Hot reload: Module accepted update');
  });
  
  // Log when hot reload is about to dispose
  (module as any).hot.dispose(() => {
    console.log('🔥 Hot reload: Module disposing');
  });
}

// Add debugging for beforeunload (page refresh)
window.addEventListener('beforeunload', (event) => {
  console.log('🔄 Page is about to reload/unload');
  console.trace('🔄 Stack trace for page reload');
});

// Add global error handlers to prevent auto-refresh on errors
window.addEventListener('error', (event) => {
  console.log('❌ Global error caught:', event.error);
  // Don't let errors bubble up to cause page refresh
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.log('❌ Unhandled promise rejection caught:', event.reason);
  // Don't let promise rejections cause page refresh
  event.preventDefault();
});

// Load configuration before rendering the app
loadConfig()
  .then(() => {
    console.log('Configuration loaded successfully');
    renderApp();
  })
  .catch((error) => {
    console.warn('Failed to load configuration, using fallback:', error);
    renderApp(); // Render with fallback config
  });

// PWA functionality removed