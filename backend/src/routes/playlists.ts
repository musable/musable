import { Router } from 'express';
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  followPlaylist,
  getAllPlaylists,
  getFollowedPlaylists,
  getPlaylist,
  getPlaylistFollowStatus,
  getPlaylistsWithFollowStatus,
  getPublicPlaylists,
  getUserPlaylists,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
  searchPlaylists,
  togglePlaylistFollow,
  unfollowPlaylist,
  updatePlaylist,
} from '../controllers/playlistController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticateToken, createPlaylist);

router.get('/my', authenticateToken, getUserPlaylists);
router.get('/public', getPublicPlaylists);
router.get('/all', authenticateToken, getAllPlaylists);
router.get('/search', optionalAuth, searchPlaylists);
router.get('/followed', authenticateToken, getFollowedPlaylists);
router.get(
  '/with-follow-status',
  authenticateToken,
  getPlaylistsWithFollowStatus,
);

router.get('/:id', optionalAuth, getPlaylist);
router.put('/:id', authenticateToken, updatePlaylist);
router.delete('/:id', authenticateToken, deletePlaylist);

router.post('/:id/songs', authenticateToken, addSongToPlaylist);
router.delete('/:id/songs/:songId', authenticateToken, removeSongFromPlaylist);
router.put('/:id/songs/reorder', authenticateToken, reorderPlaylistSongs);

// Follow endpoints for specific playlists
router.post('/:id/follow', authenticateToken, followPlaylist);
router.delete('/:id/follow', authenticateToken, unfollowPlaylist);
router.post('/:id/toggle-follow', authenticateToken, togglePlaylistFollow);
router.get('/:id/follow-status', authenticateToken, getPlaylistFollowStatus);

export default router;
