"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShareToken = exports.getSharedSong = void 0;
const ShareToken_1 = __importDefault(require("../models/ShareToken"));
const Settings_1 = __importDefault(require("../models/Settings"));
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../utils/logger"));
const getSharedSong = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            res.status(400).json({ message: 'Invalid share token' });
            return;
        }
        const publicSharingEnabled = await Settings_1.default.getSetting('public_sharing_enabled');
        if (publicSharingEnabled !== 'true') {
            res.status(403).json({
                message: 'Public sharing is disabled. Login required to access this song.'
            });
            return;
        }
        const result = await ShareToken_1.default.validateAndIncrementAccess(token);
        if (!result.valid || !result.song) {
            res.status(404).json({ message: 'Invalid or expired share link' });
            return;
        }
        const sharedSong = {
            id: result.song.id,
            title: result.song.title,
            artist_name: result.song.artist_name,
            album_title: result.song.album_title,
            duration: result.song.duration,
            artwork_path: result.song.artwork_path,
        };
        logger_1.default.info(`Song accessed via share token: ${result.song.title} by ${result.song.artist_name} (Token: ${token.substring(0, 8)}...)`);
        res.json({
            song: sharedSong,
            sharing_enabled: true
        });
        return;
    }
    catch (error) {
        logger_1.default.error('Error getting shared song:', error);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
};
exports.getSharedSong = getSharedSong;
exports.createShareToken = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { songId, maxAccess, expiresInHours } = req.body;
    const userId = req.user.id;
    if (!songId || !Number.isInteger(songId)) {
        throw new errorHandler_1.AppError('Valid song ID is required', 400);
    }
    const publicSharingEnabled = await Settings_1.default.getSetting('public_sharing_enabled');
    if (publicSharingEnabled !== 'true') {
        throw new errorHandler_1.AppError('Public sharing is disabled', 403);
    }
    const shareToken = await ShareToken_1.default.create({
        song_id: songId,
        created_by: userId,
        max_access: maxAccess,
        expires_in_hours: expiresInHours
    });
    logger_1.default.info(`Share token created for song ${songId} by user ${userId}`);
    const shareUrl = `http://localhost:3000/share/${shareToken.token}`;
    res.status(201).json({
        success: true,
        data: {
            token: shareToken.token,
            shareUrl
        }
    });
});
//# sourceMappingURL=shareController.js.map