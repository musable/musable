"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AlbumFollows_1 = __importDefault(require("../models/AlbumFollows"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/albums/:id/follow/toggle', auth_1.authenticateToken, async (req, res) => {
    try {
        const albumId = parseInt(req.params.id);
        if (isNaN(albumId)) {
            res.status(400).json({ error: 'Invalid album ID' });
            return;
        }
        const result = await AlbumFollows_1.default.toggleAlbumFollow(req.user.id, albumId);
        res.json({
            success: true,
            data: result
        });
        return;
    }
    catch (error) {
        console.error('Error toggling album follow:', error);
        res.status(500).json({ error: 'Failed to toggle album follow' });
        return;
    }
});
router.post('/albums/:id/follow', auth_1.authenticateToken, async (req, res) => {
    try {
        const albumId = parseInt(req.params.id);
        if (isNaN(albumId)) {
            res.status(400).json({ error: 'Invalid album ID' });
            return;
        }
        await AlbumFollows_1.default.followAlbum(req.user.id, albumId);
        res.json({
            success: true,
            message: 'Album followed successfully'
        });
        return;
    }
    catch (error) {
        console.error('Error following album:', error);
        res.status(500).json({ error: 'Failed to follow album' });
        return;
    }
});
router.delete('/albums/:id/follow', auth_1.authenticateToken, async (req, res) => {
    try {
        const albumId = parseInt(req.params.id);
        if (isNaN(albumId)) {
            res.status(400).json({ error: 'Invalid album ID' });
            return;
        }
        await AlbumFollows_1.default.unfollowAlbum(req.user.id, albumId);
        res.json({
            success: true,
            message: 'Album unfollowed successfully'
        });
        return;
    }
    catch (error) {
        console.error('Error unfollowing album:', error);
        res.status(500).json({ error: 'Failed to unfollow album' });
        return;
    }
});
router.get('/albums/:id/follow/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const albumId = parseInt(req.params.id);
        if (isNaN(albumId)) {
            res.status(400).json({ error: 'Invalid album ID' });
            return;
        }
        const isFollowing = await AlbumFollows_1.default.isFollowingAlbum(req.user.id, albumId);
        res.json({
            success: true,
            data: { isFollowing }
        });
        return;
    }
    catch (error) {
        console.error('Error checking follow status:', error);
        res.status(500).json({ error: 'Failed to check follow status' });
        return;
    }
});
router.get('/albums/followed', auth_1.authenticateToken, async (req, res) => {
    try {
        const albums = await AlbumFollows_1.default.getUserFollowedAlbums(req.user.id);
        res.json({
            success: true,
            data: { albums }
        });
        return;
    }
    catch (error) {
        console.error('Error fetching followed albums:', error);
        res.status(500).json({ error: 'Failed to fetch followed albums' });
        return;
    }
});
router.get('/albums/follow/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const stats = await AlbumFollows_1.default.getFollowStats(req.user.id);
        res.json({
            success: true,
            data: stats
        });
        return;
    }
    catch (error) {
        console.error('Error fetching follow stats:', error);
        res.status(500).json({ error: 'Failed to fetch follow stats' });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=albumFollows.js.map