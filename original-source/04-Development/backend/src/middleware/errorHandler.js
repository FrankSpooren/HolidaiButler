/**
 * Global Error Handler Middleware
 * ================================
 * Centralized error handling for Express
 */

const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Default error
  let statusCode = err.statusCode || 500;
  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error.code = 'VALIDATION_ERROR';
    errorResponse.error.details = err.details;
  }

  // Database errors
  if (err.code && err.code.startsWith('ER_')) {
    statusCode = 500;
    errorResponse.error.code = 'DATABASE_ERROR';
    errorResponse.error.message = 'Database operation failed';

    // Don't expose database errors in production
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.details = err.message;
    }
  }

  // JWT errors (shouldn't reach here, but just in case)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse.error.code = 'INVALID_TOKEN';
    errorResponse.error.message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse.error.code = 'TOKEN_EXPIRED';
    errorResponse.error.message = 'Authentication token has expired';
  }

  // Add request ID for tracking
  errorResponse.meta = {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
