import type { Request, Response } from 'express';
import Joi from 'joi';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import PlaylistModel from '../models/Playlist.js';
import PlaylistFollowsModel from '../models/PlaylistFollows.js';
import SongModel from '../models/Song.js';

const createPlaylistSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).allow(''),
  is_public: Joi.boolean().default(false),
});

const updatePlaylistSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  description: Joi.string().max(1000).allow(''),
  is_public: Joi.boolean(),
});

const addSongSchema = Joi.object({
  songId: Joi.number().integer().positive().required(),
});

const reorderSongsSchema = Joi.object({
  songIds: Joi.array().items(Joi.number().integer().positive()).required(),
});

export const createPlaylist = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { error } = createPlaylistSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { name, description, is_public } = req.body;
    const userId = req.user!.id;

    const playlist = await PlaylistModel.create({
      name,
      description,
      user_id: userId,
      is_public,
    });

    res.status(201).json({
      success: true,
      data: { playlist },
    });
  },
);

export const getUserPlaylists = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const playlists = await PlaylistModel.getUserPlaylists(userId);

    res.json({
      success: true,
      data: { playlists },
    });
  },
);

export const getPublicPlaylists = asyncHandler(
  async (req: Request, res: Response) => {
    const playlists = await PlaylistModel.getPublicPlaylists();

    res.json({
      success: true,
      data: { playlists },
    });
  },
);

export const getAllPlaylists = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.is_admin) {
      throw new AppError('Admin access required', 403);
    }

    const playlists = await PlaylistModel.getAllPlaylists();

    res.json({
      success: true,
      data: { playlists },
    });
  },
);

export const getPlaylist = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user?.id;

    const canAccess = await PlaylistModel.canUserAccessPlaylist(
      playlistId,
      userId,
    );
    if (!canAccess) {
      throw new AppError('Playlist not found or access denied', 404);
    }

    const playlist = await PlaylistModel.findWithDetails(playlistId);
    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }

    const songs = await PlaylistModel.getPlaylistSongs(playlistId);

    res.json({
      success: true,
      data: {
        playlist,
        songs,
      },
    });
  },
);

export const updatePlaylist = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { error } = updatePlaylistSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user!.id;

    const canModify = await PlaylistModel.canUserModifyPlaylist(
      playlistId,
      userId,
      req.user!.is_admin,
    );
    if (!canModify) {
      throw new AppError('Permission denied', 403);
    }

    await PlaylistModel.update(playlistId, req.body);

    const updatedPlaylist = await PlaylistModel.findWithDetails(playlistId);

    res.json({
      success: true,
      data: { playlist: updatedPlaylist },
    });
  },
);

export const deletePlaylist = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user!.id;

    const canModify = await PlaylistModel.canUserModifyPlaylist(
      playlistId,
      userId,
      req.user!.is_admin,
    );
    if (!canModify) {
      throw new AppError('Permission denied', 403);
    }

    await PlaylistModel.delete(playlistId);

    res.json({
      success: true,
      data: { message: 'Playlist deleted successfully' },
    });
  },
);

export const addSongToPlaylist = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { error } = addSongSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { id } = req.params;
    const { songId } = req.body;
    const playlistId = parseInt(id);
    const userId = req.user!.id;

    const canModify = await PlaylistModel.canUserModifyPlaylist(
      playlistId,
      userId,
      req.user!.is_admin,
    );
    if (!canModify) {
      throw new AppError('Permission denied', 403);
    }

    const song = await SongModel.findById(songId);
    if (!song) {
      throw new AppError('Song not found', 404);
    }

    await PlaylistModel.addSong(playlistId, songId);

    res.json({
      success: true,
      data: { message: 'Song added to playlist successfully' },
    });
  },
);

