/**
 * UserConsent Model - GDPR-compliant consent tracking
 * Database: pxoziy_db1 @ jotx.your-database.de
 *
 * Tracks user consent for different data processing categories:
 * - Essential: Required for account functionality (always true)
 * - Analytics: Tracking preferences and behavior
 * - Personalization: AI recommendations and personalized content
 * - Marketing: Promotional emails and communications
 */

import { DataTypes, Model } from 'sequelize';
import { mysqlSequelize as sequelize } from '../config/database.js';

class UserConsent extends Model {
  /**
   * Check if user has given consent for a specific type
   * @param {string} type - 'essential', 'analytics', 'personalization', 'marketing'
   * @returns {boolean}
   */
  hasConsent(type) {
    const consentMap = {
      essential: this.consentEssential,
      analytics: this.consentAnalytics,
      personalization: this.consentPersonalization,
      marketing: this.consentMarketing
    };
    return consentMap[type] ?? false;
  }

  /**
   * Get all consents as a simple object
   * @returns {object}
   */
  toConsentObject() {
    return {
      essential: this.consentEssential,
      analytics: this.consentAnalytics,
      personalization: this.consentPersonalization,
      marketing: this.consentMarketing,
      updatedAt: this.updatedAt
    };
  }
}

UserConsent.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'user_id',
    references: {
      model: 'Users',
      key: 'id'
    }
  },

  // Essential - always required for account to function
  consentEssential: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'consent_essential',
    comment: 'Essentieel - altijd vereist voor account'
  },

  // Analytics - voorkeuren en gedrag tracking
  consentAnalytics: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'consent_analytics',
    comment: 'Analytics - voorkeuren en gedrag tracking'
  },

  // Personalization - AI aanbevelingen
  consentPersonalization: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'consent_personalization',
    comment: 'Personalisatie - AI aanbevelingen'
  },

  // Marketing - emails en promoties
  consentMarketing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'consent_marketing',
    comment: 'Marketing - emails en promoties'
  }

}, {
  sequelize,
  modelName: 'UserConsent',
  tableName: 'user_consent',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default UserConsent;
