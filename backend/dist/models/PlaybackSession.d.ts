export interface PlaybackSession {
    id: number;
    userId: number;
    activeDeviceId: string | null;
    currentSongId: number | null;
    currentPosition: number;
    isPlaying: boolean;
    volume: number;
    queue: number[];
    currentIndex: number;
    shuffle: boolean;
    repeatMode: 'none' | 'one' | 'all';
    updatedAt: string;
}
export interface PlaybackState {
    currentSongId: number | null;
    currentPosition: number;
    isPlaying: boolean;
    volume: number;
    queue: number[];
    currentIndex: number;
    shuffle: boolean;
    repeatMode: 'none' | 'one' | 'all';
}
export declare class PlaybackSessionModel {
    static getOrCreate(userId: number): Promise<PlaybackSession>;
    static getById(id: number): Promise<PlaybackSession | null>;
    static getByUserId(userId: number): Promise<PlaybackSession | null>;
    static updateState(userId: number, state: Partial<PlaybackState>): Promise<PlaybackSession>;
    static setActiveDevice(userId: number, deviceId: string | null): Promise<PlaybackSession>;
    static clearActiveDevice(userId: number, deviceId: string): Promise<void>;
    private static mapRow;
}
//# sourceMappingURL=PlaybackSession.d.ts.map