"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaylistFollowsModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class PlaylistFollowsModel {
    constructor() {
        this.db = database_1.default;
    }
    async followPlaylist(userId, playlistId) {
        await this.db.run('INSERT OR IGNORE INTO playlist_follows (user_id, playlist_id) VALUES (?, ?)', [userId, playlistId]);
    }
    async unfollowPlaylist(userId, playlistId) {
        await this.db.run('DELETE FROM playlist_follows WHERE user_id = ? AND playlist_id = ?', [userId, playlistId]);
    }
    async togglePlaylistFollow(userId, playlistId) {
        const isFollowing = await this.isFollowingPlaylist(userId, playlistId);
        if (isFollowing) {
            await this.unfollowPlaylist(userId, playlistId);
            return { isFollowing: false };
        }
        else {
            await this.followPlaylist(userId, playlistId);
            return { isFollowing: true };
        }
    }
    async isFollowingPlaylist(userId, playlistId) {
        const result = await this.db.get('SELECT COUNT(*) as count FROM playlist_follows WHERE user_id = ? AND playlist_id = ?', [userId, playlistId]);
        return (result?.count || 0) > 0;
    }
    async getUserFollowedPlaylists(userId) {
        return await this.db.query(`SELECT 
        p.id,
        p.name,
        p.description,
        p.user_id,
        p.is_public,
        p.created_at,
        p.updated_at,
        u.username,
        COUNT(ps.song_id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration,
        1 as is_following,
        pf.followed_at
       FROM playlist_follows pf
       JOIN playlists p ON pf.playlist_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
       LEFT JOIN songs s ON ps.song_id = s.id
       WHERE pf.user_id = ?
       GROUP BY p.id, p.name, p.description, p.user_id, p.is_public, p.created_at, p.updated_at, u.username, pf.followed_at
       ORDER BY pf.followed_at DESC`, [userId]);
    }
    async getPlaylistsWithFollowStatus(userId, includeOwn = true, limit = 50, offset = 0) {
        const whereClause = includeOwn ? '' : 'WHERE p.user_id != ?';
        const params = includeOwn ? [userId, limit, offset] : [userId, userId, limit, offset];
        return await this.db.query(`SELECT 
        p.id,
        p.name,
        p.description,
        p.user_id,
        p.is_public,
        p.created_at,
        p.updated_at,
        u.username,
        COUNT(ps.song_id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration,
        CASE WHEN pf.user_id IS NOT NULL THEN 1 ELSE 0 END as is_following,
        pf.followed_at
       FROM playlists p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
       LEFT JOIN songs s ON ps.song_id = s.id
       LEFT JOIN playlist_follows pf ON p.id = pf.playlist_id AND pf.user_id = ?
       ${whereClause}
       GROUP BY p.id, p.name, p.description, p.user_id, p.is_public, p.created_at, p.updated_at, u.username, pf.followed_at
       ORDER BY p.updated_at DESC
       LIMIT ? OFFSET ?`, params);
    }
    async searchPlaylistsWithFollowStatus(userId, query, limit = 50) {
        const searchTerm = `%${query}%`;
        return await this.db.query(`SELECT 
        p.id,
        p.name,
        p.description,
        p.user_id,
        p.is_public,
        p.created_at,
        p.updated_at,
        u.username,
        COUNT(ps.song_id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration,
        CASE WHEN pf.user_id IS NOT NULL THEN 1 ELSE 0 END as is_following,
        pf.followed_at
       FROM playlists p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
       LEFT JOIN songs s ON ps.song_id = s.id
       LEFT JOIN playlist_follows pf ON p.id = pf.playlist_id AND pf.user_id = ?
       WHERE p.name LIKE ? OR p.description LIKE ? OR u.username LIKE ?
       GROUP BY p.id, p.name, p.description, p.user_id, p.is_public, p.created_at, p.updated_at, u.username, pf.followed_at
       ORDER BY p.name
       LIMIT ?`, [userId, searchTerm, searchTerm, searchTerm, limit]);
    }
    async getFollowStats(userId) {
        const result = await this.db.get(`SELECT 
        COUNT(DISTINCT p.id) as followedPlaylists,
        COUNT(ps.song_id) as totalSongs,
        COALESCE(SUM(s.duration), 0) as totalDuration
       FROM playlist_follows pf
       JOIN playlists p ON pf.playlist_id = p.id
       LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
       LEFT JOIN songs s ON ps.song_id = s.id
       WHERE pf.user_id = ?`, [userId]);
        return result || { followedPlaylists: 0, totalSongs: 0, totalDuration: 0 };
    }
    async getRecentlyFollowedPlaylists(userId, limit = 10) {
        return await this.db.query(`SELECT 
        p.id,
        p.name,
        p.description,
        p.user_id,
        p.is_public,
        p.created_at,
        p.updated_at,
        u.username,
        COUNT(ps.song_id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration,
        1 as is_following,
        pf.followed_at
       FROM playlist_follows pf
       JOIN playlists p ON pf.playlist_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
       LEFT JOIN songs s ON ps.song_id = s.id
       WHERE pf.user_id = ?
       GROUP BY p.id, p.name, p.description, p.user_id, p.is_public, p.created_at, p.updated_at, u.username, pf.followed_at
       ORDER BY pf.followed_at DESC
       LIMIT ?`, [userId, limit]);
    }
}
exports.PlaylistFollowsModel = PlaylistFollowsModel;
exports.default = new PlaylistFollowsModel();
//# sourceMappingURL=PlaylistFollows.js.map