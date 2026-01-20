/**
 * Session Model
 * Manages refresh tokens and user sessions
 */

const db = require('../config/database');
const logger = require('../utils/logger');

class Session {
  /**
   * Create new session with refresh token
   * @param {Object} sessionData - {userId, refreshToken, ipAddress, userAgent, expiresAt}
   * @returns {Number} Session ID
   */
  static async create({ userId, refreshToken, ipAddress, userAgent, expiresAt }) {
    try {
      const [result] = await db.execute(
        `INSERT INTO Sessions (user_id, refresh_token, ip_address, user_agent, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [userId, refreshToken, ipAddress, userAgent, expiresAt]
      );

      logger.info(`Session created for user ID: ${userId}`);
      return result.insertId;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Find session by refresh token
   * @param {String} refreshToken
   * @returns {Object|null} Session object
   */
  static async findByToken(refreshToken) {
    const [rows] = await db.execute(
      `SELECT id, user_id, refresh_token, ip_address, user_agent, expires_at, created_at
       FROM Sessions
       WHERE refresh_token = ? AND expires_at > NOW()`,
      [refreshToken]
    );

    return rows[0] || null;
  }

  /**
   * Delete session by refresh token
   * @param {String} refreshToken
   * @returns {Boolean} Success
   */
  static async deleteByToken(refreshToken) {
    const [result] = await db.execute(
      'DELETE FROM Sessions WHERE refresh_token = ?',
      [refreshToken]
    );

    logger.info(`Session deleted for token: ${refreshToken.substring(0, 10)}...`);
    return result.affectedRows > 0;
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   * @param {Number} userId
   * @returns {Number} Number of sessions deleted
   */
  static async deleteAllByUser(userId) {
    const [result] = await db.execute(
      'DELETE FROM Sessions WHERE user_id = ?',
      [userId]
    );

    logger.info(`All sessions deleted for user ID: ${userId}`);
    return result.affectedRows;
  }

  /**
   * Clean up expired sessions
   * Should be run periodically (cron job)
   * @returns {Number} Number of expired sessions deleted
   */
  static async cleanExpired() {
    const [result] = await db.execute(
      'DELETE FROM Sessions WHERE expires_at < NOW()'
    );

    if (result.affectedRows > 0) {
      logger.info(`Cleaned up ${result.affectedRows} expired sessions`);
    }

    return result.affectedRows;
  }

  /**
   * Get all active sessions for a user
   * @param {Number} userId
   * @returns {Array} List of sessions
   */
  static async getUserSessions(userId) {
    const [rows] = await db.execute(
      `SELECT id, ip_address, user_agent, created_at, expires_at
       FROM Sessions
       WHERE user_id = ? AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );

    return rows;
  }

  /**
   * Delete specific session by ID
   * @param {Number} sessionId
   * @param {Number} userId - For security, verify ownership
   * @returns {Boolean} Success
   */
  static async deleteById(sessionId, userId) {
    const [result] = await db.execute(
      'DELETE FROM Sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    return result.affectedRows > 0;
  }
}

module.exports = Session;
