/**
 * Chat Routes
 * API endpoints for HoliBot chat functionality
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { searchService } from '../services/chat/searchService.js';
import { sessionService } from '../services/chat/sessionService.js';
import logger from '../utils/logger.js';

const router = express.Router();

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

/**
 * Validation middleware for chat messages
 */
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

/**
 * POST /api/v1/chat/message
 * Send a chat message and receive AI-powered response with POI results
 */
router.post('/message', chatLimiter, validateChatMessage, async (req, res) => {
  try {
    const { query, sessionId, userId } = req.body;

    // Get or create session
    let currentSessionId = sessionId;
    let session = null;

    if (!currentSessionId) {
      // Create new session
      currentSessionId = await sessionService.createSession(userId);
      logger.info(`Created new chat session: ${currentSessionId}`);
    } else {
      // Get existing session
      session = await sessionService.getSession(currentSessionId);
      if (!session) {
        // Session expired or invalid, create new one
        logger.warn(`Session ${currentSessionId} not found, creating new session`);
        currentSessionId = await sessionService.createSession(userId);
        session = await sessionService.getSession(currentSessionId);
      }
    }

    // Check for follow-up questions
    const previousResults = session?.context?.lastResults || [];
    let isFollowUp = false;
    let results = null;

    // Simple follow-up detection
    const queryLower = query.toLowerCase();
    const hasReference = queryLower.match(/\b(first|second|third|one|two|three|eerste|tweede|derde|it|that|this|deze|die|the)\b/);

    if (previousResults.length > 0 && hasReference) {
      // Handle as follow-up
      isFollowUp = true;
      logger.info(`Detected follow-up question: "${query}"`);

      const intent = { primaryIntent: 'get_info' };
      const filteredPOIs = searchService.handleFollowUp(query, previousResults, intent);

      results = {
        pois: filteredPOIs,
        textResponse: `Hier is de informatie over ${filteredPOIs[0]?.name || 'je selectie'}.`,
        intent,
        totalResults: filteredPOIs.length
      };
    } else {
      // New search
      results = await searchService.searchPOIs(query, currentSessionId, session?.context);
    }

    // Add messages to session
    await sessionService.addMessage(currentSessionId, 'user', query);
    await sessionService.addMessage(currentSessionId, 'assistant', results.textResponse, results.pois);

    // Update session with last results
    await sessionService.updateSession(currentSessionId, {
      lastQuery: query,
      lastResults: results.pois.slice(0, 5),
      lastIntent: results.intent
    });

    // Return response
    res.json({
      success: true,
      data: {
        sessionId: currentSessionId,
        textResponse: results.textResponse,
        pois: results.pois,
        intent: results.intent,
        isFollowUp
      },
      metadata: {
        totalResults: results.totalResults || results.pois.length
      }
    });

    logger.info(`Chat query processed: "${query}" -> ${results.pois.length} POIs`);

  } catch (error) {
    logger.error('Chat message error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHAT_ERROR',
        message: 'Failed to process chat message'
      }
    });
  }
});

/**
 * GET /api/v1/chat/session/:id
 * Get session context and history
 */
router.get('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const session = await sessionService.getSession(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found or expired'
        }
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        context: session.context,
        messageCount: session.messages.length,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }
    });

  } catch (error) {
    logger.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSION_ERROR',
        message: 'Failed to retrieve session'
      }
    });
  }
});

/**
 * DELETE /api/v1/chat/session/:id
 * Clear/delete a chat session
 */
router.delete('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await sessionService.deleteSession(id);

    res.json({
      success: true,
      message: 'Session cleared successfully'
    });

    logger.info(`Session cleared: ${id}`);

  } catch (error) {
    logger.error('Clear session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSION_ERROR',
        message: 'Failed to clear session'
      }
    });
  }
});

/**
 * GET /api/v1/chat/stats
 * Get chat service statistics (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = sessionService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to retrieve stats'
      }
    });
  }
});

export default router;
