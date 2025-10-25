import { Router } from 'express';
import {
  clearHistory,
  getListeningStats,
  getMostPlayed,
  getRecentlyPlayed,
  getUserHistory,
  trackPlay,
} from '../controllers/historyController.js';
import { getMyTops } from '../controllers/topController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/track', trackPlay);
router.get('/', getUserHistory);
router.get('/recent', getRecentlyPlayed);
router.get('/most-played', getMostPlayed);
router.get('/stats', getListeningStats);
router.get('/me/tops/:itemType', getMyTops);
router.delete('/', clearHistory);

export default router;
