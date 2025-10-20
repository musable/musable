"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
class SettingsModel {
    constructor() {
        this.db = database_1.default;
    }
    async getLibraryPaths() {
        const paths = await this.db.query(`
      SELECT * FROM library_paths 
      ORDER BY created_at ASC
    `);
        return paths || [];
    }
    async addLibraryPath(path) {
        const result = await this.db.run(`INSERT INTO library_paths (path, is_active, created_at, updated_at) 
       VALUES (?, ?, datetime('now'), datetime('now'))`, [path, 1]);
        const newPath = await this.db.get('SELECT * FROM library_paths WHERE id = ?', [result.lastID]);
        if (!newPath) {
            throw new Error('Failed to create library path');
        }
        return newPath;
    }
    async updateLibraryPath(id, updates) {
        const updateFields = [];
        const values = [];
        if (updates.path !== undefined) {
            updateFields.push('path = ?');
            values.push(updates.path);
        }
        if (updates.is_active !== undefined) {
            updateFields.push('is_active = ?');
            values.push(updates.is_active ? 1 : 0);
        }
        updateFields.push('updated_at = datetime(\'now\')');
        values.push(id);
        await this.db.run(`UPDATE library_paths SET ${updateFields.join(', ')} WHERE id = ?`, values);
        const updatedPath = await this.db.get('SELECT * FROM library_paths WHERE id = ?', [id]);
        if (!updatedPath) {
            throw new Error('Library path not found');
        }
        return updatedPath;
    }
    async deleteLibraryPath(id) {
        const result = await this.db.run('DELETE FROM library_paths WHERE id = ?', [id]);
        if (result.changes === 0) {
            throw new Error('Library path not found');
        }
    }
    async getActivePaths() {
        const paths = await this.db.query('SELECT path FROM library_paths WHERE is_active = 1');
        return (paths || []).map(p => p.path);
    }
    async getSetting(key) {
        const setting = await this.db.get('SELECT value FROM settings WHERE key = ?', [key]);
        return setting?.value || null;
    }
    async setSetting(key, value) {
        await this.db.run(`INSERT OR REPLACE INTO settings (key, value, updated_at) 
       VALUES (?, ?, datetime('now'))`, [key, value]);
    }
    async initializeDefaultPaths() {
        const existingPaths = await this.getLibraryPaths();
        if (existingPaths.length === 0) {
            const config = require('../config/config').default;
            if (config.libraryPaths && config.libraryPaths.length > 0) {
                for (const path of config.libraryPaths) {
                    await this.addLibraryPath(path);
                }
            }
        }
    }
    async initializeDefaultSettings() {
        const publicSharingSetting = await this.getSetting('public_sharing_enabled');
        if (publicSharingSetting === null) {
            await this.setSetting('public_sharing_enabled', 'false');
        }
    }
    static async get(key) {
        return settingsInstance.getSetting(key);
    }
    static async set(key, value) {
        return settingsInstance.setSetting(key, value);
    }
}
const settingsInstance = new SettingsModel();
exports.default = settingsInstance;
//# sourceMappingURL=Settings.js.map