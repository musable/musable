"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/login', authController_1.login);
router.post('/register', authController_1.register);
router.get('/profile', auth_1.authenticateToken, authController_1.getProfile);
router.put('/password', auth_1.authenticateToken, authController_1.changePassword);
router.post('/logout', auth_1.authenticateToken, authController_1.logout);
router.get('/invite/:token', authController_1.validateInvite);
router.put('/profile-picture', auth_1.authenticateToken, authController_1.upload.single('profilePicture'), authController_1.updateProfilePicture);
router.delete('/profile-picture', auth_1.authenticateToken, authController_1.deleteProfilePicture);
exports.default = router;
//# sourceMappingURL=auth.js.map