"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateContextRequest = exports.validateSearchRequest = void 0;
const validateSearchRequest = (req, res, next) => {
    const { query, sessionId, userId } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_QUERY',
                message: 'Query is required and must be a non-empty string',
                suggestions: ['Please provide a valid search query']
            }
        });
        return;
    }
    if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_SESSION_ID',
                message: 'SessionId is required and must be a string',
                suggestions: ['Please provide a valid session ID']
            }
        });
        return;
    }
    if (!userId || typeof userId !== 'string') {
        res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_USER_ID',
                message: 'UserId is required and must be a string',
                suggestions: ['Please provide a valid user ID']
            }
        });
        return;
    }
    next();
};
exports.validateSearchRequest = validateSearchRequest;
const validateContextRequest = (req, res, next) => {
    const { sessionId } = req.params;
    if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_SESSION_ID',
                message: 'SessionId parameter is required and must be a string'
            }
        });
        return;
    }
    next();
};
exports.validateContextRequest = validateContextRequest;
//# sourceMappingURL=validationMiddleware.js.map