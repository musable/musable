export interface PlaylistFollow {
    id: number;
    user_id: number;
    playlist_id: number;
    followed_at: string;
}
export interface PlaylistWithFollowStatus {
    id: number;
    name: string;
    description?: string;
    user_id: number;
    username: string;
    is_public: boolean;
    song_count: number;
    total_duration: number;
    is_following: boolean;
    followed_at?: string;
    created_at: string;
    updated_at: string;
}
export declare class PlaylistFollowsModel {
    private db;
    followPlaylist(userId: number, playlistId: number): Promise<void>;
    unfollowPlaylist(userId: number, playlistId: number): Promise<void>;
    togglePlaylistFollow(userId: number, playlistId: number): Promise<{
        isFollowing: boolean;
    }>;
    isFollowingPlaylist(userId: number, playlistId: number): Promise<boolean>;
    getUserFollowedPlaylists(userId: number): Promise<PlaylistWithFollowStatus[]>;
    getPlaylistsWithFollowStatus(userId: number, includeOwn?: boolean, limit?: number, offset?: number): Promise<PlaylistWithFollowStatus[]>;
    searchPlaylistsWithFollowStatus(userId: number, query: string, limit?: number): Promise<PlaylistWithFollowStatus[]>;
    getFollowStats(userId: number): Promise<{
        followedPlaylists: number;
        totalSongs: number;
        totalDuration: number;
    }>;
    getRecentlyFollowedPlaylists(userId: number, limit?: number): Promise<PlaylistWithFollowStatus[]>;
}
declare const _default: PlaylistFollowsModel;
export default _default;
//# sourceMappingURL=PlaylistFollows.d.ts.map