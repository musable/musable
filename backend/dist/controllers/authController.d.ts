import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
export declare const login: (req: Request, res: Response, next: NextFunction) => void;
export declare const register: (req: Request, res: Response, next: NextFunction) => void;
export declare const getProfile: (req: Request, res: Response, next: NextFunction) => void;
export declare const changePassword: (req: Request, res: Response, next: NextFunction) => void;
export declare const logout: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateInvite: (req: Request, res: Response, next: NextFunction) => void;
export declare const upload: multer.Multer;
export declare const updateProfilePicture: (req: Request, res: Response, next: NextFunction) => void;
export declare const deleteProfilePicture: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=authController.d.ts.map