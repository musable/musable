"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = exports.rateLimiterMiddleware = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const config_1 = __importDefault(require("../config/config"));
const rateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    keyPrefix: 'musable',
    points: config_1.default.rateLimitMaxRequests,
    duration: Math.floor(config_1.default.rateLimitWindowMs / 1000),
});
const rateLimiterMiddleware = async (req, res, next) => {
    try {
        const key = req.ip || 'unknown';
        await rateLimiter.consume(key);
        next();
    }
    catch (rejRes) {
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
exports.rateLimiterMiddleware = rateLimiterMiddleware;
exports.rateLimiter = exports.rateLimiterMiddleware;
//# sourceMappingURL=rateLimiter.js.map