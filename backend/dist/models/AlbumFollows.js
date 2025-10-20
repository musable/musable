"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlbumFollowsModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class AlbumFollowsModel {
    constructor() {
        this.db = database_1.default;
    }
    async followAlbum(userId, albumId) {
        await this.db.run('INSERT OR IGNORE INTO album_follows (user_id, album_id) VALUES (?, ?)', [userId, albumId]);
    }
    async unfollowAlbum(userId, albumId) {
        await this.db.run('DELETE FROM album_follows WHERE user_id = ? AND album_id = ?', [userId, albumId]);
    }
    async toggleAlbumFollow(userId, albumId) {
        const isFollowing = await this.isFollowingAlbum(userId, albumId);
        if (isFollowing) {
            await this.unfollowAlbum(userId, albumId);
            return { isFollowing: false };
        }
        else {
            await this.followAlbum(userId, albumId);
            return { isFollowing: true };
        }
    }
    async isFollowingAlbum(userId, albumId) {
        const result = await this.db.get('SELECT COUNT(*) as count FROM album_follows WHERE user_id = ? AND album_id = ?', [userId, albumId]);
        return (result?.count || 0) > 0;
    }
    async getUserFollowedAlbums(userId) {
        return await this.db.query(`SELECT 
        a.id,
        a.title,
        a.artist_id,
        ar.name as artist_name,
        a.release_year,
        a.artwork_path,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration,
        1 as is_following,
        af.followed_at
       FROM album_follows af
       JOIN albums a ON af.album_id = a.id
       JOIN artists ar ON a.artist_id = ar.id
       LEFT JOIN songs s ON a.id = s.album_id
       WHERE af.user_id = ?
       GROUP BY a.id, a.title, a.artist_id, ar.name, a.release_year, a.artwork_path, af.followed_at
       ORDER BY af.followed_at DESC`, [userId]);
    }
    async getAlbumsWithFollowStatus(userId, limit = 50, offset = 0) {
        return await this.db.query(`SELECT 
        a.id,
        a.title,
        a.artist_id,
        ar.name as artist_name,
        a.release_year,
        a.artwork_path,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration,
        CASE WHEN af.user_id IS NOT NULL THEN 1 ELSE 0 END as is_following,
        af.followed_at
       FROM albums a
       JOIN artists ar ON a.artist_id = ar.id
       LEFT JOIN songs s ON a.id = s.album_id
       LEFT JOIN album_follows af ON a.id = af.album_id AND af.user_id = ?
       GROUP BY a.id, a.title, a.artist_id, ar.name, a.release_year, a.artwork_path, af.followed_at
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`, [userId, limit, offset]);
    }
    async searchAlbumsWithFollowStatus(userId, query, limit = 50) {
        const searchTerm = `%${query}%`;
        return await this.db.query(`SELECT 
        a.id,
        a.title,
        a.artist_id,
        ar.name as artist_name,
        a.release_year,
        a.artwork_path,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration,
        CASE WHEN af.user_id IS NOT NULL THEN 1 ELSE 0 END as is_following,
        af.followed_at
       FROM albums a
       JOIN artists ar ON a.artist_id = ar.id
       LEFT JOIN songs s ON a.id = s.album_id
       LEFT JOIN album_follows af ON a.id = af.album_id AND af.user_id = ?
       WHERE a.title LIKE ? OR ar.name LIKE ?
       GROUP BY a.id, a.title, a.artist_id, ar.name, a.release_year, a.artwork_path, af.followed_at
       ORDER BY a.title
       LIMIT ?`, [userId, searchTerm, searchTerm, limit]);
    }
    async getFollowStats(userId) {
        const result = await this.db.get(`SELECT 
        COUNT(DISTINCT a.id) as followedAlbums,
        COUNT(s.id) as totalSongs,
        COALESCE(SUM(s.duration), 0) as totalDuration
       FROM album_follows af
       JOIN albums a ON af.album_id = a.id
       LEFT JOIN songs s ON a.id = s.album_id
       WHERE af.user_id = ?`, [userId]);
        return result || { followedAlbums: 0, totalSongs: 0, totalDuration: 0 };
    }
}
exports.AlbumFollowsModel = AlbumFollowsModel;
exports.default = new AlbumFollowsModel();
//# sourceMappingURL=AlbumFollows.js.map