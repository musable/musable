import Database from '../config/database.js';

export interface ListenHistory {
  id: number;
  user_id: number;
  song_id: number;
  played_at: string;
  duration_played?: number;
  completed: boolean;
}

export interface ListenHistoryWithDetails extends ListenHistory {
  username: string;
  song_title: string;
  artist_name: string;
  album_title?: string;
  song_duration?: number;
  artwork_path?: string;
}

export interface CreateListenHistoryData {
  user_id: number;
  song_id: number;
  duration_played?: number;
  completed?: boolean;
}

export class ListenHistoryModel {
  private db = Database;

  async create(data: CreateListenHistoryData): Promise<ListenHistory> {
    const result = await this.db.run(
      'INSERT INTO listen_history (user_id, song_id, duration_played, completed) VALUES (?, ?, ?, ?)',
      [
        data.user_id,
        data.song_id,
        data.duration_played || null,
        data.completed || false,
      ],
    );

    const history = await this.findById(result.lastID!);
    if (!history) {
      throw new Error('Failed to create listen history entry');
    }

    return history;
  }

  async findById(id: number): Promise<ListenHistory | null> {
    return await this.db.get<ListenHistory>(
      'SELECT * FROM listen_history WHERE id = ?',
      [id],
    );
  }

  async getUserHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ListenHistoryWithDetails[]> {
    return await this.db.query<ListenHistoryWithDetails>(
      `SELECT
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
       LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );
  }

  async getAllHistory(
    limit: number = 100,
    offset: number = 0,
  ): Promise<ListenHistoryWithDetails[]> {
    return await this.db.query<ListenHistoryWithDetails>(
      `SELECT
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
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
  }

  async getRecentlyPlayedSongs(
    userId: number,
    limit: number = 20,
  ): Promise<ListenHistoryWithDetails[]> {
    return await this.db.query<ListenHistoryWithDetails>(
      `SELECT DISTINCT
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
       LIMIT ?`,
      [userId, limit],
    );
  }

  async getMostPlayedSongs(
    userId?: number,
    limit: number = 20,
  ): Promise<any[]> {
    if (userId) {
      return await this.db.query(
        `SELECT
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
         LIMIT ?`,
        [userId, limit],
      );
    } else {
      return await this.db.query(
        `SELECT
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
         LIMIT ?`,
        [limit],
      );
    }
  }

  async getListeningStats(userId?: number): Promise<any> {
    if (userId) {
      const stats = await this.db.get(
        `SELECT
          COUNT(*) as total_plays,
          COUNT(DISTINCT song_id) as unique_songs,
          COUNT(DISTINCT DATE(played_at)) as listening_days,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_plays,
          SUM(duration_played) as total_listening_time
         FROM listen_history
         WHERE user_id = ?`,
        [userId],
      );
      return stats;
    } else {
      const stats = await this.db.get(
        `SELECT
          COUNT(*) as total_plays,
          COUNT(DISTINCT song_id) as unique_songs,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(DISTINCT DATE(played_at)) as listening_days,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_plays,
          SUM(duration_played) as total_listening_time
         FROM listen_history`,
      );
      return stats;
    }
  }

  async getListeningTrends(userId?: number, days: number = 30): Promise<any[]> {
    if (userId) {
      return await this.db.query(
        `SELECT
          DATE(played_at) as date,
          COUNT(*) as plays,
          COUNT(DISTINCT song_id) as unique_songs,
          SUM(duration_played) as total_time
         FROM listen_history
         WHERE user_id = ?
           AND played_at >= datetime('now', '-${days} days')
         GROUP BY DATE(played_at)
         ORDER BY date DESC`,
        [userId],
      );
    } else {
      return await this.db.query(
        `SELECT
          DATE(played_at) as date,
          COUNT(*) as plays,
          COUNT(DISTINCT song_id) as unique_songs,
          COUNT(DISTINCT user_id) as active_users,
          SUM(duration_played) as total_time
         FROM listen_history
         WHERE played_at >= datetime('now', '-${days} days')
         GROUP BY DATE(played_at)
         ORDER BY date DESC`,
      );
    }
  }

  async getUserTopArtists(userId: number, limit: number = 10): Promise<any[]> {
    return await this.db.query(
      `SELECT
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
       LIMIT ?`,
      [userId, limit],
    );
  }

  async getUserTopAlbums(userId: number, limit: number = 10): Promise<any[]> {
    return await this.db.query(
      `SELECT
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
       LIMIT ?`,
      [userId, limit],
    );
  }

  async deleteUserHistory(userId: number): Promise<number> {
    const result = await this.db.run(
      'DELETE FROM listen_history WHERE user_id = ?',
      [userId],
    );
    return result.changes || 0;
  }

  async deleteOldHistory(days: number = 365): Promise<number> {
    const result = await this.db.run(
      `DELETE FROM listen_history
       WHERE played_at < datetime('now', '-${days} days')`,
      [],
    );
    return result.changes || 0;
  }

  async getMonthlyTrends(): Promise<any> {
    // Get current month stats
    const currentMonth = await this.db.get(
      `SELECT
        COUNT(*) as total_plays,
        COUNT(DISTINCT song_id) as unique_songs,
        COUNT(DISTINCT user_id) as active_users,
        SUM(duration_played) as total_listening_time
       FROM listen_history
       WHERE played_at >= datetime('now', 'start of month')`,
    );

    // Get previous month stats
    const previousMonth = await this.db.get(
      `SELECT
        COUNT(*) as total_plays,
        COUNT(DISTINCT song_id) as unique_songs,
        COUNT(DISTINCT user_id) as active_users,
        SUM(duration_played) as total_listening_time
       FROM listen_history
       WHERE played_at >= datetime('now', 'start of month', '-1 month')
         AND played_at < datetime('now', 'start of month')`,
    );

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      total_plays: {
        current: currentMonth.total_plays || 0,
        previous: previousMonth.total_plays || 0,
        change: calculatePercentageChange(
          currentMonth.total_plays || 0,
          previousMonth.total_plays || 0,
        ),
      },
      unique_songs: {
        current: currentMonth.unique_songs || 0,
        previous: previousMonth.unique_songs || 0,
        change: calculatePercentageChange(
          currentMonth.unique_songs || 0,
          previousMonth.unique_songs || 0,
        ),
      },
      active_users: {
        current: currentMonth.active_users || 0,
        previous: previousMonth.active_users || 0,
        change: calculatePercentageChange(
          currentMonth.active_users || 0,
          previousMonth.active_users || 0,
        ),
      },
      total_listening_time: {
        current: currentMonth.total_listening_time || 0,
        previous: previousMonth.total_listening_time || 0,
        change: calculatePercentageChange(
          currentMonth.total_listening_time || 0,
          previousMonth.total_listening_time || 0,
        ),
      },
    };
  }

