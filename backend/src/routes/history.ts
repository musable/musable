import { Router } from 'express';
import {
  trackPlay,
  getUserHistory,
  getRecentlyPlayed,
  getMostPlayed,
  getListeningStats,
  clearHistory
} from '../controllers/historyController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/track', trackPlay);
router.get('/', getUserHistory);
router.get('/recent', getRecentlyPlayed);
router.get('/most-played', getMostPlayed);
router.get('/stats', getListeningStats);
router.delete('/', clearHistory);

export default router;