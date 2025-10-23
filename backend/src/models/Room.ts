import Database from '../config/database.js';
import type { Song, SongWithDetails } from './Song.js';
import type { User } from './User.js';

export interface RoomSong {
  id: number;
  title: string;
  artist_name: string;
  album_title?: string;
  duration?: number;
  file_path: string;
  artwork_path?: string;
}

export interface Room {
  id: number;
  name: string;
  description?: string;
  code: string;
  host_id: number;
  is_public: boolean;
  max_listeners: number;
  current_song_id?: number;
  current_position: number;
  is_playing: boolean;
  play_started_at?: string;
  created_at: string;
  updated_at: string;

  // Virtual fields
  host?: User;
  host_username?: string;
  current_song?: RoomSong;
  participants?: RoomParticipant[];
  queue?: RoomQueueItem[];
  participant_count?: number;
}

export type RoomRole = 'host' | 'listener';

export interface RoomParticipant {
  id: number;
  room_id: number;
  user_id: number;
  role: RoomRole;
  joined_at: string;
  is_active: boolean;
  last_seen: string;
  user?: User;
  username?: string; // For direct access
}

export interface RoomQueueItem {
  id: number;
  room_id: number;
  song_id: number;
  added_by: number;
  position: number;
  added_at: string;
  song?: Song;
  added_by_user?: User;
}

export interface RoomMessage {
  id: number;
  room_id: number;
  user_id: number;
  message: string;
  message_type: 'chat' | 'system' | 'song_change';
  sent_at: string;
  user?: User;
}

export class RoomModel {
  // Generate a unique room code
  static generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create a new room
  static async create(roomData: {
    name: string;
    description?: string;
    host_id: number;
    is_public?: boolean;
    max_listeners?: number;
  }): Promise<Room> {
    const db = Database;

    let code = RoomModel.generateRoomCode();
    // Ensure code is unique
    while (await RoomModel.findByCode(code)) {
      code = RoomModel.generateRoomCode();
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
      roomData.max_listeners || 10,
    ]);

    const room = await RoomModel.findById(result.lastID!);
    if (!room) {
      throw new Error('Failed to create room');
    }

    // Add host as participant
    await RoomModel.addParticipant(room.id, roomData.host_id);

