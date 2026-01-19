/**
 * User Journey Manager for Communication Flow Agent
 * Enterprise-level customer journey management
 */

import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

/**
 * User Journey Types
 */
const JOURNEY_TYPES = {
  WELCOME: {
    id: 'welcome',
    name: 'Welcome Journey',
    description: 'New user onboarding sequence',
    steps: [
      { day: 0, template: 'welcome_email', subject: 'Welkom bij HolidaiButler!' },
      { day: 2, template: 'getting_started', subject: 'Ontdek wat HolidaiButler voor je kan doen' },
      { day: 7, template: 'first_week_tips', subject: 'Tips voor jouw perfecte vakantie' }
    ]
  },
  BOOKING_CONFIRMATION: {
    id: 'booking_confirmation',
    name: 'Booking Confirmation',
    description: 'Post-booking communication',
    steps: [
      { day: 0, template: 'booking_confirmed', subject: 'Je boeking is bevestigd!' },
      { day: -3, template: 'pre_arrival', subject: 'Over 3 dagen begint je avontuur!' },
      { day: 1, template: 'during_stay', subject: 'Hoe bevalt je verblijf?' }
    ]
  },
  RE_ENGAGEMENT: {
    id: 're_engagement',
    name: 'Re-engagement Journey',
    description: 'Inactive user re-activation',
    steps: [
      { day: 30, template: 'miss_you', subject: 'We missen je!' },
      { day: 60, template: 'special_offer', subject: 'Exclusieve aanbieding voor jou' },
      { day: 90, template: 'last_chance', subject: 'Laatste kans: speciale korting' }
    ]
  },
  REVIEW_REQUEST: {
    id: 'review_request',
    name: 'Review Request Journey',
    description: 'Post-visit review solicitation',
    steps: [
      { day: 1, template: 'review_request', subject: 'Hoe was je ervaring?' },
      { day: 7, template: 'review_reminder', subject: 'Je mening telt!' }
    ]
  }
};

const JOURNEY_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
};

class UserJourneyManager {
  constructor() {
    this.sequelize = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  async startJourney(userId, journeyType, metadata = {}) {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }

    const journey = JOURNEY_TYPES[journeyType.toUpperCase()];
    if (!journey) {
      throw new Error(`Unknown journey type: ${journeyType}`);
    }

    console.log(`[UserJourneyManager] Starting ${journey.name} for user ${userId}`);

    try {
      const [existing] = await this.sequelize.query(`
        SELECT id FROM user_journeys
        WHERE user_id = ? AND journey_type = ? AND status IN ('pending', 'active')
        LIMIT 1
      `, { replacements: [userId, journey.id] });

      if (existing.length > 0) {
        console.log(`[UserJourneyManager] User ${userId} already has active ${journey.id} journey`);
        return { success: false, reason: 'journey_exists', journeyId: existing[0].id };
      }

      const [result] = await this.sequelize.query(`
        INSERT INTO user_journeys (
          user_id, journey_type, status, current_step,
          metadata, started_at, created_at, updated_at
        ) VALUES (?, ?, ?, 0, ?, NOW(), NOW(), NOW())
      `, {
        replacements: [userId, journey.id, JOURNEY_STATUS.ACTIVE, JSON.stringify(metadata)]
      });

      const journeyId = result;

      await this.scheduleNextStep(journeyId, journey, 0, metadata);

      await logAgent('communication-flow', 'journey_started', {
        description: `Started ${journey.name} for user ${userId}`,
        metadata: { userId, journeyType: journey.id, journeyId }
      });

      return { success: true, journeyId, journeyType: journey.id };
    } catch (error) {
      await logError('communication-flow', error, { action: 'start_journey', userId, journeyType });
      throw error;
    }
  }

  async scheduleNextStep(journeyId, journey, stepIndex, metadata) {
    if (stepIndex >= journey.steps.length) {
      await this.completeJourney(journeyId);
      return;
    }

    const step = journey.steps[stepIndex];
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + step.day);

    await this.sequelize.query(`
      INSERT INTO journey_scheduled_emails (
        journey_id, step_index, template_id, subject,
        scheduled_for, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', NOW())
    `, {
      replacements: [journeyId, stepIndex, step.template, step.subject, scheduledDate]
    });

