export interface Artist {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}
export interface ArtistWithStats extends Artist {
    song_count: number;
    album_count: number;
}
export declare class ArtistModel {
    private db;
    findByName(name: string): Promise<Artist | null>;
    findById(id: number): Promise<Artist | null>;
    create(name: string): Promise<Artist>;
    findOrCreate(name: string): Promise<Artist>;
    getAllWithStats(): Promise<ArtistWithStats[]>;
    search(query: string): Promise<Artist[]>;
    update(id: number, name: string): Promise<void>;
    delete(id: number): Promise<void>;
    getArtistCount(): Promise<number>;
}
declare const _default: ArtistModel;
export default _default;
//# sourceMappingURL=Artist.d.ts.map