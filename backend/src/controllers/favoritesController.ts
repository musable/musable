import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { FavoriteModel } from '../models/Favorite.js';
import logger from '../utils/logger.js';

export const getFavorites = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const favorites = await FavoriteModel.getUserFavorites(userId);

    res.json({
      success: true,
      data: {
        songs: favorites,
        count: favorites.length,
      },
    });
  } catch (error) {
    logger.error('Error getting favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
};

export const toggleFavorite = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const songId = parseInt(req.params.songId);

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!songId || isNaN(songId)) {
      res.status(400).json({ error: 'Invalid song ID' });
      return;
    }

    const result = await FavoriteModel.toggleFavorite(userId, songId);

    res.json({
      success: true,
      data: {
        songId,
        isFavorited: result.isFavorited,
        message: result.isFavorited
          ? 'Added to favorites'
          : 'Removed from favorites',
      },
    });
  } catch (error) {
    logger.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
};

export const checkFavoriteStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const songId = parseInt(req.params.songId);

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!songId || isNaN(songId)) {
      res.status(400).json({ error: 'Invalid song ID' });
      return;
    }

    const isFavorited = await FavoriteModel.isFavorited(userId, songId);

    res.json({
      success: true,
      data: {
        songId,
        isFavorited,
      },
    });
  } catch (error) {
    logger.error('Error checking favorite status:', error);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
};

export const addToFavorites = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const songId = parseInt(req.params.songId);

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!songId || isNaN(songId)) {
      res.status(400).json({ error: 'Invalid song ID' });
      return;
    }

    await FavoriteModel.addToFavorites(userId, songId);

    res.json({
      success: true,
      data: {
        songId,
        isFavorited: true,
        message: 'Added to favorites',
      },
    });
  } catch (error) {
    logger.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
};

export const removeFromFavorites = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const songId = parseInt(req.params.songId);

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!songId || isNaN(songId)) {
      res.status(400).json({ error: 'Invalid song ID' });
      return;
    }

    await FavoriteModel.removeFromFavorites(userId, songId);

    res.json({
      success: true,
      data: {
        songId,
        isFavorited: false,
        message: 'Removed from favorites',
      },
    });
  } catch (error) {
    logger.error('Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
};
