import Database from '../config/database.js';

export interface LibraryPath {
  id?: number;
  path: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SystemSettings {
  id?: number;
  key: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

class SettingsModel {
  private db = Database;

  async getLibraryPaths(): Promise<LibraryPath[]> {
    const paths = await this.db.query<LibraryPath>(`
      SELECT * FROM library_paths
      ORDER BY created_at ASC
    `);
    return paths || [];
  }

  async addLibraryPath(path: string): Promise<LibraryPath> {
    const result = await this.db.run(
      `INSERT INTO library_paths (path, is_active, created_at, updated_at)
       VALUES (?, ?, datetime('now'), datetime('now'))`,
      [path, 1],
    );

    const newPath = await this.db.get<LibraryPath>(
      'SELECT * FROM library_paths WHERE id = ?',
      [result.lastID],
    );

    if (!newPath) {
      throw new Error('Failed to create library path');
    }

    return newPath;
  }

  async updateLibraryPath(
    id: number,
    updates: Partial<LibraryPath>,
  ): Promise<LibraryPath> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.path !== undefined) {
      updateFields.push('path = ?');
      values.push(updates.path);
    }

    if (updates.is_active !== undefined) {
      updateFields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    updateFields.push("updated_at = datetime('now')");
    values.push(id);

    await this.db.run(
      `UPDATE library_paths SET ${updateFields.join(', ')} WHERE id = ?`,
      values,
    );

    const updatedPath = await this.db.get<LibraryPath>(
      'SELECT * FROM library_paths WHERE id = ?',
      [id],
    );

    if (!updatedPath) {
      throw new Error('Library path not found');
    }

    return updatedPath;
  }

  async deleteLibraryPath(id: number): Promise<void> {
    const result = await this.db.run('DELETE FROM library_paths WHERE id = ?', [
      id,
    ]);

    if (result.changes === 0) {
      throw new Error('Library path not found');
    }
  }

  async getActivePaths(): Promise<string[]> {
    const paths = await this.db.query<LibraryPath>(
      'SELECT path FROM library_paths WHERE is_active = 1',
    );
    return (paths || []).map((p) => p.path);
  }

  async getSetting(key: string): Promise<string | null> {
    const setting = await this.db.get<SystemSettings>(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    return setting?.value || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))`,
      [key, value],
    );
  }

  async initializeDefaultPaths(): Promise<void> {
    const existingPaths = await this.getLibraryPaths();
    if (existingPaths.length === 0) {
      // Add some default paths based on the config
      const config = (await import('../config/config.js')).default;
      if (config.libraryPaths && config.libraryPaths.length > 0) {
        for (const path of config.libraryPaths) {
          await this.addLibraryPath(path);
        }
      }
    }
  }

  async initializeDefaultSettings(): Promise<void> {
    // Initialize default settings if they don't exist
    const publicSharingSetting = await this.getSetting(
      'public_sharing_enabled',
    );
    if (publicSharingSetting === null) {
      await this.setSetting('public_sharing_enabled', 'false');
    }
  }

  // Static convenience methods
  static async get(key: string): Promise<string | null> {
    return settingsInstance.getSetting(key);
  }

  static async set(key: string, value: string): Promise<void> {
    return settingsInstance.setSetting(key, value);
  }
}

const settingsInstance = new SettingsModel();

export default settingsInstance;
