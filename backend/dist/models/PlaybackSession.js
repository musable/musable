"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybackSessionModel = void 0;
const database_1 = __importDefault(require("../config/database"));
const db = database_1.default;
class PlaybackSessionModel {
    static async getOrCreate(userId) {
        let session = await this.getByUserId(userId);
        if (!session) {
            const result = await db.run(`
        INSERT INTO playback_sessions (user_id)
        VALUES (?)
      `, [userId]);
            session = (await this.getById(result.lastID));
        }
        return session;
    }
    static async getById(id) {
        const row = await db.get('SELECT * FROM playback_sessions WHERE id = ?', [id]);
        if (!row)
            return null;
        return this.mapRow(row);
    }
    static async getByUserId(userId) {
        const row = await db.get('SELECT * FROM playback_sessions WHERE user_id = ?', [userId]);
        if (!row)
            return null;
        return this.mapRow(row);
    }
    static async updateState(userId, state) {
        const session = await this.getOrCreate(userId);
        const updates = [];
        const values = [];
        if (state.currentSongId !== undefined) {
            updates.push('current_song_id = ?');
            values.push(state.currentSongId);
        }
        if (state.currentPosition !== undefined) {
            updates.push('current_position = ?');
            values.push(state.currentPosition);
        }
        if (state.isPlaying !== undefined) {
            updates.push('is_playing = ?');
            values.push(state.isPlaying ? 1 : 0);
        }
        if (state.volume !== undefined) {
            updates.push('volume = ?');
            values.push(state.volume);
        }
        if (state.queue !== undefined) {
            updates.push('queue = ?');
            values.push(JSON.stringify(state.queue));
        }
        if (state.currentIndex !== undefined) {
            updates.push('current_index = ?');
            values.push(state.currentIndex);
        }
        if (state.shuffle !== undefined) {
            updates.push('shuffle = ?');
            values.push(state.shuffle ? 1 : 0);
        }
        if (state.repeatMode !== undefined) {
            updates.push('repeat_mode = ?');
            values.push(state.repeatMode);
        }
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(userId);
        await db.run(`
      UPDATE playback_sessions
      SET ${updates.join(', ')}
      WHERE user_id = ?
    `, values);
        return (await this.getByUserId(userId));
    }
    static async setActiveDevice(userId, deviceId) {
        await db.run(`
      UPDATE playback_sessions
      SET active_device_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [deviceId, userId]);
        return (await this.getByUserId(userId));
    }
    static async clearActiveDevice(userId, deviceId) {
        await db.run(`
      UPDATE playback_sessions
      SET active_device_id = NULL,
          is_playing = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND active_device_id = ?
    `, [userId, deviceId]);
    }
    static mapRow(row) {
        return {
            id: row.id,
            userId: row.user_id,
            activeDeviceId: row.active_device_id,
            currentSongId: row.current_song_id,
            currentPosition: row.current_position,
            isPlaying: Boolean(row.is_playing),
            volume: row.volume,
            queue: JSON.parse(row.queue || '[]'),
            currentIndex: row.current_index,
            shuffle: Boolean(row.shuffle),
            repeatMode: row.repeat_mode,
            updatedAt: row.updated_at,
        };
    }
}
exports.PlaybackSessionModel = PlaybackSessionModel;
//# sourceMappingURL=PlaybackSession.js.map