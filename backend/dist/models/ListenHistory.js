"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListenHistoryModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class ListenHistoryModel {
    constructor() {
        this.db = database_1.default;
    }
    async create(data) {
        const result = await this.db.run('INSERT INTO listen_history (user_id, song_id, duration_played, completed) VALUES (?, ?, ?, ?)', [data.user_id, data.song_id, data.duration_played || null, data.completed || false]);
        const history = await this.findById(result.lastID);
        if (!history) {
            throw new Error('Failed to create listen history entry');
        }
        return history;
    }
    async findById(id) {
        return await this.db.get('SELECT * FROM listen_history WHERE id = ?', [id]);
    }
    async getUserHistory(userId, limit = 50, offset = 0) {
        return await this.db.query(`SELECT 
        lh.*,
        u.username,
        s.title as song_title,
        a.name as artist_name,
        al.title as album_title,
        s.duration as song_duration,
        al.artwork_path as artwork_path
       FROM listen_history lh
       JOIN users u ON lh.user_id = u.id
       JOIN songs s ON lh.song_id = s.id
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE lh.user_id = ?
       ORDER BY lh.played_at DESC
       LIMIT ? OFFSET ?`, [userId, limit, offset]);
    }
    async getAllHistory(limit = 100, offset = 0) {
        return await this.db.query(`SELECT 
        lh.*,
        u.username,
        s.title as song_title,
        a.name as artist_name,
        al.title as album_title,
        s.duration as song_duration,
        al.artwork_path as artwork_path
       FROM listen_history lh
       JOIN users u ON lh.user_id = u.id
       JOIN songs s ON lh.song_id = s.id
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       ORDER BY lh.played_at DESC
       LIMIT ? OFFSET ?`, [limit, offset]);
    }
    async getRecentlyPlayedSongs(userId, limit = 20) {
        return await this.db.query(`SELECT DISTINCT
        lh.*,
        u.username,
        s.title as song_title,
        a.name as artist_name,
        al.title as album_title,
        s.duration as song_duration,
        al.artwork_path
       FROM listen_history lh
       JOIN users u ON lh.user_id = u.id
       JOIN songs s ON lh.song_id = s.id
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE lh.user_id = ?
       GROUP BY lh.song_id
       ORDER BY MAX(lh.played_at) DESC
       LIMIT ?`, [userId, limit]);
    }
    async getMostPlayedSongs(userId, limit = 20) {
        if (userId) {
            return await this.db.query(`SELECT 
          s.id,
          s.title,
          a.name as artist_name,
          al.title as album_title,
          al.artwork_path,
          COUNT(*) as play_count
         FROM listen_history lh
         JOIN songs s ON lh.song_id = s.id
         JOIN artists a ON s.artist_id = a.id
         LEFT JOIN albums al ON s.album_id = al.id
         WHERE lh.user_id = ?
         GROUP BY s.id
         ORDER BY play_count DESC
         LIMIT ?`, [userId, limit]);
        }
        else {
            return await this.db.query(`SELECT 
          s.id,
          s.title,
          a.name as artist_name,
          al.title as album_title,
          al.artwork_path,
          COUNT(*) as play_count
         FROM listen_history lh
         JOIN songs s ON lh.song_id = s.id
         JOIN artists a ON s.artist_id = a.id
         LEFT JOIN albums al ON s.album_id = al.id
         GROUP BY s.id
         ORDER BY play_count DESC
         LIMIT ?`, [limit]);
        }
    }
    async getListeningStats(userId) {
        if (userId) {
            const stats = await this.db.get(`SELECT 
          COUNT(*) as total_plays,
          COUNT(DISTINCT song_id) as unique_songs,
          COUNT(DISTINCT DATE(played_at)) as listening_days,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_plays,
          SUM(duration_played) as total_listening_time
         FROM listen_history
         WHERE user_id = ?`, [userId]);
            return stats;
        }
        else {
            const stats = await this.db.get(`SELECT 
          COUNT(*) as total_plays,
          COUNT(DISTINCT song_id) as unique_songs,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(DISTINCT DATE(played_at)) as listening_days,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_plays,
          SUM(duration_played) as total_listening_time
         FROM listen_history`);
            return stats;
        }
    }
    async getListeningTrends(userId, days = 30) {
        if (userId) {
            return await this.db.query(`SELECT 
          DATE(played_at) as date,
          COUNT(*) as plays,
          COUNT(DISTINCT song_id) as unique_songs,
          SUM(duration_played) as total_time
         FROM listen_history
         WHERE user_id = ? 
           AND played_at >= datetime('now', '-${days} days')
         GROUP BY DATE(played_at)
         ORDER BY date DESC`, [userId]);
        }
        else {
            return await this.db.query(`SELECT 
          DATE(played_at) as date,
          COUNT(*) as plays,
          COUNT(DISTINCT song_id) as unique_songs,
          COUNT(DISTINCT user_id) as active_users,
          SUM(duration_played) as total_time
         FROM listen_history
         WHERE played_at >= datetime('now', '-${days} days')
         GROUP BY DATE(played_at)
         ORDER BY date DESC`);
        }
    }
    async getUserTopArtists(userId, limit = 10) {
        return await this.db.query(`SELECT 
        a.id,
        a.name,
        COUNT(*) as play_count,
        COUNT(DISTINCT s.id) as unique_songs
       FROM listen_history lh
       JOIN songs s ON lh.song_id = s.id
       JOIN artists a ON s.artist_id = a.id
       WHERE lh.user_id = ?
       GROUP BY a.id
       ORDER BY play_count DESC
       LIMIT ?`, [userId, limit]);
    }
    async getUserTopAlbums(userId, limit = 10) {
        return await this.db.query(`SELECT 
        al.id,
        al.title,
        a.name as artist_name,
        al.artwork_path,
        COUNT(*) as play_count
       FROM listen_history lh
       JOIN songs s ON lh.song_id = s.id
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE lh.user_id = ? AND al.id IS NOT NULL
       GROUP BY al.id
       ORDER BY play_count DESC
       LIMIT ?`, [userId, limit]);
    }
    async deleteUserHistory(userId) {
        const result = await this.db.run('DELETE FROM listen_history WHERE user_id = ?', [userId]);
        return result.changes || 0;
    }
    async deleteOldHistory(days = 365) {
        const result = await this.db.run(`DELETE FROM listen_history 
       WHERE played_at < datetime('now', '-${days} days')`, []);
        return result.changes || 0;
    }
    async getMonthlyTrends() {
        const currentMonth = await this.db.get(`SELECT 
        COUNT(*) as total_plays,
        COUNT(DISTINCT song_id) as unique_songs,
        COUNT(DISTINCT user_id) as active_users,
        SUM(duration_played) as total_listening_time
       FROM listen_history
       WHERE played_at >= datetime('now', 'start of month')`);
        const previousMonth = await this.db.get(`SELECT 
        COUNT(*) as total_plays,
        COUNT(DISTINCT song_id) as unique_songs,
        COUNT(DISTINCT user_id) as active_users,
        SUM(duration_played) as total_listening_time
       FROM listen_history
       WHERE played_at >= datetime('now', 'start of month', '-1 month')
         AND played_at < datetime('now', 'start of month')`);
        const calculatePercentageChange = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };
        return {
            total_plays: {
                current: currentMonth.total_plays || 0,
                previous: previousMonth.total_plays || 0,
                change: calculatePercentageChange(currentMonth.total_plays || 0, previousMonth.total_plays || 0)
            },
            unique_songs: {
                current: currentMonth.unique_songs || 0,
                previous: previousMonth.unique_songs || 0,
                change: calculatePercentageChange(currentMonth.unique_songs || 0, previousMonth.unique_songs || 0)
            },
            active_users: {
                current: currentMonth.active_users || 0,
                previous: previousMonth.active_users || 0,
                change: calculatePercentageChange(currentMonth.active_users || 0, previousMonth.active_users || 0)
            },
            total_listening_time: {
                current: currentMonth.total_listening_time || 0,
                previous: previousMonth.total_listening_time || 0,
                change: calculatePercentageChange(currentMonth.total_listening_time || 0, previousMonth.total_listening_time || 0)
            }
        };
    }
    async getUsersMonthlyTrend() {
        const currentMonth = await this.db.get(`SELECT COUNT(DISTINCT user_id) as active_users
       FROM listen_history
       WHERE played_at >= datetime('now', 'start of month')`);
        const previousMonth = await this.db.get(`SELECT COUNT(DISTINCT user_id) as active_users
       FROM listen_history
       WHERE played_at >= datetime('now', 'start of month', '-1 month')
         AND played_at < datetime('now', 'start of month')`);
        const calculatePercentageChange = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };
        return {
            current: currentMonth.active_users || 0,
            previous: previousMonth.active_users || 0,
            change: calculatePercentageChange(currentMonth.active_users || 0, previousMonth.active_users || 0)
        };
    }
    async getSongsMonthlyTrend() {
        const currentMonth = await this.db.get(`SELECT COUNT(*) as new_songs
       FROM songs
       WHERE created_at >= datetime('now', 'start of month')`);
        const previousMonth = await this.db.get(`SELECT COUNT(*) as new_songs
       FROM songs
       WHERE created_at >= datetime('now', 'start of month', '-1 month')
         AND created_at < datetime('now', 'start of month')`);
        const calculatePercentageChange = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };
        return {
            current: currentMonth.new_songs || 0,
            previous: previousMonth.new_songs || 0,
            change: calculatePercentageChange(currentMonth.new_songs || 0, previousMonth.new_songs || 0)
        };
    }
}
exports.ListenHistoryModel = ListenHistoryModel;
exports.default = new ListenHistoryModel();
//# sourceMappingURL=ListenHistory.js.map