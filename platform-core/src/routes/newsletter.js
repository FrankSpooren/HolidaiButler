/**
 * Newsletter Route (Fase V.6)
 * Public endpoint for newsletter subscriptions via MailerLite
 *
 * POST /api/v1/newsletter/subscribe — Subscribe to newsletter
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import mailerLiteService from '../services/mailerlite.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limit: 3 subscriptions per 15 minutes per IP
const subscribeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: false,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

/**
 * POST /api/v1/newsletter/subscribe
 * Subscribe email to MailerLite newsletter
 */
router.post('/subscribe', subscribeRateLimit, async (req, res) => {
  try {
    const { email, name, groupId, consent } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    if (!consent) {
      return res.status(400).json({ success: false, error: 'Consent is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    const subscriber = await mailerLiteService.subscribeUser(email, {
      name: name || '',
      groupIds: groupId ? [groupId] : undefined,
    });

    logger.info(`[Newsletter] Subscribed: ${email}${groupId ? ` to group ${groupId}` : ''}`);

    res.json({ success: true, message: 'Successfully subscribed' });
  } catch (error) {
    logger.error('[Newsletter] Subscription error:', error);

    if (error.response?.status === 422) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    res.status(500).json({ success: false, error: 'Subscription failed' });
  }
});

export default router;
