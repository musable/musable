import { Router } from 'express';
import {
  login,
  register,
  getProfile,
  changePassword,
  logout,
  validateInvite,
  upload,
  updateProfilePicture,
  deleteProfilePicture
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', login);

router.post('/register', register);

router.get('/profile', authenticateToken, getProfile);

router.put('/password', authenticateToken, changePassword);

router.post('/logout', authenticateToken, logout);

router.get('/invite/:token', validateInvite);

// Profile picture routes
router.put('/profile-picture', authenticateToken, upload.single('profilePicture'), updateProfilePicture);

router.delete('/profile-picture', authenticateToken, deleteProfilePicture);

export default router;