"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_session_1 = __importDefault(require("express-session"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const config_1 = __importDefault(require("./config/config"));
const initDb_1 = require("./utils/initDb");
const seedDb_1 = require("./utils/seedDb");
const logger_1 = __importDefault(require("./utils/logger"));
const errorHandler_1 = require("./middleware/errorHandler");
const roomService_1 = require("./services/roomService");
const deviceSyncService_1 = require("./services/deviceSyncService");
const auth_1 = __importDefault(require("./routes/auth"));
const library_1 = __importDefault(require("./routes/library"));
const playlists_1 = __importDefault(require("./routes/playlists"));
const history_1 = __importDefault(require("./routes/history"));
const admin_1 = __importDefault(require("./routes/admin"));
const stream_1 = __importDefault(require("./routes/stream"));
const favorites_1 = __importDefault(require("./routes/favorites"));
const share_1 = __importDefault(require("./routes/share"));
const youtube_1 = __importDefault(require("./routes/youtube"));
const ytMusic_1 = __importDefault(require("./routes/ytMusic"));
const rooms_1 = __importDefault(require("./routes/rooms"));
const devices_1 = __importDefault(require("./routes/devices"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: config_1.default.corsOrigin,
        methods: ["GET", "POST"],
        credentials: false
    }
});
const SQLiteStore = require('connect-sqlite3')(express_session_1.default);
const uploadsDir = path_1.default.resolve(config_1.default.uploadPath);
const musicDir = path_1.default.join(uploadsDir, 'music');
const artworkDir = path_1.default.join(uploadsDir, 'artwork');
const profilePicturesDir = path_1.default.join(uploadsDir, 'profile-pictures');
[uploadsDir, musicDir, artworkDir, profilePicturesDir].forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
app.use('/uploads', express_1.default.static(uploadsDir, {
    setHeaders: (res, path, stat) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'false');
    }
}));
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:", "http://localhost:3001"],
            mediaSrc: ["'self'", "blob:", "http://localhost:3001"],
            connectSrc: ["'self'", "http://localhost:3001"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
        },
    },
}));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'false');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});
app.use((0, cors_1.default)({
    origin: '*',
    credentials: false,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, express_session_1.default)({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: path_1.default.dirname(config_1.default.databasePath)
    }),
    secret: config_1.default.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config_1.default.nodeEnv === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));
app.use('/api/auth', auth_1.default);
app.use('/api/library', library_1.default);
app.use('/api/playlists', playlists_1.default);
app.use('/api/history', history_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/stream', stream_1.default);
app.use('/api/favorites', favorites_1.default);
app.use('/api/share', share_1.default);
app.use('/api/youtube', youtube_1.default);
app.use('/api/ytmusic', ytMusic_1.default);
app.use('/api/rooms', (0, rooms_1.default)(io));
app.use('/api/devices', devices_1.default);
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
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
            favorites: '/api/favorites'
        }
    });
});
app.use(errorHandler_1.errorHandler);
async function startServer() {
    try {
        await (0, initDb_1.initializeDatabase)();
        await (0, seedDb_1.seedDatabase)();
        const roomService = new roomService_1.RoomService(io);
        roomService.startPeriodicSync();
        const deviceSyncService = new deviceSyncService_1.DeviceSyncService(io);
        logger_1.default.info('🔄 Device sync service initialized');
        server.listen(config_1.default.port, '0.0.0.0', () => {
            logger_1.default.info(`🎵 Musable server running on port ${config_1.default.port}`);
            logger_1.default.info(`🌍 Environment: ${config_1.default.nodeEnv}`);
            logger_1.default.info(`📁 Upload path: ${config_1.default.uploadPath}`);
            logger_1.default.info(`🎵 Library paths: ${config_1.default.libraryPaths.join(', ')}`);
            logger_1.default.info(`🔗 CORS origin: ${config_1.default.corsOrigin}`);
            logger_1.default.info(`🔌 WebSocket server enabled for real-time rooms`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
}
process.on('SIGINT', async () => {
    logger_1.default.info('Received SIGINT, shutting down gracefully');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger_1.default.info('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});
if (require.main === module) {
    startServer();
}
exports.default = app;
//# sourceMappingURL=app.js.map