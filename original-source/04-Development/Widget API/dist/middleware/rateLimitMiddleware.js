"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRateLimit = exports.contextRateLimit = exports.searchRateLimit = exports.createRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const createRateLimit = (windowMs, max) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later',
                details: `Rate limit: ${max} requests per ${windowMs / 1000} seconds`
            }
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};
exports.createRateLimit = createRateLimit;
exports.searchRateLimit = (0, exports.createRateLimit)(3600000, 100);
exports.contextRateLimit = (0, exports.createRateLimit)(3600000, 200);
exports.healthRateLimit = (0, exports.createRateLimit)(60000, 10);
//# sourceMappingURL=rateLimitMiddleware.js.map