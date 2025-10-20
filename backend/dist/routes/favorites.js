"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const favoritesController_1 = require("../controllers/favoritesController");
const router = express_1.default.Router();
if (auth_1.authenticateToken) {
    router.use(auth_1.authenticateToken);
}
router.get('/', favoritesController_1.getFavorites);
router.post('/:songId/toggle', favoritesController_1.toggleFavorite);
router.get('/:songId/status', favoritesController_1.checkFavoriteStatus);
router.post('/:songId', favoritesController_1.addToFavorites);
router.delete('/:songId', favoritesController_1.removeFromFavorites);
exports.default = router;
//# sourceMappingURL=favorites.js.map