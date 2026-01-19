/**
 * Communication Flow Agent v1.0
 * Enterprise-level communication automation
 */

import userJourneyManager from './userJourneyManager.js';
import mailerliteService from './mailerliteService.js';
import notificationRouter from './notificationRouter.js';
import syncScheduler from './syncScheduler.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

class CommunicationFlowAgent {
  constructor() {
    this.isInitialized = false;
    this.sequelize = null;
  }

  async initialize(sequelize) {
    if (this.isInitialized) {
      console.log('[CommunicationFlowAgent] Already initialized, skipping...');
      return;
    }

    console.log('[CommunicationFlowAgent] Initializing...');

    try {
      this.sequelize = sequelize;
      userJourneyManager.setSequelize(sequelize);
      notificationRouter.initialize();

      // Initialize scheduled jobs
      await syncScheduler.initializeScheduledJobs();

      this.isInitialized = true;

      await logAgent('communication-flow', 'agent_initialized', {
        description: 'Communication Flow Agent v1.0 initialized',
        metadata: { version: '1.0' }
      });

      console.log('[CommunicationFlowAgent] Enterprise agent ready');
    } catch (error) {
      await logError('communication-flow', error, { action: 'initialize' });
      throw error;
    }
  }

  /**
   * Start a user journey
   */
  async startJourney(userId, journeyType, metadata = {}) {
    return userJourneyManager.startJourney(userId, journeyType, metadata);
  }

  /**
   * Process pending journey emails
   */
  async processJourneyEmails() {
    return userJourneyManager.processPendingEmails();
  }

  /**
   * Cancel a journey
   */
  async cancelJourney(journeyId, reason) {
    return userJourneyManager.cancelJourney(journeyId, reason);
  }

  /**
   * Get user journeys
   */
  async getUserJourneys(userId) {
    return userJourneyManager.getUserJourneys(userId);
  }

  /**
   * Route a notification
   */
  async sendNotification(type, recipient, data) {
    return notificationRouter.route(type, recipient, data);
  }

  /**
   * Batch send notifications
   */
  async batchNotifications(notifications) {
    return notificationRouter.batchSend(notifications);
  }

  /**
   * Sync users to MailerLite
   */
  async syncUsers() {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }
    return mailerliteService.syncUsersToMailerLite(this.sequelize);
  }

  /**
   * Cleanup completed journeys (older than 90 days)
   */
  async cleanupJourneys() {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }

    console.log('[CommunicationFlowAgent] Cleaning up old journeys...');

    try {
      // Delete scheduled emails for old completed journeys
      const [emailResult] = await this.sequelize.query(`
        DELETE jse FROM journey_scheduled_emails jse
        JOIN user_journeys uj ON jse.journey_id = uj.id
        WHERE uj.status IN ('completed', 'cancelled')
        AND uj.updated_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
      `);

      // Delete old completed journeys
      const [journeyResult] = await this.sequelize.query(`
        DELETE FROM user_journeys
        WHERE status IN ('completed', 'cancelled')
        AND updated_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
      `);

      await logAgent('communication-flow', 'journeys_cleaned', {
        description: 'Cleaned up old completed journeys',
        metadata: { journeysDeleted: journeyResult.affectedRows || 0 }
      });

      console.log(`[CommunicationFlowAgent] Cleanup complete`);

      return { success: true, journeysDeleted: journeyResult.affectedRows || 0 };
    } catch (error) {
      await logError('communication-flow', error, { action: 'cleanup_journeys' });
      throw error;
    }
  }

  /**
   * Get agent status
   */
  async getStatus() {
    const jobs = syncScheduler.getJobs();
    const journeyTypes = userJourneyManager.getJourneyTypes();
    const notificationTypes = notificationRouter.getNotificationTypes();

    return {
      agent: 'communication-flow',
      version: '1.0',
      status: this.isInitialized ? 'active' : 'inactive',
      scheduledJobs: Object.keys(jobs).length,
      journeyTypes: Object.keys(journeyTypes).length,
      notificationTypes: Object.keys(notificationTypes).length,
      timestamp: new Date().toISOString()
    };
  }

  isReady() {
    return this.isInitialized;
  }
}

export default new CommunicationFlowAgent();
