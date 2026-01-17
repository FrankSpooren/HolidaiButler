/**
 * Owner Interface Agent (Stub)
 * Handles communication with the project owner
 *
 * @module agents/ownerInterfaceAgent
 * @version 1.0.0
 *
 * Note: This is a minimal stub for the Health Monitor integration.
 * The full Owner Interface Agent implementation should be imported from the existing codebase.
 */

import axios from 'axios';

class OwnerInterfaceAgent {
  constructor() {
    this.name = 'Owner Interface Agent';
    this.version = '1.0.0';
  }

  /**
   * Send notification to owner based on urgency level
   * @param {Object} notification - Notification details
   * @param {string} notification.subject - Email subject/title
   * @param {string} notification.message - Notification message
   * @param {number} notification.urgency - Urgency level (1-5)
   * @param {string} notification.category - Category of notification
   * @param {Object} notification.metadata - Additional metadata
   * @returns {Promise<Object>} Notification result
   */
  async sendNotification(notification) {
    const { subject, message, urgency, category, metadata } = notification;
    const channels = [];

    console.log(`[OwnerInterfaceAgent] Sending notification: ${subject} (urgency: ${urgency})`);

    try {
      // Urgency 1-2: Dashboard only (logged)
      if (urgency <= 2) {
        console.log(`[OwnerInterfaceAgent] Low urgency notification logged`);
        channels.push('dashboard');
      }

      // Urgency 3: Email + Dashboard
      if (urgency >= 3) {
        await this.sendEmail(subject, message);
        channels.push('email');
      }

      // Urgency 4-5: Email + SMS/Threema
      if (urgency >= 4) {
        await this.sendThreema(subject, message);
        channels.push('threema');
      }

      return {
        success: true,
        channels,
        urgency,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[OwnerInterfaceAgent] Notification failed:', error.message);
      return {
        success: false,
        error: error.message,
        channels,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send email notification via MailerLite
   * @param {string} subject - Email subject
   * @param {string} message - Email body
   * @returns {Promise<Object>} Email result
   */
  async sendEmail(subject, message) {
    try {
      const apiKey = process.env.MAILERLITE_API_KEY;

      if (!apiKey) {
        console.warn('[OwnerInterfaceAgent] MAILERLITE_API_KEY not configured');
        return { success: false, error: 'API key not configured' };
      }

      // Send via MailerLite API
      const response = await axios.post(
        'https://connect.mailerlite.com/api/subscribers/info@holidaibutler.com/emails',
        {
          subject: `[HolidaiButler] ${subject}`,
          html: `<pre>${message}</pre>`
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, response: response.status };
    } catch (error) {
      console.error('[OwnerInterfaceAgent] Email failed:', error.message);
      // Graceful fallback - don't throw
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Threema message for critical alerts
   * @param {string} subject - Message subject
   * @param {string} message - Message body
   * @returns {Promise<Object>} Threema result
   */
  async sendThreema(subject, message) {
    try {
      const gatewayId = process.env.THREEMA_GATEWAY_ID;
      const secret = process.env.THREEMA_SECRET;
      const recipientId = process.env.OWNER_THREEMA_ID;

      if (!gatewayId || !secret || !recipientId) {
        console.warn('[OwnerInterfaceAgent] Threema not fully configured');
        return { success: false, error: 'Threema not configured' };
      }

      const fullMessage = `${subject}\n\n${message}`;

      const response = await axios.post(
        'https://msgapi.threema.ch/send_simple',
        new URLSearchParams({
          from: gatewayId,
          to: recipientId,
          secret: secret,
          text: fullMessage.substring(0, 3500) // Threema limit
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return { success: true, messageId: response.data };
    } catch (error) {
      console.error('[OwnerInterfaceAgent] Threema failed:', error.message);
      // Graceful fallback - don't throw
      return { success: false, error: error.message };
    }
  }
}

export default new OwnerInterfaceAgent();
