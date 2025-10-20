import { Request, Response } from 'express';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import UserModel from '../models/User';
import InviteModel from '../models/Invite';
import ListenHistoryModel from '../models/ListenHistory';
import SongModel from '../models/Song';
import SettingsModel from '../models/Settings';
import libraryScanner from '../services/libraryScanner';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const createInviteSchema = Joi.object({
  expiresInHours: Joi.number().integer().min(1).max(8760).default(24) // 1 hour to 1 year
});

const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50),
  email: Joi.string().email(),
  is_admin: Joi.boolean()
});

const addLibraryPathSchema = Joi.object({
  path: Joi.string().required()
});

const updateLibraryPathSchema = Joi.object({
  path: Joi.string(),
  is_active: Joi.boolean()
});

export const getDashboardStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const libraryStats = await libraryScanner.getLibraryStats();
  const listeningStats = await ListenHistoryModel.getListeningStats();
  
  const userCount = await UserModel.getAllUsers().then(users => users.length);
  const adminCount = await UserModel.getAdminCount();
  const activeInvites = await InviteModel.getActiveInviteCount();
  const usedInvites = await InviteModel.getUsedInviteCount();

  const recentActivity = await ListenHistoryModel.getAllHistory(10);
  const listeningTrends = await ListenHistoryModel.getListeningTrends();
  const mostPlayedSongs = await ListenHistoryModel.getMostPlayedSongs(undefined, 10);

  // Get monthly trends for dashboard cards
  const monthlyTrends = await ListenHistoryModel.getMonthlyTrends();
  const usersMonthlyTrend = await ListenHistoryModel.getUsersMonthlyTrend();
  const songsMonthlyTrend = await ListenHistoryModel.getSongsMonthlyTrend();

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

export const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await UserModel.getAllUsers();

  res.json({
    success: true,
    data: { users }
  });
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error } = updateUserSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { id } = req.params;
  const userId = parseInt(id);
  const currentUserId = req.user!.id;

  if (userId === currentUserId && req.body.is_admin === false) {
    throw new AppError('You cannot remove your own admin privileges', 400);
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (req.body.username && req.body.username !== user.username) {
    const existingUser = await UserModel.findByUsername(req.body.username);
    if (existingUser && existingUser.id !== userId) {
      throw new AppError('Username already taken', 400);
    }
  }

  if (req.body.email && req.body.email !== user.email) {
    const existingUser = await UserModel.findByEmail(req.body.email);
    if (existingUser && existingUser.id !== userId) {
      throw new AppError('Email already taken', 400);
    }
  }

  if (typeof req.body.is_admin === 'boolean') {
    if (req.body.is_admin) {
      await UserModel.makeAdmin(userId);
    } else {
      const adminCount = await UserModel.getAdminCount();
      if (adminCount <= 1) {
        throw new AppError('Cannot remove the last admin user', 400);
      }
      await UserModel.removeAdmin(userId);
    }
  }

  const updatedUser = await UserModel.findById(userId);

  res.json({
    success: true,
    data: { user: updatedUser }
  });
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = parseInt(id);
  const currentUserId = req.user!.id;

  if (userId === currentUserId) {
    throw new AppError('You cannot delete your own account', 400);
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.is_admin) {
    const adminCount = await UserModel.getAdminCount();
    if (adminCount <= 1) {
      throw new AppError('Cannot delete the last admin user', 400);
    }
  }

  await UserModel.deleteUser(userId);

  res.json({
    success: true,
    data: { message: 'User deleted successfully' }
  });
});

export const createInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error } = createInviteSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { expiresInHours } = req.body;
  const createdBy = req.user!.id;

  const invite = await InviteModel.create({
    created_by: createdBy,
    expires_in_hours: expiresInHours
  });

  res.status(201).json({
    success: true,
    data: { invite }
  });
});

export const getAllInvites = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invites = await InviteModel.getAllInvites();

  res.json({
    success: true,
    data: { invites }
  });
});

export const revokeInvite = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const inviteId = parseInt(id);

  const invite = await InviteModel.findById(inviteId);
  if (!invite) {
    throw new AppError('Invite not found', 404);
  }

  await InviteModel.revokeInvite(inviteId);

  res.json({
    success: true,
    data: { message: 'Invite revoked successfully' }
  });
});

export const getAllHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit = 100, offset = 0, user } = req.query;

  let history;
  
  if (user) {
    const userId = parseInt(user as string);
    history = await ListenHistoryModel.getUserHistory(userId, parseInt(limit as string), parseInt(offset as string));
  } else {
    history = await ListenHistoryModel.getAllHistory(parseInt(limit as string), parseInt(offset as string));
  }

  res.json({
    success: true,
    data: { history }
  });
});

export const getListeningStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { user } = req.query;
  
  let stats;
  if (user) {
    const userId = parseInt(user as string);
    stats = await ListenHistoryModel.getListeningStats(userId);
  } else {
    stats = await ListenHistoryModel.getListeningStats();
  }

  const trends = await ListenHistoryModel.getListeningTrends(user ? parseInt(user as string) : undefined);
  const mostPlayed = await ListenHistoryModel.getMostPlayedSongs(user ? parseInt(user as string) : undefined);

  res.json({
    success: true,
    data: {
      stats,
      trends,
      mostPlayed
    }
  });
});

