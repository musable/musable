import { Router } from 'express';
import {
  followAlbum,
  getAlbum,
  getAlbumFollowStatus,
  getAlbumsWithFollowStatus,
  getAllAlbums,
  getAllArtists,
  getAllSongs,
  getArtist,
  getFollowedAlbums,
  getGenres,
  getLibraryStats,
  getRandomSongs,
  getRecentAlbums,
  getScanStatus,
  getSong,
  startLibraryScan,
  toggleAlbumFollow,
  unfollowAlbum,
} from '../controllers/libraryController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/songs', getAllSongs);
router.get('/songs/random', getRandomSongs);
router.get('/songs/:id', getSong);

router.get('/artists', getAllArtists);
router.get('/artists/:id', getArtist);

router.get('/albums', getAllAlbums);
router.get('/albums/recent', getRecentAlbums);
router.get('/albums/followed', authenticateToken, getFollowedAlbums);
router.get(
  '/albums/with-follow-status',
  authenticateToken,
  getAlbumsWithFollowStatus,
);
router.get('/albums/:id', getAlbum);

router.get('/genres', getGenres);
router.get('/stats', getLibraryStats);

router.post('/scan', authenticateToken, requireAdmin, startLibraryScan);
router.get('/scan/status', getScanStatus);

// Album follow endpoints
router.post('/albums/:id/follow', authenticateToken, followAlbum);
router.delete('/albums/:id/follow', authenticateToken, unfollowAlbum);
router.post('/albums/:id/toggle-follow', authenticateToken, toggleAlbumFollow);
router.get(
  '/albums/:id/follow-status',
  authenticateToken,
  getAlbumFollowStatus,
);

export default router;
