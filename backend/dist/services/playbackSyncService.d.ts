import { PlaybackSession, PlaybackState } from '../models/PlaybackSession';
export declare class PlaybackSyncService {
    static getSession(userId: number): Promise<PlaybackSession>;
    static updatePlaybackState(userId: number, deviceId: string, state: Partial<PlaybackState>): Promise<PlaybackSession>;
    static setActiveDevice(userId: number, deviceId: string): Promise<PlaybackSession>;
    static handoffPlayback(userId: number, fromDeviceId: string, toDeviceId: string): Promise<PlaybackSession>;
    static sendRemoteCommand(userId: number, command: 'play' | 'pause' | 'next' | 'previous' | 'seek', value?: number): Promise<void>;
    static broadcastState(userId: number): Promise<void>;
    static clearActiveDevice(userId: number, deviceId: string): Promise<void>;
    private static getPlaybackStateFromSession;
}
//# sourceMappingURL=playbackSyncService.d.ts.map