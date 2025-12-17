/**
 * ConsentHistory Model - GDPR audit trail for consent changes
 * Database: pxoziy_db1 @ jotx.your-database.de
 *
 * Records every consent change for compliance purposes.
 * Includes IP address, user agent, and source of change.
 */

import { DataTypes, Model } from 'sequelize';
import { mysqlSequelize as sequelize } from '../config/database.js';

class ConsentHistory extends Model {
  /**
   * Log a consent change
   * @param {object} params
   * @param {number} params.userId - User ID
   * @param {string} params.consentType - 'essential', 'analytics', 'personalization', 'marketing'
   * @param {boolean} params.oldValue - Previous consent value
   * @param {boolean} params.newValue - New consent value
   * @param {string} params.ipAddress - Client IP address
   * @param {string} params.userAgent - Client user agent
   * @param {string} params.source - 'registration', 'settings', 'cookie_banner', 'api', 'admin'
   * @returns {Promise<ConsentHistory>}
   */
  static async logChange({ userId, consentType, oldValue, newValue, ipAddress, userAgent, source = 'settings' }) {
    return await this.create({
      userId,
      consentType,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
      source
    });
  }

  /**
   * Get consent history for a user
   * @param {number} userId
   * @returns {Promise<ConsentHistory[]>}
   */
  static async getHistoryForUser(userId) {
    return await this.findAll({
      where: { userId },
      order: [['changedAt', 'DESC']]
    });
  }
}

ConsentHistory.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'Users',
      key: 'id'
    }
  },

  consentType: {
    type: DataTypes.ENUM('essential', 'analytics', 'personalization', 'marketing'),
    allowNull: false,
    field: 'consent_type'
  },

  oldValue: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'old_value'
  },

  newValue: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    field: 'new_value'
  },

  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
    comment: 'IPv4 of IPv6 adres'
  },

  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },

  source: {
    type: DataTypes.ENUM('registration', 'settings', 'cookie_banner', 'api', 'admin'),
    defaultValue: 'settings',
    field: 'source'
  },

  changedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'changed_at'
  }

}, {
  sequelize,
  modelName: 'ConsentHistory',
  tableName: 'consent_history',
  timestamps: false, // We use changedAt instead
  underscored: true
});

export default ConsentHistory;
