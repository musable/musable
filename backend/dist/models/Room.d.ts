import { Song } from './Song';
import { User } from './User';
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
    username?: string;
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
export declare class RoomModel {
    static generateRoomCode(): string;
    static create(roomData: {
        name: string;
        description?: string;
        host_id: number;
        is_public?: boolean;
        max_listeners?: number;
    }): Promise<Room>;
    static findById(id: number): Promise<Room | null>;
    static findByCode(code: string): Promise<Room | null>;
    static getPublicRooms(limit?: number, offset?: number): Promise<Room[]>;
    static getUserRooms(userId: number): Promise<Room[]>;
    static updatePlaybackState(roomId: number, updates: {
        current_song_id?: number;
        current_position?: number;
        is_playing?: boolean;
        play_started_at?: string;
    }): Promise<void>;
    static addParticipant(roomId: number, userId: number): Promise<void>;
    static removeParticipant(roomId: number, userId: number): Promise<void>;
    static isUserInRoom(roomId: number, userId: number): Promise<boolean>;
    static getUserRole(roomId: number, userId: number): Promise<RoomRole | null>;
    static updateUserRole(roomId: number, userId: number, role: RoomRole): Promise<void>;
    static handleHostTransfer(roomId: number, leavingUserId: number): Promise<void>;
    static getParticipants(roomId: number): Promise<RoomParticipant[]>;
    static updateParticipantLastSeen(roomId: number, userId: number): Promise<void>;
    static getQueue(roomId: number): Promise<RoomQueueItem[]>;
    static addToQueue(roomId: number, songId: number, userId: number): Promise<void>;
    static addToQueueTop(roomId: number, songId: number, userId: number): Promise<void>;
    static getQueueItem(roomId: number, queueItemId: number): Promise<RoomQueueItem | null>;
    static removeFromQueue(roomId: number, queueItemId: number): Promise<void>;
    static delete(roomId: number): Promise<void>;
}
//# sourceMappingURL=Room.d.ts.map