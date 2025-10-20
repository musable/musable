"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlaylistFollowStatus = exports.getPlaylistsWithFollowStatus = exports.getFollowedPlaylists = exports.togglePlaylistFollow = exports.unfollowPlaylist = exports.followPlaylist = exports.searchPlaylists = exports.reorderPlaylistSongs = exports.removeSongFromPlaylist = exports.addSongToPlaylist = exports.deletePlaylist = exports.updatePlaylist = exports.getPlaylist = exports.getAllPlaylists = exports.getPublicPlaylists = exports.getUserPlaylists = exports.createPlaylist = void 0;
const joi_1 = __importDefault(require("joi"));
const Playlist_1 = __importDefault(require("../models/Playlist"));
const PlaylistFollows_1 = __importDefault(require("../models/PlaylistFollows"));
const Song_1 = __importDefault(require("../models/Song"));
const errorHandler_1 = require("../middleware/errorHandler");
const createPlaylistSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(255).required(),
    description: joi_1.default.string().max(1000).allow(''),
    is_public: joi_1.default.boolean().default(false)
});
const updatePlaylistSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(255),
    description: joi_1.default.string().max(1000).allow(''),
    is_public: joi_1.default.boolean()
});
const addSongSchema = joi_1.default.object({
    songId: joi_1.default.number().integer().positive().required()
});
const reorderSongsSchema = joi_1.default.object({
    songIds: joi_1.default.array().items(joi_1.default.number().integer().positive()).required()
});
exports.createPlaylist = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = createPlaylistSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { name, description, is_public } = req.body;
    const userId = req.user.id;
    const playlist = await Playlist_1.default.create({
        name,
        description,
        user_id: userId,
        is_public
    });
    res.status(201).json({
        success: true,
        data: { playlist }
    });
});
exports.getUserPlaylists = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const playlists = await Playlist_1.default.getUserPlaylists(userId);
    res.json({
        success: true,
        data: { playlists }
    });
});
exports.getPublicPlaylists = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const playlists = await Playlist_1.default.getPublicPlaylists();
    res.json({
        success: true,
        data: { playlists }
    });
});
exports.getAllPlaylists = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user?.is_admin) {
        throw new errorHandler_1.AppError('Admin access required', 403);
    }
    const playlists = await Playlist_1.default.getAllPlaylists();
    res.json({
        success: true,
        data: { playlists }
    });
});
exports.getPlaylist = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user?.id;
    const canAccess = await Playlist_1.default.canUserAccessPlaylist(playlistId, userId);
    if (!canAccess) {
        throw new errorHandler_1.AppError('Playlist not found or access denied', 404);
    }
    const playlist = await Playlist_1.default.findWithDetails(playlistId);
    if (!playlist) {
        throw new errorHandler_1.AppError('Playlist not found', 404);
    }
    const songs = await Playlist_1.default.getPlaylistSongs(playlistId);
    res.json({
        success: true,
        data: {
            playlist,
            songs
        }
    });
});
exports.updatePlaylist = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = updatePlaylistSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user.id;
    const canModify = await Playlist_1.default.canUserModifyPlaylist(playlistId, userId, req.user.is_admin);
    if (!canModify) {
        throw new errorHandler_1.AppError('Permission denied', 403);
    }
    await Playlist_1.default.update(playlistId, req.body);
    const updatedPlaylist = await Playlist_1.default.findWithDetails(playlistId);
    res.json({
        success: true,
        data: { playlist: updatedPlaylist }
    });
});
exports.deletePlaylist = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user.id;
    const canModify = await Playlist_1.default.canUserModifyPlaylist(playlistId, userId, req.user.is_admin);
    if (!canModify) {
        throw new errorHandler_1.AppError('Permission denied', 403);
    }
    await Playlist_1.default.delete(playlistId);
    res.json({
        success: true,
        data: { message: 'Playlist deleted successfully' }
    });
});
exports.addSongToPlaylist = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = addSongSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { id } = req.params;
    const { songId } = req.body;
    const playlistId = parseInt(id);
    const userId = req.user.id;
    const canModify = await Playlist_1.default.canUserModifyPlaylist(playlistId, userId, req.user.is_admin);
    if (!canModify) {
        throw new errorHandler_1.AppError('Permission denied', 403);
    }
    const song = await Song_1.default.findById(songId);
    if (!song) {
        throw new errorHandler_1.AppError('Song not found', 404);
    }
    await Playlist_1.default.addSong(playlistId, songId);
    res.json({
        success: true,
        data: { message: 'Song added to playlist successfully' }
    });
});
exports.removeSongFromPlaylist = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id, songId } = req.params;
    const playlistId = parseInt(id);
    const songIdNum = parseInt(songId);
    const userId = req.user.id;
    const canModify = await Playlist_1.default.canUserModifyPlaylist(playlistId, userId, req.user.is_admin);
    if (!canModify) {
        throw new errorHandler_1.AppError('Permission denied', 403);
    }
    await Playlist_1.default.removeSong(playlistId, songIdNum);
    res.json({
        success: true,
        data: { message: 'Song removed from playlist successfully' }
    });
});
exports.reorderPlaylistSongs = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = reorderSongsSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { id } = req.params;
    const { songIds } = req.body;
    const playlistId = parseInt(id);
    const userId = req.user.id;
    const canModify = await Playlist_1.default.canUserModifyPlaylist(playlistId, userId, req.user.is_admin);
    if (!canModify) {
        throw new errorHandler_1.AppError('Permission denied', 403);
    }
    await Playlist_1.default.reorderSongs(playlistId, songIds);
    res.json({
        success: true,
        data: { message: 'Playlist songs reordered successfully' }
    });
});
exports.searchPlaylists = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q: query } = req.query;
    if (!query) {
        throw new errorHandler_1.AppError('Search query is required', 400);
    }
    const userId = req.user?.id;
    const playlists = await Playlist_1.default.searchPlaylists(query, userId);
    res.json({
        success: true,
        data: { playlists }
    });
});
exports.followPlaylist = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user.id;
    const playlist = await Playlist_1.default.findById(playlistId);
    if (!playlist) {
        throw new errorHandler_1.AppError('Playlist not found', 404);
    }
    if (playlist.user_id === userId) {
        throw new errorHandler_1.AppError('You cannot follow your own playlist', 400);
    }
    const canAccess = await Playlist_1.default.canUserAccessPlaylist(playlistId, userId);
    if (!canAccess) {
        throw new errorHandler_1.AppError('Playlist not found or access denied', 404);
    }
    await PlaylistFollows_1.default.followPlaylist(userId, playlistId);
    res.json({
        success: true,
        data: { message: 'Playlist followed successfully' }
    });
});
exports.unfollowPlaylist = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user.id;
    await PlaylistFollows_1.default.unfollowPlaylist(userId, playlistId);
    res.json({
        success: true,
        data: { message: 'Playlist unfollowed successfully' }
    });
});
exports.togglePlaylistFollow = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user.id;
    const playlist = await Playlist_1.default.findById(playlistId);
    if (!playlist) {
        throw new errorHandler_1.AppError('Playlist not found', 404);
    }
    if (playlist.user_id === userId) {
        throw new errorHandler_1.AppError('You cannot follow your own playlist', 400);
    }
    const canAccess = await Playlist_1.default.canUserAccessPlaylist(playlistId, userId);
    if (!canAccess) {
        throw new errorHandler_1.AppError('Playlist not found or access denied', 404);
    }
    const result = await PlaylistFollows_1.default.togglePlaylistFollow(userId, playlistId);
    res.json({
        success: true,
        data: {
            isFollowing: result.isFollowing,
            message: result.isFollowing ? 'Playlist followed successfully' : 'Playlist unfollowed successfully'
        }
    });
});
exports.getFollowedPlaylists = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const playlists = await PlaylistFollows_1.default.getUserFollowedPlaylists(userId);
    res.json({
        success: true,
        data: { playlists }
    });
});
exports.getPlaylistsWithFollowStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const includeOwn = req.query.includeOwn !== 'false';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const playlists = await PlaylistFollows_1.default.getPlaylistsWithFollowStatus(userId, includeOwn, limit, offset);
    res.json({
        success: true,
        data: { playlists }
    });
});
exports.getPlaylistFollowStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user.id;
    const isFollowing = await PlaylistFollows_1.default.isFollowingPlaylist(userId, playlistId);
    res.json({
        success: true,
        data: { isFollowing }
    });
});
//# sourceMappingURL=playlistController.js.map