import Database from '../config/database';

export interface AlbumFollow {
  id: number;
  user_id: number;
  album_id: number;
  followed_at: string;
}

export interface AlbumWithFollowStatus {
  id: number;
  title: string;
  artist_id: number;
  artist_name: string;
  release_year?: number;
  artwork_path?: string;
  song_count: number;
  total_duration: number;
  is_following: boolean;
  followed_at?: string;
}

export class AlbumFollowsModel {
  private db = Database;

  async followAlbum(userId: number, albumId: number): Promise<void> {
    await this.db.run(
      'INSERT OR IGNORE INTO album_follows (user_id, album_id) VALUES (?, ?)',
      [userId, albumId]
    );
  }

  async unfollowAlbum(userId: number, albumId: number): Promise<void> {
    await this.db.run(
      'DELETE FROM album_follows WHERE user_id = ? AND album_id = ?',
      [userId, albumId]
    );
  }

  async toggleAlbumFollow(userId: number, albumId: number): Promise<{ isFollowing: boolean }> {
    const isFollowing = await this.isFollowingAlbum(userId, albumId);
    
    if (isFollowing) {
      await this.unfollowAlbum(userId, albumId);
      return { isFollowing: false };
    } else {
      await this.followAlbum(userId, albumId);
      return { isFollowing: true };
    }
  }

  async isFollowingAlbum(userId: number, albumId: number): Promise<boolean> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM album_follows WHERE user_id = ? AND album_id = ?',
      [userId, albumId]
    );
    
    return (result?.count || 0) > 0;
  }

  async getUserFollowedAlbums(userId: number): Promise<AlbumWithFollowStatus[]> {
    return await this.db.query<AlbumWithFollowStatus>(
      `SELECT 
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
       ORDER BY af.followed_at DESC`,
      [userId]
    );
  }

  async getAlbumsWithFollowStatus(userId: number, limit: number = 50, offset: number = 0): Promise<AlbumWithFollowStatus[]> {
    return await this.db.query<AlbumWithFollowStatus>(
      `SELECT 
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
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
  }

  async searchAlbumsWithFollowStatus(userId: number, query: string, limit: number = 50): Promise<AlbumWithFollowStatus[]> {
    const searchTerm = `%${query}%`;
    
    return await this.db.query<AlbumWithFollowStatus>(
      `SELECT 
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
       LIMIT ?`,
      [userId, searchTerm, searchTerm, limit]
    );
  }

  async getFollowStats(userId: number): Promise<{ followedAlbums: number; totalSongs: number; totalDuration: number }> {
    const result = await this.db.get<{ followedAlbums: number; totalSongs: number; totalDuration: number }>(
      `SELECT 
        COUNT(DISTINCT a.id) as followedAlbums,
        COUNT(s.id) as totalSongs,
        COALESCE(SUM(s.duration), 0) as totalDuration
       FROM album_follows af
       JOIN albums a ON af.album_id = a.id
       LEFT JOIN songs s ON a.id = s.album_id
       WHERE af.user_id = ?`,
      [userId]
    );
    
    return result || { followedAlbums: 0, totalSongs: 0, totalDuration: 0 };
  }
}

export default new AlbumFollowsModel();