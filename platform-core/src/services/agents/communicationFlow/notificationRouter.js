/**
 * Notification Router for Communication Flow Agent
 * Intelligent routing of notifications to appropriate channels
 */

import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import { sendAlert, criticalAlert } from '../../orchestrator/ownerInterface/index.js';

/**
 * Notification types and their default routing
 */
const NOTIFICATION_TYPES = {
  // User notifications
  BOOKING_CONFIRMED: { channel: 'email', template: 'booking_confirmed', urgency: 2 },
  BOOKING_CANCELLED: { channel: 'email', template: 'booking_cancelled', urgency: 3 },
  PAYMENT_RECEIVED: { channel: 'email', template: 'payment_received', urgency: 2 },
  PAYMENT_FAILED: { channel: 'email', template: 'payment_failed', urgency: 4 },
  REVIEW_REQUEST: { channel: 'email', template: 'review_request', urgency: 1 },

  // System notifications (to owner)
  DAILY_BRIEFING: { channel: 'email', template: 'daily_briefing', urgency: 1 },
  BUDGET_WARNING: { channel: 'email', template: 'budget_warning', urgency: 3 },
  BUDGET_CRITICAL: { channel: 'both', template: 'budget_critical', urgency: 5 },
  SYSTEM_ERROR: { channel: 'both', template: 'system_error', urgency: 5 },
  HEALTH_ALERT: { channel: 'email', template: 'health_alert', urgency: 4 },

  // Partner notifications
  NEW_BOOKING: { channel: 'email', template: 'partner_new_booking', urgency: 2 },
  BOOKING_REMINDER: { channel: 'email', template: 'partner_reminder', urgency: 2 }
};

class NotificationRouter {
  constructor() {
    this.mailerliteService = null;
  }

  initialize() {
    // Lazy load to avoid circular dependencies
  }

  async getMailerliteService() {
    if (!this.mailerliteService) {
      const { default: service } = await import('./mailerliteService.js');
      this.mailerliteService = service;
    }
    return this.mailerliteService;
  }

  async route(notificationType, recipient, data) {
    const config = NOTIFICATION_TYPES[notificationType];

    if (!config) {
      console.warn(`[NotificationRouter] Unknown notification type: ${notificationType}`);
      return { success: false, reason: 'unknown_type' };
    }

    console.log(`[NotificationRouter] Routing ${notificationType} to ${recipient.email || 'owner'}`);

    try {
      const result = {
        type: notificationType,
        channel: config.channel,
        urgency: config.urgency,
        timestamp: new Date().toISOString()
      };

      switch (config.channel) {
        case 'email':
          result.emailResult = await this.sendEmail(recipient, config, data);
          break;

        case 'threema':
          result.threemaResult = await this.sendThreema(data);
          break;

        case 'both':
          result.emailResult = await this.sendEmail(recipient, config, data);
          result.threemaResult = await this.sendThreema(data);
          break;

        default:
          throw new Error(`Unknown channel: ${config.channel}`);
      }

      await logAgent('communication-flow', 'notification_routed', {
        description: `Routed ${notificationType} via ${config.channel}`,
        metadata: { type: notificationType, channel: config.channel, urgency: config.urgency }
      });

      return { success: true, ...result };
    } catch (error) {
      await logError('communication-flow', error, {
        action: 'route_notification',
        type: notificationType
      });
      return { success: false, error: error.message };
    }
  }

  async sendEmail(recipient, config, data) {
    const mailerliteService = await this.getMailerliteService();

    // For system notifications, use the owner alert system
    if (config.urgency >= 4 && !recipient.email) {
      return sendAlert({
        urgency: config.urgency,
        title: data.subject || config.template,
        message: data.message || '',
        metadata: data
      });
    }

    // For user/partner emails, use MailerLite
    if (recipient.email) {
      await mailerliteService.upsertSubscriber(recipient.email, {
        name: recipient.name || '',
        ...data.fields
      });

      // Trigger group-based automation if needed
      if (data.triggerGroup) {
        const subscriber = await mailerliteService.getSubscriber(recipient.email);
        await mailerliteService.addToGroup(subscriber.id, data.triggerGroup);
      }
    }

    return { sent: true, template: config.template };
  }

  async sendThreema(data) {
    return criticalAlert(data.type || 'system_alert', data.message || '');
  }

  getNotificationTypes() {
    return NOTIFICATION_TYPES;
  }

  async batchSend(notifications) {
    console.log(`[NotificationRouter] Batch sending ${notifications.length} notifications`);

    const results = {
      total: notifications.length,
      success: 0,
      failed: 0,
      details: []
    };

    for (const notification of notifications) {
      try {
        const result = await this.route(
          notification.type,
          notification.recipient,
          notification.data
        );

        if (result.success) {
          results.success++;
        } else {
          results.failed++;
        }

        results.details.push(result);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        results.failed++;
        results.details.push({ success: false, error: error.message });
      }
    }

    await logAgent('communication-flow', 'batch_notifications_sent', {
      description: `Batch sent ${results.success}/${results.total} notifications`,
      metadata: results
    });

    return results;
  }
}

export default new NotificationRouter();
