/**
 * Notification Service
 * Multi-channel notifications: In-app, Email, WhatsApp
 */

import { Notification, User, Task, Deal } from '../models/index.js';
import { whatsappService } from '../config/whatsapp.js';
import { cacheService, cacheKeys, pubsub } from '../config/redis.js';
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

class NotificationService {
  /**
   * Send notification through all enabled channels
   */
  async notify(userId, data) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn(`Notification target user not found: ${userId}`);
        return null;
      }

      const preferences = user.notificationPreferences || {};

      // Create in-app notification
      const notification = await this.createInAppNotification(userId, data);

      // Send email if enabled
      if (this.shouldSendEmail(data.type, preferences)) {
        await this.sendEmail(user, data);
        await notification.update({ emailSent: true, emailSentAt: new Date() });
      }

      // Send WhatsApp if enabled and urgent
      if (this.shouldSendWhatsApp(data.type, preferences) && user.whatsappNumber) {
        await this.sendWhatsApp(user, data);
        await notification.update({ whatsappSent: true, whatsappSentAt: new Date() });
      }

      // Publish real-time event
      await pubsub.publish(`notifications:${userId}`, {
        type: 'new_notification',
        notification: notification.toPublicJSON()
      });

      return notification;
    } catch (error) {
      logger.error('Notification error:', error);
      return null;
    }
  }

  /**
   * Create in-app notification
   */
  async createInAppNotification(userId, data) {
    const notification = await Notification.create({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'normal',
      actionUrl: data.actionUrl || this.generateActionUrl(data),
      actionLabel: data.actionLabel,
      accountId: data.accountId,
      contactId: data.contactId,
      dealId: data.dealId,
      leadId: data.leadId,
      taskId: data.taskId,
      activityId: data.activityId,
      fromUserId: data.fromUserId,
      channels: {
        inApp: true,
        email: data.sendEmail || false,
        whatsapp: data.sendWhatsApp || false
      },
      metadata: data.metadata
    });

    // Update unread count in cache
    await this.incrementUnreadCount(userId);

    return notification;
  }

  /**
   * Send email notification
   */
  async sendEmail(user, data) {
    try {
      const html = this.generateEmailHtml(data);

      await emailTransporter.sendMail({
        from: `"HolidaiButler CRM" <${process.env.SMTP_FROM || 'noreply@holidaibutler.com'}>`,
        to: user.email,
        subject: data.title,
        html
      });

      logger.info(`Email notification sent to ${user.email}`);
    } catch (error) {
      logger.error('Email notification error:', error);
    }
  }

  /**
   * Send WhatsApp notification
   */
  async sendWhatsApp(user, data) {
    try {
      const templateName = this.getWhatsAppTemplate(data.type);

      if (templateName) {
        await whatsappService.sendTemplateMessage(
          user.whatsappNumber,
          templateName,
          user.language || 'en',
          this.getWhatsAppComponents(data)
        );
      } else {
        await whatsappService.sendTextMessage(
          user.whatsappNumber,
          `${data.title}\n\n${data.message}`
        );
      }

      logger.info(`WhatsApp notification sent to ${user.whatsappNumber}`);
    } catch (error) {
      logger.error('WhatsApp notification error:', error);
    }
  }

  /**
   * Get notifications for user
   */
  async getNotifications(userId, options = {}) {
    const {
      unreadOnly = false,
      type,
      page = 1,
      limit = 20
    } = options;

    const where = { userId };

    if (unreadOnly) {
      where.isRead = false;
    }

    if (type) {
      where.type = type;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'firstName', 'lastName', 'avatar'] }
      ]
    });

    return {
      notifications: rows,
      total: count,
      unreadCount: await this.getUnreadCount(userId),
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!notification.isRead) {
      await notification.update({
        isRead: true,
        readAt: new Date()
      });

      await this.decrementUnreadCount(userId);
    }

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId, isRead: false } }
    );

    await cacheService.set(cacheKeys.notifications(userId), 0, 86400);

    return { success: true };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    const cached = await cacheService.get(cacheKeys.notifications(userId));
    if (cached !== null) {
      return cached;
    }

    const count = await Notification.count({
      where: { userId, isRead: false }
    });

    await cacheService.set(cacheKeys.notifications(userId), count, 86400);

    return count;
  }

  /**
   * Send task reminder
   */
  async sendTaskReminder(task) {
    try {
      const user = await User.findByPk(task.assignedTo);
      if (!user) return;

      await this.notify(user.id, {
        type: 'task_due',
        title: 'Task Reminder',
        message: `Task "${task.title}" is due ${task.dueDate ? 'soon' : 'now'}`,
        taskId: task.id,
        dealId: task.dealId,
        accountId: task.accountId,
        priority: task.priority === 'urgent' ? 'urgent' : 'high',
        sendEmail: true,
        sendWhatsApp: task.priority === 'urgent'
      });

      // Mark reminder as sent
      await Task.update(
        { reminderSentAt: new Date() },
        { where: { id: task.id } }
      );
    } catch (error) {
      logger.error('Task reminder error:', error);
    }
  }

  /**
   * Send deal stage change notification
   */
  async notifyDealStageChange(deal, oldStage, newStage, changedBy) {
    if (deal.ownerId === changedBy) return;

    await this.notify(deal.ownerId, {
      type: 'deal_stage_change',
      title: 'Deal Stage Updated',
      message: `Deal "${deal.name}" moved from "${oldStage}" to "${newStage}"`,
      dealId: deal.id,
      accountId: deal.accountId,
      fromUserId: changedBy
    });
  }

  /**
   * Send mention notification
   */
  async notifyMention(mentionedUserId, mentionedByUserId, entityType, entityId, comment) {
    const mentionedBy = await User.findByPk(mentionedByUserId);

    await this.notify(mentionedUserId, {
      type: 'mention',
      title: 'You were mentioned',
      message: `${mentionedBy?.firstName || 'Someone'} mentioned you in a ${entityType}`,
      [`${entityType}Id`]: entityId,
      fromUserId: mentionedByUserId,
      metadata: { comment }
    });
  }

  /**
   * Send quota alert
   */
  async sendQuotaAlert(userId, current, target, percentage) {
    const alertType = percentage >= 100 ? 'achieved' :
                      percentage >= 80 ? 'approaching' :
                      percentage < 50 ? 'behind' : null;

    if (!alertType) return;

    await this.notify(userId, {
      type: 'quota_alert',
      title: alertType === 'achieved' ? 'Quota Achieved!' :
             alertType === 'approaching' ? 'Quota Almost There!' :
             'Quota Alert',
      message: `Your sales quota is at ${percentage.toFixed(1)}% (${current} / ${target})`,
      priority: alertType === 'behind' ? 'high' : 'normal',
      sendEmail: true
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  shouldSendEmail(type, preferences) {
    const emailPrefs = preferences.email || {};

    switch (type) {
      case 'deal_assigned':
      case 'deal_stage_change':
      case 'deal_won':
      case 'deal_lost':
        return emailPrefs.dealUpdates !== false;
      case 'task_due':
      case 'task_assigned':
      case 'task_overdue':
        return emailPrefs.taskReminders !== false;
      case 'mention':
        return emailPrefs.mentions !== false;
      default:
        return true;
    }
  }

  shouldSendWhatsApp(type, preferences) {
    const whatsappPrefs = preferences.whatsapp || {};

    switch (type) {
      case 'deal_stage_change':
      case 'deal_won':
        return whatsappPrefs.dealUpdates === true;
      case 'task_due':
      case 'task_overdue':
        return whatsappPrefs.taskReminders !== false;
      default:
        return whatsappPrefs.urgentAlerts === true;
    }
  }

  generateActionUrl(data) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5175';

    if (data.dealId) return `${baseUrl}/deals/${data.dealId}`;
    if (data.leadId) return `${baseUrl}/leads/${data.leadId}`;
    if (data.taskId) return `${baseUrl}/tasks/${data.taskId}`;
    if (data.accountId) return `${baseUrl}/accounts/${data.accountId}`;
    if (data.contactId) return `${baseUrl}/contacts/${data.contactId}`;

    return baseUrl;
  }

  generateEmailHtml(data) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">${data.title}</h1>
            </div>
            <div class="content">
              <p>${data.message}</p>
              ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">${data.actionLabel || 'View Details'}</a>` : ''}
            </div>
            <div class="footer">
              <p>HolidaiButler CRM - Sent automatically, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  getWhatsAppTemplate(type) {
    const templates = {
      'task_due': 'task_reminder',
      'task_overdue': 'task_reminder',
      'deal_stage_change': 'deal_stage_update',
      'meeting_reminder': 'meeting_reminder'
    };
    return templates[type];
  }

  getWhatsAppComponents(data) {
    return [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.title },
          { type: 'text', text: data.message }
        ]
      }
    ];
  }

  async incrementUnreadCount(userId) {
    const key = cacheKeys.notifications(userId);
    const current = await cacheService.get(key);
    if (current !== null) {
      await cacheService.set(key, current + 1, 86400);
    }
  }

  async decrementUnreadCount(userId) {
    const key = cacheKeys.notifications(userId);
    const current = await cacheService.get(key);
    if (current && current > 0) {
      await cacheService.set(key, current - 1, 86400);
    }
  }
}

export default new NotificationService();
