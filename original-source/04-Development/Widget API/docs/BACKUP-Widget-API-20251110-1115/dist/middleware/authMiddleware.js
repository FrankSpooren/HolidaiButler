"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.optionalAuth = void 0;
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        req.user = { id: 'authenticated-user' };
    }
    else {
        req.user = { id: 'anonymous-user' };
    }
    next();
};
exports.optionalAuth = optionalAuth;
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
                suggestions: ['Please provide a valid authorization header']
            }
        });
        return;
    }
    req.user = { id: 'authenticated-user' };
    next();
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=authMiddleware.js.map