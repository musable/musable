import cors from 'cors';
import express from 'express';
import session from 'express-session';
import fs from 'fs';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

import config from './config/config.js';
import { errorHandler } from './middleware/errorHandler.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import favoritesRoutes from './routes/favorites.js';
import historyRoutes from './routes/history.js';
import libraryRoutes from './routes/library.js';
import playlistRoutes from './routes/playlists.js';
import createRoomRoutes from './routes/rooms.js';
import shareRoutes from './routes/share.js';
import streamRoutes from './routes/stream.js';
import youtubeRoutes from './routes/youtube.js';
import ytMusicRoutes from './routes/ytMusic.js';
import { RoomService } from './services/roomService.js';
import { initializeDatabase } from './utils/initDb.js';
import logger from './utils/logger.js';
import { seedDatabase } from './utils/seedDb.js';

const app = express();
const server = createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: false,
  },
});

import SQLiteStoreFactory from 'connect-sqlite3';

const SQLiteStore = SQLiteStoreFactory(session);

// Define upload directories early
const uploadsDir = path.resolve(config.uploadPath);
const musicDir = path.join(uploadsDir, 'music');
const artworkDir = path.join(uploadsDir, 'artwork');
const profilePicturesDir = path.join(uploadsDir, 'profile-pictures');

[uploadsDir, musicDir, artworkDir, profilePicturesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// CORS-enabled static file serving with setHeaders callback
app.use(
  '/uploads',
  express.static(uploadsDir, {
    setHeaders: (res, path, stat) => {
      // Set CORS headers directly in the setHeaders callback
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With',
      );
      res.setHeader('Access-Control-Allow-Credentials', 'false');
    },
  }),
);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false, // Disable CORP to allow cross-origin static files
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'http://localhost:3001'],
        mediaSrc: ["'self'", 'blob:', 'http://localhost:3001'],
        connectSrc: ["'self'", 'http://localhost:3001'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
  }),
);

// Manual CORS headers for all requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  );
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With',
  );
  res.header('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Keep the cors middleware as backup
app.use(
  cors({
    origin: '*',
    credentials: false,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

app.use(morgan('combined'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  session({
    store: new SQLiteStore({
      db: 'sessions.db',
      dir: path.dirname(config.databasePath),
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

// Rate limiting removed for development

app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/ytmusic', ytMusicRoutes);
app.use('/api/rooms', createRoomRoutes(io));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Serve frontend static files in production (Docker)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));

  // Serve index.html for all non-API routes (SPA support)
  app.get('*', (req, res, next) => {
    // Skip API routes and health check
    if (
      req.path.startsWith('/api') ||
      req.path === '/health' ||
      req.path.startsWith('/uploads')
    ) {
      return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  // Development mode - show API info
  app.get('/', (req, res) => {
    res.json({
      message: 'Musable API Server',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        library: '/api/library',
        playlists: '/api/playlists',
        history: '/api/history',
        admin: '/api/admin',
        favorites: '/api/favorites',
      },
    });
  });
}

app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    await initializeDatabase();
    await seedDatabase();

    // Initialize room service
    const roomService = new RoomService(io);
    roomService.startPeriodicSync();

    server.listen(config.port, '0.0.0.0', () => {
      logger.info(`🎵 Musable server running on port ${config.port}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`📁 Upload path: ${config.uploadPath}`);
      logger.info(`🎵 Library paths: ${config.libraryPaths.join(', ')}`);
      logger.info(`🔗 CORS origin: ${config.corsOrigin}`);
      logger.info(`🔌 WebSocket server enabled for real-time rooms`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
