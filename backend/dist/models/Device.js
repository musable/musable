"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceModel = void 0;
const database_1 = __importDefault(require("../config/database"));
const db = database_1.default;
class DeviceModel {
    static async registerDevice(userId, deviceInfo) {
        const existing = await this.getByDeviceId(deviceInfo.deviceId);
        if (existing) {
            await db.run(`
        UPDATE devices
        SET device_name = ?,
            device_type = ?,
            browser = ?,
            os = ?,
            last_active = CURRENT_TIMESTAMP
        WHERE device_id = ?
      `, [
                deviceInfo.deviceName,
                deviceInfo.deviceType,
                deviceInfo.browser,
                deviceInfo.os,
                deviceInfo.deviceId
            ]);
            return (await this.getByDeviceId(deviceInfo.deviceId));
        }
        else {
            const result = await db.run(`
        INSERT INTO devices (user_id, device_id, device_name, device_type, browser, os)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
                userId,
                deviceInfo.deviceId,
                deviceInfo.deviceName,
                deviceInfo.deviceType,
                deviceInfo.browser,
                deviceInfo.os
            ]);
            return (await this.getById(result.lastID));
        }
    }
    static async getById(id) {
        const row = await db.get('SELECT * FROM devices WHERE id = ?', [id]);
        if (!row)
            return null;
        return {
            id: row.id,
            userId: row.user_id,
            deviceId: row.device_id,
            deviceName: row.device_name,
            deviceType: row.device_type,
            browser: row.browser,
            os: row.os,
            lastActive: row.last_active,
            createdAt: row.created_at,
        };
    }
    static async getByDeviceId(deviceId) {
        const row = await db.get('SELECT * FROM devices WHERE device_id = ?', [deviceId]);
        if (!row)
            return null;
        return {
            id: row.id,
            userId: row.user_id,
            deviceId: row.device_id,
            deviceName: row.device_name,
            deviceType: row.device_type,
            browser: row.browser,
            os: row.os,
            lastActive: row.last_active,
            createdAt: row.created_at,
        };
    }
    static async getUserDevices(userId) {
        const rows = await db.query(`
      SELECT * FROM devices
      WHERE user_id = ?
      ORDER BY last_active DESC
    `, [userId]);
        return rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            deviceId: row.device_id,
            deviceName: row.device_name,
            deviceType: row.device_type,
            browser: row.browser,
            os: row.os,
            lastActive: row.last_active,
            createdAt: row.created_at,
        }));
    }
    static async updateActivity(deviceId) {
        await db.run(`
      UPDATE devices
      SET last_active = CURRENT_TIMESTAMP
      WHERE device_id = ?
    `, [deviceId]);
    }
    static async updateName(deviceId, name) {
        await db.run(`
      UPDATE devices
      SET device_name = ?
      WHERE device_id = ?
    `, [name, deviceId]);
        return this.getByDeviceId(deviceId);
    }
    static async delete(deviceId) {
        await db.run('DELETE FROM devices WHERE device_id = ?', [deviceId]);
    }
    static async cleanupInactive() {
        await db.run(`
      DELETE FROM devices
      WHERE last_active < datetime('now', '-7 days')
    `);
    }
    static async getUserDeviceCount(userId) {
        const result = await db.get('SELECT COUNT(*) as count FROM devices WHERE user_id = ?', [userId]);
        return result?.count || 0;
    }
}
exports.DeviceModel = DeviceModel;
//# sourceMappingURL=Device.js.map