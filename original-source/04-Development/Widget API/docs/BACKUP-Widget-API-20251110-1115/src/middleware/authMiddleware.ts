import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  // For now, authentication is optional
  // Can be enhanced later with JWT or API keys
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    // Extract user info from auth header if present
    req.user = { id: 'authenticated-user' };
  } else {
    req.user = { id: 'anonymous-user' };
  }
  
  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
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
  
  // For now, accept any auth header
  // Can be enhanced with proper JWT validation
  req.user = { id: 'authenticated-user' };
  next();
};
