"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserProfilePicture = exports.updateUserProfilePicture = exports.adminUploadProfilePicture = exports.getAllSystemSettings = exports.setSystemSetting = exports.getSystemSetting = exports.deleteLibraryPath = exports.updateLibraryPath = exports.addLibraryPath = exports.getLibraryPaths = exports.getUserActivity = exports.cleanupExpiredInvites = exports.deleteSong = exports.getListeningStats = exports.getAllHistory = exports.revokeInvite = exports.getAllInvites = exports.createInvite = exports.deleteUser = exports.updateUser = exports.getAllUsers = exports.getDashboardStats = void 0;
const joi_1 = __importDefault(require("joi"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const User_1 = __importDefault(require("../models/User"));
const Invite_1 = __importDefault(require("../models/Invite"));
const ListenHistory_1 = __importDefault(require("../models/ListenHistory"));
const Song_1 = __importDefault(require("../models/Song"));
const Settings_1 = __importDefault(require("../models/Settings"));
const libraryScanner_1 = __importDefault(require("../services/libraryScanner"));
const errorHandler_1 = require("../middleware/errorHandler");
const createInviteSchema = joi_1.default.object({
    expiresInHours: joi_1.default.number().integer().min(1).max(8760).default(24)
});
const updateUserSchema = joi_1.default.object({
    username: joi_1.default.string().alphanum().min(3).max(50),
    email: joi_1.default.string().email(),
    is_admin: joi_1.default.boolean()
});
const addLibraryPathSchema = joi_1.default.object({
    path: joi_1.default.string().required()
});
const updateLibraryPathSchema = joi_1.default.object({
    path: joi_1.default.string(),
    is_active: joi_1.default.boolean()
});
exports.getDashboardStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const libraryStats = await libraryScanner_1.default.getLibraryStats();
    const listeningStats = await ListenHistory_1.default.getListeningStats();
    const userCount = await User_1.default.getAllUsers().then(users => users.length);
    const adminCount = await User_1.default.getAdminCount();
    const activeInvites = await Invite_1.default.getActiveInviteCount();
    const usedInvites = await Invite_1.default.getUsedInviteCount();
    const recentActivity = await ListenHistory_1.default.getAllHistory(10);
    const listeningTrends = await ListenHistory_1.default.getListeningTrends();
    const mostPlayedSongs = await ListenHistory_1.default.getMostPlayedSongs(undefined, 10);
    const monthlyTrends = await ListenHistory_1.default.getMonthlyTrends();
    const usersMonthlyTrend = await ListenHistory_1.default.getUsersMonthlyTrend();
    const songsMonthlyTrend = await ListenHistory_1.default.getSongsMonthlyTrend();
    res.json({
        success: true,
        data: {
            library: libraryStats,
            listening: listeningStats,
            users: {
                total: userCount,
                admins: adminCount
            },
            invites: {
                active: activeInvites,
                used: usedInvites
            },
            trends: {
                users: usersMonthlyTrend,
                songs: songsMonthlyTrend,
                plays: monthlyTrends.total_plays,
                listeningTime: monthlyTrends.total_listening_time
            },
            recentActivity,
            listeningTrends,
            mostPlayedSongs
        }
    });
});
exports.getAllUsers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const users = await User_1.default.getAllUsers();
    res.json({
        success: true,
        data: { users }
    });
});
exports.updateUser = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = updateUserSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { id } = req.params;
    const userId = parseInt(id);
    const currentUserId = req.user.id;
    if (userId === currentUserId && req.body.is_admin === false) {
        throw new errorHandler_1.AppError('You cannot remove your own admin privileges', 400);
    }
    const user = await User_1.default.findById(userId);
    if (!user) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    if (req.body.username && req.body.username !== user.username) {
        const existingUser = await User_1.default.findByUsername(req.body.username);
        if (existingUser && existingUser.id !== userId) {
            throw new errorHandler_1.AppError('Username already taken', 400);
        }
    }
    if (req.body.email && req.body.email !== user.email) {
        const existingUser = await User_1.default.findByEmail(req.body.email);
        if (existingUser && existingUser.id !== userId) {
            throw new errorHandler_1.AppError('Email already taken', 400);
        }
    }
    if (typeof req.body.is_admin === 'boolean') {
        if (req.body.is_admin) {
            await User_1.default.makeAdmin(userId);
        }
        else {
            const adminCount = await User_1.default.getAdminCount();
            if (adminCount <= 1) {
                throw new errorHandler_1.AppError('Cannot remove the last admin user', 400);
            }
            await User_1.default.removeAdmin(userId);
        }
    }
    const updatedUser = await User_1.default.findById(userId);
    res.json({
        success: true,
        data: { user: updatedUser }
    });
});
exports.deleteUser = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(id);
    const currentUserId = req.user.id;
    if (userId === currentUserId) {
        throw new errorHandler_1.AppError('You cannot delete your own account', 400);
    }
    const user = await User_1.default.findById(userId);
    if (!user) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    if (user.is_admin) {
        const adminCount = await User_1.default.getAdminCount();
        if (adminCount <= 1) {
            throw new errorHandler_1.AppError('Cannot delete the last admin user', 400);
        }
    }
    await User_1.default.deleteUser(userId);
    res.json({
        success: true,
        data: { message: 'User deleted successfully' }
    });
});
exports.createInvite = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = createInviteSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { expiresInHours } = req.body;
    const createdBy = req.user.id;
    const invite = await Invite_1.default.create({
        created_by: createdBy,
        expires_in_hours: expiresInHours
    });
    res.status(201).json({
        success: true,
        data: { invite }
    });
});
exports.getAllInvites = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const invites = await Invite_1.default.getAllInvites();
    res.json({
        success: true,
        data: { invites }
    });
});
exports.revokeInvite = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const inviteId = parseInt(id);
    const invite = await Invite_1.default.findById(inviteId);
    if (!invite) {
        throw new errorHandler_1.AppError('Invite not found', 404);
    }
    await Invite_1.default.revokeInvite(inviteId);
    res.json({
        success: true,
        data: { message: 'Invite revoked successfully' }
    });
});
exports.getAllHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 100, offset = 0, user } = req.query;
    let history;
    if (user) {
        const userId = parseInt(user);
        history = await ListenHistory_1.default.getUserHistory(userId, parseInt(limit), parseInt(offset));
    }
    else {
        history = await ListenHistory_1.default.getAllHistory(parseInt(limit), parseInt(offset));
    }
    res.json({
        success: true,
        data: { history }
    });
});
exports.getListeningStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { user } = req.query;
    let stats;
    if (user) {
        const userId = parseInt(user);
        stats = await ListenHistory_1.default.getListeningStats(userId);
    }
    else {
        stats = await ListenHistory_1.default.getListeningStats();
    }
    const trends = await ListenHistory_1.default.getListeningTrends(user ? parseInt(user) : undefined);
    const mostPlayed = await ListenHistory_1.default.getMostPlayedSongs(user ? parseInt(user) : undefined);
    res.json({
        success: true,
        data: {
            stats,
            trends,
            mostPlayed
        }
    });
});
exports.deleteSong = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const songId = parseInt(id);
    const song = await Song_1.default.findById(songId);
    if (!song) {
        throw new errorHandler_1.AppError('Song not found', 404);
    }
    await Song_1.default.deleteSong(songId);
    res.json({
        success: true,
        data: { message: 'Song deleted successfully' }
    });
});
exports.cleanupExpiredInvites = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const deletedCount = await Invite_1.default.cleanupExpiredInvites();
    res.json({
        success: true,
        data: {
            message: `${deletedCount} expired invites cleaned up`
        }
    });
});
exports.getUserActivity = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(id);
    const user = await User_1.default.findById(userId);
    if (!user) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    const history = await ListenHistory_1.default.getUserHistory(userId, 50);
    const stats = await ListenHistory_1.default.getListeningStats(userId);
    const topArtists = await ListenHistory_1.default.getUserTopArtists(userId);
    const topAlbums = await ListenHistory_1.default.getUserTopAlbums(userId);
    const mostPlayed = await ListenHistory_1.default.getMostPlayedSongs(userId);
    res.json({
        success: true,
        data: {
            user,
            history,
            stats,
            topArtists,
            topAlbums,
            mostPlayed
        }
    });
});
exports.getLibraryPaths = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const paths = await Settings_1.default.getLibraryPaths();
    res.json({
        success: true,
        data: { paths }
    });
});
exports.addLibraryPath = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = addLibraryPathSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { path } = value;
    try {
        const newPath = await Settings_1.default.addLibraryPath(path);
        await libraryScanner_1.default.refreshFileWatcher();
        res.status(201).json({
            success: true,
            data: { path: newPath }
        });
    }
    catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            throw new errorHandler_1.AppError('Library path already exists', 409);
        }
        throw err;
    }
});
exports.updateLibraryPath = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const pathId = parseInt(id);
    const { error, value } = updateLibraryPathSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const updatedPath = await Settings_1.default.updateLibraryPath(pathId, value);
    await libraryScanner_1.default.refreshFileWatcher();
    res.json({
        success: true,
        data: { path: updatedPath }
    });
});
exports.deleteLibraryPath = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const pathId = parseInt(id);
    await Settings_1.default.deleteLibraryPath(pathId);
    await libraryScanner_1.default.refreshFileWatcher();
    res.json({
        success: true,
        message: 'Library path deleted successfully'
    });
});
exports.getSystemSetting = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { key } = req.params;
    const value = await Settings_1.default.getSetting(key);
    res.json({
        success: true,
        data: { key, value }
    });
});
exports.setSystemSetting = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined || value === null) {
        throw new errorHandler_1.AppError('Setting value is required', 400);
    }
    await Settings_1.default.setSetting(key, String(value));
    res.json({
        success: true,
        data: { key, value: String(value) }
    });
});
exports.getAllSystemSettings = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const publicSharingEnabled = await Settings_1.default.getSetting('public_sharing_enabled') || 'false';
    const settings = {
        public_sharing_enabled: publicSharingEnabled === 'true'
    };
    res.json({
        success: true,
        data: { settings }
    });
});
const adminProfilePictureStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'profile-pictures');
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const userId = req.params.userId;
        const extension = path_1.default.extname(file.originalname);
        cb(null, `user-${userId}-${Date.now()}${extension}`);
    }
});
const adminProfilePictureFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    }
    else {
        cb(new errorHandler_1.AppError('Only image files are allowed (jpeg, jpg, png, gif, webp)', 400));
    }
};
exports.adminUploadProfilePicture = (0, multer_1.default)({
    storage: adminProfilePictureStorage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: adminProfilePictureFilter
});
exports.updateUserProfilePicture = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    if (!req.file) {
        throw new errorHandler_1.AppError('No image file provided', 400);
    }
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
        throw new errorHandler_1.AppError('Invalid user ID', 400);
    }
    const user = await User_1.default.findById(numericUserId);
    if (!user) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    const profilePicturePath = `/uploads/profile-pictures/${req.file.filename}`;
    if (user.profile_picture) {
        const oldPicturePath = path_1.default.join(process.cwd(), user.profile_picture);
        if (fs_1.default.existsSync(oldPicturePath)) {
            fs_1.default.unlinkSync(oldPicturePath);
        }
    }
    await User_1.default.updateProfilePicture(numericUserId, profilePicturePath);
    const updatedUser = await User_1.default.findById(numericUserId);
    res.json({
        success: true,
        data: {
            message: 'User profile picture updated successfully',
            user: updatedUser
        }
    });
});
exports.deleteUserProfilePicture = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
        throw new errorHandler_1.AppError('Invalid user ID', 400);
    }
    const user = await User_1.default.findById(numericUserId);
    if (!user) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    if (user.profile_picture) {
        const oldPicturePath = path_1.default.join(process.cwd(), user.profile_picture);
        if (fs_1.default.existsSync(oldPicturePath)) {
            fs_1.default.unlinkSync(oldPicturePath);
        }
    }
    await User_1.default.updateProfilePicture(numericUserId, null);
    const updatedUser = await User_1.default.findById(numericUserId);
    res.json({
        success: true,
        data: {
            message: 'User profile picture removed successfully',
            user: updatedUser
        }
    });
});
//# sourceMappingURL=adminController.js.map