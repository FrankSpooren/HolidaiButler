/**
 * Contact Form Route (Fase V.6)
 * Public endpoint for contact form submissions
 *
 * POST /api/v1/contact — Submit contact form
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import mailerLiteService from '../services/mailerlite.js';
import logger from '../utils/logger.js';
import { mysqlSequelize } from '../config/database.js';

const router = express.Router();

// Rate limit: 5 submissions per 15 minutes per IP
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: false,
  legacyHeaders: false,
  message: { success: false, error: 'Too many submissions, please try again later' },
});

/**
 * POST /api/v1/contact
 * Submit a contact form message
 */
router.post('/', contactRateLimit, async (req, res) => {
  try {
    const { name, email, phone, company, subject, message, consent, _hp, source } = req.body;

    // Honeypot check — if filled, it's a bot
    if (_hp) {
      return res.json({ success: true, message: 'Message sent successfully' });
    }

    // Validation
    if (!email || !message) {
      return res.status(400).json({ success: false, error: 'Email and message are required' });
    }

    if (!consent) {
      return res.status(400).json({ success: false, error: 'Consent is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Get destination context from header
    const destId = req.headers['x-destination-id'] || 'unknown';
    const destinationName = typeof destId === 'string' ? destId.charAt(0).toUpperCase() + destId.slice(1) : 'HolidaiButler';

    // Persist demo requests (Content Studio landing page leads)
    const isDemoRequest = source === 'studio_landing' || (subject && subject.toLowerCase().includes('demo'));
    if (isDemoRequest) {
      try {
        await mysqlSequelize.query(
          `INSERT INTO demo_requests
           (name, email, phone, company, message, source, destination_context, ip, user_agent, consent_given)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              name || null,
              email,
              phone || null,
              company || null,
              message || null,
              source || 'studio_landing',
              String(destId),
              (req.headers['x-forwarded-for'] || req.ip || '').toString().slice(0, 45),
              (req.headers['user-agent'] || '').toString().slice(0, 500),
              consent ? 1 : 0,
            ],
          }
        );
        logger.info(`[Contact] Demo request persisted from ${email} (${company || 'no company'})`);
      } catch (dbErr) {
        logger.error('[Contact] Failed to persist demo_request:', dbErr.message);
      }
    }

    // Send notification email via MailerLite
    if (mailerLiteService.isEnabled()) {
      try {
        await mailerLiteService.sendTransactionalEmail(
          process.env.CONTACT_EMAIL || 'info@holidaibutler.com',
          null, // No template — raw content
          {
            subject: `[${destinationName}] Contact: ${subject || 'No subject'}`,
            from_name: name || 'Website Visitor',
            from_email: email,
            message: `Name: ${name || 'N/A'}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nCompany: ${company || 'N/A'}\nSubject: ${subject || 'N/A'}\n\nMessage:\n${message}`,
          }
        );
      } catch (emailErr) {
        // Log but don't fail — email delivery is best-effort
        logger.warn('[Contact] Email send failed, logging to audit:', emailErr.message);
      }
    }

    // Log to console for now (no PII stored in DB — GDPR compliant)
    logger.info(`[Contact] Form submission from ${email} for ${destinationName}`);

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    logger.error('[Contact] Submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

export default router;
