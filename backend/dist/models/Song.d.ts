export interface Song {
    id: number;
    title: string;
    artist_id: number;
    album_id?: number;
    file_path: string;
    file_size?: number;
    duration?: number;
    track_number?: number;
    genre?: string;
    year?: number;
    bitrate?: number;
    sample_rate?: number;
    source: 'local' | 'youtube' | 'youtube-music';
    youtube_id?: string;
    created_at: string;
    updated_at: string;
}
export interface SongWithDetails extends Song {
    artist_name: string;
    album_title?: string;
    artwork_path?: string;
}
export interface CreateSongData {
    title: string;
    artist_id: number;
    album_id?: number;
    file_path: string;
    file_size?: number;
    duration?: number;
    track_number?: number;
    genre?: string;
    year?: number;
    bitrate?: number;
    sample_rate?: number;
    source?: 'local' | 'youtube' | 'youtube-music';
    youtube_id?: string;
}
export declare class SongModel {
    private db;
    create(songData: CreateSongData): Promise<Song>;
    findById(id: number): Promise<Song | null>;
    findByPath(filePath: string): Promise<Song | null>;
    findByYoutubeId(youtubeId: string): Promise<Song | null>;
    findWithDetails(id: number): Promise<SongWithDetails | null>;
    getAllWithDetails(): Promise<SongWithDetails[]>;
    searchSongs(query: string): Promise<SongWithDetails[]>;
    getSongsByArtist(artistId: number): Promise<SongWithDetails[]>;
    getSongsByAlbum(albumId: number): Promise<SongWithDetails[]>;
    updateSong(id: number, updates: Partial<CreateSongData>): Promise<void>;
    deleteSong(id: number): Promise<void>;
    getSongCount(): Promise<number>;
    getTotalDuration(): Promise<number>;
    getGenres(): Promise<string[]>;
    getSongsByGenre(genre: string): Promise<SongWithDetails[]>;
    getRandomSongs(limit?: number): Promise<SongWithDetails[]>;
}
declare const _default: SongModel;
export default _default;
//# sourceMappingURL=Song.d.ts.map