"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearHistory = exports.getListeningStats = exports.getMostPlayed = exports.getRecentlyPlayed = exports.getUserHistory = exports.trackPlay = void 0;
const joi_1 = __importDefault(require("joi"));
const ListenHistory_1 = __importDefault(require("../models/ListenHistory"));
const Song_1 = __importDefault(require("../models/Song"));
const errorHandler_1 = require("../middleware/errorHandler");
const trackPlaySchema = joi_1.default.object({
    songId: joi_1.default.number().integer().positive().required(),
    durationPlayed: joi_1.default.number().integer().min(0),
    completed: joi_1.default.boolean().default(false)
});
exports.trackPlay = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = trackPlaySchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { songId, durationPlayed, completed } = req.body;
    const userId = req.user.id;
    const song = await Song_1.default.findById(songId);
    if (!song) {
        throw new errorHandler_1.AppError('Song not found', 404);
    }
    const historyEntry = await ListenHistory_1.default.create({
        user_id: userId,
        song_id: songId,
        duration_played: durationPlayed,
        completed
    });
    res.status(201).json({
        success: true,
        data: { historyEntry }
    });
});
exports.getUserHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;
    const history = await ListenHistory_1.default.getUserHistory(userId, parseInt(limit), parseInt(offset));
    res.json({
        success: true,
        data: { history }
    });
});
exports.getRecentlyPlayed = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 20 } = req.query;
    const userId = req.user.id;
    const recentHistoryData = await ListenHistory_1.default.getRecentlyPlayedSongs(userId, parseInt(limit));
    const songs = recentHistoryData.map(item => ({
        id: item.song_id,
        title: item.song_title,
        artist_id: 0,
        artist_name: item.artist_name,
        album_id: 0,
        album_title: item.album_title,
        file_path: '',
        duration: item.song_duration,
        artwork_path: item.artwork_path,
        source: 'local',
        created_at: item.played_at,
        updated_at: item.played_at
    }));
    res.json({
        success: true,
        data: { songs }
    });
});
exports.getMostPlayed = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 20 } = req.query;
    const userId = req.user.id;
    const mostPlayedSongs = await ListenHistory_1.default.getMostPlayedSongs(userId, parseInt(limit));
    res.json({
        success: true,
        data: { songs: mostPlayedSongs }
    });
});
exports.getListeningStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const stats = await ListenHistory_1.default.getListeningStats(userId);
    const trends = await ListenHistory_1.default.getListeningTrends(userId);
    const topArtists = await ListenHistory_1.default.getUserTopArtists(userId);
    const topAlbums = await ListenHistory_1.default.getUserTopAlbums(userId);
    res.json({
        success: true,
        data: {
            stats,
            trends,
            topArtists,
            topAlbums
        }
    });
});
exports.clearHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const deletedCount = await ListenHistory_1.default.deleteUserHistory(userId);
    res.json({
        success: true,
        data: {
            message: `${deletedCount} history entries cleared`
        }
    });
});
//# sourceMappingURL=historyController.js.map