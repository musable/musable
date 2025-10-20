export interface Album {
    id: number;
    title: string;
    artist_id: number;
    release_year?: number;
    artwork_path?: string;
    created_at: string;
    updated_at: string;
}
export interface AlbumWithDetails extends Album {
    artist_name: string;
    song_count: number;
    total_duration: number;
}
export interface CreateAlbumData {
    title: string;
    artist_id: number;
    release_year?: number;
    artwork_path?: string;
}
export declare class AlbumModel {
    private db;
    findById(id: number): Promise<Album | null>;
    findByTitleAndArtist(title: string, artistId: number): Promise<Album | null>;
    create(albumData: CreateAlbumData): Promise<Album>;
    findOrCreate(title: string, artistId: number, releaseYear?: number): Promise<Album>;
    findWithDetails(id: number): Promise<AlbumWithDetails | null>;
    getAllWithDetails(): Promise<AlbumWithDetails[]>;
    getAlbumsByArtist(artistId: number): Promise<AlbumWithDetails[]>;
    search(query: string): Promise<AlbumWithDetails[]>;
    updateArtwork(id: number, artworkPath: string): Promise<void>;
    update(id: number, updates: Partial<CreateAlbumData>): Promise<void>;
    delete(id: number): Promise<void>;
    getAlbumCount(): Promise<number>;
    getRecentAlbums(limit?: number): Promise<AlbumWithDetails[]>;
}
declare const _default: AlbumModel;
export default _default;
//# sourceMappingURL=Album.d.ts.map