/**
 * Chat Session Service
 * Manages conversation sessions for HoliBot
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';

// In-memory session store (for production, use Redis)
const sessions = new Map();

// Session expiry in milliseconds (24 hours)
const SESSION_EXPIRY = parseInt(process.env.SESSION_EXPIRY_HOURS || '24') * 60 * 60 * 1000;

// Cleanup interval (1 hour)
const CLEANUP_INTERVAL = 60 * 60 * 1000;

class SessionService {
  constructor() {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), CLEANUP_INTERVAL);
    logger.info('Session service initialized', { expiryHours: SESSION_EXPIRY / (60 * 60 * 1000) });
  }

  /**
   * Create a new chat session
   * @param {number|null} userId - Optional user ID for authenticated users
   * @returns {string} Session ID
   */
  async createSession(userId = null) {
    const sessionId = uuidv4();
    const now = Date.now();

    const session = {
      id: sessionId,
      userId,
      messages: [],
      context: {
        lastQuery: null,
        lastResults: [],
        lastIntent: null,
        displayedPOIs: [],
        conversationTurn: 0
      },
      created_at: now,
      updated_at: now,
      expires_at: now + SESSION_EXPIRY
    };

    sessions.set(sessionId, session);

    logger.info('Chat session created', { sessionId, userId });
    return sessionId;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session object or null if not found/expired
   */
  async getSession(sessionId) {
    const session = sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (Date.now() > session.expires_at) {
      sessions.delete(sessionId);
      logger.info('Session expired and removed', { sessionId });
      return null;
    }

    return session;
  }

  /**
   * Update session context
   * @param {string} sessionId - Session ID
   * @param {Object} contextUpdate - Context updates
   */
  async updateSession(sessionId, contextUpdate) {
    const session = sessions.get(sessionId);

    if (!session) {
      logger.warn('Attempted to update non-existent session', { sessionId });
      return false;
    }

    // Update context
    session.context = {
      ...session.context,
      ...contextUpdate,
      conversationTurn: session.context.conversationTurn + 1
    };
    session.updated_at = Date.now();

    // Extend expiry on activity
    session.expires_at = Date.now() + SESSION_EXPIRY;

    sessions.set(sessionId, session);

    logger.debug('Session updated', {
      sessionId,
      conversationTurn: session.context.conversationTurn
    });

    return true;
  }

  /**
   * Add message to session history
   * @param {string} sessionId - Session ID
   * @param {string} role - Message role ('user' or 'assistant')
   * @param {string} content - Message content
   * @param {Array} pois - Optional POI results for assistant messages
   */
  async addMessage(sessionId, role, content, pois = []) {
    const session = sessions.get(sessionId);

    if (!session) {
      logger.warn('Attempted to add message to non-existent session', { sessionId });
      return false;
    }

    const message = {
      role,
      content,
      timestamp: Date.now(),
      ...(pois.length > 0 && { pois: pois.slice(0, 5) })
    };

    session.messages.push(message);
    session.updated_at = Date.now();

    // Keep only last 50 messages to prevent memory issues
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
    }

    // Track displayed POIs for context
    if (role === 'assistant' && pois.length > 0) {
      const poiIds = pois.map(p => p.id || p.google_placeid).filter(Boolean);
      session.context.displayedPOIs = [
        ...new Set([...session.context.displayedPOIs, ...poiIds])
      ].slice(-20); // Keep track of last 20 displayed POIs
    }

    sessions.set(sessionId, session);
    return true;
  }

  /**
   * Get conversation history for AI context
   * @param {string} sessionId - Session ID
   * @param {number} limit - Maximum messages to return
   * @returns {Array} Conversation history in format expected by AI
   */
  async getConversationHistory(sessionId, limit = 10) {
    const session = await this.getSession(sessionId);

    if (!session || !session.messages.length) {
      return [];
    }

    return session.messages
      .slice(-limit)
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   */
  async deleteSession(sessionId) {
    const existed = sessions.delete(sessionId);
    if (existed) {
      logger.info('Session deleted', { sessionId });
    }
    return existed;
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of sessions.entries()) {
      if (now > session.expires_at) {
        sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Expired sessions cleaned up', { count: cleaned, remaining: sessions.size });
    }
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      activeSessions: sessions.size,
      expiryHours: SESSION_EXPIRY / (60 * 60 * 1000)
    };
  }

  /**
   * Shutdown - cleanup interval
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const sessionService = new SessionService();
export default sessionService;
