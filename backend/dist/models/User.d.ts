export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    profile_picture?: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
    last_login?: string;
}
export interface CreateUserData {
    username: string;
    email: string;
    password: string;
    is_admin?: boolean;
}
export interface UserWithoutPassword extends Omit<User, 'password_hash'> {
}
export declare class UserModel {
    private db;
    findById(id: number): Promise<UserWithoutPassword | null>;
    findByEmail(email: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    create(userData: CreateUserData): Promise<UserWithoutPassword>;
    verifyPassword(user: User, password: string): Promise<boolean>;
    updateLastLogin(id: number): Promise<void>;
    updatePassword(id: number, newPassword: string): Promise<void>;
    updateProfilePicture(id: number, profilePicture: string | null): Promise<void>;
    makeAdmin(id: number): Promise<void>;
    removeAdmin(id: number): Promise<void>;
    getAllUsers(): Promise<UserWithoutPassword[]>;
    deleteUser(id: number): Promise<void>;
    userExists(email: string, username: string): Promise<boolean>;
    getAdminCount(): Promise<number>;
}
declare const _default: UserModel;
export default _default;
//# sourceMappingURL=User.d.ts.map