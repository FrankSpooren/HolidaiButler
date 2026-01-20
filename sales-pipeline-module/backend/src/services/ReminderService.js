/**
 * Reminder Service
 * Automated reminders via email and WhatsApp
 */

import { Op } from 'sequelize';
import { Task, Deal, Activity, User } from '../models/index.js';
import { whatsappService } from '../config/whatsapp.js';
import NotificationService from './NotificationService.js';
import logger from '../utils/logger.js';

class ReminderService {
  /**
   * Process due task reminders
   */
  async processTaskReminders() {
    try {
      const now = new Date();
      const tasks = await Task.findAll({
        where: {
          status: { [Op.in]: ['not_started', 'in_progress'] },
          dueDate: { [Op.lte]: new Date(now.getTime() + 24 * 60 * 60 * 1000) }, // Due within 24h
          reminderSentAt: { [Op.or]: [{ [Op.eq]: null }, { [Op.lt]: new Date(now.getTime() - 12 * 60 * 60 * 1000) }] }
        },
        include: [
          { model: User, as: 'assignee' },
          { model: Deal, as: 'deal' },
          { model: Activity, as: 'activity' }
        ]
      });

      logger.info(`Processing ${tasks.length} task reminders`);

      for (const task of tasks) {
        await this.sendTaskReminder(task);
      }

      return { processed: tasks.length };
    } catch (error) {
      logger.error('Process task reminders error:', error);
      throw error;
    }
  }

  /**
   * Send task reminder
   */
  async sendTaskReminder(task) {
    try {
      const user = task.assignee;
      if (!user) return;

      const preferences = user.notificationPreferences || {};
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const hoursUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60));

      let urgency = 'normal';
      if (hoursUntilDue < 0) urgency = 'overdue';
      else if (hoursUntilDue < 2) urgency = 'urgent';
      else if (hoursUntilDue < 6) urgency = 'high';

      const title = urgency === 'overdue'
        ? `Overdue Task: ${task.title}`
        : `Task Due Soon: ${task.title}`;

      const message = urgency === 'overdue'
        ? `Your task "${task.title}" is overdue! Please complete it as soon as possible.`
        : `Your task "${task.title}" is due in ${hoursUntilDue} hour${hoursUntilDue !== 1 ? 's' : ''}.`;

      // In-app notification
      await NotificationService.notify(user.id, {
        type: urgency === 'overdue' ? 'task_overdue' : 'task_due',
        title,
        message,
        taskId: task.id,
        dealId: task.dealId,
        accountId: task.accountId,
        priority: urgency === 'overdue' || urgency === 'urgent' ? 'urgent' : 'high',
        sendEmail: preferences.email?.taskReminders !== false,
        sendWhatsApp: urgency === 'overdue' || (urgency === 'urgent' && preferences.whatsapp?.taskReminders)
      });

      // WhatsApp reminder for urgent/overdue tasks
      if (user.whatsappNumber && (urgency === 'overdue' || urgency === 'urgent')) {
        if (preferences.whatsapp?.taskReminders !== false) {
          await whatsappService.sendTaskReminder(
            user.whatsappNumber,
            `${user.firstName}`,
            task.title,
            this.formatDateTime(dueDate)
          );
        }
      }

      // Update reminder sent timestamp
      await Task.update(
        { reminderSentAt: new Date() },
        { where: { id: task.id } }
      );

