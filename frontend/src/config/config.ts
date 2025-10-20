interface Config {
  BASE_URL: string;
  API_BASE_URL: string;
  WEBSOCKET_URL: string;
}

let config: Config | null = null;

export const loadConfig = async (): Promise<Config> => {
  if (config) {
    return config;
  }

  try {
    const isLocalDevelopment = window.location.hostname === 'localhost' && window.location.port === '3000';
    
    // Try to load development config first if in local development
    if (isLocalDevelopment) {
      try {
        const devResponse = await fetch('/config.dev.json');
        const devJsonConfig = await devResponse.json() as any;
        config = {
          BASE_URL: devJsonConfig.BASE_URL || 'http://localhost:3000',
          API_BASE_URL: devJsonConfig.API_BASE_URL || 'http://localhost:3001/api',
          WEBSOCKET_URL: devJsonConfig.WEBSOCKET_URL || 'ws://localhost:3001'
        };
        console.log('Development config loaded');
        return config!;
      } catch (devError) {
        console.warn('Failed to load config.dev.json, falling back to config.json');
      }
    }
    
    // Load production config
    const response = await fetch('/config.json');
    const jsonConfig = await response.json() as any;
    config = {
      BASE_URL: jsonConfig.BASE_URL || 'https://musable.breadjs.nl',
      API_BASE_URL: jsonConfig.API_BASE_URL || 'https://musable.breadjs.nl/api',
      WEBSOCKET_URL: jsonConfig.WEBSOCKET_URL || 'wss://musable.breadjs.nl'
    };
    return config;
  } catch (error) {
    console.warn('Failed to load config.json, using fallback config');
    
    // Fallback configuration 
    const isLocalDevelopment = window.location.hostname === 'localhost' && window.location.port === '3000';
    
    config = {
      BASE_URL: isLocalDevelopment ? window.location.origin : 'https://musable.breadjs.nl',
      API_BASE_URL: isLocalDevelopment ? '/api' : 'https://musable.breadjs.nl/api',
      WEBSOCKET_URL: isLocalDevelopment ? 'ws://localhost:3001' : 'wss://musable.breadjs.nl'
    };
    
    return config;
  }
};

export const getConfig = (): Config => {
  if (!config) {
    throw new Error('Config not loaded. Call loadConfig() first.');
  }
  return config;
};

export const getBaseUrl = (): string => {
  return getConfig().BASE_URL;
};

export const getApiBaseUrl = (): string => {
  return getConfig().API_BASE_URL;
};

export const getWebSocketUrl = (): string => {
  return getConfig().WEBSOCKET_URL;
};