/**
 * Chat Routes
 * Handles conversational AI chat endpoints
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const rateLimit = require('express-rate-limit');

// Rate limiting for chat (stricter than regular API)
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many chat messages, please slow down'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
function validateChatMessage(req, res, next) {
  const { query, sessionId } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_QUERY',
        message: 'Query is required and must be a non-empty string'
      }
    });
  }

  if (query.length > 500) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'QUERY_TOO_LONG',
        message: 'Query must be less than 500 characters'
      }
    });
  }

  if (sessionId && typeof sessionId !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SESSION_ID',
        message: 'Session ID must be a string'
      }
    });
  }

  next();
}

// Routes
router.post('/message', chatLimiter, validateChatMessage, chatController.handleMessage);
router.get('/session/:id', chatController.getSessionContext);
router.delete('/session/:id', chatController.clearSession);

module.exports = router;
