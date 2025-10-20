"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFromFavorites = exports.addToFavorites = exports.checkFavoriteStatus = exports.toggleFavorite = exports.getFavorites = void 0;
const Favorite_1 = require("../models/Favorite");
const logger_1 = __importDefault(require("../utils/logger"));
const getFavorites = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const favorites = await Favorite_1.FavoriteModel.getUserFavorites(userId);
        res.json({
            success: true,
            data: {
                songs: favorites,
                count: favorites.length
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error getting favorites:', error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
};
exports.getFavorites = getFavorites;
const toggleFavorite = async (req, res) => {
    try {
        const userId = req.user?.id;
        const songId = parseInt(req.params.songId);
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        if (!songId || isNaN(songId)) {
            res.status(400).json({ error: 'Invalid song ID' });
            return;
        }
        const result = await Favorite_1.FavoriteModel.toggleFavorite(userId, songId);
        res.json({
            success: true,
            data: {
                songId,
                isFavorited: result.isFavorited,
                message: result.isFavorited ? 'Added to favorites' : 'Removed from favorites'
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error toggling favorite:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
};
exports.toggleFavorite = toggleFavorite;
const checkFavoriteStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        const songId = parseInt(req.params.songId);
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        if (!songId || isNaN(songId)) {
            res.status(400).json({ error: 'Invalid song ID' });
            return;
        }
        const isFavorited = await Favorite_1.FavoriteModel.isFavorited(userId, songId);
        res.json({
            success: true,
            data: {
                songId,
                isFavorited
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error checking favorite status:', error);
        res.status(500).json({ error: 'Failed to check favorite status' });
    }
};
exports.checkFavoriteStatus = checkFavoriteStatus;
const addToFavorites = async (req, res) => {
    try {
        const userId = req.user?.id;
        const songId = parseInt(req.params.songId);
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        if (!songId || isNaN(songId)) {
            res.status(400).json({ error: 'Invalid song ID' });
            return;
        }
        await Favorite_1.FavoriteModel.addToFavorites(userId, songId);
        res.json({
            success: true,
            data: {
                songId,
                isFavorited: true,
                message: 'Added to favorites'
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error adding to favorites:', error);
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
};
exports.addToFavorites = addToFavorites;
const removeFromFavorites = async (req, res) => {
    try {
        const userId = req.user?.id;
        const songId = parseInt(req.params.songId);
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        if (!songId || isNaN(songId)) {
            res.status(400).json({ error: 'Invalid song ID' });
            return;
        }
        await Favorite_1.FavoriteModel.removeFromFavorites(userId, songId);
        res.json({
            success: true,
            data: {
                songId,
                isFavorited: false,
                message: 'Removed from favorites'
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error removing from favorites:', error);
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
};
exports.removeFromFavorites = removeFromFavorites;
//# sourceMappingURL=favoritesController.js.map