/**
 * Authentication Middleware
 * JWT-based authentication for gateway requests
 */

import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

/**
 * Get JWT secret (lazy evaluation to allow dotenv to load first)
 * SECURITY FIX: Changed from process.env.getJwtSecret() to process.env.JWT_SECRET
 * Bug fixed: 30-11-2025
 */
const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('JWT_SECRET not set - using development fallback (DO NOT USE IN PRODUCTION)');
      return 'development-secret-change-in-production';
    }
    logger.error('FATAL: JWT_SECRET environment variable is not set');
    throw new Error('JWT_SECRET must be set in environment variables for production');
  }
  return process.env.JWT_SECRET;
};

/**
 * Verify JWT token
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token Expired',
          message: 'Your session has expired. Please log in again.',
        });
      }

      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Authentication token is invalid',
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication Error',
      message: 'An error occurred during authentication',
    });
  }
}

/**
 * Optional authentication (doesn't fail if no token)
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = decoded;
    } catch (error) {
      // Token invalid, but continue anyway
      logger.debug('Invalid token in optional auth');
    }
  }

  next();
}

/**
 * Generate JWT token
 */
export function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

export default {
  authenticate,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
};
