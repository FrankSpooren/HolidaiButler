/**
 * Notification Service
 * Handles email and SMS notifications for reservations
 */

const axios = require('axios');
const { getCircuitBreaker } = require('../utils/circuitBreaker');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class NotificationService {
  constructor() {
    this.mailerLiteApiKey = process.env.MAILERLITE_API_KEY;
    this.mailerLiteBaseUrl = 'https://api.mailerlite.com/api/v2';
    this.fromEmail = process.env.MAILERLITE_FROM_EMAIL || 'reservations@holidaibutler.com';
    this.fromName = process.env.MAILERLITE_FROM_NAME || 'HolidaiButler Reservations';

    // Twilio config for SMS
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Circuit breakers
    this.emailBreaker = getCircuitBreaker('mailerlite', {
      failureThreshold: 5,
      resetTimeout: 60000,
    });

    this.smsBreaker = getCircuitBreaker('twilio', {
      failureThreshold: 3,
      resetTimeout: 60000,
    });
  }

  /**
   * Send reservation confirmation email
   */
  async sendReservationConfirmation(reservation, restaurant, guest) {
    const templateData = {
      guest_name: `${guest.first_name} ${guest.last_name}`,
      restaurant_name: restaurant.name,
      reservation_date: moment(reservation.reservation_date).format('dddd, MMMM D, YYYY'),
      reservation_time: reservation.reservation_time,
      party_size: reservation.party_size,
      reference: reservation.reservation_reference,
      restaurant_address: this.formatAddress(restaurant.address),
      restaurant_phone: restaurant.contact?.phone,
      special_requests: reservation.special_requests || 'None',
      cancellation_link: `${process.env.FRONTEND_URL}/reservation/${reservation.reservation_reference}/cancel`,
      modify_link: `${process.env.FRONTEND_URL}/reservation/${reservation.reservation_reference}/modify`,
    };

    return this.sendEmail({
      to: guest.email,
      subject: `Reservation Confirmed at ${restaurant.name} - ${templateData.reservation_date}`,
      template: 'reservation_confirmation',
      data: templateData,
      type: 'confirmation',
    });
  }

  /**
   * Send reservation confirmed (after payment)
   */
  async sendReservationConfirmed(reservation, restaurant, guest) {
    const templateData = {
      guest_name: `${guest.first_name} ${guest.last_name}`,
      restaurant_name: restaurant.name,
      reservation_date: moment(reservation.reservation_date).format('dddd, MMMM D, YYYY'),
      reservation_time: reservation.reservation_time,
      party_size: reservation.party_size,
      reference: reservation.reservation_reference,
      deposit_paid: reservation.deposit_amount ? `€${reservation.deposit_amount}` : null,
    };

    return this.sendEmail({
      to: guest.email,
      subject: `Payment Confirmed - Your reservation at ${restaurant.name}`,
      template: 'payment_confirmed',
      data: templateData,
      type: 'payment_confirmation',
    });
  }

  /**
   * Send reservation reminder (24 hours before)
   */
  async sendReservationReminder(reservation, restaurant, guest) {
    const templateData = {
      guest_name: `${guest.first_name} ${guest.last_name}`,
      restaurant_name: restaurant.name,
      reservation_date: moment(reservation.reservation_date).format('dddd, MMMM D, YYYY'),
      reservation_time: reservation.reservation_time,
      party_size: reservation.party_size,
      reference: reservation.reservation_reference,
      restaurant_address: this.formatAddress(restaurant.address),
      restaurant_phone: restaurant.contact?.phone,
      cancellation_deadline: restaurant.cancellation_deadline_hours,
      map_link: this.generateMapLink(restaurant),
    };

    // Send email
    if (guest.email_notifications) {
      await this.sendEmail({
        to: guest.email,
        subject: `Reminder: Your reservation at ${restaurant.name} tomorrow`,
        template: 'reservation_reminder',
        data: templateData,
        type: 'reminder',
      });
    }

    // Send SMS
    if (guest.sms_notifications && guest.phone) {
      await this.sendSMS({
        to: guest.phone,
        message: `Reminder: Your reservation at ${restaurant.name} is tomorrow at ${reservation.reservation_time}. Party of ${reservation.party_size}. Ref: ${reservation.reservation_reference}`,
        type: 'reminder',
      });
    }

    return true;
  }

  /**
   * Send cancellation email
   */
  async sendCancellationEmail(reservation, restaurant, guest, cancelledBy) {
    const templateData = {
      guest_name: `${guest.first_name} ${guest.last_name}`,
      restaurant_name: restaurant.name,
      reservation_date: moment(reservation.reservation_date).format('dddd, MMMM D, YYYY'),
      reservation_time: reservation.reservation_time,
      reference: reservation.reservation_reference,
      cancelled_by: cancelledBy === 'guest' ? 'you' : 'the restaurant',
      refund_status: reservation.deposit_status === 'refunded' ? 'Your deposit will be refunded within 5-10 business days.' : null,
    };

    const subject = cancelledBy === 'guest'
      ? `Reservation Cancelled - ${restaurant.name}`
      : `Important: Your reservation at ${restaurant.name} has been cancelled`;

    return this.sendEmail({
      to: guest.email,
      subject,
      template: 'reservation_cancelled',
      data: templateData,
      type: 'cancellation',
    });
  }

  /**
   * Send modification confirmation
   */
  async sendModificationConfirmation(reservation, restaurant) {
    const templateData = {
      guest_name: reservation.guest_name,
      restaurant_name: restaurant.name,
      reservation_date: moment(reservation.reservation_date).format('dddd, MMMM D, YYYY'),
      reservation_time: reservation.reservation_time,
      party_size: reservation.party_size,
      reference: reservation.reservation_reference,
    };

    return this.sendEmail({
      to: reservation.guest_email,
      subject: `Reservation Updated - ${restaurant.name}`,
      template: 'reservation_modified',
      data: templateData,
      type: 'modification',
    });
  }

  /**
   * Send post-visit email (review request)
   */
  async sendPostVisitEmail(reservation, restaurant, guest) {
    const templateData = {
      guest_name: `${guest.first_name}`,
      restaurant_name: restaurant.name,
      visit_date: moment(reservation.reservation_date).format('MMMM D'),
      review_link: `${process.env.FRONTEND_URL}/review/${reservation.reservation_reference}`,
      rebook_link: `${process.env.FRONTEND_URL}/restaurant/${restaurant.id}/book`,
    };

    return this.sendEmail({
      to: guest.email,
      subject: `How was your visit to ${restaurant.name}?`,
      template: 'post_visit',
      data: templateData,
      type: 'post_visit',
    });
  }

  /**
   * Send waitlist notification (spot available)
   */
  async sendWaitlistNotification(waitlistEntry, restaurant) {
    const templateData = {
      guest_name: waitlistEntry.guest_name,
      restaurant_name: restaurant.name,
      preferred_date: moment(waitlistEntry.preferred_date).format('dddd, MMMM D'),
      booking_link: `${process.env.FRONTEND_URL}/restaurant/${restaurant.id}/book?date=${waitlistEntry.preferred_date}&time=${waitlistEntry.preferred_time_start}&party=${waitlistEntry.party_size}`,
      expires_in: '24 hours',
    };

    return this.sendEmail({
      to: waitlistEntry.guest_email,
      subject: `Good news! A table is now available at ${restaurant.name}`,
      template: 'waitlist_available',
      data: templateData,
      type: 'waitlist',
    });
  }

  /**
   * Send email via MailerLite (or fallback)
   */
  async sendEmail({ to, subject, template, data, type }) {
    try {
      // Build HTML from template
      const html = this.buildEmailHtml(template, data);

      // Use circuit breaker for email sending
      const result = await this.emailBreaker.execute(
        () => this.sendViaMailerLite({ to, subject, html }),
        () => this.logFailedEmail({ to, subject, type })
      );

      logger.info(`Email sent: ${type} to ${to}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send email (${type}) to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send via MailerLite API
   */
  async sendViaMailerLite({ to, subject, html }) {
    if (!this.mailerLiteApiKey) {
      logger.warn('MailerLite API key not configured');
      return { sent: false, reason: 'not_configured' };
    }

    const response = await axios.post(
      `${this.mailerLiteBaseUrl}/campaigns`,
      {
        type: 'regular',
        subject,
        from: this.fromEmail,
        from_name: this.fromName,
        language: 'en',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-MailerLite-ApiKey': this.mailerLiteApiKey,
        },
        timeout: 10000,
      }
    );

    return { sent: true, messageId: response.data.id };
  }

  /**
   * Log failed email for retry
   */
  logFailedEmail({ to, subject, type }) {
    logger.warn(`Email queued for retry: ${type} to ${to} - ${subject}`);
    return { sent: false, queued: true };
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS({ to, message, type }) {
    if (!this.twilioAccountSid || !this.twilioAuthToken) {
      logger.warn('Twilio not configured');
      return { sent: false, reason: 'not_configured' };
    }

    try {
      const result = await this.smsBreaker.execute(
        () => this.sendViaTwilio({ to, message }),
        () => this.logFailedSMS({ to, type })
      );

      logger.info(`SMS sent: ${type} to ${to}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send SMS (${type}) to ${to}:`, error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Send via Twilio API
   */
  async sendViaTwilio({ to, message }) {
    const client = require('twilio')(this.twilioAccountSid, this.twilioAuthToken);

    const result = await client.messages.create({
      body: message,
      from: this.twilioPhoneNumber,
      to,
    });

    return { sent: true, sid: result.sid };
  }

  /**
   * Log failed SMS for retry
   */
  logFailedSMS({ to, type }) {
    logger.warn(`SMS queued for retry: ${type} to ${to}`);
    return { sent: false, queued: true };
  }

  /**
   * Build email HTML from template
   */
  buildEmailHtml(template, data) {
    // Simple template engine - in production, use handlebars or similar
    const templates = {
      reservation_confirmation: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2d3748;">Reservation Confirmed!</h1>
          <p>Dear {{guest_name}},</p>
          <p>Your reservation at <strong>{{restaurant_name}}</strong> has been confirmed.</p>
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Date:</strong> {{reservation_date}}</p>
            <p><strong>Time:</strong> {{reservation_time}}</p>
            <p><strong>Party Size:</strong> {{party_size}} guests</p>
            <p><strong>Reference:</strong> {{reference}}</p>
          </div>
          <p><strong>Restaurant Address:</strong><br>{{restaurant_address}}</p>
          <p><strong>Phone:</strong> {{restaurant_phone}}</p>
          <p style="margin-top: 20px;">
            <a href="{{modify_link}}" style="background: #4299e1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">Modify Reservation</a>
            <a href="{{cancellation_link}}" style="color: #e53e3e; text-decoration: underline;">Cancel Reservation</a>
          </p>
          <p style="color: #718096; font-size: 14px; margin-top: 30px;">
            We look forward to seeing you!<br>
            - The HolidaiButler Team
          </p>
        </div>
      `,
      reservation_reminder: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2d3748;">Reminder: Your Reservation Tomorrow</h1>
          <p>Dear {{guest_name}},</p>
          <p>This is a friendly reminder about your upcoming reservation at <strong>{{restaurant_name}}</strong>.</p>
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Date:</strong> {{reservation_date}}</p>
            <p><strong>Time:</strong> {{reservation_time}}</p>
            <p><strong>Party Size:</strong> {{party_size}} guests</p>
            <p><strong>Reference:</strong> {{reference}}</p>
          </div>
          <p><strong>Address:</strong><br>{{restaurant_address}}</p>
          <p><a href="{{map_link}}">View on Map</a></p>
          <p style="color: #718096; font-size: 14px; margin-top: 30px;">
            See you tomorrow!<br>
            - The HolidaiButler Team
          </p>
        </div>
      `,
      reservation_cancelled: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e53e3e;">Reservation Cancelled</h1>
          <p>Dear {{guest_name}},</p>
          <p>Your reservation at <strong>{{restaurant_name}}</strong> has been cancelled by {{cancelled_by}}.</p>
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Date:</strong> {{reservation_date}}</p>
            <p><strong>Time:</strong> {{reservation_time}}</p>
            <p><strong>Reference:</strong> {{reference}}</p>
          </div>
          {{#if refund_status}}
          <p style="color: #38a169;">{{refund_status}}</p>
          {{/if}}
          <p style="color: #718096; font-size: 14px; margin-top: 30px;">
            We hope to see you again soon!<br>
            - The HolidaiButler Team
          </p>
        </div>
      `,
      post_visit: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2d3748;">How was your experience?</h1>
          <p>Dear {{guest_name}},</p>
          <p>Thank you for dining at <strong>{{restaurant_name}}</strong> on {{visit_date}}!</p>
          <p>We'd love to hear about your experience.</p>
          <p style="margin: 30px 0;">
            <a href="{{review_link}}" style="background: #48bb78; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px;">Leave a Review</a>
          </p>
          <p>Want to visit again? <a href="{{rebook_link}}">Book your next table</a></p>
          <p style="color: #718096; font-size: 14px; margin-top: 30px;">
            Thank you for choosing HolidaiButler!<br>
            - The HolidaiButler Team
          </p>
        </div>
      `,
    };

    let html = templates[template] || templates.reservation_confirmation;

    // Simple template variable replacement
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value || '');
    }

    // Handle conditionals (simple implementation)
    html = html.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, key, content) => {
      return data[key] ? content : '';
    });

    return html;
  }

  /**
   * Format address for display
   */
  formatAddress(address) {
    if (!address) return 'Address not available';

    const parts = [
      address.street,
      address.city,
      address.postal_code,
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Generate Google Maps link
   */
  generateMapLink(restaurant) {
    if (!restaurant.address) return '#';

    const address = this.formatAddress(restaurant.address);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      email: {
        provider: 'mailerlite',
        configured: !!this.mailerLiteApiKey,
        circuitBreaker: this.emailBreaker.getStatus(),
      },
      sms: {
        provider: 'twilio',
        configured: !!(this.twilioAccountSid && this.twilioAuthToken),
        circuitBreaker: this.smsBreaker.getStatus(),
      },
    };
  }
}

module.exports = new NotificationService();
