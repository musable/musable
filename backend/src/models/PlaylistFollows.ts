import Database from '../config/database.js';

export interface PlaylistFollow {
  id: number;
  user_id: number;
  playlist_id: number;
  followed_at: string;
}

export interface PlaylistWithFollowStatus {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  username: string;
  is_public: boolean;
  song_count: number;
  total_duration: number;
  is_following: boolean;
  followed_at?: string;
  created_at: string;
  updated_at: string;
}

export class PlaylistFollowsModel {
  private db = Database;

  async followPlaylist(userId: number, playlistId: number): Promise<void> {
    await this.db.run(
      'INSERT OR IGNORE INTO playlist_follows (user_id, playlist_id) VALUES (?, ?)',
      [userId, playlistId],
    );
  }

  async unfollowPlaylist(userId: number, playlistId: number): Promise<void> {
    await this.db.run(
      'DELETE FROM playlist_follows WHERE user_id = ? AND playlist_id = ?',
      [userId, playlistId],
    );
  }

  async togglePlaylistFollow(
    userId: number,
    playlistId: number,
  ): Promise<{ isFollowing: boolean }> {
    const isFollowing = await this.isFollowingPlaylist(userId, playlistId);

    if (isFollowing) {
      await this.unfollowPlaylist(userId, playlistId);
      return { isFollowing: false };
    } else {
      await this.followPlaylist(userId, playlistId);
      return { isFollowing: true };
    }
  }

  async isFollowingPlaylist(
    userId: number,
    playlistId: number,
  ): Promise<boolean> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM playlist_follows WHERE user_id = ? AND playlist_id = ?',
      [userId, playlistId],
    );

    return (result?.count || 0) > 0;
  }

  async getUserFollowedPlaylists(
    userId: number,
  ): Promise<PlaylistWithFollowStatus[]> {
    return await this.db.query<PlaylistWithFollowStatus>(
      `SELECT
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
       ORDER BY pf.followed_at DESC`,
      [userId],
    );
  }

  async getPlaylistsWithFollowStatus(
    userId: number,
    includeOwn: boolean = true,
    limit: number = 50,
    offset: number = 0,
  ): Promise<PlaylistWithFollowStatus[]> {
    const whereClause = includeOwn ? '' : 'WHERE p.user_id != ?';
    const params = includeOwn
      ? [userId, limit, offset]
      : [userId, userId, limit, offset];

    return await this.db.query<PlaylistWithFollowStatus>(
      `SELECT
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
       LIMIT ? OFFSET ?`,
      params,
    );
  }

  async searchPlaylistsWithFollowStatus(
    userId: number,
    query: string,
    limit: number = 50,
  ): Promise<PlaylistWithFollowStatus[]> {
    const searchTerm = `%${query}%`;

    return await this.db.query<PlaylistWithFollowStatus>(
      `SELECT
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
       LIMIT ?`,
      [userId, searchTerm, searchTerm, searchTerm, limit],
    );
  }

  async getFollowStats(userId: number): Promise<{
    followedPlaylists: number;
    totalSongs: number;
    totalDuration: number;
  }> {
    const result = await this.db.get<{
      followedPlaylists: number;
      totalSongs: number;
      totalDuration: number;
    }>(
      `SELECT
        COUNT(DISTINCT p.id) as followedPlaylists,
        COUNT(ps.song_id) as totalSongs,
        COALESCE(SUM(s.duration), 0) as totalDuration
       FROM playlist_follows pf
       JOIN playlists p ON pf.playlist_id = p.id
       LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
       LEFT JOIN songs s ON ps.song_id = s.id
       WHERE pf.user_id = ?`,
      [userId],
    );

    return result || { followedPlaylists: 0, totalSongs: 0, totalDuration: 0 };
  }

  async getRecentlyFollowedPlaylists(
    userId: number,
    limit: number = 10,
  ): Promise<PlaylistWithFollowStatus[]> {
    return await this.db.query<PlaylistWithFollowStatus>(
      `SELECT
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
       LIMIT ?`,
      [userId, limit],
    );
  }
}

export default new PlaylistFollowsModel();