    return room;
  }

  // Find room by ID
  static async findById(id: number): Promise<Room | null> {
    const db = Database;

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
    if (!row) return null;

    const room: Room = {
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
        updated_at: '',
      };
    }

    if (row.current_song_id && row.current_song_title) {
      room.current_song = {
        id: row.current_song_id,
        title: row.current_song_title,
        artist_name: row.current_song_artist,
        file_path: '',
      };
    }

    return room;
  }

  // Find room by code
  static async findByCode(code: string): Promise<Room | null> {
    const db = Database;

    const stmt = `
      SELECT lr.*, u.username as host_username, u.email as host_email
      FROM listening_rooms lr
      LEFT JOIN users u ON lr.host_id = u.id
      WHERE lr.code = ?
    `;

    const row = await db.get(stmt, [code]);
    if (!row) return null;

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
      host: row.host_username
        ? {
            id: row.host_id,
            username: row.host_username,
            email: row.host_email,
            password_hash: '',
            is_admin: false,
            created_at: '',
            updated_at: '',
          }
        : undefined,
    };
  }

  // Get all public rooms
  static async getPublicRooms(limit = 20, offset = 0): Promise<Room[]> {
    const db = Database;

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

    return rows.map((row) => ({
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
      current_song: row.song_id
        ? {
            id: row.song_id,
            title: row.song_title,
            artist_name: row.artist_name,
            album_title: row.album_title,
            duration: row.duration,
            file_path: row.file_path,
            artwork_path: row.artwork_path,
          }
        : null,
      host: {
        id: row.host_id,
        username: row.host_username,
        email: '',
        password_hash: '',
        is_admin: false,
        created_at: '',
        updated_at: '',
      },
    }));
  }

  // Get user's rooms (hosted or participating)
  static async getUserRooms(userId: number): Promise<Room[]> {
    const db = Database;

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

    return rows.map((row) => ({
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
        updated_at: '',
      },
    }));
  }

  // Update room playback state
  static async updatePlaybackState(
    roomId: number,
    updates: {
      current_song_id?: number;
      current_position?: number;
      is_playing?: boolean;
      play_started_at?: string;
    },
  ): Promise<void> {
    const db = Database;

    const setParts: string[] = [];
    const values: any[] = [];

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

  // Add participant to room
  static async addParticipant(roomId: number, userId: number): Promise<void> {
    const db = Database;

    // Check if user is the room creator
    const room = await RoomModel.findById(roomId);
    if (!room) throw new Error('Room not found');

    // Determine role: host if they created the room, listener otherwise
    const role: RoomRole = room.host_id === userId ? 'host' : 'listener';

    const stmt = `
      INSERT OR REPLACE INTO room_participants (room_id, user_id, role, joined_at, is_active, last_seen)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)
    `;

    await db.run(stmt, [roomId, userId, role]);
  }

  // Remove participant from room
  static async removeParticipant(
    roomId: number,
    userId: number,
  ): Promise<void> {
    const db = Database;

    const stmt = `UPDATE room_participants SET is_active = 0 WHERE room_id = ? AND user_id = ?`;

    await db.run(stmt, [roomId, userId]);

    // If the leaving user was a host, promote another participant to host
    await RoomModel.handleHostTransfer(roomId, userId);
  }

  // Check if user is in room
  static async isUserInRoom(roomId: number, userId: number): Promise<boolean> {
    const db = Database;

    const result = await db.get(
      `SELECT 1 FROM room_participants WHERE room_id = ? AND user_id = ? AND is_active = 1`,
      [roomId, userId],
    );

    return !!result;
  }

  // Get user's role in room
  static async getUserRole(
    roomId: number,
    userId: number,
  ): Promise<RoomRole | null> {
    const db = Database;

    const result = await db.get(
      `SELECT role FROM room_participants WHERE room_id = ? AND user_id = ? AND is_active = 1`,
      [roomId, userId],
    );

    return result ? (result.role as RoomRole) : null;
  }

  static async updateUserRole(
    roomId: number,
    userId: number,
    role: RoomRole,
  ): Promise<void> {
    const db = Database;

    await db.run(
      `UPDATE room_participants SET role = ?, last_seen = CURRENT_TIMESTAMP WHERE room_id = ? AND user_id = ?`,
      [role, roomId, userId],
    );
  }

  // Handle host transfer when a host leaves
  static async handleHostTransfer(
    roomId: number,
    leavingUserId: number,
  ): Promise<void> {
    const db = Database;

    // Check if the leaving user was a host
    const wasHost = await db.get(
      `SELECT role FROM room_participants WHERE room_id = ? AND user_id = ? AND role = 'host'`,
      [roomId, leavingUserId],
    );

    if (wasHost) {
      // Get remaining active participants (excluding the one leaving)
      const remainingParticipants = await db.query(
        `SELECT user_id FROM room_participants
         WHERE room_id = ? AND user_id != ? AND is_active = 1
         ORDER BY joined_at LIMIT 1`,
        [roomId, leavingUserId],
      );

      // Promote the earliest joiner to host if there are remaining participants
      if (remainingParticipants.length > 0) {
        const newHostUserId = remainingParticipants[0].user_id;
        await db.run(
          `UPDATE room_participants SET role = 'host' WHERE room_id = ? AND user_id = ?`,
          [roomId, newHostUserId],
        );
      }
    }
  }

  // Get room participants
  static async getParticipants(roomId: number): Promise<RoomParticipant[]> {
    const db = Database;

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

    return rows.map((row) => ({
      id: row.id,
      room_id: row.room_id,
      user_id: row.user_id,
      role: row.role as RoomRole,
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
        updated_at: '',
      },
    }));
  }

  // Update participant last seen
  static async updateParticipantLastSeen(
    roomId: number,
    userId: number,
  ): Promise<void> {
    const db = Database;

    const stmt = `
      UPDATE room_participants
      SET last_seen = CURRENT_TIMESTAMP
      WHERE room_id = ? AND user_id = ?
    `;

    await db.run(stmt, [roomId, userId]);
  }

  // Get room queue
  static async getQueue(roomId: number): Promise<RoomQueueItem[]> {
    const db = Database;

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

    return rows.map((row) => ({
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
        source: 'local' as const,
        created_at: '',
        updated_at: '',
      } as Song,
      added_by_user: {
        id: row.added_by,
        username: row.added_by_username,
        email: '',
        password_hash: '',
        is_admin: false,
        created_at: '',
        updated_at: '',
      },
    }));
  }

  // Add song to room queue
  static async addToQueue(
    roomId: number,
    songId: number,
    userId: number,
  ): Promise<void> {
    const db = Database;

    // Get next position
    const positionStmt = `SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM room_queue WHERE room_id = ?`;
    const positionRow = await db.get(positionStmt, [roomId]);
    const nextPosition = positionRow.next_position;

    const stmt = `
      INSERT INTO room_queue (room_id, song_id, added_by, position)
      VALUES (?, ?, ?, ?)
    `;

    await db.run(stmt, [roomId, songId, userId, nextPosition]);
  }

  // Add song to top of room queue (for immediate play)
  static async addToQueueTop(
    roomId: number,
    songId: number,
    userId: number,
  ): Promise<void> {
    const db = Database;

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Shift all existing songs down by 1 position
      const shiftStmt = `
        UPDATE room_queue
        SET position = position + 1
        WHERE room_id = ?
      `;
      await db.run(shiftStmt, [roomId]);

      // Insert new song at position 1
      const insertStmt = `
        INSERT INTO room_queue (room_id, song_id, added_by, position)
        VALUES (?, ?, ?, 1)
      `;
      await db.run(insertStmt, [roomId, songId, userId]);

      // Commit transaction
      await db.run('COMMIT');
    } catch (error) {
      // Rollback on error
      await db.run('ROLLBACK');
      throw error;
    }
  }

  // Get queue item details
  static async getQueueItem(
    roomId: number,
    queueItemId: number,
  ): Promise<RoomQueueItem | null> {
    const db = Database;

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

    if (!row) return null;

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
        source: 'local' as const,
        created_at: '',
        updated_at: '',
      } as Song,
      added_by_user: {
        id: row.added_by,
        username: row.added_by_username,
        email: '',
        password_hash: '',
        is_admin: false,
        created_at: '',
        updated_at: '',
      },
    };
  }

  // Remove song from queue
  static async removeFromQueue(
    roomId: number,
    queueItemId: number,
  ): Promise<void> {
    const db = Database;

    // Get the position of the item to be removed
    const positionStmt = `SELECT position FROM room_queue WHERE id = ? AND room_id = ?`;
    const positionRow = await db.get(positionStmt, [queueItemId, roomId]);

    if (!positionRow) return;

    // Remove the item
    const deleteStmt = `DELETE FROM room_queue WHERE id = ? AND room_id = ?`;
    await db.run(deleteStmt, [queueItemId, roomId]);

    // Reorder remaining items
    const reorderStmt = `
      UPDATE room_queue
      SET position = position - 1
      WHERE room_id = ? AND position > ?
    `;
    await db.run(reorderStmt, [roomId, positionRow.position]);
  }

  // Delete room
  static async delete(roomId: number): Promise<void> {
    const db = Database;

    const stmt = `DELETE FROM listening_rooms WHERE id = ?`;

    await db.run(stmt, [roomId]);
  }
}
