"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shareController_1 = require("../controllers/shareController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/:token', shareController_1.getSharedSong);
router.post('/create', auth_1.authenticateToken, shareController_1.createShareToken);
exports.default = router;
//# sourceMappingURL=share.js.map