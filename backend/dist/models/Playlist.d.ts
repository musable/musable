export interface Playlist {
    id: number;
    name: string;
    description?: string;
    user_id: number;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}
export interface PlaylistWithDetails extends Playlist {
    username: string;
    song_count: number;
    total_duration: number;
}
export interface PlaylistSong {
    id: number;
    playlist_id: number;
    song_id: number;
    position: number;
    added_at: string;
    title: string;
    artist_name: string;
    album_title?: string;
    duration?: number;
    artwork_path?: string;
}
export interface CreatePlaylistData {
    name: string;
    description?: string;
    user_id: number;
    is_public?: boolean;
}
export declare class PlaylistModel {
    private db;
    create(playlistData: CreatePlaylistData): Promise<Playlist>;
    findById(id: number): Promise<Playlist | null>;
    findWithDetails(id: number): Promise<PlaylistWithDetails | null>;
    getUserPlaylists(userId: number): Promise<PlaylistWithDetails[]>;
    getPublicPlaylists(): Promise<PlaylistWithDetails[]>;
    getAllPlaylists(): Promise<PlaylistWithDetails[]>;
    update(id: number, updates: Partial<CreatePlaylistData>): Promise<void>;
    delete(id: number): Promise<void>;
    addSong(playlistId: number, songId: number): Promise<void>;
    removeSong(playlistId: number, songId: number): Promise<void>;
    reorderSongs(playlistId: number, songIds?: number[]): Promise<void>;
    getPlaylistSongs(playlistId: number): Promise<PlaylistSong[]>;
    searchPlaylists(query: string, userId?: number): Promise<PlaylistWithDetails[]>;
    canUserAccessPlaylist(playlistId: number, userId?: number): Promise<boolean>;
    canUserModifyPlaylist(playlistId: number, userId: number, isAdmin?: boolean): Promise<boolean>;
}
declare const _default: PlaylistModel;
export default _default;
//# sourceMappingURL=Playlist.d.ts.map