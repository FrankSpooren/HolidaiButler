/**
 * ReminderService - Handles event reminder notifications
 * Sends reminders 24 hours and 2 hours before events
 */

const Queue = require('bull');
const { Booking, Ticket } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Redis connection for Bull queue
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create reminder queues
const reminderQueue = new Queue('event-reminders', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

class ReminderService {
  /**
   * Initialize the reminder service and set up job processors
   */
  static async initialize() {
    // Process reminder jobs
    reminderQueue.process('send-reminder', async (job) => {
      const { bookingId, reminderType, userId, eventDate } = job.data;
      await this._processReminder(bookingId, reminderType, userId, eventDate);
    });

    // Handle failed jobs
    reminderQueue.on('failed', (job, error) => {
      logger.error(`Reminder job ${job.id} failed:`, error);
    });

    // Handle completed jobs
    reminderQueue.on('completed', (job) => {
      logger.info(`Reminder job ${job.id} completed for booking ${job.data.bookingId}`);
    });

    // Start the scheduler
    await this._startScheduler();

    logger.info('ReminderService initialized');
  }

  /**
   * Schedule reminders for a new booking
   * @param {Object} booking - The booking object
   */
  static async scheduleReminders(booking) {
    const eventDate = new Date(booking.visitDate || booking.eventDate);
    const now = new Date();

    // Calculate reminder times
    const reminder24h = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    const reminder2h = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);

    // Schedule 24-hour reminder
    if (reminder24h > now) {
      const delay24h = reminder24h.getTime() - now.getTime();
      await reminderQueue.add(
        'send-reminder',
        {
          bookingId: booking.id,
          reminderType: '24h',
          userId: booking.userId,
          eventDate: eventDate.toISOString(),
        },
        {
          delay: delay24h,
          jobId: `reminder-24h-${booking.id}`,
        }
      );
      logger.info(`Scheduled 24h reminder for booking ${booking.id} at ${reminder24h.toISOString()}`);
    }

    // Schedule 2-hour reminder
    if (reminder2h > now) {
      const delay2h = reminder2h.getTime() - now.getTime();
      await reminderQueue.add(
        'send-reminder',
        {
          bookingId: booking.id,
          reminderType: '2h',
          userId: booking.userId,
          eventDate: eventDate.toISOString(),
        },
        {
          delay: delay2h,
          jobId: `reminder-2h-${booking.id}`,
        }
      );
      logger.info(`Scheduled 2h reminder for booking ${booking.id} at ${reminder2h.toISOString()}`);
    }

    // Update booking with reminder status
    await Booking.update(
      {
        reminderScheduled: true,
        reminder24hScheduledFor: reminder24h > now ? reminder24h : null,
        reminder2hScheduledFor: reminder2h > now ? reminder2h : null,
      },
      { where: { id: booking.id } }
    );
  }

  /**
   * Cancel reminders for a booking (e.g., when cancelled)
   * @param {string} bookingId - The booking ID
   */
  static async cancelReminders(bookingId) {
    try {
      // Remove scheduled jobs
      const job24h = await reminderQueue.getJob(`reminder-24h-${bookingId}`);
      const job2h = await reminderQueue.getJob(`reminder-2h-${bookingId}`);

      if (job24h) {
        await job24h.remove();
        logger.info(`Cancelled 24h reminder for booking ${bookingId}`);
      }

      if (job2h) {
        await job2h.remove();
        logger.info(`Cancelled 2h reminder for booking ${bookingId}`);
      }

      // Update booking
      await Booking.update(
        {
          reminderScheduled: false,
          reminder24hScheduledFor: null,
          reminder2hScheduledFor: null,
        },
        { where: { id: bookingId } }
      );
    } catch (error) {
      logger.error(`Failed to cancel reminders for booking ${bookingId}:`, error);
    }
  }

  /**
   * Process a reminder job
   * @param {string} bookingId - The booking ID
   * @param {string} reminderType - '24h' or '2h'
   * @param {string} userId - The user ID
   * @param {string} eventDate - The event date
   */
  static async _processReminder(bookingId, reminderType, userId, eventDate) {
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Ticket, as: 'tickets' }],
    });

    if (!booking) {
      logger.warn(`Booking ${bookingId} not found for reminder`);
      return;
    }

    // Check if booking is still valid
    if (booking.status === 'cancelled') {
      logger.info(`Skipping reminder for cancelled booking ${bookingId}`);
      return;
    }

    // Send reminder via different channels
    await Promise.all([
      this._sendEmailReminder(booking, reminderType),
      this._sendPushReminder(booking, reminderType, userId),
    ]);

    // Update reminder status
    const updateField = reminderType === '24h' ? 'reminder24hSentAt' : 'reminder2hSentAt';
    await Booking.update(
      { [updateField]: new Date() },
      { where: { id: bookingId } }
    );
  }

  /**
   * Send email reminder
   * @param {Object} booking - The booking object
   * @param {string} reminderType - '24h' or '2h'
   */
  static async _sendEmailReminder(booking, reminderType) {
    const MailerLite = require('@mailerlite/mailerlite-nodejs').default;

    if (!process.env.MAILERLITE_API_KEY) {
      logger.warn('MailerLite API key not configured, skipping email reminder');
      return;
    }

    const mailer = new MailerLite({ api_key: process.env.MAILERLITE_API_KEY });
    const eventDate = new Date(booking.visitDate || booking.eventDate);

    const timeMessage = reminderType === '24h'
      ? 'morgen'
      : 'over 2 uur';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f5f5f5; }
          .event-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #1976d2; }
          .tickets { margin-top: 20px; }
          .ticket { background: white; padding: 10px 15px; margin: 5px 0; border-radius: 4px; }
          .cta { text-align: center; margin: 20px 0; }
          .cta a { background: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Herinnering: Je bezoek is ${timeMessage}!</h1>
          </div>
          <div class="content">
            <p>Hallo ${booking.customerFirstName || 'daar'},</p>
            <p>Dit is een vriendelijke herinnering dat je bezoek ${timeMessage} plaatsvindt.</p>

            <div class="event-box">
              <h2>${booking.productName || 'Evenement'}</h2>
              <p>📅 <strong>Datum:</strong> ${eventDate.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>🕐 <strong>Tijd:</strong> ${eventDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</p>
              ${booking.poiAddress ? `<p>📍 <strong>Locatie:</strong> ${booking.poiAddress}</p>` : ''}
            </div>

            <div class="tickets">
              <h3>Je tickets (${booking.tickets?.length || booking.quantity}x)</h3>
              ${booking.tickets?.map(t => `
                <div class="ticket">
                  <strong>${t.productName || 'Ticket'}</strong><br>
                  Ticket nummer: ${t.ticketNumber}
                </div>
              `).join('') || ''}
            </div>

            <div class="cta">
              <a href="${process.env.FRONTEND_URL || 'https://holidaibutler.com'}/booking/${booking.id}">Bekijk je boeking</a>
            </div>

            <h3>📝 Vergeet niet:</h3>
            <ul>
              <li>Neem je tickets mee (digitaal of geprint)</li>
              <li>Kom op tijd aan</li>
              <li>Controleer de toegangsvereisten</li>
            </ul>
          </div>
          <div class="footer">
            <p>HolidaiButler - Jouw vakantiepartner</p>
            <p>Boekingreferentie: ${booking.reference}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await mailer.emails.send({
        from: {
          email: 'reminders@holidaibutler.com',
          name: 'HolidaiButler',
        },
        to: [{ email: booking.customerEmail }],
        subject: `⏰ Herinnering: Je bezoek aan ${booking.productName || 'evenement'} is ${timeMessage}!`,
        html: htmlContent,
      });

      logger.info(`${reminderType} email reminder sent for booking ${booking.id}`);
    } catch (error) {
      logger.error(`Failed to send ${reminderType} email reminder:`, error);
      throw error;
    }
  }

  /**
   * Send push notification reminder
   * @param {Object} booking - The booking object
   * @param {string} reminderType - '24h' or '2h'
   * @param {string} userId - The user ID
   */
  static async _sendPushReminder(booking, reminderType, userId) {
    // Import NotificationService dynamically to avoid circular dependency
    const NotificationService = require('./NotificationService');

    const timeMessage = reminderType === '24h'
      ? 'morgen'
      : 'over 2 uur';

    try {
      await NotificationService.sendToUser(userId, {
        title: `🎫 Herinnering: Bezoek ${timeMessage}!`,
        body: `Je bezoek aan ${booking.productName || 'het evenement'} is ${timeMessage}. Vergeet je tickets niet!`,
        data: {
          type: 'event_reminder',
          reminderType,
          bookingId: booking.id,
          eventDate: booking.visitDate || booking.eventDate,
        },
        clickAction: `/booking/${booking.id}`,
      });

      logger.info(`${reminderType} push reminder sent for booking ${booking.id}`);
    } catch (error) {
      logger.error(`Failed to send ${reminderType} push reminder:`, error);
      // Don't throw - push notification failure shouldn't fail the job
    }
  }

  /**
   * Start the scheduler to check for upcoming events and schedule reminders
   */
  static async _startScheduler() {
    // Run scheduler every hour to catch any missed reminders
    setInterval(async () => {
      await this._checkUpcomingEvents();
    }, 60 * 60 * 1000);

    // Also run immediately on startup
    await this._checkUpcomingEvents();
  }

  /**
   * Check for upcoming events without scheduled reminders
   */
  static async _checkUpcomingEvents() {
    try {
      const now = new Date();
      const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Find confirmed bookings with events in the next 48 hours without reminders
      const bookings = await Booking.findAll({
        where: {
          status: 'confirmed',
          reminderScheduled: { [Op.or]: [false, null] },
          [Op.or]: [
            { visitDate: { [Op.between]: [now, next48h] } },
            { eventDate: { [Op.between]: [now, next48h] } },
          ],
        },
      });

      for (const booking of bookings) {
        await this.scheduleReminders(booking);
      }

      if (bookings.length > 0) {
        logger.info(`Scheduled reminders for ${bookings.length} upcoming bookings`);
      }
    } catch (error) {
      logger.error('Error checking upcoming events:', error);
    }
  }

  /**
   * Get queue stats
   */
  static async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      reminderQueue.getWaitingCount(),
      reminderQueue.getActiveCount(),
      reminderQueue.getCompletedCount(),
      reminderQueue.getFailedCount(),
      reminderQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  /**
   * Graceful shutdown
   */
  static async shutdown() {
    await reminderQueue.close();
    logger.info('ReminderService shut down');
  }
}

module.exports = ReminderService;
