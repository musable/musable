import { SongWithDetails } from './Song';
export interface Favorite {
    id: number;
    user_id: number;
    song_id: number;
    added_at: string;
}
export declare class FavoriteModel {
    static addToFavorites(userId: number, songId: number): Promise<boolean>;
    static removeFromFavorites(userId: number, songId: number): Promise<boolean>;
    static isFavorited(userId: number, songId: number): Promise<boolean>;
    static getUserFavorites(userId: number): Promise<SongWithDetails[]>;
    static getFavoritesCount(userId: number): Promise<number>;
    static toggleFavorite(userId: number, songId: number): Promise<{
        isFavorited: boolean;
    }>;
}
//# sourceMappingURL=Favorite.d.ts.map