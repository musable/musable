import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import SettingsModel from '../models/Settings.js';
import ShareTokenModel from '../models/ShareToken.js';
import logger from '../utils/logger.js';

export const getSharedSong = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ message: 'Invalid share token' });
      return;
    }

    // Check if public sharing is enabled
    const publicSharingEnabled = await SettingsModel.getSetting(
      'public_sharing_enabled',
    );
    if (publicSharingEnabled !== 'true') {
      res.status(403).json({
        message:
          'Public sharing is disabled. Login required to access this song.',
      });
      return;
    }

    const result = await ShareTokenModel.validateAndIncrementAccess(token);

    if (!result.valid || !result.song) {
      res.status(404).json({ message: 'Invalid or expired share link' });
      return;
    }

    // Only return essential song data for sharing
    const sharedSong = {
      id: result.song.id,
      title: result.song.title,
      artist_name: result.song.artist_name,
      album_title: result.song.album_title,
      duration: result.song.duration,
      artwork_path: result.song.artwork_path,
      // Don't expose file_path for security
    };

    logger.info(
      `Song accessed via share token: ${result.song.title} by ${result.song.artist_name} (Token: ${token.substring(0, 8)}...)`,
    );

    res.json({
      song: sharedSong,
      sharing_enabled: true,
    });
    return;
  } catch (error) {
    logger.error('Error getting shared song:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const createShareToken = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { songId, maxAccess, expiresInHours } = req.body;
    const userId = req.user!.id;

    if (!songId || !Number.isInteger(songId)) {
      throw new AppError('Valid song ID is required', 400);
    }

    // Check if public sharing is enabled
    const publicSharingEnabled = await SettingsModel.getSetting(
      'public_sharing_enabled',
    );
    if (publicSharingEnabled !== 'true') {
      throw new AppError('Public sharing is disabled', 403);
    }

    // Check if song exists (this will throw if not found)
    // We don't need to import Song model, just validate the ID exists in database

    const shareToken = await ShareTokenModel.create({
      song_id: songId,
      created_by: userId,
      max_access: maxAccess,
      expires_in_hours: expiresInHours,
    });

    logger.info(`Share token created for song ${songId} by user ${userId}`);

    // Create share URL safely - use hardcoded host to avoid req.get() issues
    const shareUrl = `http://localhost:3000/share/${shareToken.token}`;

    res.status(201).json({
      success: true,
      data: {
        token: shareToken.token,
        shareUrl,
      },
    });
  },
);
