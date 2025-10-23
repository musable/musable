import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import ytMusicService from '../services/ytMusicService.js';

const router = express.Router();

// Initialize YTMusic service
ytMusicService.initialize();

// Search YouTube Music
router.get(
  '/search',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
    }

    const results = await ytMusicService.searchMusic(query);

    res.json({
      success: true,
      data: {
        results,
        source: 'youtube-music',
      },
    });
  }),
);

// Download song from YouTube Music
router.post(
  '/download/:videoId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    try {
      const downloadId = await ytMusicService.downloadSong(videoId);

      res.json({
        success: true,
        data: {
          downloadId,
          message: 'Download started',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to start download',
      });
    }
  }),
);

// Get download progress
router.get(
  '/download/:downloadId/progress',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { downloadId } = req.params;

    const progress = ytMusicService.getDownloadProgress(downloadId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Download not found',
      });
    }

    res.json({
      success: true,
      data: progress,
    });
  }),
);

// Get all active downloads
router.get(
  '/downloads',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const downloads = ytMusicService.getAllActiveDownloads();

    res.json({
      success: true,
      data: downloads,
    });
  }),
);

export default router;
