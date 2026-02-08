/**
 * Conversation Service for HoliBot
 * Manages chat sessions, message logging, and analytics
 *
 * Features:
 * - Session creation and management
 * - Message logging with metadata
 * - POI click tracking
 * - Analytics data retrieval
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const { QueryTypes } = (await import('sequelize')).default;

class ConversationService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the conversation service
   * Checks if required tables exist
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Check if tables exist
      const [tables] = await mysqlSequelize.query(
        "SHOW TABLES LIKE 'holibot_sessions'",
        { type: QueryTypes.SELECT }
      );

      if (tables) {
        this.isInitialized = true;
        logger.info('Conversation service initialized');
      } else {
        logger.warn('Conversation tables not yet created. Logging disabled.');
      }

      return this.isInitialized;
    } catch (error) {
      logger.warn('Conversation service init failed:', error.message);
      return false;
    }
  }

  /**
   * Create or get an existing session
   * @param {Object} options - Session options
   * @returns {string} Session ID
   */
  async getOrCreateSession(options = {}) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return null;

    const {
      sessionId,
      userId = null,
      language = 'nl',
      userAgent = null,
      deviceFingerprint = null,
      referrer = null,
      destinationId = 1
    } = options;

    try {
      // If sessionId provided, check if it exists
      if (sessionId) {
        const [existing] = await mysqlSequelize.query(
          'SELECT id FROM holibot_sessions WHERE id = ?',
          { replacements: [sessionId], type: QueryTypes.SELECT }
        );

        if (existing) {
          // Update last activity
          await mysqlSequelize.query(
            'UPDATE holibot_sessions SET last_activity_at = NOW() WHERE id = ?',
            { replacements: [sessionId], type: QueryTypes.UPDATE }
          );
          return sessionId;
        }
      }

      // Create new session
      const newSessionId = sessionId || uuidv4();

      await mysqlSequelize.query(`
        INSERT INTO holibot_sessions
        (id, destination_id, user_id, language, user_agent, device_fingerprint, referrer)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [newSessionId, destinationId, userId, language, userAgent, deviceFingerprint, referrer],
        type: QueryTypes.INSERT
      });

      logger.debug('New chat session created', { sessionId: newSessionId, language });
      return newSessionId;

    } catch (error) {
      logger.warn('Failed to create session:', error.message);
      return null;
    }
  }

  /**
   * Log a user message
   * @param {Object} data - Message data
   * @returns {number|null} Message ID
   */
  async logUserMessage(data) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return null;

    const {
      sessionId,
      message,
      originalMessage = null,
      wasSpellCorrected = false
    } = data;

    if (!sessionId || !message) return null;

    try {
      const [result] = await mysqlSequelize.query(`
        INSERT INTO holibot_messages
        (session_id, role, message, original_message, was_spell_corrected)
        VALUES (?, 'user', ?, ?, ?)
      `, {
        replacements: [sessionId, message, originalMessage, wasSpellCorrected],
        type: QueryTypes.INSERT
      });

      // Update session message count
      await mysqlSequelize.query(
        'UPDATE holibot_sessions SET message_count = message_count + 1 WHERE id = ?',
        { replacements: [sessionId], type: QueryTypes.UPDATE }
      );

      // Update spell correction flag on session if used
      if (wasSpellCorrected) {
        await mysqlSequelize.query(
          'UPDATE holibot_sessions SET had_spell_correction = TRUE WHERE id = ?',
          { replacements: [sessionId], type: QueryTypes.UPDATE }
        );
      }

      return result;
    } catch (error) {
      logger.warn('Failed to log user message:', error.message);
      return null;
    }
  }

  /**
   * Log an assistant response
   * @param {Object} data - Response data
   * @returns {number|null} Message ID
   */
  async logAssistantMessage(data) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return null;

    const {
      sessionId,
      message,
      source = null,
      poiCount = 0,
      hadFallback = false,
      searchTimeMs = null,
      totalResponseTimeMs = null,
      poiIds = null,
      quickAction = null
    } = data;

    if (!sessionId || !message) return null;

    try {
      const [result] = await mysqlSequelize.query(`
        INSERT INTO holibot_messages
        (session_id, role, message, source, poi_count, had_fallback,
         search_time_ms, total_response_time_ms, poi_ids, quick_action)
        VALUES (?, 'assistant', ?, ?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          sessionId,
          message.substring(0, 65000), // Truncate if too long
          source,
          poiCount,
          hadFallback,
          searchTimeMs,
          totalResponseTimeMs,
          poiIds ? JSON.stringify(poiIds) : null,
          quickAction
        ],
        type: QueryTypes.INSERT
      });

      // Update session metrics
      await mysqlSequelize.query(`
        UPDATE holibot_sessions SET
          message_count = message_count + 1,
          had_fallback = had_fallback OR ?,
          avg_response_time_ms = COALESCE(
            (avg_response_time_ms * (message_count - 1) + ?) / message_count,
            ?
          )
        WHERE id = ?
      `, {
        replacements: [hadFallback, totalResponseTimeMs || 0, totalResponseTimeMs || 0, sessionId],
        type: QueryTypes.UPDATE
      });

      return result;
    } catch (error) {
      logger.warn('Failed to log assistant message:', error.message);
      return null;
    }
  }

  /**
   * Log a POI click/interaction
   * @param {Object} data - Click data
   */
  async logPoiClick(data) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return;

    const {
      sessionId,
      messageId = null,
      poiId,
      poiName = null,
      clickType = 'view_details',
      sourceContext = 'chat'
    } = data;

    if (!sessionId || !poiId) return;

    try {
      await mysqlSequelize.query(`
        INSERT INTO holibot_poi_clicks
        (session_id, message_id, poi_id, poi_name, click_type, source_context)
        VALUES (?, ?, ?, ?, ?, ?)
      `, {
        replacements: [sessionId, messageId, poiId, poiName, clickType, sourceContext],
        type: QueryTypes.INSERT
      });
    } catch (error) {
      logger.warn('Failed to log POI click:', error.message);
    }
  }

  /**
   * Get conversation history for a session
   * @param {string} sessionId - Session ID
   * @param {number} limit - Max messages to return
   * @returns {Array} Messages
   */
  async getSessionHistory(sessionId, limit = 50) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return [];

    try {
      const messages = await mysqlSequelize.query(`
        SELECT
          id, role, message, source, poi_count, had_fallback,
          was_spell_corrected, original_message, quick_action, created_at
        FROM holibot_messages
        WHERE session_id = ?
        ORDER BY created_at ASC
        LIMIT ?
      `, {
        replacements: [sessionId, limit],
        type: QueryTypes.SELECT
      });

      return messages;
    } catch (error) {
      logger.warn('Failed to get session history:', error.message);
      return [];
    }
  }

  /**
   * Get daily analytics
   * @param {number} days - Number of days to look back
   * @returns {Object} Analytics data
   */
  async getDailyAnalytics(days = 7) {
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) {
      return { message: 'Conversation logging not initialized', data: [] };
    }

    try {
      // Daily metrics
      const dailyMetrics = await mysqlSequelize.query(`
        SELECT
          DATE(started_at) as date,
          COUNT(*) as total_sessions,
          SUM(message_count) as total_messages,
          ROUND(AVG(message_count), 1) as avg_messages_per_session,
          ROUND(AVG(avg_response_time_ms)) as avg_response_ms,
          SUM(CASE WHEN had_fallback THEN 1 ELSE 0 END) as sessions_with_fallback,
          ROUND(100.0 * SUM(CASE WHEN had_fallback THEN 1 ELSE 0 END) / COUNT(*), 1) as fallback_rate_pct
        FROM holibot_sessions
        WHERE started_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(started_at)
        ORDER BY date DESC
      `, { replacements: [days], type: QueryTypes.SELECT });

      // Language breakdown
      const languageStats = await mysqlSequelize.query(`
        SELECT
          language,
          COUNT(*) as session_count,
          SUM(message_count) as total_messages
        FROM holibot_sessions
        WHERE started_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY language
        ORDER BY session_count DESC
      `, { replacements: [days], type: QueryTypes.SELECT });

      // Top POIs clicked
      const topPois = await mysqlSequelize.query(`
        SELECT
          poi_id,
          poi_name,
          COUNT(*) as click_count,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM holibot_poi_clicks
        WHERE clicked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY poi_id, poi_name
        ORDER BY click_count DESC
        LIMIT 10
      `, { replacements: [days], type: QueryTypes.SELECT });

      // Summary totals
      const [summary] = await mysqlSequelize.query(`
        SELECT
          COUNT(*) as total_sessions,
          SUM(message_count) as total_messages,
          ROUND(AVG(message_count), 1) as avg_messages,
          SUM(CASE WHEN had_fallback THEN 1 ELSE 0 END) as fallback_sessions,
          SUM(CASE WHEN had_spell_correction THEN 1 ELSE 0 END) as spell_correction_sessions
        FROM holibot_sessions
        WHERE started_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `, { replacements: [days], type: QueryTypes.SELECT });

      return {
        period: `${days} days`,
        summary: summary[0] || {},
        dailyMetrics,
        languageStats,
        topPois
      };
    } catch (error) {
      logger.warn('Failed to get analytics:', error.message);
      return { error: error.message, data: [] };
    }
  }

  /**
   * End a session explicitly
   * @param {string} sessionId - Session ID
   * @param {number} satisfaction - Optional user satisfaction rating 1-5
   */
  async endSession(sessionId, satisfaction = null) {
    if (!this.isInitialized) return;

    try {
      await mysqlSequelize.query(`
        UPDATE holibot_sessions SET
          ended_at = NOW(),
          user_satisfaction = ?
        WHERE id = ?
      `, {
        replacements: [satisfaction, sessionId],
        type: QueryTypes.UPDATE
      });
    } catch (error) {
      logger.warn('Failed to end session:', error.message);
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isInitialized;
  }
}

export const conversationService = new ConversationService();
export default conversationService;
