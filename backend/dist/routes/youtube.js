"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const youtubeService_1 = require("../services/youtubeService");
const auth_1 = require("../middleware/auth");
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
router.get('/search', auth_1.authenticateToken, async (req, res) => {
    try {
        const { q: query, limit = 20 } = req.query;
        if (!query || typeof query !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Query parameter "q" is required'
            });
            return;
        }
        const limitNumber = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
        logger_1.default.info(`🔍 YouTube search requested: "${query}" (limit: ${limitNumber}) by user ${req.user?.id}`);
        const results = await youtubeService_1.youtubeService.searchImages(query, limitNumber);
        res.json({
            success: true,
            data: results,
            count: results.length,
            query: query,
            limit: limitNumber
        });
        return;
    }
    catch (error) {
        logger_1.default.error('YouTube search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search for images'
        });
        return;
    }
});
router.get('/album-artwork', auth_1.authenticateToken, async (req, res) => {
    try {
        const { artist, album } = req.query;
        if (!artist || !album || typeof artist !== 'string' || typeof album !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Both "artist" and "album" query parameters are required'
            });
            return;
        }
        logger_1.default.info(`🎨 Album artwork search requested: "${artist}" - "${album}" by user ${req.user?.id}`);
        const results = await youtubeService_1.youtubeService.searchAlbumArtwork(artist, album);
        res.json({
            success: true,
            data: results,
            count: results.length,
            artist: artist,
            album: album
        });
        return;
    }
    catch (error) {
        logger_1.default.error('Album artwork search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search for album artwork'
        });
        return;
    }
});
router.get('/thumbnail/:videoId', auth_1.authenticateToken, (req, res) => {
    try {
        const { videoId } = req.params;
        const { quality = 'maxres' } = req.query;
        if (!videoId) {
            res.status(400).json({
                success: false,
                error: 'Video ID is required'
            });
            return;
        }
        const validQualities = ['maxres', 'standard', 'high', 'medium'];
        const requestedQuality = validQualities.includes(quality)
            ? quality
            : 'maxres';
        const thumbnailUrl = youtubeService_1.youtubeService.getHighQualityThumbnail(videoId, requestedQuality);
        res.json({
            success: true,
            data: {
                videoId: videoId,
                quality: requestedQuality,
                url: thumbnailUrl
            }
        });
        return;
    }
    catch (error) {
        logger_1.default.error('Thumbnail URL generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate thumbnail URL'
        });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=youtube.js.map