export const deleteSong = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const songId = parseInt(id);

  const song = await SongModel.findById(songId);
  if (!song) {
    throw new AppError('Song not found', 404);
  }

  await SongModel.deleteSong(songId);

  res.json({
    success: true,
    data: { message: 'Song deleted successfully' }
  });
});

export const cleanupExpiredInvites = asyncHandler(async (req: AuthRequest, res: Response) => {
  const deletedCount = await InviteModel.cleanupExpiredInvites();

  res.json({
    success: true,
    data: { 
      message: `${deletedCount} expired invites cleaned up`
    }
  });
});

export const getUserActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = parseInt(id);

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const history = await ListenHistoryModel.getUserHistory(userId, 50);
  const stats = await ListenHistoryModel.getListeningStats(userId);
  const topArtists = await ListenHistoryModel.getUserTopArtists(userId);
  const topAlbums = await ListenHistoryModel.getUserTopAlbums(userId);
  const mostPlayed = await ListenHistoryModel.getMostPlayedSongs(userId);

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

export const getLibraryPaths = asyncHandler(async (req: AuthRequest, res: Response) => {
  const paths = await SettingsModel.getLibraryPaths();
  
  res.json({
    success: true,
    data: { paths }
  });
});

export const addLibraryPath = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error, value } = addLibraryPathSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { path } = value;

  try {
    const newPath = await SettingsModel.addLibraryPath(path);
    
    // Refresh the file watcher with updated paths
    await libraryScanner.refreshFileWatcher();
    
    res.status(201).json({
      success: true,
      data: { path: newPath }
    });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new AppError('Library path already exists', 409);
    }
    throw err;
  }
});

export const updateLibraryPath = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const pathId = parseInt(id);

  const { error, value } = updateLibraryPathSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const updatedPath = await SettingsModel.updateLibraryPath(pathId, value);
  
  // Refresh the file watcher with updated paths
  await libraryScanner.refreshFileWatcher();
  
  res.json({
    success: true,
    data: { path: updatedPath }
  });
});

export const deleteLibraryPath = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const pathId = parseInt(id);

  await SettingsModel.deleteLibraryPath(pathId);
  
  // Refresh the file watcher with updated paths
  await libraryScanner.refreshFileWatcher();
  
  res.json({
    success: true,
    message: 'Library path deleted successfully'
  });
});

export const getSystemSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { key } = req.params;
  
  const value = await SettingsModel.getSetting(key);
  
  res.json({
    success: true,
    data: { key, value }
  });
});

export const setSystemSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;
  
  if (value === undefined || value === null) {
    throw new AppError('Setting value is required', 400);
  }
  
  await SettingsModel.setSetting(key, String(value));
  
  res.json({
    success: true,
    data: { key, value: String(value) }
  });
});

export const getAllSystemSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Get all relevant system settings
  const publicSharingEnabled = await SettingsModel.getSetting('public_sharing_enabled') || 'false';
  
  const settings = {
    public_sharing_enabled: publicSharingEnabled === 'true'
  };
  
  res.json({
    success: true,
    data: { settings }
  });
});

// Multer configuration for admin profile picture uploads
const adminProfilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.params.userId;
    const extension = path.extname(file.originalname);
    cb(null, `user-${userId}-${Date.now()}${extension}`);
  }
});

const adminProfilePictureFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed (jpeg, jpg, png, gif, webp)', 400));
  }
};

export const adminUploadProfilePicture = multer({
  storage: adminProfilePictureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: adminProfilePictureFilter
});

export const updateUserProfilePicture = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  
  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }

  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw new AppError('Invalid user ID', 400);
  }

  // Check if user exists
  const user = await UserModel.findById(numericUserId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const profilePicturePath = `/uploads/profile-pictures/${req.file.filename}`;

  // Delete old profile picture if it exists
  if (user.profile_picture) {
    const oldPicturePath = path.join(process.cwd(), user.profile_picture);
    if (fs.existsSync(oldPicturePath)) {
      fs.unlinkSync(oldPicturePath);
    }
  }

  await UserModel.updateProfilePicture(numericUserId, profilePicturePath);

  // Get updated user data
  const updatedUser = await UserModel.findById(numericUserId);

  res.json({
    success: true,
    data: {
      message: 'User profile picture updated successfully',
      user: updatedUser
    }
  });
});

export const deleteUserProfilePicture = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  
  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw new AppError('Invalid user ID', 400);
  }

  // Check if user exists
  const user = await UserModel.findById(numericUserId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Delete profile picture file if it exists
  if (user.profile_picture) {
    const oldPicturePath = path.join(process.cwd(), user.profile_picture);
    if (fs.existsSync(oldPicturePath)) {
      fs.unlinkSync(oldPicturePath);
    }
  }

  await UserModel.updateProfilePicture(numericUserId, null);

  // Get updated user data
  const updatedUser = await UserModel.findById(numericUserId);

  res.json({
    success: true,
    data: {
      message: 'User profile picture removed successfully',
      user: updatedUser
    }
  });
});

