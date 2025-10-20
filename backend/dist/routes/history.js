"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const historyController_1 = require("../controllers/historyController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/track', historyController_1.trackPlay);
router.get('/', historyController_1.getUserHistory);
router.get('/recent', historyController_1.getRecentlyPlayed);
router.get('/most-played', historyController_1.getMostPlayed);
router.get('/stats', historyController_1.getListeningStats);
router.delete('/', historyController_1.clearHistory);
exports.default = router;
//# sourceMappingURL=history.js.map