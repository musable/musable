"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const database_1 = __importDefault(require("../config/database"));
class ShareTokenModel {
    constructor() {
        this.db = database_1.default;
    }
    generateToken() {
        return (0, crypto_1.randomBytes)(32).toString('base64url');
    }
    async create(data) {
        const token = this.generateToken();
        const expiresAt = data.expires_in_hours
            ? new Date(Date.now() + data.expires_in_hours * 60 * 60 * 1000).toISOString()
            : null;
        const result = await this.db.run(`INSERT INTO share_tokens (token, song_id, created_by, max_access, expires_at)
       VALUES (?, ?, ?, ?, ?)`, [token, data.song_id, data.created_by, data.max_access || null, expiresAt]);
        const shareToken = await this.findById(result.lastID);
        if (!shareToken) {
            throw new Error('Failed to create share token');
        }
        return shareToken;
    }
    async findById(id) {
        return await this.db.get('SELECT * FROM share_tokens WHERE id = ?', [id]);
    }
    async findByToken(token) {
        return await this.db.get('SELECT * FROM share_tokens WHERE token = ?', [token]);
    }
    async validateAndIncrementAccess(token) {
        const shareToken = await this.findByToken(token);
        if (!shareToken) {
            return { valid: false };
        }
        if (shareToken.expires_at && new Date() > new Date(shareToken.expires_at)) {
            return { valid: false };
        }
        if (shareToken.max_access && shareToken.access_count >= shareToken.max_access) {
            return { valid: false };
        }
        const song = await this.db.get(`SELECT s.*, a.name as artist_name, al.title as album_title, al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.id = ?`, [shareToken.song_id]);
        if (!song) {
            return { valid: false };
        }
        await this.db.run('UPDATE share_tokens SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE id = ?', [shareToken.id]);
        return {
            valid: true,
            shareToken: {
                ...shareToken,
                access_count: shareToken.access_count + 1
            },
            song
        };
    }
    async findBySongId(songId) {
        return await this.db.query('SELECT * FROM share_tokens WHERE song_id = ? ORDER BY created_at DESC', [songId]);
    }
    async findByCreatedBy(userId) {
        return await this.db.query(`SELECT st.*, s.title as song_title, a.name as artist_name
       FROM share_tokens st
       JOIN songs s ON st.song_id = s.id
       JOIN artists a ON s.artist_id = a.id
       WHERE st.created_by = ?
       ORDER BY st.created_at DESC`, [userId]);
    }
    async delete(id) {
        const result = await this.db.run('DELETE FROM share_tokens WHERE id = ?', [id]);
        return result.changes > 0;
    }
    async cleanupExpired() {
        const result = await this.db.run('DELETE FROM share_tokens WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP');
        return result.changes;
    }
}
exports.default = new ShareTokenModel();
//# sourceMappingURL=ShareToken.js.map