  async getUsersMonthlyTrend(): Promise<any> {
    // Get current month user count (users who listened)
    const currentMonth = await this.db.get(
      `SELECT COUNT(DISTINCT user_id) as active_users
       FROM listen_history
       WHERE played_at >= datetime('now', 'start of month')`,
    );

    // Get previous month user count
    const previousMonth = await this.db.get(
      `SELECT COUNT(DISTINCT user_id) as active_users
       FROM listen_history
       WHERE played_at >= datetime('now', 'start of month', '-1 month')
         AND played_at < datetime('now', 'start of month')`,
    );

    const calculatePercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      current: currentMonth.active_users || 0,
      previous: previousMonth.active_users || 0,
      change: calculatePercentageChange(
        currentMonth.active_users || 0,
        previousMonth.active_users || 0,
      ),
    };
  }

  async getSongsMonthlyTrend(): Promise<any> {
    // Get current month - count songs added in current month
    const currentMonth = await this.db.get(
      `SELECT COUNT(*) as new_songs
       FROM songs
       WHERE created_at >= datetime('now', 'start of month')`,
    );

    // Get previous month
    const previousMonth = await this.db.get(
      `SELECT COUNT(*) as new_songs
       FROM songs
       WHERE created_at >= datetime('now', 'start of month', '-1 month')
         AND created_at < datetime('now', 'start of month')`,
    );

    const calculatePercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      current: currentMonth.new_songs || 0,
      previous: previousMonth.new_songs || 0,
      change: calculatePercentageChange(
        currentMonth.new_songs || 0,
        previousMonth.new_songs || 0,
      ),
    };
  }
}

export default new ListenHistoryModel();
