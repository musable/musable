export interface ShareToken {
    id: number;
    token: string;
    song_id: number;
    created_by: number;
    access_count: number;
    max_access: number | null;
    expires_at: string | null;
    created_at: string;
    last_accessed: string | null;
}
export interface CreateShareTokenData {
    song_id: number;
    created_by: number;
    max_access?: number;
    expires_in_hours?: number;
}
declare class ShareTokenModel {
    private db;
    private generateToken;
    create(data: CreateShareTokenData): Promise<ShareToken>;
    findById(id: number): Promise<ShareToken | null>;
    findByToken(token: string): Promise<ShareToken | null>;
    validateAndIncrementAccess(token: string): Promise<{
        valid: boolean;
        shareToken?: ShareToken;
        song?: any;
    }>;
    findBySongId(songId: number): Promise<ShareToken[]>;
    findByCreatedBy(userId: number): Promise<ShareToken[]>;
    delete(id: number): Promise<boolean>;
    cleanupExpired(): Promise<number>;
}
declare const _default: ShareTokenModel;
export default _default;
//# sourceMappingURL=ShareToken.d.ts.map