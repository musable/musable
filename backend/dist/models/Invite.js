"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteModel = void 0;
const database_1 = __importDefault(require("../config/database"));
const uuid_1 = require("uuid");
class InviteModel {
    constructor() {
        this.db = database_1.default;
    }
    async create(data) {
        const token = (0, uuid_1.v4)();
        const expires_in_hours = data.expires_in_hours || 24;
        const expires_at = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString();
        const result = await this.db.run('INSERT INTO invites (token, created_by, expires_at) VALUES (?, ?, ?)', [token, data.created_by, expires_at]);
        const invite = await this.findById(result.lastID);
        if (!invite) {
            throw new Error('Failed to create invite');
        }
        return invite;
    }
    async findById(id) {
        return await this.db.get('SELECT * FROM invites WHERE id = ?', [id]);
    }
    async findByToken(token) {
        return await this.db.get('SELECT * FROM invites WHERE token = ?', [token]);
    }
    async isValidToken(token) {
        const invite = await this.db.get('SELECT * FROM invites WHERE token = ? AND used_by IS NULL AND expires_at > CURRENT_TIMESTAMP', [token]);
        return !!invite;
    }
    async useInvite(token, userId) {
        await this.db.run('UPDATE invites SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE token = ?', [userId, token]);
    }
    async getAllInvites() {
        return await this.db.query(`SELECT 
        i.*,
        creator.username as creator_username,
        user.username as user_username
       FROM invites i
       LEFT JOIN users creator ON i.created_by = creator.id
       LEFT JOIN users user ON i.used_by = user.id
       ORDER BY i.created_at DESC`);
    }
    async getInvitesByUser(userId) {
        return await this.db.query(`SELECT 
        i.*,
        creator.username as creator_username,
        user.username as user_username
       FROM invites i
       LEFT JOIN users creator ON i.created_by = creator.id
       LEFT JOIN users user ON i.used_by = user.id
       WHERE i.created_by = ?
       ORDER BY i.created_at DESC`, [userId]);
    }
    async revokeInvite(id) {
        await this.db.run('DELETE FROM invites WHERE id = ?', [id]);
    }
    async cleanupExpiredInvites() {
        const result = await this.db.run('DELETE FROM invites WHERE expires_at < CURRENT_TIMESTAMP AND used_by IS NULL');
        return result.changes || 0;
    }
    async getActiveInviteCount() {
        const result = await this.db.get('SELECT COUNT(*) as count FROM invites WHERE used_by IS NULL AND expires_at > CURRENT_TIMESTAMP');
        return result.count;
    }
    async getUsedInviteCount() {
        const result = await this.db.get('SELECT COUNT(*) as count FROM invites WHERE used_by IS NOT NULL');
        return result.count;
    }
}
exports.InviteModel = InviteModel;
exports.default = new InviteModel();
//# sourceMappingURL=Invite.js.map