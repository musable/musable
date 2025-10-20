import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import UserModel from '../models/User';
import InviteModel from '../models/Invite';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { generateToken, AuthRequest } from '../middleware/auth';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  inviteToken: Joi.string().uuid().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { email, password } = req.body;

  const user = await UserModel.findByEmail(email);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isPasswordValid = await UserModel.verifyPassword(user, password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  await UserModel.updateLastLogin(user.id);

  const userWithoutPassword = {
    id: user.id,
    username: user.username,
    email: user.email,
    profile_picture: user.profile_picture,
    is_admin: user.is_admin,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login: user.last_login
  };

  const token = generateToken(userWithoutPassword);

  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      token
    }
  });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { username, email, password, inviteToken } = req.body;

  const isValidInvite = await InviteModel.isValidToken(inviteToken);
  if (!isValidInvite) {
    throw new AppError('Invalid or expired invite token', 400);
  }

  const userExists = await UserModel.userExists(email, username);
  if (userExists) {
    throw new AppError('User with this email or username already exists', 400);
  }

  const user = await UserModel.create({
    username,
    email,
    password
  });

  await InviteModel.useInvite(inviteToken, user.id);

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    data: {
      user,
      token
    }
  });
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { error } = changePasswordSchema.validate(req.body);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.id;

  const user = await UserModel.findByEmail(req.user!.email);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isCurrentPasswordValid = await UserModel.verifyPassword(user, currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  await UserModel.updatePassword(userId, newPassword);

  res.json({
    success: true,
    data: {
      message: 'Password updated successfully'
    }
  });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  });
});

export const validateInvite = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!token) {
    throw new AppError('Invite token required', 400);
  }

  const isValid = await InviteModel.isValidToken(token);
  
  res.json({
    success: true,
    data: {
      valid: isValid
    }
  });
});

// Multer configuration for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as AuthRequest).user!.id;
    const extension = path.extname(file.originalname);
    cb(null, `user-${userId}-${Date.now()}${extension}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed (jpeg, jpg, png, gif, webp)', 400));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

export const updateProfilePicture = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }

  const userId = req.user!.id;
  const profilePicturePath = `/uploads/profile-pictures/${req.file.filename}`;

  // Delete old profile picture if it exists
  const currentUser = await UserModel.findById(userId);
  if (currentUser && currentUser.profile_picture) {
    const oldPicturePath = path.join(process.cwd(), currentUser.profile_picture);
    if (fs.existsSync(oldPicturePath)) {
      fs.unlinkSync(oldPicturePath);
    }
  }

  await UserModel.updateProfilePicture(userId, profilePicturePath);

  // Get updated user data
  const updatedUser = await UserModel.findById(userId);

  res.json({
    success: true,
    data: {
      message: 'Profile picture updated successfully',
      user: updatedUser
    }
  });
});

export const deleteProfilePicture = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const currentUser = await UserModel.findById(userId);

  if (currentUser && currentUser.profile_picture) {
    const oldPicturePath = path.join(process.cwd(), currentUser.profile_picture);
    if (fs.existsSync(oldPicturePath)) {
      fs.unlinkSync(oldPicturePath);
    }
  }

  await UserModel.updateProfilePicture(userId, null);

  // Get updated user data
  const updatedUser = await UserModel.findById(userId);

  res.json({
    success: true,
    data: {
      message: 'Profile picture removed successfully',
      user: updatedUser
    }
  });
});