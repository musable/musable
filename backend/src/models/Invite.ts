import Database from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Invite {
  id: number;
  token: string;
  created_by: number;
  used_by?: number;
  created_at: string;
  expires_at: string;
  used_at?: string;
}

export interface CreateInviteData {
  created_by: number;
  expires_in_hours?: number;
}

export interface InviteWithUser extends Invite {
  creator_username?: string;
  user_username?: string;
}

export class InviteModel {
  private db = Database;

  async create(data: CreateInviteData): Promise<Invite> {
    const token = uuidv4();
    const expires_in_hours = data.expires_in_hours || 24;
    const expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString();

    const result = await this.db.run(
      'INSERT INTO invites (token, created_by, expires_at) VALUES (?, ?, ?)',
      [token, data.created_by, expires_at]
    );

    const invite = await this.findById(result.lastID!);
    if (!invite) {
      throw new Error('Failed to create invite');
    }

    return invite;
  }

  async findById(id: number): Promise<Invite | null> {
    return await this.db.get<Invite>(
      'SELECT * FROM invites WHERE id = ?',
      [id]
    );
  }

  async findByToken(token: string): Promise<Invite | null> {
    return await this.db.get<Invite>(
      'SELECT * FROM invites WHERE token = ?',
      [token]
    );
  }

  async isValidToken(token: string): Promise<boolean> {
    const invite = await this.db.get<Invite>(
      'SELECT * FROM invites WHERE token = ? AND used_by IS NULL AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );
    return !!invite;
  }

  async useInvite(token: string, userId: number): Promise<void> {
    await this.db.run(
      'UPDATE invites SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE token = ?',
      [userId, token]
    );
  }

  async getAllInvites(): Promise<InviteWithUser[]> {
    return await this.db.query<InviteWithUser>(
      `SELECT 
        i.*,
        creator.username as creator_username,
        user.username as user_username
       FROM invites i
       LEFT JOIN users creator ON i.created_by = creator.id
       LEFT JOIN users user ON i.used_by = user.id
       ORDER BY i.created_at DESC`
    );
  }

  async getInvitesByUser(userId: number): Promise<InviteWithUser[]> {
    return await this.db.query<InviteWithUser>(
      `SELECT 
        i.*,
        creator.username as creator_username,
        user.username as user_username
       FROM invites i
       LEFT JOIN users creator ON i.created_by = creator.id
       LEFT JOIN users user ON i.used_by = user.id
       WHERE i.created_by = ?
       ORDER BY i.created_at DESC`,
      [userId]
    );
  }

  async revokeInvite(id: number): Promise<void> {
    await this.db.run('DELETE FROM invites WHERE id = ?', [id]);
  }

  async cleanupExpiredInvites(): Promise<number> {
    const result = await this.db.run(
      'DELETE FROM invites WHERE expires_at < CURRENT_TIMESTAMP AND used_by IS NULL'
    );
    return result.changes || 0;
  }

  async getActiveInviteCount(): Promise<number> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM invites WHERE used_by IS NULL AND expires_at > CURRENT_TIMESTAMP'
    );
    return result!.count;
  }

  async getUsedInviteCount(): Promise<number> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM invites WHERE used_by IS NOT NULL'
    );
    return result!.count;
  }
}

export default new InviteModel();