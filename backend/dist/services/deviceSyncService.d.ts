import { Server } from 'socket.io';
export declare class DeviceSyncService {
    private io;
    constructor(io: Server);
    private initializeHandlers;
    private handleDeviceRegister;
    private handleDeviceHeartbeat;
    private handlePlaybackUpdate;
    private handlePlaybackHandoff;
    private handleRemoteCommand;
    private handleDisconnect;
    private broadcastToUser;
}
//# sourceMappingURL=deviceSyncService.d.ts.map