/**
 * GDPR Consent Manager
 * Handles Art. 7 - Conditions for Consent
 *
 * Tracks and manages user consent for various processing activities
 * Uses existing user_consent table in database
 */

import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

const CONSENT_TYPES = {
  ESSENTIAL: {
    id: 'consent_essential',
    name: 'Essential Services',
    description: 'Required for the platform to function',
    legalBasis: 'Contract Performance (Art. 6.1.b)',
    required: true
  },
  ANALYTICS: {
    id: 'consent_analytics',
    name: 'Analytics',
    description: 'Help us understand how visitors interact with our website',
    legalBasis: 'Consent (Art. 6.1.a)',
    required: false
  },
  PERSONALIZATION: {
    id: 'consent_personalization',
    name: 'Personalized Recommendations',
    description: 'Receive personalized travel recommendations based on your preferences',
    legalBasis: 'Consent (Art. 6.1.a)',
    required: false
  },
  MARKETING: {
    id: 'consent_marketing',
    name: 'Marketing Communications',
    description: 'Receive promotional emails and newsletters',
    legalBasis: 'Consent (Art. 6.1.a)',
    required: false
  }
};

class ConsentManager {
  constructor() {
    this.sequelize = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  /**
   * Record user consent
   */
  async recordConsent(userId, consentType, granted, metadata = {}) {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }

    const consent = CONSENT_TYPES[consentType.toUpperCase()];
    if (!consent) {
      throw new Error(`Unknown consent type: ${consentType}`);
    }

    console.log(`[ConsentManager] Recording consent: ${consentType} = ${granted} for user ${userId}`);

    try {
      // Check for existing consent record
      const [existing] = await this.sequelize.query(`
        SELECT id FROM user_consent WHERE user_id = ?
      `, { replacements: [userId] });

      if (existing.length > 0) {
        // Update existing consent
        await this.sequelize.query(`
          UPDATE user_consent
          SET ${consent.id} = ?, updated_at = NOW()
          WHERE user_id = ?
        `, { replacements: [granted ? 1 : 0, userId] });
      } else {
        // Create new consent record with defaults
        await this.sequelize.query(`
          INSERT INTO user_consent (
            user_id, consent_essential, consent_analytics,
            consent_personalization, consent_marketing, created_at, updated_at
          ) VALUES (?, 1, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            userId,
            consentType === 'ANALYTICS' ? (granted ? 1 : 0) : 0,
            consentType === 'PERSONALIZATION' ? (granted ? 1 : 0) : 0,
            consentType === 'MARKETING' ? (granted ? 1 : 0) : 0
          ]
        });
      }

      await logAgent('gdpr', 'consent_recorded', {
        description: `Consent ${granted ? 'granted' : 'withdrawn'}: ${consent.name} for user ${userId}`,
        metadata: { userId, consentType: consent.id, granted }
      });

      return { success: true, consentType: consent.id, granted };
    } catch (error) {
      await logError('gdpr', error, { action: 'record_consent', userId, consentType });
      throw error;
    }
  }

  /**
   * Record all consents at once (for consent form submission)
   */
  async recordAllConsents(userId, consents, metadata = {}) {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }

    console.log(`[ConsentManager] Recording all consents for user ${userId}`);

    try {
      const [existing] = await this.sequelize.query(`
        SELECT id FROM user_consent WHERE user_id = ?
      `, { replacements: [userId] });

      if (existing.length > 0) {
        await this.sequelize.query(`
          UPDATE user_consent
          SET consent_essential = 1,
              consent_analytics = ?,
              consent_personalization = ?,
              consent_marketing = ?,
              updated_at = NOW()
          WHERE user_id = ?
        `, {
          replacements: [
            consents.analytics ? 1 : 0,
            consents.personalization ? 1 : 0,
            consents.marketing ? 1 : 0,
            userId
          ]
        });
      } else {
        await this.sequelize.query(`
          INSERT INTO user_consent (
            user_id, consent_essential, consent_analytics,
            consent_personalization, consent_marketing, created_at, updated_at
          ) VALUES (?, 1, ?, ?, ?, NOW(), NOW())
        `, {
          replacements: [
            userId,
            consents.analytics ? 1 : 0,
            consents.personalization ? 1 : 0,
            consents.marketing ? 1 : 0
          ]
        });
      }

      await logAgent('gdpr', 'all_consents_recorded', {
        description: `All consents recorded for user ${userId}`,
        metadata: { userId, consents }
      });

      return { success: true, userId, consents };
    } catch (error) {
      await logError('gdpr', error, { action: 'record_all_consents', userId });
      throw error;
    }
  }

  /**
   * Get all consents for a user
   */
  async getUserConsents(userId) {
    const [consents] = await this.sequelize.query(`
      SELECT consent_essential, consent_analytics, consent_personalization,
             consent_marketing, created_at, updated_at
      FROM user_consent WHERE user_id = ?
    `, { replacements: [userId] });

    if (consents.length === 0) {
      // Return defaults if no consent record exists
      return {
        essential: { ...CONSENT_TYPES.ESSENTIAL, granted: true, updatedAt: null },
        analytics: { ...CONSENT_TYPES.ANALYTICS, granted: false, updatedAt: null },
        personalization: { ...CONSENT_TYPES.PERSONALIZATION, granted: false, updatedAt: null },
        marketing: { ...CONSENT_TYPES.MARKETING, granted: false, updatedAt: null }
      };
    }

    const consent = consents[0];
    return {
      essential: { ...CONSENT_TYPES.ESSENTIAL, granted: consent.consent_essential === 1, updatedAt: consent.updated_at },
      analytics: { ...CONSENT_TYPES.ANALYTICS, granted: consent.consent_analytics === 1, updatedAt: consent.updated_at },
      personalization: { ...CONSENT_TYPES.PERSONALIZATION, granted: consent.consent_personalization === 1, updatedAt: consent.updated_at },
      marketing: { ...CONSENT_TYPES.MARKETING, granted: consent.consent_marketing === 1, updatedAt: consent.updated_at }
    };
  }

  /**
   * Check if user has specific consent
   */
  async hasConsent(userId, consentType) {
    const consent = CONSENT_TYPES[consentType.toUpperCase()];
    if (!consent) return false;

    // Essential consent is always true
    if (consent.required) return true;

    const [rows] = await this.sequelize.query(`
      SELECT ${consent.id} as granted FROM user_consent WHERE user_id = ?
    `, { replacements: [userId] });

    return rows.length > 0 && rows[0].granted === 1;
  }

  /**
   * Withdraw all consents (except essential)
   */
  async withdrawAllConsents(userId) {
    console.log(`[ConsentManager] Withdrawing all consents for user ${userId}`);

    await this.sequelize.query(`
      UPDATE user_consent
      SET consent_analytics = 0,
          consent_personalization = 0,
          consent_marketing = 0,
          updated_at = NOW()
      WHERE user_id = ?
    `, { replacements: [userId] });

    await logAgent('gdpr', 'all_consents_withdrawn', {
      description: `All consents withdrawn for user ${userId}`,
      metadata: { userId }
    });

    return { success: true, userId };
  }

  /**
   * Get consent types
   */
  getConsentTypes() {
    return CONSENT_TYPES;
  }

  /**
   * Generate consent report
   */
  async generateConsentReport() {
    const [stats] = await this.sequelize.query(`
      SELECT
        SUM(consent_analytics) as analytics_granted,
        SUM(consent_personalization) as personalization_granted,
        SUM(consent_marketing) as marketing_granted,
        COUNT(*) as total_users
      FROM user_consent
    `);

    const report = {
      generatedAt: new Date().toISOString(),
      statistics: {
        totalUsers: stats[0]?.total_users || 0,
        analyticsGranted: stats[0]?.analytics_granted || 0,
        personalizationGranted: stats[0]?.personalization_granted || 0,
        marketingGranted: stats[0]?.marketing_granted || 0
      },
      consentTypes: CONSENT_TYPES
    };

    await logAgent('gdpr', 'consent_report_generated', {
      description: 'Generated consent statistics report',
      metadata: { totalUsers: report.statistics.totalUsers }
    });

    return report;
  }
}

export default new ConsentManager();
