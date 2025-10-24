import express from 'express';
import {
  addToFavorites,
  checkFavoriteStatus,
  getFavorites,
  removeFromFavorites,
  toggleFavorite,
} from '../controllers/favoritesController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
if (authenticateToken) {
  router.use(authenticateToken);
}

// Get user's favorites
router.get('/', getFavorites);

// Toggle favorite status for a song
router.post('/:songId/toggle', toggleFavorite);

// Check if a song is favorited
router.get('/:songId/status', checkFavoriteStatus);

// Add song to favorites
router.post('/:songId', addToFavorites);

// Remove song from favorites
router.delete('/:songId', removeFromFavorites);

export default router;
