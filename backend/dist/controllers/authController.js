"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProfilePicture = exports.updateProfilePicture = exports.upload = exports.validateInvite = exports.logout = exports.changePassword = exports.getProfile = exports.register = exports.login = void 0;
const joi_1 = __importDefault(require("joi"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const User_1 = __importDefault(require("../models/User"));
const Invite_1 = __importDefault(require("../models/Invite"));
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required()
});
const registerSchema = joi_1.default.object({
    username: joi_1.default.string().alphanum().min(3).max(50).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    inviteToken: joi_1.default.string().uuid().required()
});
const changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string().required(),
    newPassword: joi_1.default.string().min(6).required()
});
exports.login = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = loginSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { email, password } = req.body;
    const user = await User_1.default.findByEmail(email);
    if (!user) {
        throw new errorHandler_1.AppError('Invalid credentials', 401);
    }
    const isPasswordValid = await User_1.default.verifyPassword(user, password);
    if (!isPasswordValid) {
        throw new errorHandler_1.AppError('Invalid credentials', 401);
    }
    await User_1.default.updateLastLogin(user.id);
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
    const token = (0, auth_1.generateToken)(userWithoutPassword);
    res.json({
        success: true,
        data: {
            user: userWithoutPassword,
            token
        }
    });
});
exports.register = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = registerSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { username, email, password, inviteToken } = req.body;
    const isValidInvite = await Invite_1.default.isValidToken(inviteToken);
    if (!isValidInvite) {
        throw new errorHandler_1.AppError('Invalid or expired invite token', 400);
    }
    const userExists = await User_1.default.userExists(email, username);
    if (userExists) {
        throw new errorHandler_1.AppError('User with this email or username already exists', 400);
    }
    const user = await User_1.default.create({
        username,
        email,
        password
    });
    await Invite_1.default.useInvite(inviteToken, user.id);
    const token = (0, auth_1.generateToken)(user);
    res.status(201).json({
        success: true,
        data: {
            user,
            token
        }
    });
});
exports.getProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        data: {
            user: req.user
        }
    });
});
exports.changePassword = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = changePasswordSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.AppError(error.details[0].message, 400);
    }
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const user = await User_1.default.findByEmail(req.user.email);
    if (!user) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    const isCurrentPasswordValid = await User_1.default.verifyPassword(user, currentPassword);
    if (!isCurrentPasswordValid) {
        throw new errorHandler_1.AppError('Current password is incorrect', 400);
    }
    await User_1.default.updatePassword(userId, newPassword);
    res.json({
        success: true,
        data: {
            message: 'Password updated successfully'
        }
    });
});
exports.logout = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        data: {
            message: 'Logged out successfully'
        }
    });
});
exports.validateInvite = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.params;
    if (!token) {
        throw new errorHandler_1.AppError('Invite token required', 400);
    }
    const isValid = await Invite_1.default.isValidToken(token);
    res.json({
        success: true,
        data: {
            valid: isValid
        }
    });
});
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'profile-pictures');
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const userId = req.user.id;
        const extension = path_1.default.extname(file.originalname);
        cb(null, `user-${userId}-${Date.now()}${extension}`);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    }
    else {
        cb(new errorHandler_1.AppError('Only image files are allowed (jpeg, jpg, png, gif, webp)', 400));
    }
};
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: fileFilter
});
exports.updateProfilePicture = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw new errorHandler_1.AppError('No image file provided', 400);
    }
    const userId = req.user.id;
    const profilePicturePath = `/uploads/profile-pictures/${req.file.filename}`;
    const currentUser = await User_1.default.findById(userId);
    if (currentUser && currentUser.profile_picture) {
        const oldPicturePath = path_1.default.join(process.cwd(), currentUser.profile_picture);
        if (fs_1.default.existsSync(oldPicturePath)) {
            fs_1.default.unlinkSync(oldPicturePath);
        }
    }
    await User_1.default.updateProfilePicture(userId, profilePicturePath);
    const updatedUser = await User_1.default.findById(userId);
    res.json({
        success: true,
        data: {
            message: 'Profile picture updated successfully',
            user: updatedUser
        }
    });
});
exports.deleteProfilePicture = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const currentUser = await User_1.default.findById(userId);
    if (currentUser && currentUser.profile_picture) {
        const oldPicturePath = path_1.default.join(process.cwd(), currentUser.profile_picture);
        if (fs_1.default.existsSync(oldPicturePath)) {
            fs_1.default.unlinkSync(oldPicturePath);
        }
    }
    await User_1.default.updateProfilePicture(userId, null);
    const updatedUser = await User_1.default.findById(userId);
    res.json({
        success: true,
        data: {
            message: 'Profile picture removed successfully',
            user: updatedUser
        }
    });
});
//# sourceMappingURL=authController.js.map