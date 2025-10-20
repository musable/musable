export interface ListenHistory {
    id: number;
    user_id: number;
    song_id: number;
    played_at: string;
    duration_played?: number;
    completed: boolean;
}
export interface ListenHistoryWithDetails extends ListenHistory {
    username: string;
    song_title: string;
    artist_name: string;
    album_title?: string;
    song_duration?: number;
    artwork_path?: string;
}
export interface CreateListenHistoryData {
    user_id: number;
    song_id: number;
    duration_played?: number;
    completed?: boolean;
}
export declare class ListenHistoryModel {
    private db;
    create(data: CreateListenHistoryData): Promise<ListenHistory>;
    findById(id: number): Promise<ListenHistory | null>;
    getUserHistory(userId: number, limit?: number, offset?: number): Promise<ListenHistoryWithDetails[]>;
    getAllHistory(limit?: number, offset?: number): Promise<ListenHistoryWithDetails[]>;
    getRecentlyPlayedSongs(userId: number, limit?: number): Promise<ListenHistoryWithDetails[]>;
    getMostPlayedSongs(userId?: number, limit?: number): Promise<any[]>;
    getListeningStats(userId?: number): Promise<any>;
    getListeningTrends(userId?: number, days?: number): Promise<any[]>;
    getUserTopArtists(userId: number, limit?: number): Promise<any[]>;
    getUserTopAlbums(userId: number, limit?: number): Promise<any[]>;
    deleteUserHistory(userId: number): Promise<number>;
    deleteOldHistory(days?: number): Promise<number>;
    getMonthlyTrends(): Promise<any>;
    getUsersMonthlyTrend(): Promise<any>;
    getSongsMonthlyTrend(): Promise<any>;
}
declare const _default: ListenHistoryModel;
export default _default;
//# sourceMappingURL=ListenHistory.d.ts.map