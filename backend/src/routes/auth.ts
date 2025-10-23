import { Router } from 'express';
import {
  changePassword,
  deleteProfilePicture,
  getProfile,
  login,
  logout,
  register,
  updateProfilePicture,
  upload,
  validateInvite,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);

router.post('/register', register);

router.get('/profile', authenticateToken, getProfile);

router.put('/password', authenticateToken, changePassword);

router.post('/logout', authenticateToken, logout);

router.get('/invite/:token', validateInvite);

// Profile picture routes
router.put(
  '/profile-picture',
  authenticateToken,
  upload.single('profilePicture'),
  updateProfilePicture,
);

router.delete('/profile-picture', authenticateToken, deleteProfilePicture);

export default router;
