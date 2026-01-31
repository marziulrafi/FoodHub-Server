import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils.js';

export interface AuthRequest extends Request {
    user?: { id: number; role: string };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token' });
    }

    try {
        const token = auth.split(' ')[1];
        req.user = verifyToken(token);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};

export const restrictTo = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};

export const isProviderForResource = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'PROVIDER') return res.status(403).json({ error: 'Not provider' });

    const resourceProviderId = Number(req.params.providerId || req.body.providerId);
    if (resourceProviderId && resourceProviderId !== req.user.id) {
        return res.status(403).json({ error: 'You can only manage your own resources' });
    }

    next();
};