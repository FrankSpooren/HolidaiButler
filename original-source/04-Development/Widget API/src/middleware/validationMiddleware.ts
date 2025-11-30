import { Request, Response, NextFunction } from 'express';
import { SearchRequest } from '../models';

export const validateSearchRequest = (req: Request, res: Response, next: NextFunction): void => {
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

export const validateContextRequest = (req: Request, res: Response, next: NextFunction): void => {
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
