/**
 * Session Service - MySQL-based Session Storage
 * Stores and manages chat conversation sessions
 */

const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

class SessionService {
  /**
   * Create a new chat session
   * @param {number} userId - User ID (optional, null for anonymous)
   * @returns {Promise<string>} - Session ID
   */
  async createSession(userId = null) {
    try {
      const sessionId = uuidv4();
      const context = {
        conversationHistory: [],
        displayedPOIs: [],
        lastIntent: null,
        preferences: {}
      };

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.pool.query(
        `INSERT INTO ChatSession (id, user_id, context, expires_at) VALUES (?, ?, ?, ?)`,
        [sessionId, userId, JSON.stringify(context), expiresAt]
      );

      logger.info(`Created chat session: ${sessionId}`);
      return sessionId;

    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} - Session object or null
   */
  async getSession(sessionId) {
    try {
      const [rows] = await db.pool.query(
        `SELECT * FROM ChatSession
         WHERE id = ?
           AND (expires_at IS NULL OR expires_at > NOW())`,
        [sessionId]
      );

      if (rows.length === 0) {
        logger.info(`Session not found or expired: ${sessionId}`);
        return null;
      }

      const session = rows[0];
      return {
        ...session,
        context: JSON.parse(session.context)
      };

    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Update session context
   * @param {string} sessionId - Session ID
   * @param {Object} updates - Context updates
   * @returns {Promise<boolean>} - Success status
   */
  async updateSession(sessionId, updates) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        logger.warn(`Cannot update non-existent session: ${sessionId}`);
        return false;
      }

      const newContext = { ...session.context, ...updates };

      await db.pool.query(
        `UPDATE ChatSession
         SET context = ?, updated_at = NOW()
         WHERE id = ?`,
        [JSON.stringify(newContext), sessionId]
      );

      logger.debug(`Updated session: ${sessionId}`);
      return true;

    } catch (error) {
      logger.error('Failed to update session:', error);
      return false;
    }
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteSession(sessionId) {
    try {
      await db.pool.query(`DELETE FROM ChatSession WHERE id = ?`, [sessionId]);
      logger.info(`Deleted session: ${sessionId}`);
      return true;

    } catch (error) {
      logger.error('Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Add message to conversation history
   * @param {string} sessionId - Session ID
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @param {Array} pois - Associated POIs (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async addMessage(sessionId, role, content, pois = []) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      const message = {
        role,
        content,
        timestamp: new Date().toISOString(),
        ...(pois.length > 0 && { pois: pois.map(p => p.id) })
      };

      session.context.conversationHistory.push(message);

      // Update displayed POIs
      if (pois.length > 0) {
        const newPOIIds = pois.map(p => p.id);
        session.context.displayedPOIs = [
          ...new Set([...session.context.displayedPOIs, ...newPOIIds])
        ];
      }

      await db.pool.query(
        `UPDATE ChatSession SET context = ?, updated_at = NOW() WHERE id = ?`,
        [JSON.stringify(session.context), sessionId]
      );

      return true;

    } catch (error) {
      logger.error('Failed to add message:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions (to be called by cron job)
   * @returns {Promise<number>} - Number of deleted sessions
   */
  async cleanupExpiredSessions() {
    try {
      const [result] = await db.pool.query(
        `DELETE FROM ChatSession
         WHERE expires_at IS NOT NULL AND expires_at < NOW()`
      );

      const deletedCount = result.affectedRows || 0;
      logger.info(`Cleaned up ${deletedCount} expired sessions`);

      // Log to cleanup table
      await db.pool.query(
        `INSERT INTO ChatSessionCleanupLog (sessions_deleted) VALUES (?)`,
        [deletedCount]
      );

      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }
}

module.exports = new SessionService();
