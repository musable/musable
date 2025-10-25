import express from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { youtubeService } from '../services/youtubeService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Search for images from YouTube
router.get('/search', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
      return;
    }

    const limitNumber = Math.min(
      Math.max(parseInt(limit as string) || 20, 1),
      50,
    );

    logger.info(
      `🔍 YouTube search requested: "${query}" (limit: ${limitNumber}) by user ${req.user?.id}`,
    );

    const results = await youtubeService.searchImages(query, limitNumber);

    res.json({
      success: true,
      data: results,
      count: results.length,
      query: query,
      limit: limitNumber,
    });
    return;
  } catch (error) {
    logger.error('YouTube search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search for images',
    });
    return;
  }
});

// Search for album artwork specifically
router.get(
  '/album-artwork',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { artist, album } = req.query;

      if (
        !artist ||
        !album ||
        typeof artist !== 'string' ||
        typeof album !== 'string'
      ) {
        res.status(400).json({
          success: false,
          error: 'Both "artist" and "album" query parameters are required',
        });
        return;
      }

      logger.info(
        `🎨 Album artwork search requested: "${artist}" - "${album}" by user ${req.user?.id}`,
      );

      const results = await youtubeService.searchAlbumArtwork(artist, album);

      res.json({
        success: true,
        data: results,
        count: results.length,
        artist: artist,
        album: album,
      });
      return;
    } catch (error) {
      logger.error('Album artwork search error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search for album artwork',
      });
      return;
    }
  },
);

// Get high-quality thumbnail URL for a specific YouTube video
router.get(
  '/thumbnail/:videoId',
  authenticateToken,
  (req: AuthRequest, res) => {
    try {
      const { videoId } = req.params;
      const { quality = 'maxres' } = req.query;

      if (!videoId) {
        res.status(400).json({
          success: false,
          error: 'Video ID is required',
        });
        return;
      }

      const validQualities = ['maxres', 'standard', 'high', 'medium'];
      const requestedQuality = validQualities.includes(quality as string)
        ? (quality as 'maxres' | 'standard' | 'high' | 'medium')
        : 'maxres';

      const thumbnailUrl = youtubeService.getHighQualityThumbnail(
        videoId,
        requestedQuality,
      );

      res.json({
        success: true,
        data: {
          videoId: videoId,
          quality: requestedQuality,
          url: thumbnailUrl,
        },
      });
      return;
    } catch (error) {
      logger.error('Thumbnail URL generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate thumbnail URL',
      });
      return;
    }
  },
);

export default router;
