export interface Invite {
    id: number;
    token: string;
    created_by: number;
    used_by?: number;
    created_at: string;
    expires_at: string;
    used_at?: string;
}
export interface CreateInviteData {
    created_by: number;
    expires_in_hours?: number;
}
export interface InviteWithUser extends Invite {
    creator_username?: string;
    user_username?: string;
}
export declare class InviteModel {
    private db;
    create(data: CreateInviteData): Promise<Invite>;
    findById(id: number): Promise<Invite | null>;
    findByToken(token: string): Promise<Invite | null>;
    isValidToken(token: string): Promise<boolean>;
    useInvite(token: string, userId: number): Promise<void>;
    getAllInvites(): Promise<InviteWithUser[]>;
    getInvitesByUser(userId: number): Promise<InviteWithUser[]>;
    revokeInvite(id: number): Promise<void>;
    cleanupExpiredInvites(): Promise<number>;
    getActiveInviteCount(): Promise<number>;
    getUsedInviteCount(): Promise<number>;
}
declare const _default: InviteModel;
export default _default;
//# sourceMappingURL=Invite.d.ts.map