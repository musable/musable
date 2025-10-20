import { Request, Response, NextFunction } from 'express';
import { UserWithoutPassword } from '../models/User';
export interface AuthRequest extends Request {
    user?: UserWithoutPassword;
}
export interface JwtPayload {
    id: number;
    username: string;
    email: string;
    is_admin: boolean;
    iat?: number;
    exp?: number;
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const generateToken: (user: UserWithoutPassword) => string;
export declare const verifyToken: (token: string) => JwtPayload;
//# sourceMappingURL=auth.d.ts.map