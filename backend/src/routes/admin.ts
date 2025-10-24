import { Router } from 'express';
import {
  addLibraryPath,
  adminUploadProfilePicture,
  cleanupExpiredInvites,
  createInvite,
  deleteLibraryPath,
  deleteSong,
  deleteUser,
  deleteUserProfilePicture,
  getAllHistory,
  getAllInvites,
  getAllSystemSettings,
  getAllUsers,
  getDashboardStats,
  getLibraryPaths,
  getListeningStats,
  getScanOptions,
  getSystemSetting,
  getUserActivity,
  revokeInvite,
  setScanOptions,
  setSystemSetting,
  updateLibraryPath,
  updateUser,
  updateUserProfilePicture,
} from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/dashboard', getDashboardStats);

router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/users/:id/activity', getUserActivity);

router.post('/invites', createInvite);
router.get('/invites', getAllInvites);
router.delete('/invites/:id', revokeInvite);
router.post('/invites/cleanup', cleanupExpiredInvites);

router.get('/history', getAllHistory);
router.get('/stats/listening', getListeningStats);

router.delete('/songs/:id', deleteSong);

router.get('/library/paths', getLibraryPaths);
router.post('/library/paths', addLibraryPath);
router.put('/library/paths/:id', updateLibraryPath);
router.delete('/library/paths/:id', deleteLibraryPath);

router.get('/settings', getAllSystemSettings);
router.get('/settings/:key', getSystemSetting);
router.put('/settings/:key', setSystemSetting);

// Scan options routes
router.get('/scan-options', getScanOptions);
router.put('/scan-options', setScanOptions);

// User profile picture management routes
router.put(
  '/users/:userId/profile-picture',
  adminUploadProfilePicture.single('profilePicture'),
  updateUserProfilePicture,
);
router.delete('/users/:userId/profile-picture', deleteUserProfilePicture);

export default router;
