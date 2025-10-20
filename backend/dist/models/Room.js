"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class RoomModel {
    static generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    static async create(roomData) {
        const db = database_1.default;
        let code = this.generateRoomCode();
        while (await this.findByCode(code)) {
            code = this.generateRoomCode();
        }
        const stmt = `
      INSERT INTO listening_rooms (name, description, code, host_id, is_public, max_listeners)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        const result = await db.run(stmt, [
            roomData.name,
            roomData.description || null,
            code,
            roomData.host_id,
            roomData.is_public || false,
            roomData.max_listeners || 10
        ]);
        const room = await this.findById(result.lastID);
        if (!room) {
            throw new Error('Failed to create room');
        }
        await this.addParticipant(room.id, roomData.host_id);
        return room;
    }
    static async findById(id) {
        const db = database_1.default;
        const stmt = `
      SELECT lr.*, u.username as host_username, u.email as host_email,
             s.title as current_song_title, s.artist_id, a.name as current_song_artist
      FROM listening_rooms lr
      LEFT JOIN users u ON lr.host_id = u.id
      LEFT JOIN songs s ON lr.current_song_id = s.id
      LEFT JOIN artists a ON s.artist_id = a.id
      WHERE lr.id = ?
    `;
        const row = await db.get(stmt, [id]);
        if (!row)
            return null;
        const room = {
            id: row.id,
            name: row.name,
            description: row.description,
            code: row.code,
            host_id: row.host_id,
            is_public: row.is_public,
            max_listeners: row.max_listeners,
            current_song_id: row.current_song_id,
            current_position: row.current_position,
            is_playing: row.is_playing,
            play_started_at: row.play_started_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
        if (row.host_username) {
            room.host = {
                id: row.host_id,
                username: row.host_username,
                email: row.host_email,
                password_hash: '',
                is_admin: false,
                created_at: '',
                updated_at: ''
            };
        }
        if (row.current_song_id && row.current_song_title) {
            room.current_song = {
                id: row.current_song_id,
                title: row.current_song_title,
                artist_name: row.current_song_artist,
                file_path: ''
            };
        }
        return room;
    }
    static async findByCode(code) {
        const db = database_1.default;
        const stmt = `
      SELECT lr.*, u.username as host_username, u.email as host_email
      FROM listening_rooms lr
      LEFT JOIN users u ON lr.host_id = u.id
      WHERE lr.code = ?
    `;
        const row = await db.get(stmt, [code]);
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            code: row.code,
            host_id: row.host_id,
            is_public: row.is_public,
            max_listeners: row.max_listeners,
            current_song_id: row.current_song_id,
            current_position: row.current_position,
            is_playing: row.is_playing,
            play_started_at: row.play_started_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            host: row.host_username ? {
                id: row.host_id,
                username: row.host_username,
                email: row.host_email,
                password_hash: '',
                is_admin: false,
                created_at: '',
                updated_at: ''
            } : undefined
        };
    }
    static async getPublicRooms(limit = 20, offset = 0) {
        const db = database_1.default;
        const stmt = `
      SELECT lr.*, u.username as host_username,
             (SELECT COUNT(*) FROM room_participants rp WHERE rp.room_id = lr.id AND rp.is_active = 1) as participant_count,
             s.id as song_id, s.title as song_title, s.duration, s.file_path,
             a.name as artist_name, al.title as album_title, al.artwork_path
      FROM listening_rooms lr
      LEFT JOIN users u ON lr.host_id = u.id
      LEFT JOIN songs s ON lr.current_song_id = s.id
      LEFT JOIN artists a ON s.artist_id = a.id
      LEFT JOIN albums al ON s.album_id = al.id
      WHERE lr.is_public = 1
      ORDER BY participant_count DESC, lr.created_at DESC
      LIMIT ? OFFSET ?
    `;
        const rows = await db.query(stmt, [limit, offset]);
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            code: row.code,
            host_id: row.host_id,
            host_username: row.host_username,
            is_public: row.is_public,
            max_listeners: row.max_listeners,
            current_song_id: row.current_song_id,
            current_position: row.current_position,
            is_playing: row.is_playing,
            play_started_at: row.play_started_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            participant_count: row.participant_count,
            current_song: row.song_id ? {
                id: row.song_id,
                title: row.song_title,
                artist_name: row.artist_name,
                album_title: row.album_title,
                duration: row.duration,
                file_path: row.file_path,
                artwork_path: row.artwork_path
            } : null,
            host: {
                id: row.host_id,
                username: row.host_username,
                email: '',
                password_hash: '',
                is_admin: false,
                created_at: '',
                updated_at: ''
            }
        }));
    }
    static async getUserRooms(userId) {
        const db = database_1.default;
        const stmt = `
      SELECT DISTINCT lr.*, u.username as host_username,
             (SELECT COUNT(*) FROM room_participants rp WHERE rp.room_id = lr.id AND rp.is_active = 1) as participant_count
      FROM listening_rooms lr
      LEFT JOIN users u ON lr.host_id = u.id
      LEFT JOIN room_participants rp ON lr.id = rp.room_id
      WHERE lr.host_id = ? OR (rp.user_id = ? AND rp.is_active = 1)
      ORDER BY lr.updated_at DESC
    `;
        const rows = await db.query(stmt, [userId, userId]);
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            code: row.code,
            host_id: row.host_id,
            is_public: row.is_public,
            max_listeners: row.max_listeners,
            current_song_id: row.current_song_id,
            current_position: row.current_position,
            is_playing: row.is_playing,
            play_started_at: row.play_started_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            participant_count: row.participant_count,
            host: {
                id: row.host_id,
                username: row.host_username,
                email: '',
                password_hash: '',
                is_admin: false,
                created_at: '',
                updated_at: ''
            }
        }));
    }
    static async updatePlaybackState(roomId, updates) {
        const db = database_1.default;
        const setParts = [];
        const values = [];
        if (updates.current_song_id !== undefined) {
            setParts.push('current_song_id = ?');
            values.push(updates.current_song_id);
        }
        if (updates.current_position !== undefined) {
            setParts.push('current_position = ?');
            values.push(updates.current_position);
        }
        if (updates.is_playing !== undefined) {
            setParts.push('is_playing = ?');
            values.push(updates.is_playing);
        }
        if (updates.play_started_at !== undefined) {
            setParts.push('play_started_at = ?');
            values.push(updates.play_started_at);
        }
        setParts.push('updated_at = CURRENT_TIMESTAMP');
        values.push(roomId);
        const stmt = `UPDATE listening_rooms SET ${setParts.join(', ')} WHERE id = ?`;
        await db.run(stmt, values);
    }
    static async addParticipant(roomId, userId) {
        const db = database_1.default;
        const room = await this.findById(roomId);
        if (!room)
            throw new Error('Room not found');
        const role = room.host_id === userId ? 'host' : 'listener';
        const stmt = `
      INSERT OR REPLACE INTO room_participants (room_id, user_id, role, joined_at, is_active, last_seen)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)
    `;
        await db.run(stmt, [roomId, userId, role]);
    }
    static async removeParticipant(roomId, userId) {
        const db = database_1.default;
        const stmt = `UPDATE room_participants SET is_active = 0 WHERE room_id = ? AND user_id = ?`;
        await db.run(stmt, [roomId, userId]);
        await this.handleHostTransfer(roomId, userId);
    }
    static async isUserInRoom(roomId, userId) {
        const db = database_1.default;
        const result = await db.get(`SELECT 1 FROM room_participants WHERE room_id = ? AND user_id = ? AND is_active = 1`, [roomId, userId]);
        return !!result;
    }
    static async getUserRole(roomId, userId) {
        const db = database_1.default;
        const result = await db.get(`SELECT role FROM room_participants WHERE room_id = ? AND user_id = ? AND is_active = 1`, [roomId, userId]);
        return result ? result.role : null;
    }
    static async updateUserRole(roomId, userId, role) {
        const db = database_1.default;
        await db.run(`UPDATE room_participants SET role = ?, last_seen = CURRENT_TIMESTAMP WHERE room_id = ? AND user_id = ?`, [role, roomId, userId]);
    }
    static async handleHostTransfer(roomId, leavingUserId) {
        const db = database_1.default;
        const wasHost = await db.get(`SELECT role FROM room_participants WHERE room_id = ? AND user_id = ? AND role = 'host'`, [roomId, leavingUserId]);
        if (wasHost) {
            const remainingParticipants = await db.query(`SELECT user_id FROM room_participants 
         WHERE room_id = ? AND user_id != ? AND is_active = 1 
         ORDER BY joined_at LIMIT 1`, [roomId, leavingUserId]);
            if (remainingParticipants.length > 0) {
                const newHostUserId = remainingParticipants[0].user_id;
                await db.run(`UPDATE room_participants SET role = 'host' WHERE room_id = ? AND user_id = ?`, [roomId, newHostUserId]);
            }
        }
    }
    static async getParticipants(roomId) {
        const db = database_1.default;
        const stmt = `
      SELECT rp.*, u.username, u.email
      FROM room_participants rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.room_id = ? AND rp.is_active = 1
      ORDER BY 
        CASE WHEN rp.role = 'host' THEN 0 ELSE 1 END,
        rp.joined_at
    `;
        const rows = await db.query(stmt, [roomId]);
        return rows.map(row => ({
            id: row.id,
            room_id: row.room_id,
            user_id: row.user_id,
            role: row.role,
            username: row.username,
            joined_at: row.joined_at,
            is_active: row.is_active,
            last_seen: row.last_seen,
            user: {
                id: row.user_id,
                username: row.username,
                email: row.email,
                password_hash: '',
                is_admin: false,
                created_at: '',
                updated_at: ''
            }
        }));
    }
    static async updateParticipantLastSeen(roomId, userId) {
        const db = database_1.default;
        const stmt = `
      UPDATE room_participants 
      SET last_seen = CURRENT_TIMESTAMP 
      WHERE room_id = ? AND user_id = ?
    `;
        await db.run(stmt, [roomId, userId]);
    }
    static async getQueue(roomId) {
        const db = database_1.default;
        const stmt = `
      SELECT rq.*, s.title, s.artist_id, s.duration, a.name as artist_name, u.username as added_by_username
      FROM room_queue rq
      JOIN songs s ON rq.song_id = s.id
      JOIN artists a ON s.artist_id = a.id
      JOIN users u ON rq.added_by = u.id
      WHERE rq.room_id = ?
      ORDER BY rq.position
    `;
        const rows = await db.query(stmt, [roomId]);
        return rows.map(row => ({
            id: row.id,
            room_id: row.room_id,
            song_id: row.song_id,
            added_by: row.added_by,
            position: row.position,
            added_at: row.added_at,
            song: {
                id: row.song_id,
                title: row.title,
                artist_id: row.artist_id,
                artist_name: row.artist_name,
                duration: row.duration,
                file_path: '',
                source: 'local',
                created_at: '',
                updated_at: ''
            },
            added_by_user: {
                id: row.added_by,
                username: row.added_by_username,
                email: '',
                password_hash: '',
                is_admin: false,
                created_at: '',
                updated_at: ''
            }
        }));
    }
    static async addToQueue(roomId, songId, userId) {
        const db = database_1.default;
        const positionStmt = `SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM room_queue WHERE room_id = ?`;
        const positionRow = await db.get(positionStmt, [roomId]);
        const nextPosition = positionRow.next_position;
        const stmt = `
      INSERT INTO room_queue (room_id, song_id, added_by, position)
      VALUES (?, ?, ?, ?)
    `;
        await db.run(stmt, [roomId, songId, userId, nextPosition]);
    }
    static async addToQueueTop(roomId, songId, userId) {
        const db = database_1.default;
        await db.run('BEGIN TRANSACTION');
        try {
            const shiftStmt = `
        UPDATE room_queue 
        SET position = position + 1 
        WHERE room_id = ?
      `;
            await db.run(shiftStmt, [roomId]);
            const insertStmt = `
        INSERT INTO room_queue (room_id, song_id, added_by, position)
        VALUES (?, ?, ?, 1)
      `;
            await db.run(insertStmt, [roomId, songId, userId]);
            await db.run('COMMIT');
        }
        catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }
    static async getQueueItem(roomId, queueItemId) {
        const db = database_1.default;
        const stmt = `
      SELECT 
        rq.*,
        s.title,
        s.artist_id,
        s.duration,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path,
        u.username as added_by_username
      FROM room_queue rq
      LEFT JOIN songs s ON rq.song_id = s.id
      LEFT JOIN artists a ON s.artist_id = a.id
      LEFT JOIN albums al ON s.album_id = al.id
      LEFT JOIN users u ON rq.added_by = u.id
      WHERE rq.id = ? AND rq.room_id = ?
      ORDER BY rq.position ASC
    `;
        const row = await db.get(stmt, [queueItemId, roomId]);
        if (!row)
            return null;
        return {
            id: row.id,
            room_id: row.room_id,
            song_id: row.song_id,
            added_by: row.added_by,
            position: row.position,
            added_at: row.added_at,
            song: {
                id: row.song_id,
                title: row.title,
                artist_id: row.artist_id,
                artist_name: row.artist_name,
                album_title: row.album_title,
                duration: row.duration,
                artwork_path: row.artwork_path,
                file_path: '',
                source: 'local',
                created_at: '',
                updated_at: ''
            },
            added_by_user: {
                id: row.added_by,
                username: row.added_by_username,
                email: '',
                password_hash: '',
                is_admin: false,
                created_at: '',
                updated_at: ''
            }
        };
    }
    static async removeFromQueue(roomId, queueItemId) {
        const db = database_1.default;
        const positionStmt = `SELECT position FROM room_queue WHERE id = ? AND room_id = ?`;
        const positionRow = await db.get(positionStmt, [queueItemId, roomId]);
        if (!positionRow)
            return;
        const deleteStmt = `DELETE FROM room_queue WHERE id = ? AND room_id = ?`;
        await db.run(deleteStmt, [queueItemId, roomId]);
        const reorderStmt = `
      UPDATE room_queue 
      SET position = position - 1 
      WHERE room_id = ? AND position > ?
    `;
        await db.run(reorderStmt, [roomId, positionRow.position]);
    }
    static async delete(roomId) {
        const db = database_1.default;
        const stmt = `DELETE FROM listening_rooms WHERE id = ?`;
        await db.run(stmt, [roomId]);
    }
}
exports.RoomModel = RoomModel;
//# sourceMappingURL=Room.js.map