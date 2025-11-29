/**
 * Automation System
 * Initializes all automated workflows and cron jobs
 */

import cron from 'node-cron';
import logger from '../utils/logger.js';
import workflowManager from './workflowManager.js';
import eventBus from '../services/eventBus.js';

// Import workflows
import './workflows/userSync.js';
import './workflows/bookingSync.js';
import './workflows/emailCampaigns.js';
import './workflows/dataCleanup.js';
import './workflows/analytics.js';
import './workflows/poiClassification.js';

/**
 * Initialize automation system
 */
export async function initializeAutomation() {
  logger.info('🤖 Initializing automation system...');

  try {
    // Register event listeners
    setupEventListeners();

    // Schedule cron jobs
    scheduleCronJobs();

    logger.info('✅ Automation system initialized');
  } catch (error) {
    logger.error('❌ Automation initialization failed:', error);
    throw error;
  }
}

/**
 * Setup event listeners for reactive workflows
 */
function setupEventListeners() {
  // User registration event
  eventBus.on('user.registered', async (data) => {
    logger.workflow('user_registration', 'triggered', data);
    await workflowManager.execute('user-onboarding', data);
  });

  // Booking created event
  eventBus.on('booking.created', async (data) => {
    logger.workflow('booking_created', 'triggered', data);
    await workflowManager.execute('booking-confirmation', data);
  });

  // Payment completed event
  eventBus.on('payment.completed', async (data) => {
    logger.workflow('payment_completed', 'triggered', data);
    await workflowManager.execute('ticket-delivery', data);
  });

  // Payment failed event
  eventBus.on('payment.failed', async (data) => {
    logger.workflow('payment_failed', 'triggered', data);
    await workflowManager.execute('payment-recovery', data);
  });

  // Booking cancelled event
  eventBus.on('booking.cancelled', async (data) => {
    logger.workflow('booking_cancelled', 'triggered', data);
    await workflowManager.execute('booking-cancellation', data);
  });

  // POI updated event
  eventBus.on('poi.updated', async (data) => {
    logger.workflow('poi_updated', 'triggered', data);
    await workflowManager.execute('poi-sync', data);
  });

  // POI tier changed event
  eventBus.on('poi.tier.changed', async (data) => {
    logger.workflow('poi_tier_changed', 'triggered', data);
    logger.info(`POI tier changed: ${data.name} (${data.oldTier} → ${data.newTier})`);
  });

  logger.info('Event listeners registered');
}

/**
 * Schedule cron jobs for time-based workflows
 */
function scheduleCronJobs() {
  const syncInterval = parseInt(process.env.SYNC_INTERVAL_MINUTES || '15');

  // Data synchronization (every 15 minutes)
  cron.schedule(`*/${syncInterval} * * * *`, async () => {
    logger.info('Running scheduled data sync');
    await workflowManager.execute('data-sync', { scheduled: true });
  });

  // Daily cleanup (every day at 2:00 AM)
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running daily cleanup');
    await workflowManager.execute('data-cleanup', { scheduled: true });
  });

  // Analytics aggregation (every hour)
  cron.schedule('0 * * * *', async () => {
    logger.info('Running analytics aggregation');
    await workflowManager.execute('analytics-aggregation', { scheduled: true });
  });

  // Email campaign check (every day at 9:00 AM)
  cron.schedule('0 9 * * *', async () => {
    logger.info('Checking email campaigns');
    await workflowManager.execute('email-campaign-check', { scheduled: true });
  });

  // Booking reminder emails (every day at 10:00 AM)
  cron.schedule('0 10 * * *', async () => {
    logger.info('Sending booking reminders');
    await workflowManager.execute('booking-reminders', { scheduled: true });
  });

  // Abandoned cart recovery (every 6 hours)
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running abandoned cart recovery');
    await workflowManager.execute('abandoned-cart-recovery', { scheduled: true });
  });

  // POI Classification - Tier 1 updates (every hour)
  cron.schedule('0 * * * *', async () => {
    logger.info('Running Tier 1 POI updates');
    await workflowManager.execute('poi-tier1-updates', { scheduled: true });
  });

  // POI Classification - Tier 2 updates (daily at 3:00 AM)
  cron.schedule('0 3 * * *', async () => {
    logger.info('Running Tier 2 POI updates');
    await workflowManager.execute('poi-tier2-updates', { scheduled: true });
  });

  // POI Classification - Tier 3 updates (weekly on Monday at 4:00 AM)
  cron.schedule('0 4 * * 1', async () => {
    logger.info('Running Tier 3 POI updates');
    await workflowManager.execute('poi-tier3-updates', { scheduled: true });
  });

  // POI Classification - Tier 4 updates (monthly on 1st at 5:00 AM)
  cron.schedule('0 5 1 * *', async () => {
    logger.info('Running Tier 4 POI updates');
    await workflowManager.execute('poi-tier4-updates', { scheduled: true });
  });

  // POI Quarterly Review (every 3 months on 1st at 6:00 AM)
  cron.schedule('0 6 1 */3 *', async () => {
    logger.info('Running quarterly POI review');
    await workflowManager.execute('poi-quarterly-review', { scheduled: true });
  });

  logger.info('Cron jobs scheduled');
}

export default {
  initializeAutomation,
};
