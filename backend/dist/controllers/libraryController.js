"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlbumFollowStatus = exports.getAlbumsWithFollowStatus = exports.getFollowedAlbums = exports.toggleAlbumFollow = exports.unfollowAlbum = exports.followAlbum = exports.getScanStatus = exports.startLibraryScan = exports.getLibraryStats = exports.getGenres = exports.getRecentAlbums = exports.getAlbum = exports.getAllAlbums = exports.getArtist = exports.getAllArtists = exports.getRandomSongs = exports.getSong = exports.getAllSongs = void 0;
const Song_1 = __importDefault(require("../models/Song"));
const Artist_1 = __importDefault(require("../models/Artist"));
const Album_1 = __importDefault(require("../models/Album"));
const AlbumFollows_1 = __importDefault(require("../models/AlbumFollows"));
const libraryScanner_1 = __importDefault(require("../services/libraryScanner"));
const ytMusicService_1 = __importDefault(require("../services/ytMusicService"));
const errorHandler_1 = require("../middleware/errorHandler");
exports.getAllSongs = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { search, artist, album, genre, limit = 50, offset = 0, includeYTMusic = 'true' } = req.query;
    let songs;
    let ytMusicResults = [];
    if (search) {
        songs = await Song_1.default.searchSongs(search);
        console.log(`🎵 Search query: "${search}", includeYTMusic: "${includeYTMusic}"`);
        if (includeYTMusic === 'true') {
            try {
                console.log('🎵 Searching YouTube Music...');
                ytMusicResults = await ytMusicService_1.default.searchMusic(search);
                console.log(`🎵 Found ${ytMusicResults.length} YouTube Music results`);
            }
            catch (error) {
                console.error('YouTube Music search error:', error);
            }
        }
    }
    else if (genre) {
        songs = await Song_1.default.getSongsByGenre(genre);
    }
    else if (artist) {
        songs = await Song_1.default.getSongsByArtist(parseInt(artist));
    }
    else if (album) {
        songs = await Song_1.default.getSongsByAlbum(parseInt(album));
    }
    else {
        songs = await Song_1.default.getAllWithDetails();
    }
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    const paginatedSongs = songs.slice(offsetNum, offsetNum + limitNum);
    res.json({
        success: true,
        data: {
            songs: paginatedSongs,
            ytMusicResults: search ? ytMusicResults : [],
            total: songs.length,
            limit: limitNum,
            offset: offsetNum,
            hasYTMusicResults: ytMusicResults.length > 0
        }
    });
});
exports.getSong = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const song = await Song_1.default.findWithDetails(parseInt(id));
    if (!song) {
        throw new errorHandler_1.AppError('Song not found', 404);
    }
    res.json({
        success: true,
        data: { song }
    });
});
exports.getRandomSongs = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 50 } = req.query;
    const songs = await Song_1.default.getRandomSongs(parseInt(limit));
    res.json({
        success: true,
        data: { songs }
    });
});
exports.getAllArtists = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { search } = req.query;
    let artists;
    if (search) {
        artists = await Artist_1.default.search(search);
    }
    else {
        artists = await Artist_1.default.getAllWithStats();
    }
    res.json({
        success: true,
        data: { artists }
    });
});
exports.getArtist = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const artist = await Artist_1.default.findById(parseInt(id));
    if (!artist) {
        throw new errorHandler_1.AppError('Artist not found', 404);
    }
    const songs = await Song_1.default.getSongsByArtist(artist.id);
    const albums = await Album_1.default.getAlbumsByArtist(artist.id);
    res.json({
        success: true,
        data: {
            artist,
            songs,
            albums
        }
    });
});
exports.getAllAlbums = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { search, artist } = req.query;
    let albums;
    if (search) {
        albums = await Album_1.default.search(search);
    }
    else if (artist) {
        albums = await Album_1.default.getAlbumsByArtist(parseInt(artist));
    }
    else {
        albums = await Album_1.default.getAllWithDetails();
    }
    res.json({
        success: true,
        data: { albums }
    });
});
exports.getAlbum = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const album = await Album_1.default.findWithDetails(parseInt(id));
    if (!album) {
        throw new errorHandler_1.AppError('Album not found', 404);
    }
    const songs = await Song_1.default.getSongsByAlbum(album.id);
    res.json({
        success: true,
        data: {
            album,
            songs
        }
    });
});
exports.getRecentAlbums = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 20 } = req.query;
    const albums = await Album_1.default.getRecentAlbums(parseInt(limit));
    res.json({
        success: true,
        data: { albums }
    });
});
exports.getGenres = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const genres = await Song_1.default.getGenres();
    res.json({
        success: true,
        data: { genres }
    });
});
exports.getLibraryStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const stats = await libraryScanner_1.default.getLibraryStats();
    res.json({
        success: true,
        data: { stats }
    });
});
exports.startLibraryScan = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user?.is_admin) {
        throw new errorHandler_1.AppError('Admin access required', 403);
    }
    const { paths } = req.body;
    if (libraryScanner_1.default.isCurrentlyScanning()) {
        throw new errorHandler_1.AppError('Library scan already in progress', 409);
    }
    const scanId = await libraryScanner_1.default.startScan(paths);
    res.json({
        success: true,
        data: {
            scanId,
            message: 'Library scan started'
        }
    });
});
exports.getScanStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const currentScan = libraryScanner_1.default.getCurrentScan();
    const scanHistory = await libraryScanner_1.default.getScanHistory();
    res.json({
        success: true,
        data: {
            currentScan,
            history: scanHistory,
            isScanning: libraryScanner_1.default.isCurrentlyScanning()
        }
    });
});
exports.followAlbum = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const albumId = parseInt(id);
    const userId = req.user.id;
    const album = await Album_1.default.findById(albumId);
    if (!album) {
        throw new errorHandler_1.AppError('Album not found', 404);
    }
    await AlbumFollows_1.default.followAlbum(userId, albumId);
    res.json({
        success: true,
        data: { message: 'Album followed successfully' }
    });
});
exports.unfollowAlbum = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const albumId = parseInt(id);
    const userId = req.user.id;
    await AlbumFollows_1.default.unfollowAlbum(userId, albumId);
    res.json({
        success: true,
        data: { message: 'Album unfollowed successfully' }
    });
});
exports.toggleAlbumFollow = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const albumId = parseInt(id);
    const userId = req.user.id;
    const album = await Album_1.default.findById(albumId);
    if (!album) {
        throw new errorHandler_1.AppError('Album not found', 404);
    }
    const result = await AlbumFollows_1.default.toggleAlbumFollow(userId, albumId);
    res.json({
        success: true,
        data: {
            isFollowing: result.isFollowing,
            message: result.isFollowing ? 'Album followed successfully' : 'Album unfollowed successfully'
        }
    });
});
exports.getFollowedAlbums = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const albums = await AlbumFollows_1.default.getUserFollowedAlbums(userId);
    res.json({
        success: true,
        data: { albums }
    });
});
exports.getAlbumsWithFollowStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const albums = await AlbumFollows_1.default.getAlbumsWithFollowStatus(userId, limit, offset);
    res.json({
        success: true,
        data: { albums }
    });
});
exports.getAlbumFollowStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const albumId = parseInt(id);
    const userId = req.user.id;
    const isFollowing = await AlbumFollows_1.default.isFollowingAlbum(userId, albumId);
    res.json({
        success: true,
        data: { isFollowing }
    });
});
//# sourceMappingURL=libraryController.js.map