export const removeSongFromPlaylist = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id, songId } = req.params;
    const playlistId = parseInt(id);
    const songIdNum = parseInt(songId);
    const userId = req.user!.id;

    const canModify = await PlaylistModel.canUserModifyPlaylist(
      playlistId,
      userId,
      req.user!.is_admin,
    );
    if (!canModify) {
      throw new AppError('Permission denied', 403);
    }

    await PlaylistModel.removeSong(playlistId, songIdNum);

    res.json({
      success: true,
      data: { message: 'Song removed from playlist successfully' },
    });
  },
);

export const reorderPlaylistSongs = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { error } = reorderSongsSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { id } = req.params;
    const { songIds } = req.body;
    const playlistId = parseInt(id);
    const userId = req.user!.id;

    const canModify = await PlaylistModel.canUserModifyPlaylist(
      playlistId,
      userId,
      req.user!.is_admin,
    );
    if (!canModify) {
      throw new AppError('Permission denied', 403);
    }

    await PlaylistModel.reorderSongs(playlistId, songIds);

    res.json({
      success: true,
      data: { message: 'Playlist songs reordered successfully' },
    });
  },
);

export const searchPlaylists = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { q: query } = req.query;

    if (!query) {
      throw new AppError('Search query is required', 400);
    }

    const userId = req.user?.id;
    const playlists = await PlaylistModel.searchPlaylists(
      query as string,
      userId,
    );

    res.json({
      success: true,
      data: { playlists },
    });
  },
);

// Playlist Follow endpoints
export const followPlaylist = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user!.id;

    const playlist = await PlaylistModel.findById(playlistId);
    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }

    // Users cannot follow their own playlists
    if (playlist.user_id === userId) {
      throw new AppError('You cannot follow your own playlist', 400);
    }

    // Check if playlist is public or user has access
    const canAccess = await PlaylistModel.canUserAccessPlaylist(
      playlistId,
      userId,
    );
    if (!canAccess) {
      throw new AppError('Playlist not found or access denied', 404);
    }

    await PlaylistFollowsModel.followPlaylist(userId, playlistId);

    res.json({
      success: true,
      data: { message: 'Playlist followed successfully' },
    });
  },
);

export const unfollowPlaylist = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user!.id;

    await PlaylistFollowsModel.unfollowPlaylist(userId, playlistId);

    res.json({
      success: true,
      data: { message: 'Playlist unfollowed successfully' },
    });
  },
);

export const togglePlaylistFollow = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user!.id;

    const playlist = await PlaylistModel.findById(playlistId);
    if (!playlist) {
      throw new AppError('Playlist not found', 404);
    }

    // Users cannot follow their own playlists
    if (playlist.user_id === userId) {
      throw new AppError('You cannot follow your own playlist', 400);
    }

    // Check if playlist is public or user has access
    const canAccess = await PlaylistModel.canUserAccessPlaylist(
      playlistId,
      userId,
    );
    if (!canAccess) {
      throw new AppError('Playlist not found or access denied', 404);
    }

    const result = await PlaylistFollowsModel.togglePlaylistFollow(
      userId,
      playlistId,
    );

    res.json({
      success: true,
      data: {
        isFollowing: result.isFollowing,
        message: result.isFollowing
          ? 'Playlist followed successfully'
          : 'Playlist unfollowed successfully',
      },
    });
  },
);

export const getFollowedPlaylists = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const playlists =
      await PlaylistFollowsModel.getUserFollowedPlaylists(userId);

    res.json({
      success: true,
      data: { playlists },
    });
  },
);

export const getPlaylistsWithFollowStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const includeOwn = req.query.includeOwn !== 'false';
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const playlists = await PlaylistFollowsModel.getPlaylistsWithFollowStatus(
      userId,
      includeOwn,
      limit,
      offset,
    );

    res.json({
      success: true,
      data: { playlists },
    });
  },
);

export const getPlaylistFollowStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const playlistId = parseInt(id);
    const userId = req.user!.id;

    const isFollowing = await PlaylistFollowsModel.isFollowingPlaylist(
      userId,
      playlistId,
    );

    res.json({
      success: true,
      data: { isFollowing },
    });
  },
);
