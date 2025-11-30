"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextController = void 0;
const sessionService_1 = require("../services/sessionService");
const responseFormatter_1 = require("../utils/responseFormatter");
const logger_1 = require("../config/logger");
class ContextController {
    constructor() {
        this.sessionService = null;
    }
    getSessionService() {
        if (!this.sessionService) {
            this.sessionService = new sessionService_1.SessionService();
        }
        return this.sessionService;
    }
    async getContext(req, res) {
        try {
            const { sessionId } = req.params;
            logger_1.logger.info(`Getting context for session: ${sessionId}`);
            if (!sessionId) {
                res.status(400).json(responseFormatter_1.ResponseFormatter.formatErrorResponse('INVALID_SESSION_ID', 'Session ID is required', 'Please provide a valid session ID'));
                return;
            }
            const session = await this.getSessionService().getSession(sessionId);
            if (!session) {
                res.status(404).json(responseFormatter_1.ResponseFormatter.formatErrorResponse('SESSION_NOT_FOUND', 'Session not found', `No session found with ID: ${sessionId}`, ['Create a new session by making a search request']));
                return;
            }
            res.json(responseFormatter_1.ResponseFormatter.formatContextResponse(session));
        }
        catch (error) {
            logger_1.logger.error('Context retrieval error:', error);
            res.status(500).json(responseFormatter_1.ResponseFormatter.formatErrorResponse('CONTEXT_ERROR', 'Failed to get context', error.message, [], req.params.sessionId));
        }
    }
    async deleteContext(req, res) {
        try {
            const { sessionId } = req.params;
            logger_1.logger.info(`Deleting context for session: ${sessionId}`);
            if (!sessionId) {
                res.status(400).json(responseFormatter_1.ResponseFormatter.formatErrorResponse('INVALID_SESSION_ID', 'Session ID is required', 'Please provide a valid session ID'));
                return;
            }
            await this.getSessionService().deleteSession(sessionId);
            res.json(responseFormatter_1.ResponseFormatter.formatSuccessMessage(`Context for session ${sessionId} deleted successfully`));
        }
        catch (error) {
            logger_1.logger.error('Context deletion error:', error);
            res.status(500).json(responseFormatter_1.ResponseFormatter.formatErrorResponse('CONTEXT_ERROR', 'Failed to delete context', error.message, [], req.params.sessionId));
        }
    }
}
exports.ContextController = ContextController;
//# sourceMappingURL=contextController.js.map