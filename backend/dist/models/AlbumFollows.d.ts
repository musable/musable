export interface AlbumFollow {
    id: number;
    user_id: number;
    album_id: number;
    followed_at: string;
}
export interface AlbumWithFollowStatus {
    id: number;
    title: string;
    artist_id: number;
    artist_name: string;
    release_year?: number;
    artwork_path?: string;
    song_count: number;
    total_duration: number;
    is_following: boolean;
    followed_at?: string;
}
export declare class AlbumFollowsModel {
    private db;
    followAlbum(userId: number, albumId: number): Promise<void>;
    unfollowAlbum(userId: number, albumId: number): Promise<void>;
    toggleAlbumFollow(userId: number, albumId: number): Promise<{
        isFollowing: boolean;
    }>;
    isFollowingAlbum(userId: number, albumId: number): Promise<boolean>;
    getUserFollowedAlbums(userId: number): Promise<AlbumWithFollowStatus[]>;
    getAlbumsWithFollowStatus(userId: number, limit?: number, offset?: number): Promise<AlbumWithFollowStatus[]>;
    searchAlbumsWithFollowStatus(userId: number, query: string, limit?: number): Promise<AlbumWithFollowStatus[]>;
    getFollowStats(userId: number): Promise<{
        followedAlbums: number;
        totalSongs: number;
        totalDuration: number;
    }>;
}
declare const _default: AlbumFollowsModel;
export default _default;
//# sourceMappingURL=AlbumFollows.d.ts.map