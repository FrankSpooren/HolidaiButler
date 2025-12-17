/**
 * Consent Routes - GDPR-compliant consent management
 * Handles user privacy consent preferences
 */

import express from 'express';
import { UserConsent, ConsentHistory, User } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Helper: Get client IP address
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         null;
}

/**
 * @route   GET /api/consent
 * @desc    Get current user's consent preferences
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find or create consent record
    let consent = await UserConsent.findOne({ where: { userId } });

    if (!consent) {
      // Create default consent record (all false except essential)
      consent = await UserConsent.create({
        userId,
        consentEssential: true,
        consentAnalytics: false,
        consentPersonalization: false,
        consentMarketing: false
      });

      logger.info(`Created default consent record for user ${userId}`);
    }

    res.json({
      success: true,
      data: {
        essential: consent.consentEssential,
        analytics: consent.consentAnalytics,
        personalization: consent.consentPersonalization,
        marketing: consent.consentMarketing,
        updatedAt: consent.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error fetching consent:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Fout bij ophalen van privacy-instellingen',
      debug: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/consent
 * @desc    Update user's consent preferences
 * @access  Private
 */
router.put('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { analytics, personalization, marketing } = req.body;

    // Find or create consent record
    let consent = await UserConsent.findOne({ where: { userId } });
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || null;

    if (!consent) {
      // Create new consent record
      consent = await UserConsent.create({
        userId,
        consentEssential: true,
        consentAnalytics: analytics ?? false,
        consentPersonalization: personalization ?? false,
        consentMarketing: marketing ?? false
      });

      // Log initial consent settings
      const consentTypes = ['analytics', 'personalization', 'marketing'];
      const values = { analytics, personalization, marketing };

      for (const type of consentTypes) {
        if (values[type] !== undefined) {
          await ConsentHistory.logChange({
            userId,
            consentType: type,
            oldValue: null,
            newValue: values[type],
            ipAddress,
            userAgent,
            source: 'settings'
          });
        }
      }

      logger.info(`Created consent record for user ${userId}`);

    } else {
      // Track changes and update
      const changes = [];

      if (analytics !== undefined && consent.consentAnalytics !== analytics) {
        changes.push({
          type: 'analytics',
          oldValue: consent.consentAnalytics,
          newValue: analytics
        });
      }

      if (personalization !== undefined && consent.consentPersonalization !== personalization) {
        changes.push({
          type: 'personalization',
          oldValue: consent.consentPersonalization,
          newValue: personalization
        });
      }

      if (marketing !== undefined && consent.consentMarketing !== marketing) {
        changes.push({
          type: 'marketing',
          oldValue: consent.consentMarketing,
          newValue: marketing
        });
      }

      // Update consent record
      await consent.update({
        consentAnalytics: analytics ?? consent.consentAnalytics,
        consentPersonalization: personalization ?? consent.consentPersonalization,
        consentMarketing: marketing ?? consent.consentMarketing
      });

      // Log each change to history
      for (const change of changes) {
        await ConsentHistory.logChange({
          userId,
          consentType: change.type,
          oldValue: change.oldValue,
          newValue: change.newValue,
          ipAddress,
          userAgent,
          source: 'settings'
        });
      }

      if (changes.length > 0) {
        logger.info(`Updated consent for user ${userId}: ${changes.map(c => c.type).join(', ')}`);
      }
    }

    // Reload consent to get updated values
    await consent.reload();

    res.json({
      success: true,
      message: 'Privacy-instellingen opgeslagen',
      data: {
        essential: consent.consentEssential,
        analytics: consent.consentAnalytics,
        personalization: consent.consentPersonalization,
        marketing: consent.consentMarketing,
        updatedAt: consent.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error updating consent:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Fout bij opslaan van privacy-instellingen',
      debug: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/consent/history
 * @desc    Get user's consent change history (GDPR compliance)
 * @access  Private
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await ConsentHistory.findAll({
      where: { userId },
      order: [['changedAt', 'DESC']],
      limit: 100
    });

    res.json({
      success: true,
      data: history.map(h => ({
        consentType: h.consentType,
        oldValue: h.oldValue,
        newValue: h.newValue,
        source: h.source,
        changedAt: h.changedAt
      }))
    });

  } catch (error) {
    logger.error('Error fetching consent history:', error);
    res.status(500).json({
      success: false,
      message: 'Fout bij ophalen van consent historie'
    });
  }
});

/**
 * @route   POST /api/consent/check
 * @desc    Check if user has specific consent (for internal use)
 * @access  Private
 */
router.post('/check', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;

    if (!['essential', 'analytics', 'personalization', 'marketing'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Ongeldig consent type'
      });
    }

    const consent = await UserConsent.findOne({ where: { userId } });

    if (!consent) {
      // No consent record = only essential is true
      return res.json({
        success: true,
        data: {
          type,
          hasConsent: type === 'essential'
        }
      });
    }

    res.json({
      success: true,
      data: {
        type,
        hasConsent: consent.hasConsent(type)
      }
    });

  } catch (error) {
    logger.error('Error checking consent:', error);
    res.status(500).json({
      success: false,
      message: 'Fout bij controleren van consent'
    });
  }
});

export default router;
