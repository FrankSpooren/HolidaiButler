/**
 * MailerLite Integration Service
 * Centralized email campaign automation
 */

import MailerLite from '@mailerlite/mailerlite-nodejs';
import logger from '../utils/logger.js';

class MailerLiteService {
  constructor() {
    this.enabled = !!process.env.MAILERLITE_API_KEY;

    if (!this.enabled) {
      logger.warn('MailerLite API key not configured - email features disabled');
      this.client = null;
    } else {
      this.client = new MailerLite({
        api_key: process.env.MAILERLITE_API_KEY,
      });
    }

    this.fromEmail = process.env.MAILERLITE_FROM_EMAIL || 'noreply@holidaibutler.com';
    this.fromName = process.env.MAILERLITE_FROM_NAME || 'HolidaiButler';
    this.defaultGroupId = process.env.MAILERLITE_GROUP_ID;
  }

  /**
   * Check if service is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Subscribe user to mailing list
   */
  async subscribeUser(email, data = {}) {
    if (!this.enabled) {
      logger.info(`[DEV] Would subscribe user: ${email}`);
      return { id: 'dev-mock-id', email, status: 'mock' };
    }

    try {
      const subscriberData = {
        email,
        fields: {
          name: data.name || '',
          last_name: data.lastName || '',
          phone: data.phone || '',
          ...data.customFields,
        },
        groups: data.groupIds || (this.defaultGroupId ? [this.defaultGroupId] : []),
      };

      const response = await this.client.subscribers.createOrUpdate(subscriberData);

      logger.integration('mailerlite.subscribe', {
        email,
        subscriberId: response.data?.id,
      });

      return response.data;
    } catch (error) {
      logger.error('MailerLite subscription failed:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from mailing list
   */
  async unsubscribeUser(email) {
    try {
      const response = await this.client.subscribers.delete(email);

      logger.integration('mailerlite.unsubscribe', { email });

      return response;
    } catch (error) {
      logger.error('MailerLite unsubscribe failed:', error);
      throw error;
    }
  }

  /**
   * Update subscriber information
   */
  async updateSubscriber(email, data) {
    try {
      const updateData = {
        fields: {
          name: data.name,
          last_name: data.lastName,
          phone: data.phone,
          ...data.customFields,
        },
      };

      const response = await this.client.subscribers.update(email, updateData);

      logger.integration('mailerlite.update', { email });

      return response.data;
    } catch (error) {
      logger.error('MailerLite update failed:', error);
      throw error;
    }
  }

  /**
   * Send transactional email
   */
  async sendTransactionalEmail(to, templateId, variables = {}) {
    try {
      const emailData = {
        to: [{ email: to }],
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        template_id: templateId,
        variables,
      };

      const response = await this.client.emails.send(emailData);

      logger.integration('mailerlite.send_email', {
        to,
        templateId,
        messageId: response.data?.id,
      });

      return response.data;
    } catch (error) {
      logger.error('MailerLite send email failed:', error);
      throw error;
    }
  }

  /**
   * Add subscriber to specific group
   */
  async addToGroup(email, groupId) {
    try {
      const response = await this.client.groups.assignSubscriber(groupId, email);

      logger.integration('mailerlite.add_to_group', { email, groupId });

      return response.data;
    } catch (error) {
      logger.error('MailerLite add to group failed:', error);
      throw error;
    }
  }

  /**
   * Remove subscriber from group
   */
  async removeFromGroup(email, groupId) {
    try {
      const response = await this.client.groups.unassignSubscriber(groupId, email);

      logger.integration('mailerlite.remove_from_group', { email, groupId });

      return response;
    } catch (error) {
      logger.error('MailerLite remove from group failed:', error);
      throw error;
    }
  }

  /**
   * Get subscriber by email
   */
  async getSubscriber(email) {
    try {
      const response = await this.client.subscribers.get(email);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error('MailerLite get subscriber failed:', error);
      throw error;
    }
  }

  /**
   * Trigger automation workflow
   */
  async triggerAutomation(email, automationId, data = {}) {
    try {
      // First ensure subscriber exists
      await this.subscribeUser(email, data);

      // Trigger automation via custom event
      const response = await this.client.automations.trigger(automationId, {
        email,
        data,
      });

      logger.integration('mailerlite.trigger_automation', {
        email,
        automationId,
      });

      return response.data;
    } catch (error) {
      logger.error('MailerLite trigger automation failed:', error);
      throw error;
    }
  }

  /**
   * Batch subscribe users
   */
  async batchSubscribe(users, groupId = null) {
    try {
      const subscribers = users.map(user => ({
        email: user.email,
        fields: {
          name: user.name || '',
          last_name: user.lastName || '',
          phone: user.phone || '',
          ...user.customFields,
        },
      }));

      const response = await this.client.subscribers.createOrUpdateBatch(subscribers);

      if (groupId && response.data) {
        // Add all to group
        const subscriberIds = response.data.map(s => s.id);
        await this.client.groups.assignSubscribers(groupId, subscriberIds);
      }

      logger.integration('mailerlite.batch_subscribe', {
        count: users.length,
        groupId,
      });

      return response.data;
    } catch (error) {
      logger.error('MailerLite batch subscribe failed:', error);
      throw error;
    }
  }

  /**
   * Get all groups
   */
  async getGroups() {
    try {
      const response = await this.client.groups.get();
      return response.data;
    } catch (error) {
      logger.error('MailerLite get groups failed:', error);
      throw error;
    }
  }

  /**
   * Create new group
   */
  async createGroup(name) {
    try {
      const response = await this.client.groups.create({ name });

      logger.integration('mailerlite.create_group', {
        groupId: response.data?.id,
        name,
      });

      return response.data;
    } catch (error) {
      logger.error('MailerLite create group failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const mailerLiteService = new MailerLiteService();
export default mailerLiteService;
