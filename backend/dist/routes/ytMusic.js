"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ytMusicService_1 = __importDefault(require("../services/ytMusicService"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
ytMusicService_1.default.initialize();
router.get('/search', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Query parameter is required'
        });
    }
    const results = await ytMusicService_1.default.searchMusic(query);
    res.json({
        success: true,
        data: {
            results,
            source: 'youtube-music'
        }
    });
}));
router.post('/download/:videoId', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { videoId } = req.params;
    try {
        const downloadId = await ytMusicService_1.default.downloadSong(videoId);
        res.json({
            success: true,
            data: {
                downloadId,
                message: 'Download started'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to start download'
        });
    }
}));
router.get('/download/:downloadId/progress', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { downloadId } = req.params;
    const progress = ytMusicService_1.default.getDownloadProgress(downloadId);
    if (!progress) {
        return res.status(404).json({
            success: false,
            error: 'Download not found'
        });
    }
    res.json({
        success: true,
        data: progress
    });
}));
router.get('/downloads', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const downloads = ytMusicService_1.default.getAllActiveDownloads();
    res.json({
        success: true,
        data: downloads
    });
}));
exports.default = router;
//# sourceMappingURL=ytMusic.js.map