      logger.info(`Task reminder sent for task ${task.id} to user ${user.id}`);
    } catch (error) {
      logger.error(`Task reminder error for task ${task.id}:`, error);
    }
  }

  /**
   * Process follow-up reminders
   */
  async processFollowUpReminders() {
    try {
      const now = new Date();
      const deals = await Deal.findAll({
        where: {
          status: 'open',
          nextStepDate: {
            [Op.lte]: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            [Op.gte]: new Date(now.getTime() - 24 * 60 * 60 * 1000)
          }
        },
        include: [
          { model: User, as: 'owner' },
          {
            model: (await import('../models/index.js')).Account,
            as: 'account'
          }
        ]
      });

      logger.info(`Processing ${deals.length} follow-up reminders`);

      for (const deal of deals) {
        await this.sendFollowUpReminder(deal);
      }

      return { processed: deals.length };
    } catch (error) {
      logger.error('Process follow-up reminders error:', error);
      throw error;
    }
  }

  /**
   * Send follow-up reminder
   */
  async sendFollowUpReminder(deal) {
    try {
      const user = deal.owner;
      if (!user) return;

      const preferences = user.notificationPreferences || {};

      const title = `Follow-up: ${deal.name}`;
      const message = `Time to follow up on deal "${deal.name}"${deal.nextStep ? `: ${deal.nextStep}` : ''}`;

      // In-app notification
      await NotificationService.notify(user.id, {
        type: 'follow_up',
        title,
        message,
        dealId: deal.id,
        accountId: deal.accountId,
        priority: 'high'
      });

      // WhatsApp reminder
      if (user.whatsappNumber && preferences.whatsapp?.dealUpdates !== false) {
        await whatsappService.sendFollowUpReminder(
          user.whatsappNumber,
          deal.account?.name || deal.name,
          deal.name,
          this.formatDateTime(deal.nextStepDate)
        );
      }

      logger.info(`Follow-up reminder sent for deal ${deal.id}`);
    } catch (error) {
      logger.error(`Follow-up reminder error for deal ${deal.id}:`, error);
    }
  }

  /**
   * Process stale deal alerts
   */
  async processStaleDealAlerts() {
    try {
      const now = new Date();
      const staleDays = parseInt(process.env.STALE_DEAL_DAYS) || 14;
      const staleThreshold = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);

      const staleDeals = await Deal.findAll({
        where: {
          status: 'open',
          stageEnteredAt: { [Op.lt]: staleThreshold },
          lastActivityAt: { [Op.or]: [{ [Op.eq]: null }, { [Op.lt]: staleThreshold }] }
        },
        include: [
          { model: User, as: 'owner' },
          {
            model: (await import('../models/index.js')).Account,
            as: 'account'
          }
        ]
      });

      logger.info(`Found ${staleDeals.length} stale deals`);

      // Group by owner
      const byOwner = {};
      staleDeals.forEach(deal => {
        if (!deal.ownerId) return;
        if (!byOwner[deal.ownerId]) byOwner[deal.ownerId] = [];
        byOwner[deal.ownerId].push(deal);
      });

      for (const [ownerId, deals] of Object.entries(byOwner)) {
        await this.sendStaleDealAlert(ownerId, deals);
      }

      return { processed: staleDeals.length };
    } catch (error) {
      logger.error('Process stale deal alerts error:', error);
      throw error;
    }
  }

  /**
   * Send stale deal alert
   */
  async sendStaleDealAlert(userId, deals) {
    try {
      const title = deals.length === 1
        ? `Stale Deal: ${deals[0].name}`
        : `${deals.length} Deals Need Attention`;

      const message = deals.length === 1
        ? `Deal "${deals[0].name}" has had no activity for ${this.getDaysStale(deals[0])} days`
        : `You have ${deals.length} deals that haven't been updated recently`;

      await NotificationService.notify(userId, {
        type: 'deal_stale',
        title,
        message,
        dealId: deals.length === 1 ? deals[0].id : null,
        priority: 'high',
        metadata: {
          dealIds: deals.map(d => d.id),
          dealNames: deals.map(d => d.name)
        }
      });

      logger.info(`Stale deal alert sent to user ${userId} for ${deals.length} deals`);
    } catch (error) {
      logger.error(`Stale deal alert error for user ${userId}:`, error);
    }
  }

  /**
   * Process meeting reminders
   */
  async processMeetingReminders() {
    try {
      const now = new Date();
      const activities = await Activity.findAll({
        where: {
          type: 'meeting',
          status: 'scheduled',
          startTime: {
            [Op.gte]: now,
            [Op.lte]: new Date(now.getTime() + 60 * 60 * 1000) // Within 1 hour
          },
          reminderSent: false
        },
        include: [
          { model: User, as: 'user' },
          { model: User, as: 'assignee' },
          {
            model: (await import('../models/index.js')).Contact,
            as: 'contact'
          }
        ]
      });

      logger.info(`Processing ${activities.length} meeting reminders`);

      for (const meeting of activities) {
        await this.sendMeetingReminder(meeting);
      }

      return { processed: activities.length };
    } catch (error) {
      logger.error('Process meeting reminders error:', error);
      throw error;
    }
  }

  /**
   * Send meeting reminder
   */
  async sendMeetingReminder(meeting) {
    try {
      const user = meeting.user || meeting.assignee;
      if (!user) return;

      const preferences = user.notificationPreferences || {};
      const minutesUntil = Math.floor((new Date(meeting.startTime) - new Date()) / (1000 * 60));

      const title = `Meeting in ${minutesUntil} minutes`;
      const message = `"${meeting.subject}" starts at ${this.formatTime(meeting.startTime)}`;

      // In-app notification
      await NotificationService.notify(user.id, {
        type: 'meeting_reminder',
        title,
        message,
        activityId: meeting.id,
        dealId: meeting.dealId,
        priority: 'urgent'
      });

      // WhatsApp reminder
      if (user.whatsappNumber && preferences.whatsapp?.urgentAlerts !== false) {
        await whatsappService.sendMeetingReminder(
          user.whatsappNumber,
          meeting.contact?.firstName || user.firstName,
          meeting.subject,
          this.formatDateTime(meeting.startTime),
          meeting.meetingLink || ''
        );
      }

      // Mark reminder as sent
      await Activity.update(
        { reminderSent: true },
        { where: { id: meeting.id } }
      );

      logger.info(`Meeting reminder sent for activity ${meeting.id}`);
    } catch (error) {
      logger.error(`Meeting reminder error for activity ${meeting.id}:`, error);
    }
  }

  /**
   * Schedule custom reminder
   */
  async scheduleReminder(data) {
    try {
      const { userId, title, message, remindAt, channels, entityType, entityId } = data;

      // Store in cache for scheduled processing
      const reminderId = `reminder:${Date.now()}:${userId}`;
      const reminder = {
        id: reminderId,
        userId,
        title,
        message,
        remindAt: new Date(remindAt),
        channels: channels || { inApp: true },
        entityType,
        entityId,
        createdAt: new Date()
      };

      // In production, use a job queue like Bull
      // For now, we'll check in the cron job
      const { cacheService } = await import('../config/redis.js');
      await cacheService.set(reminderId, reminder, Math.floor((new Date(remindAt) - new Date()) / 1000) + 3600);

      return reminder;
    } catch (error) {
      logger.error('Schedule reminder error:', error);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDaysStale(deal) {
    const lastActivity = deal.lastActivityAt || deal.stageEnteredAt || deal.createdAt;
    return Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  }
}

export default new ReminderService();
