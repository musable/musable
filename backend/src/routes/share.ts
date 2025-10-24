import { Router } from 'express';
import {
  createShareToken,
  getSharedSong,
} from '../controllers/shareController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * @route   GET /api/share/:token
 * @desc    Get shared song details (public access)
 * @access  Public (if sharing enabled)
 */
router.get('/:token', getSharedSong);

/**
 * @route   POST /api/share/create
 * @desc    Create a share token for a song
 * @access  Private
 */
router.post('/create', authenticateToken, createShareToken);

export default router;
