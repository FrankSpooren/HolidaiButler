/**
 * Chat Session Service with Redis
 * Manages conversation sessions for HoliBot
 *
 * Features:
 * - Redis storage for production scalability
 * - Automatic fallback to in-memory if Redis unavailable
 * - Session expiry with automatic cleanup
 * - Conversation history management
 */

import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import logger from '../../utils/logger.js';

// Session expiry in seconds (24 hours)
const SESSION_EXPIRY_SECONDS = parseInt(process.env.SESSION_EXPIRY_HOURS || '24') * 60 * 60;

// Redis key prefix
const REDIS_PREFIX = 'holibot:session:';

// In-memory fallback store
const memoryStore = new Map();

class SessionService {
  constructor() {
    this.redis = null;
    this.useRedis = false;
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        lazyConnect: true
      });

      // Set up event handlers
      this.redis.on('connect', () => {
        logger.info('Redis connected for session storage');
        this.useRedis = true;
      });

      this.redis.on('error', (error) => {
        logger.warn('Redis error, falling back to in-memory storage:', error.message);
        this.useRedis = false;
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed, using in-memory storage');
        this.useRedis = false;
      });

      // Try to connect
      await this.redis.connect();

      // Test connection
      await this.redis.ping();
      this.useRedis = true;
      logger.info('Session service initialized with Redis', {
        expiryHours: SESSION_EXPIRY_SECONDS / 3600
      });

    } catch (error) {
      logger.warn('Redis unavailable, using in-memory session storage:', error.message);
      this.useRedis = false;
      this.redis = null;

      // Start in-memory cleanup interval
      this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000);
      logger.info('Session service initialized with in-memory storage', {
        expiryHours: SESSION_EXPIRY_SECONDS / 3600
      });
    }
  }

  /**
   * Get Redis key for session
   */
  getKey(sessionId) {
    return `${REDIS_PREFIX}${sessionId}`;
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
      updated_at: now
    };

    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(
          this.getKey(sessionId),
          SESSION_EXPIRY_SECONDS,
          JSON.stringify(session)
        );
      } catch (error) {
        logger.error('Redis setex failed, using memory fallback:', error.message);
        session.expires_at = now + (SESSION_EXPIRY_SECONDS * 1000);
        memoryStore.set(sessionId, session);
      }
    } else {
      session.expires_at = now + (SESSION_EXPIRY_SECONDS * 1000);
      memoryStore.set(sessionId, session);
    }

    logger.info('Chat session created', { sessionId, userId, storage: this.useRedis ? 'redis' : 'memory' });
    return sessionId;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session object or null if not found/expired
   */
  async getSession(sessionId) {
    if (this.useRedis && this.redis) {
      try {
        const data = await this.redis.get(this.getKey(sessionId));
        if (!data) {
          return null;
        }
        return JSON.parse(data);
      } catch (error) {
        logger.error('Redis get failed:', error.message);
        // Try memory fallback
      }
    }

    // In-memory fallback
    const session = memoryStore.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session has expired
    if (session.expires_at && Date.now() > session.expires_at) {
      memoryStore.delete(sessionId);
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
    const session = await this.getSession(sessionId);

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

    // Save back
    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(
          this.getKey(sessionId),
          SESSION_EXPIRY_SECONDS,
          JSON.stringify(session)
        );
      } catch (error) {
        logger.error('Redis setex failed during update:', error.message);
        session.expires_at = Date.now() + (SESSION_EXPIRY_SECONDS * 1000);
        memoryStore.set(sessionId, session);
      }
    } else {
      session.expires_at = Date.now() + (SESSION_EXPIRY_SECONDS * 1000);
      memoryStore.set(sessionId, session);
    }

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
    const session = await this.getSession(sessionId);

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

    // Keep only last 50 messages to prevent memory/storage issues
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
    }

    // Track displayed POIs for context
    if (role === 'assistant' && pois.length > 0) {
      const poiIds = pois.map(p => p.id || p.google_placeid).filter(Boolean);
      session.context.displayedPOIs = [
        ...new Set([...session.context.displayedPOIs, ...poiIds])
      ].slice(-20);
    }

    // Save back
    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(
          this.getKey(sessionId),
          SESSION_EXPIRY_SECONDS,
          JSON.stringify(session)
        );
      } catch (error) {
        logger.error('Redis setex failed during addMessage:', error.message);
        session.expires_at = Date.now() + (SESSION_EXPIRY_SECONDS * 1000);
        memoryStore.set(sessionId, session);
      }
    } else {
      session.expires_at = Date.now() + (SESSION_EXPIRY_SECONDS * 1000);
      memoryStore.set(sessionId, session);
    }

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
    let deleted = false;

    if (this.useRedis && this.redis) {
      try {
        const result = await this.redis.del(this.getKey(sessionId));
        deleted = result > 0;
      } catch (error) {
        logger.error('Redis del failed:', error.message);
      }
    }

    // Also try memory store
    if (memoryStore.delete(sessionId)) {
      deleted = true;
    }

    if (deleted) {
      logger.info('Session deleted', { sessionId });
    }
    return deleted;
  }

  /**
   * Cleanup expired sessions (only for in-memory storage)
   */
  cleanupExpiredSessions() {
    if (this.useRedis) {
      // Redis handles expiry automatically
      return;
    }

    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of memoryStore.entries()) {
      if (session.expires_at && now > session.expires_at) {
        memoryStore.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Expired sessions cleaned up', { count: cleaned, remaining: memoryStore.size });
    }
  }

  /**
   * Get session statistics
   */
  async getStats() {
    let activeSessions = 0;

    if (this.useRedis && this.redis) {
      try {
        const keys = await this.redis.keys(`${REDIS_PREFIX}*`);
        activeSessions = keys.length;
      } catch (error) {
        logger.error('Redis keys failed:', error.message);
        activeSessions = memoryStore.size;
      }
    } else {
      activeSessions = memoryStore.size;
    }

    return {
      activeSessions,
      expiryHours: SESSION_EXPIRY_SECONDS / 3600,
      storage: this.useRedis ? 'redis' : 'memory'
    };
  }

  /**
   * Check if service is using Redis
   */
  isUsingRedis() {
    return this.useRedis;
  }

  /**
   * Shutdown - cleanup resources
   */
  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redis) {
      try {
        await this.redis.quit();
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error closing Redis connection:', error.message);
      }
    }
  }
}

export const sessionService = new SessionService();
export default sessionService;
