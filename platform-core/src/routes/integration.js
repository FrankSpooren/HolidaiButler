/**
 * Integration Routes
 * Manual triggers for integration operations
 */

import express from 'express';
import eventBus from '../services/eventBus.js';
import mailerLiteService from '../services/mailerlite.js';
import logger from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Trigger data sync between modules
 */
router.post('/sync', authenticate, async (req, res) => {
  try {
    const { modules, force = false } = req.body;

    logger.workflow('manual_sync', 'started', { modules, userId: req.user.id });

    // Publish sync event
    await eventBus.publish('sync.requested', {
      modules,
      force,
      triggeredBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Synchronization started',
      modules,
    });
  } catch (error) {
    logger.error('Sync trigger failed:', error);
    res.status(500).json({
      error: 'Sync Failed',
      message: error.message,
    });
  }
});

/**
 * Get integration status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = {
      eventBus: eventBus.isInitialized,
      mailerLite: !!process.env.MAILERLITE_API_KEY,
      modules: {
        admin: process.env.ADMIN_MODULE_URL || 'http://localhost:3003',
        ticketing: process.env.TICKETING_MODULE_URL || 'http://localhost:3004',
        payment: process.env.PAYMENT_MODULE_URL || 'http://localhost:3005',
      },
    };

    res.json(status);
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({
      error: 'Status Check Failed',
      message: error.message,
    });
  }
});

/**
 * Get event history
 */
router.get('/events/:eventName', authenticate, async (req, res) => {
  try {
    const { eventName } = req.params;
    const { limit = 50 } = req.query;

    const history = await eventBus.getEventHistory(eventName, parseInt(limit));

    res.json({
      event: eventName,
      count: history.length,
      events: history,
    });
  } catch (error) {
    logger.error('Event history retrieval failed:', error);
    res.status(500).json({
      error: 'Event History Failed',
      message: error.message,
    });
  }
});

/**
 * Test MailerLite connection
 */
router.get('/mailerlite/test', authenticate, async (req, res) => {
  try {
    const groups = await mailerLiteService.getGroups();

    res.json({
      success: true,
      message: 'MailerLite connection successful',
      groupCount: groups.length,
    });
  } catch (error) {
    logger.error('MailerLite test failed:', error);
    res.status(500).json({
      success: false,
      error: 'MailerLite Test Failed',
      message: error.message,
    });
  }
});

/**
 * Subscribe user to MailerLite
 */
router.post('/mailerlite/subscribe', authenticate, async (req, res) => {
  try {
    const { email, name, lastName, groupIds, customFields } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email is required',
      });
    }

    const subscriber = await mailerLiteService.subscribeUser(email, {
      name,
      lastName,
      groupIds,
      customFields,
    });

    res.json({
      success: true,
      message: 'User subscribed successfully',
      subscriber,
    });
  } catch (error) {
    logger.error('MailerLite subscribe failed:', error);
    res.status(500).json({
      error: 'Subscribe Failed',
      message: error.message,
    });
  }
});

export default router;
