import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getFavorites: (req: AuthRequest, res: Response) => Promise<void>;
export declare const toggleFavorite: (req: AuthRequest, res: Response) => Promise<void>;
export declare const checkFavoriteStatus: (req: AuthRequest, res: Response) => Promise<void>;
export declare const addToFavorites: (req: AuthRequest, res: Response) => Promise<void>;
export declare const removeFromFavorites: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=favoritesController.d.ts.map