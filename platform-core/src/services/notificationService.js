import { mysqlSequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../utils/logger.js';

class NotificationService {
  /**
   * Create a notification for a user
   */
  async create({ userId, destinationId = null, type, severity = 'medium', title, message = null, actionUrl = null, actionLabel = null }) {
    try {
      const [result] = await mysqlSequelize.query(
        `INSERT INTO notifications (user_id, destination_id, type, severity, title, message, action_url, action_label)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        { replacements: [userId, destinationId, type, severity, title, message, actionUrl, actionLabel], type: QueryTypes.INSERT }
      );
      return result;
    } catch (error) {
      logger.error('[NotificationService] Create error:', error.message);
      throw error;
    }
  }

  /**
   * Get notifications for a user (with pagination)
   */
  async getForUser(userId, { limit = 20, offset = 0, unreadOnly = false } = {}) {
    let where = 'WHERE user_id = ? AND dismissed_at IS NULL';
    const params = [userId];

    if (unreadOnly) {
      where += ' AND read_at IS NULL';
    }

    const notifications = await mysqlSequelize.query(
      `SELECT id, destination_id, type, severity, title, message, action_url, action_label, read_at, created_at
       FROM notifications
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      { replacements: [...params, limit, offset], type: QueryTypes.SELECT }
    );

    const [countResult] = await mysqlSequelize.query(
      `SELECT COUNT(*) as count FROM notifications ${where}`,
      { replacements: params, type: QueryTypes.SELECT }
    );

    const [unreadResult] = await mysqlSequelize.query(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND read_at IS NULL AND dismissed_at IS NULL',
      { replacements: [userId], type: QueryTypes.SELECT }
    );

    return { notifications, total: countResult.count, unread: unreadResult.unread };
  }

  /**
   * Mark a single notification as read
   */
  async markRead(notificationId, userId) {
    const [, meta] = await mysqlSequelize.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL',
      { replacements: [notificationId, userId], type: QueryTypes.UPDATE }
    );
    return meta > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllRead(userId) {
    const [, meta] = await mysqlSequelize.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL AND dismissed_at IS NULL',
      { replacements: [userId], type: QueryTypes.UPDATE }
    );
    return meta;
  }

  /**
   * Dismiss (soft-delete) a notification
   */
  async dismiss(notificationId, userId) {
    const [, meta] = await mysqlSequelize.query(
      'UPDATE notifications SET dismissed_at = NOW() WHERE id = ? AND user_id = ?',
      { replacements: [notificationId, userId], type: QueryTypes.UPDATE }
    );
    return meta > 0;
  }

  /**
   * Get unread count only (lightweight polling)
   */
  async getUnreadCount(userId) {
    const [result] = await mysqlSequelize.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL AND dismissed_at IS NULL',
      { replacements: [userId], type: QueryTypes.SELECT }
    );
    return result.count;
  }
}

export default new NotificationService();
