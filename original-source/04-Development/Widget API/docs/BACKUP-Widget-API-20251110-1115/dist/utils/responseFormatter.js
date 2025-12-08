"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseFormatter = void 0;
class ResponseFormatter {
    static formatSearchResponse(results, searchType, queryInterpretation, sessionContext, metadata) {
        return {
            success: true,
            data: {
                results,
                searchType,
                queryInterpretation,
                context: sessionContext
            },
            metadata
        };
    }
    static formatErrorResponse(code, message, details, suggestions, sessionId) {
        return {
            success: false,
            error: {
                code,
                message,
                ...(details && { details }),
                ...(suggestions && { suggestions })
            },
            ...(sessionId && { context: { sessionId, preserved: true } })
        };
    }
    static formatHealthResponse(status, services, metrics) {
        return {
            success: true,
            data: {
                status,
                timestamp: new Date().toISOString(),
                services,
                metrics
            }
        };
    }
    static formatContextResponse(sessionContext) {
        return {
            success: true,
            data: sessionContext
        };
    }
    static formatSuccessMessage(message) {
        return {
            success: true,
            message
        };
    }
}
exports.ResponseFormatter = ResponseFormatter;
//# sourceMappingURL=responseFormatter.js.map