import { Server } from 'socket.io';
export interface PlaybackSyncEvent {
    type: 'play' | 'pause' | 'seek' | 'song_change';
    song_id?: number;
    position?: number;
    timestamp: number;
    user_id: number;
}
export interface ChatMessage {
    id: string;
    user_id: number;
    username: string;
    message: string;
    timestamp: number;
    type: 'chat' | 'system' | 'song_change';
}
export declare class RoomService {
    private io;
    private roomStates;
    constructor(io: Server);
    private setupSocketHandlers;
    private authenticateSocket;
    private handleJoinRoom;
    private handleLeaveRoom;
    private handlePlaybackControl;
    private handleAddToQueue;
    private handleAddToQueueTop;
    private handleRemoveFromQueue;
    private handleChatMessage;
    private sendRoomSync;
    private getRoomData;
    startPeriodicSync(): void;
}
//# sourceMappingURL=roomService.d.ts.map