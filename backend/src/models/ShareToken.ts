import { randomBytes } from 'crypto';
import Database from '../config/database';

export interface ShareToken {
  id: number;
  token: string;
  song_id: number;
  created_by: number;
  access_count: number;
  max_access: number | null;
  expires_at: string | null;
  created_at: string;
  last_accessed: string | null;
}

export interface CreateShareTokenData {
  song_id: number;
  created_by: number;
  max_access?: number;
  expires_in_hours?: number;
}

class ShareTokenModel {
  private db = Database;

  private generateToken(): string {
    // Generate a secure random token
    return randomBytes(32).toString('base64url');
  }

  async create(data: CreateShareTokenData): Promise<ShareToken> {
    const token = this.generateToken();
    const expiresAt = data.expires_in_hours 
      ? new Date(Date.now() + data.expires_in_hours * 60 * 60 * 1000).toISOString()
      : null;

    const result = await this.db.run(
      `INSERT INTO share_tokens (token, song_id, created_by, max_access, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [token, data.song_id, data.created_by, data.max_access || null, expiresAt]
    );

    const shareToken = await this.findById(result.lastID!);
    if (!shareToken) {
      throw new Error('Failed to create share token');
    }

    return shareToken;
  }

  async findById(id: number): Promise<ShareToken | null> {
    return await this.db.get<ShareToken>(
      'SELECT * FROM share_tokens WHERE id = ?',
      [id]
    );
  }

  async findByToken(token: string): Promise<ShareToken | null> {
    return await this.db.get<ShareToken>(
      'SELECT * FROM share_tokens WHERE token = ?',
      [token]
    );
  }

  async validateAndIncrementAccess(token: string): Promise<{ valid: boolean; shareToken?: ShareToken; song?: any }> {
    const shareToken = await this.findByToken(token);
    
    if (!shareToken) {
      return { valid: false };
    }

    // Check if expired
    if (shareToken.expires_at && new Date() > new Date(shareToken.expires_at)) {
      return { valid: false };
    }

    // Check max access limit
    if (shareToken.max_access && shareToken.access_count >= shareToken.max_access) {
      return { valid: false };
    }

    // Get song details
    const song = await this.db.get(
      `SELECT s.*, a.name as artist_name, al.title as album_title, al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.id = ?`,
      [shareToken.song_id]
    );

    if (!song) {
      return { valid: false };
    }

    // Increment access count and update last accessed
    await this.db.run(
      'UPDATE share_tokens SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE id = ?',
      [shareToken.id]
    );

    return { 
      valid: true, 
      shareToken: {
        ...shareToken,
        access_count: shareToken.access_count + 1
      },
      song 
    };
  }

  async findBySongId(songId: number): Promise<ShareToken[]> {
    return await this.db.query<ShareToken>(
      'SELECT * FROM share_tokens WHERE song_id = ? ORDER BY created_at DESC',
      [songId]
    );
  }

  async findByCreatedBy(userId: number): Promise<ShareToken[]> {
    return await this.db.query<ShareToken>(
      `SELECT st.*, s.title as song_title, a.name as artist_name
       FROM share_tokens st
       JOIN songs s ON st.song_id = s.id
       JOIN artists a ON s.artist_id = a.id
       WHERE st.created_by = ?
       ORDER BY st.created_at DESC`,
      [userId]
    );
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.run(
      'DELETE FROM share_tokens WHERE id = ?',
      [id]
    );

    return result.changes > 0;
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.db.run(
      'DELETE FROM share_tokens WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP'
    );

    return result.changes;
  }
}

export default new ShareTokenModel();