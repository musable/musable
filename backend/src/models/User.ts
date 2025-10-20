import Database from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  profile_picture?: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  is_admin?: boolean;
}

export interface UserWithoutPassword extends Omit<User, 'password_hash'> {}

export class UserModel {
  private db = Database;

  async findById(id: number): Promise<UserWithoutPassword | null> {
    const user = await this.db.get<User>(
      'SELECT id, username, email, profile_picture, is_admin, created_at, updated_at, last_login FROM users WHERE id = ?',
      [id]
    );
    if (user) {
      // Convert SQLite integer to boolean
      user.is_admin = Boolean(user.is_admin);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db.get<User>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    if (user) {
      // Convert SQLite integer to boolean
      user.is_admin = Boolean(user.is_admin);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.db.get<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
  }

  async create(userData: CreateUserData): Promise<UserWithoutPassword> {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(userData.password, saltRounds);

    const result = await this.db.run(
      `INSERT INTO users (username, email, password_hash, is_admin) 
       VALUES (?, ?, ?, ?)`,
      [userData.username, userData.email, password_hash, userData.is_admin || false]
    );

    const user = await this.findById(result.lastID!);
    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password_hash);
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    await this.db.run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [password_hash, id]
    );
  }

  async updateProfilePicture(id: number, profilePicture: string | null): Promise<void> {
    await this.db.run(
      'UPDATE users SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [profilePicture, id]
    );
  }

  async makeAdmin(id: number): Promise<void> {
    await this.db.run(
      'UPDATE users SET is_admin = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  async removeAdmin(id: number): Promise<void> {
    await this.db.run(
      'UPDATE users SET is_admin = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  async getAllUsers(): Promise<UserWithoutPassword[]> {
    return await this.db.query<UserWithoutPassword>(
      `SELECT id, username, email, profile_picture, is_admin, created_at, updated_at, last_login 
       FROM users ORDER BY created_at DESC`
    );
  }

  async deleteUser(id: number): Promise<void> {
    await this.db.run('DELETE FROM users WHERE id = ?', [id]);
  }

  async userExists(email: string, username: string): Promise<boolean> {
    const user = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    return user!.count > 0;
  }

  async getAdminCount(): Promise<number> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE is_admin = 1'
    );
    return result!.count;
  }
}

export default new UserModel();