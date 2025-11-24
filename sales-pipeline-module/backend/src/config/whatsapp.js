/**
 * WhatsApp Business API Configuration
 * Direct integration with WhatsApp Cloud API
 */

import axios from 'axios';
import logger from '../utils/logger.js';

// WhatsApp Cloud API configuration
const WHATSAPP_API_VERSION = 'v18.0';
const WHATSAPP_API_BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

const config = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  appSecret: process.env.WHATSAPP_APP_SECRET
};

// Create axios instance for WhatsApp API
const whatsappClient = axios.create({
  baseURL: WHATSAPP_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${config.accessToken}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Response interceptor for error handling
whatsappClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data?.error || {};
    logger.error('WhatsApp API Error:', {
      message: errorData.message,
      code: errorData.code,
      type: errorData.type,
      fbtrace_id: errorData.fbtrace_id
    });
    throw error;
  }
);

/**
 * WhatsApp Business API Service
 */
export const whatsappService = {
  /**
   * Send a text message
   */
  async sendTextMessage(to, text, previewUrl = false) {
    try {
      const response = await whatsappClient.post(
        `/${config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhoneNumber(to),
          type: 'text',
          text: {
            preview_url: previewUrl,
            body: text
          }
        }
      );

      logger.info('WhatsApp text message sent', {
        messageId: response.data.messages[0].id,
        to
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp text message:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  },

  /**
   * Send a template message (for notifications, reminders)
   */
  async sendTemplateMessage(to, templateName, languageCode, components = []) {
    try {
      const response = await whatsappClient.post(
        `/${config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhoneNumber(to),
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components
          }
        }
      );

      logger.info('WhatsApp template message sent', {
        messageId: response.data.messages[0].id,
        template: templateName,
        to
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp template message:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  },

  /**
   * Send follow-up reminder
   */
  async sendFollowUpReminder(to, contactName, dealName, dueDate) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: contactName },
          { type: 'text', text: dealName },
          { type: 'text', text: dueDate }
        ]
      }
    ];

    return this.sendTemplateMessage(
      to,
      'follow_up_reminder',
      'en',
      components
    );
  },

  /**
   * Send task reminder
   */
  async sendTaskReminder(to, userName, taskTitle, dueTime) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: userName },
          { type: 'text', text: taskTitle },
          { type: 'text', text: dueTime }
        ]
      }
    ];

    return this.sendTemplateMessage(
      to,
      'task_reminder',
      'en',
      components
    );
  },

  /**
   * Send deal stage update
   */
  async sendDealStageUpdate(to, dealName, newStage, dealValue) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: dealName },
          { type: 'text', text: newStage },
          { type: 'text', text: dealValue }
        ]
      }
    ];

    return this.sendTemplateMessage(
      to,
      'deal_stage_update',
      'en',
      components
    );
  },

  /**
   * Send meeting reminder
   */
  async sendMeetingReminder(to, contactName, meetingTitle, meetingTime, meetingLink) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: contactName },
          { type: 'text', text: meetingTitle },
          { type: 'text', text: meetingTime }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [
          { type: 'text', text: meetingLink }
        ]
      }
    ];

    return this.sendTemplateMessage(
      to,
      'meeting_reminder',
      'en',
      components
    );
  },

  /**
   * Send interactive message with buttons
   */
  async sendInteractiveMessage(to, bodyText, buttons) {
    try {
      const response = await whatsappClient.post(
        `/${config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhoneNumber(to),
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: bodyText
            },
            action: {
              buttons: buttons.map((btn, index) => ({
                type: 'reply',
                reply: {
                  id: btn.id || `btn_${index}`,
                  title: btn.title.substring(0, 20)
                }
              }))
            }
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp interactive message:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  },

  /**
   * Send a document
   */
  async sendDocument(to, documentUrl, filename, caption = '') {
    try {
      const response = await whatsappClient.post(
        `/${config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhoneNumber(to),
          type: 'document',
          document: {
            link: documentUrl,
            filename,
            caption
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp document:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  },

  /**
   * Send location
   */
  async sendLocation(to, latitude, longitude, name, address) {
    try {
      const response = await whatsappClient.post(
        `/${config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhoneNumber(to),
          type: 'location',
          location: {
            latitude,
            longitude,
            name,
            address
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp location:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  },

  /**
   * Mark message as read
   */
  async markAsRead(messageId) {
    try {
      await whatsappClient.post(
        `/${config.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        }
      );
      return true;
    } catch (error) {
      logger.error('Failed to mark message as read:', error);
      return false;
    }
  },

  /**
   * Get message templates
   */
  async getTemplates() {
    try {
      const response = await whatsappClient.get(
        `/${config.businessAccountId}/message_templates`
      );
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get WhatsApp templates:', error);
      return [];
    }
  },

  /**
   * Create message template
   */
  async createTemplate(name, category, language, components) {
    try {
      const response = await whatsappClient.post(
        `/${config.businessAccountId}/message_templates`,
        {
          name,
          category, // MARKETING, UTILITY, AUTHENTICATION
          language,
          components
        }
      );
      return {
        success: true,
        templateId: response.data.id
      };
    } catch (error) {
      logger.error('Failed to create WhatsApp template:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  },

  /**
   * Get phone number info
   */
  async getPhoneNumberInfo() {
    try {
      const response = await whatsappClient.get(
        `/${config.phoneNumberId}`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get phone number info:', error);
      return null;
    }
  },

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(signature, payload) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', config.appSecret)
      .update(payload)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  },

  /**
   * Process incoming webhook
   */
  processWebhook(body) {
    const messages = [];
    const statuses = [];

    if (body.entry) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];

        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;

            // Process incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                messages.push({
                  id: message.id,
                  from: message.from,
                  timestamp: new Date(parseInt(message.timestamp) * 1000),
                  type: message.type,
                  text: message.text?.body,
                  image: message.image,
                  document: message.document,
                  audio: message.audio,
                  video: message.video,
                  location: message.location,
                  contacts: message.contacts,
                  interactive: message.interactive,
                  button: message.button,
                  context: message.context
                });
              }
            }

            // Process status updates
            if (value.statuses) {
              for (const status of value.statuses) {
                statuses.push({
                  id: status.id,
                  recipientId: status.recipient_id,
                  status: status.status, // sent, delivered, read, failed
                  timestamp: new Date(parseInt(status.timestamp) * 1000),
                  conversation: status.conversation,
                  pricing: status.pricing,
                  errors: status.errors
                });
              }
            }
          }
        }
      }
    }

    return { messages, statuses };
  },

  /**
   * Format phone number to WhatsApp format
   */
  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');

    // If starts with country code, return as is
    // Otherwise assume Netherlands (+31)
    if (!cleaned.startsWith('31') && !cleaned.startsWith('1') && cleaned.length <= 10) {
      cleaned = '31' + cleaned;
    }

    return cleaned;
  },

  /**
   * Check if number is valid WhatsApp number
   */
  async isValidWhatsAppNumber(phone) {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const response = await whatsappClient.post(
        `/${config.phoneNumberId}/contacts`,
        {
          blocking: 'wait',
          contacts: [`+${formattedPhone}`]
        }
      );

      const contact = response.data.contacts?.[0];
      return contact?.status === 'valid';
    } catch (error) {
      logger.error('Failed to validate WhatsApp number:', error);
      return false;
    }
  }
};

