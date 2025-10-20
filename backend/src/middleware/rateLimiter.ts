import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import config from '../config/config';

const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'musable',
  points: config.rateLimitMaxRequests,
  duration: Math.floor(config.rateLimitWindowMs / 1000),
});

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = req.ip || 'unknown';
    await rateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const remainingPoints = rejRes?.remainingPoints || 0;
    const msBeforeNext = rejRes?.msBeforeNext || 0;

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests',
        retryAfter: Math.round(msBeforeNext / 1000),
        remainingPoints
      }
    });
  }
};

export { rateLimiterMiddleware as rateLimiter };