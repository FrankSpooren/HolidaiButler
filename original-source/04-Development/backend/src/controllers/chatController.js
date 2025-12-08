/**
 * Chat Controller - Handles chat API endpoints
 * Manages conversation with chatbot
 */

const searchService = require('../services/chat/searchService');
const sessionService = require('../services/chat/sessionService');
const logger = require('../utils/logger');

/**
 * Handle chat message
 * POST /api/v1/chat/message
 * Body: { query: string, sessionId?: string, userId?: number }
 */
async function handleMessage(req, res) {
  try {
    const { query, sessionId, userId } = req.body;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query is required and must be a non-empty string'
        }
      });
    }

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

    // Simple follow-up detection: if we have previous results and query has reference words
    const queryLower = query.toLowerCase();
    const hasReference = queryLower.match(/\b(first|second|third|one|two|three|it|that|this|the)\b/);

    if (previousResults.length > 0 && hasReference) {
      // Handle as follow-up
      isFollowUp = true;
      logger.info(`Detected follow-up question: "${query}"`);

      const intent = { primaryIntent: 'get_info' };
      const filteredPOIs = searchService.handleFollowUp(query, previousResults, intent);

      results = {
        pois: filteredPOIs,
        textResponse: `Here's the information you requested.`,
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
}

/**
 * Get session context
 * GET /api/v1/chat/session/:id
 */
async function getSessionContext(req, res) {
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
}

/**
 * Clear session
 * DELETE /api/v1/chat/session/:id
 */
async function clearSession(req, res) {
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
}

module.exports = {
  handleMessage,
  getSessionContext,
  clearSession
};