    console.log(`[UserJourneyManager] Scheduled step ${stepIndex} for journey ${journeyId} at ${scheduledDate}`);
  }

  async processPendingEmails() {
    if (!this.sequelize) {
      throw new Error('Sequelize not initialized');
    }

    console.log('[UserJourneyManager] Processing pending journey emails...');

    try {
      const [pendingEmails] = await this.sequelize.query(`
        SELECT
          jse.id, jse.journey_id, jse.step_index, jse.template_id, jse.subject,
          uj.user_id, uj.journey_type, uj.metadata,
          u.email, u.first_name, u.last_name, u.language
        FROM journey_scheduled_emails jse
        JOIN user_journeys uj ON jse.journey_id = uj.id
        JOIN Users u ON uj.user_id = u.id
        WHERE jse.status = 'pending'
        AND jse.scheduled_for <= NOW()
        AND uj.status = 'active'
        LIMIT 50
      `);

      console.log(`[UserJourneyManager] Found ${pendingEmails.length} emails to send`);

      let sent = 0;
      let failed = 0;

      for (const email of pendingEmails) {
        try {
          await this.sendJourneyEmail(email);

          await this.sequelize.query(`
            UPDATE journey_scheduled_emails
            SET status = 'sent', sent_at = NOW()
            WHERE id = ?
          `, { replacements: [email.id] });

          await this.sequelize.query(`
            UPDATE user_journeys
            SET current_step = ?, updated_at = NOW()
            WHERE id = ?
          `, { replacements: [email.step_index + 1, email.journey_id] });

          const journey = JOURNEY_TYPES[email.journey_type.toUpperCase()];
          if (journey) {
            await this.scheduleNextStep(email.journey_id, journey, email.step_index + 1,
              JSON.parse(email.metadata || '{}'));
          }

          sent++;
        } catch (error) {
          console.error(`[UserJourneyManager] Failed to send email ${email.id}:`, error.message);

          await this.sequelize.query(`
            UPDATE journey_scheduled_emails
            SET status = 'failed', error_message = ?
            WHERE id = ?
          `, { replacements: [error.message, email.id] });

          failed++;
        }
      }

      await logAgent('communication-flow', 'journey_emails_processed', {
        description: `Processed ${pendingEmails.length} journey emails: ${sent} sent, ${failed} failed`,
        metadata: { total: pendingEmails.length, sent, failed }
      });

      return { processed: pendingEmails.length, sent, failed };
    } catch (error) {
      await logError('communication-flow', error, { action: 'process_pending_emails' });
      throw error;
    }
  }

  async sendJourneyEmail(emailData) {
    const { default: mailerliteService } = await import('./mailerliteService.js');

    await mailerliteService.sendTransactionalEmail({
      to: emailData.email,
      subject: emailData.subject,
      templateId: emailData.template_id,
      variables: {
        first_name: emailData.first_name || 'Gast',
        last_name: emailData.last_name || '',
        language: emailData.language || 'nl',
        ...JSON.parse(emailData.metadata || '{}')
      }
    });
  }

  async completeJourney(journeyId) {
    await this.sequelize.query(`
      UPDATE user_journeys
      SET status = 'completed', completed_at = NOW(), updated_at = NOW()
      WHERE id = ?
    `, { replacements: [journeyId] });

    await logAgent('communication-flow', 'journey_completed', {
      description: `Journey ${journeyId} completed`,
      metadata: { journeyId }
    });
  }

  async cancelJourney(journeyId, reason = 'manual') {
    await this.sequelize.query(`
      UPDATE user_journeys
      SET status = 'cancelled', cancelled_reason = ?, updated_at = NOW()
      WHERE id = ?
    `, { replacements: [reason, journeyId] });

    await this.sequelize.query(`
      UPDATE journey_scheduled_emails
      SET status = 'cancelled'
      WHERE journey_id = ? AND status = 'pending'
    `, { replacements: [journeyId] });

    await logAgent('communication-flow', 'journey_cancelled', {
      description: `Journey ${journeyId} cancelled: ${reason}`,
      metadata: { journeyId, reason }
    });
  }

  getJourneyTypes() {
    return JOURNEY_TYPES;
  }

  async getUserJourneys(userId) {
    const [journeys] = await this.sequelize.query(`
      SELECT id, journey_type, status, current_step, started_at, completed_at
      FROM user_journeys
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, { replacements: [userId] });

    return journeys;
  }
}

export default new UserJourneyManager();
