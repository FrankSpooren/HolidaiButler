import { Request, Response } from 'express';
import { SessionService } from '../services/sessionService';
import { ResponseFormatter } from '../utils/responseFormatter';
import { logger } from '../config/logger';

export class ContextController {
  private sessionService: SessionService | null = null;

  private getSessionService(): SessionService {
    if (!this.sessionService) {
      this.sessionService = new SessionService();
    }
    return this.sessionService;
  }

  async getContext(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      logger.info(`Getting context for session: ${sessionId}`);

      if (!sessionId) {
        res.status(400).json(ResponseFormatter.formatErrorResponse(
          'INVALID_SESSION_ID',
          'Session ID is required',
          'Please provide a valid session ID'
        ));
        return;
      }

      const session = await this.getSessionService().getSession(sessionId);
      
      if (!session) {
        res.status(404).json(ResponseFormatter.formatErrorResponse(
          'SESSION_NOT_FOUND',
          'Session not found',
          `No session found with ID: ${sessionId}`,
          ['Create a new session by making a search request']
        ));
        return;
      }

      res.json(ResponseFormatter.formatContextResponse(session));
      
    } catch (error: any) {
      logger.error('Context retrieval error:', error);
      res.status(500).json(ResponseFormatter.formatErrorResponse(
        'CONTEXT_ERROR',
        'Failed to get context',
        error.message,
        [],
        req.params.sessionId
      ));
    }
  }

  async deleteContext(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      logger.info(`Deleting context for session: ${sessionId}`);

      if (!sessionId) {
        res.status(400).json(ResponseFormatter.formatErrorResponse(
          'INVALID_SESSION_ID',
          'Session ID is required',
          'Please provide a valid session ID'
        ));
        return;
      }

      await this.getSessionService().deleteSession(sessionId);

      res.json(ResponseFormatter.formatSuccessMessage(`Context for session ${sessionId} deleted successfully`));
      
    } catch (error: any) {
      logger.error('Context deletion error:', error);
      res.status(500).json(ResponseFormatter.formatErrorResponse(
        'CONTEXT_ERROR',
        'Failed to delete context',
        error.message,
        [],
        req.params.sessionId
      ));
    }
  }
}