// Message templates for common CRM notifications
export const messageTemplates = {
  followUpReminder: {
    name: 'follow_up_reminder',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Follow-up Reminder'
      },
      {
        type: 'BODY',
        text: 'Hi {{1}}, this is a reminder to follow up on the deal "{{2}}" scheduled for {{3}}.'
      },
      {
        type: 'FOOTER',
        text: 'HolidaiButler CRM'
      }
    ]
  },
  taskReminder: {
    name: 'task_reminder',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Task Reminder'
      },
      {
        type: 'BODY',
        text: 'Hi {{1}}, your task "{{2}}" is due at {{3}}. Please complete it on time.'
      },
      {
        type: 'FOOTER',
        text: 'HolidaiButler CRM'
      }
    ]
  },
  dealStageUpdate: {
    name: 'deal_stage_update',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Deal Update'
      },
      {
        type: 'BODY',
        text: 'Great news! Deal "{{1}}" has moved to {{2}} stage. Potential value: {{3}}'
      },
      {
        type: 'FOOTER',
        text: 'HolidaiButler CRM'
      }
    ]
  },
  meetingReminder: {
    name: 'meeting_reminder',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Meeting Reminder'
      },
      {
        type: 'BODY',
        text: 'Hi {{1}}, you have a meeting "{{2}}" scheduled at {{3}}. Click below to join.'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Join Meeting',
            url: 'https://meet.example.com/{{1}}'
          }
        ]
      },
      {
        type: 'FOOTER',
        text: 'HolidaiButler CRM'
      }
    ]
  }
};

export { config as whatsappConfig };
export default whatsappService;
