"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const database_1 = __importDefault(require("../config/database"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserModel {
    constructor() {
        this.db = database_1.default;
    }
    async findById(id) {
        const user = await this.db.get('SELECT id, username, email, profile_picture, is_admin, created_at, updated_at, last_login FROM users WHERE id = ?', [id]);
        if (user) {
            user.is_admin = Boolean(user.is_admin);
        }
        return user;
    }
    async findByEmail(email) {
        const user = await this.db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (user) {
            user.is_admin = Boolean(user.is_admin);
        }
        return user;
    }
    async findByUsername(username) {
        return await this.db.get('SELECT * FROM users WHERE username = ?', [username]);
    }
    async create(userData) {
        const saltRounds = 12;
        const password_hash = await bcryptjs_1.default.hash(userData.password, saltRounds);
        const result = await this.db.run(`INSERT INTO users (username, email, password_hash, is_admin) 
       VALUES (?, ?, ?, ?)`, [userData.username, userData.email, password_hash, userData.is_admin || false]);
        const user = await this.findById(result.lastID);
        if (!user) {
            throw new Error('Failed to create user');
        }
        return user;
    }
    async verifyPassword(user, password) {
        return await bcryptjs_1.default.compare(password, user.password_hash);
    }
    async updateLastLogin(id) {
        await this.db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }
    async updatePassword(id, newPassword) {
        const saltRounds = 12;
        const password_hash = await bcryptjs_1.default.hash(newPassword, saltRounds);
        await this.db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [password_hash, id]);
    }
    async updateProfilePicture(id, profilePicture) {
        await this.db.run('UPDATE users SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [profilePicture, id]);
    }
    async makeAdmin(id) {
        await this.db.run('UPDATE users SET is_admin = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }
    async removeAdmin(id) {
        await this.db.run('UPDATE users SET is_admin = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }
    async getAllUsers() {
        return await this.db.query(`SELECT id, username, email, profile_picture, is_admin, created_at, updated_at, last_login 
       FROM users ORDER BY created_at DESC`);
    }
    async deleteUser(id) {
        await this.db.run('DELETE FROM users WHERE id = ?', [id]);
    }
    async userExists(email, username) {
        const user = await this.db.get('SELECT COUNT(*) as count FROM users WHERE email = ? OR username = ?', [email, username]);
        return user.count > 0;
    }
    async getAdminCount() {
        const result = await this.db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = 1');
        return result.count;
    }
}
exports.UserModel = UserModel;
exports.default = new UserModel();
//# sourceMappingURL=User.js.map