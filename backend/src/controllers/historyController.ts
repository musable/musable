import { Request, Response } from 'express';
import Joi from 'joi';
import ListenHistoryModel from '../models/ListenHistory';
import SongModel from '../models/Song';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const trackPlaySchema = Joi.object({
  songId: Joi.number().integer().positive().required(),
  durationPlayed: Joi.number().integer().min(0),
  completed: Joi.boolean().default(false)
});

export const trackPlay = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error } = trackPlaySchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { songId, durationPlayed, completed } = req.body;
  const userId = req.user!.id;

  const song = await SongModel.findById(songId);
  if (!song) {
    throw new AppError('Song not found', 404);
  }

  const historyEntry = await ListenHistoryModel.create({
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

export const getUserHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit = 50, offset = 0 } = req.query;
  const userId = req.user!.id;

  const history = await ListenHistoryModel.getUserHistory(
    userId,
    parseInt(limit as string),
    parseInt(offset as string)
  );

  res.json({
    success: true,
    data: { history }
  });
});

export const getRecentlyPlayed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit = 20 } = req.query;
  const userId = req.user!.id;

  const recentHistoryData = await ListenHistoryModel.getRecentlyPlayedSongs(userId, parseInt(limit as string));
  
  // Transform the history data to Song objects
  const songs = recentHistoryData.map(item => ({
    id: item.song_id,
    title: item.song_title,
    artist_id: 0, // We don't have this in the history query, but it's not used in the frontend
    artist_name: item.artist_name,
    album_id: 0, // We don't have this in the history query, but it's not used in the frontend
    album_title: item.album_title,
    file_path: '', // We don't expose file paths to frontend
    duration: item.song_duration,
    artwork_path: item.artwork_path,
    source: 'local' as const,
    created_at: item.played_at,
    updated_at: item.played_at
  }));

  res.json({
    success: true,
    data: { songs }
  });
});

export const getMostPlayed = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit = 20 } = req.query;
  const userId = req.user!.id;

  const mostPlayedSongs = await ListenHistoryModel.getMostPlayedSongs(userId, parseInt(limit as string));

  res.json({
    success: true,
    data: { songs: mostPlayedSongs }
  });
});

export const getListeningStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const stats = await ListenHistoryModel.getListeningStats(userId);
  const trends = await ListenHistoryModel.getListeningTrends(userId);
  const topArtists = await ListenHistoryModel.getUserTopArtists(userId);
  const topAlbums = await ListenHistoryModel.getUserTopAlbums(userId);

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

export const clearHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const deletedCount = await ListenHistoryModel.deleteUserHistory(userId);

  res.json({
    success: true,
    data: { 
      message: `${deletedCount} history entries cleared`
    }
  });
});