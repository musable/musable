"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class FavoriteModel {
    static async addToFavorites(userId, songId) {
        try {
            const stmt = `INSERT INTO favorites (user_id, song_id) VALUES (?, ?)`;
            await database_1.default.run(stmt, [userId, songId]);
            return true;
        }
        catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                return true;
            }
            throw error;
        }
    }
    static async removeFromFavorites(userId, songId) {
        try {
            const stmt = `DELETE FROM favorites WHERE user_id = ? AND song_id = ?`;
            const result = await database_1.default.run(stmt, [userId, songId]);
            return result.changes > 0;
        }
        catch (error) {
            throw error;
        }
    }
    static async isFavorited(userId, songId) {
        try {
            const stmt = `SELECT 1 FROM favorites WHERE user_id = ? AND song_id = ?`;
            const result = await database_1.default.get(stmt, [userId, songId]);
            return !!result;
        }
        catch (error) {
            throw error;
        }
    }
    static async getUserFavorites(userId) {
        try {
            const stmt = `
        SELECT 
          s.*,
          a.name as artist_name,
          al.title as album_title,
          al.artwork_path,
          f.added_at as favorited_at
        FROM favorites f
        JOIN songs s ON f.song_id = s.id
        JOIN artists a ON s.artist_id = a.id
        LEFT JOIN albums al ON s.album_id = al.id
        WHERE f.user_id = ?
        ORDER BY f.added_at DESC
      `;
            const favorites = await database_1.default.query(stmt, [userId]);
            return favorites;
        }
        catch (error) {
            throw error;
        }
    }
    static async getFavoritesCount(userId) {
        try {
            const stmt = `SELECT COUNT(*) as count FROM favorites WHERE user_id = ?`;
            const result = await database_1.default.get(stmt, [userId]);
            return result?.count || 0;
        }
        catch (error) {
            throw error;
        }
    }
    static async toggleFavorite(userId, songId) {
        try {
            const isCurrentlyFavorited = await this.isFavorited(userId, songId);
            if (isCurrentlyFavorited) {
                await this.removeFromFavorites(userId, songId);
                return { isFavorited: false };
            }
            else {
                await this.addToFavorites(userId, songId);
                return { isFavorited: true };
            }
        }
        catch (error) {
            throw error;
        }
    }
}
exports.FavoriteModel = FavoriteModel;
//# sourceMappingURL=Favorite.js.map