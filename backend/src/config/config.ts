import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  databasePath: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  sessionSecret: string;
  maxFileSize: number;
  uploadPath: string;
  libraryPaths: string[];
  supportedFormats: string[];
  youtubeEnabled: boolean;
  youtubeDownloadPath: string;
  youtubeApiKey: string | undefined;
  adminEmail: string;
  adminPassword: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  corsOrigin: string;
  logLevel: string;
  lastfmApiKey?: string;
  topsDefaultTtlDays: number;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || './musable.db',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  sessionSecret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10),
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  libraryPaths: JSON.parse(process.env.LIBRARY_PATHS || '["./music"]'),
  supportedFormats: JSON.parse(
    process.env.SUPPORTED_FORMATS || '["mp3","flac","wav","m4a","aac","ogg"]',
  ),
  youtubeEnabled: process.env.YOUTUBE_ENABLED === 'true',
  youtubeDownloadPath: process.env.YOUTUBE_DOWNLOAD_PATH || './downloads',
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@admin.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || '10000',
    10,
  ),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info',
  lastfmApiKey: process.env.LASTFM_API_KEY,
  topsDefaultTtlDays: parseInt(process.env.TOPS_DEFAULT_TTL_DAYS || '30', 10),
};

export default config;
