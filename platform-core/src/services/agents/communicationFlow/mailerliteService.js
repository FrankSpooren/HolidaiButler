/**
 * MailerLite Service for Communication Flow Agent
 * Enterprise-level email automation
 */

import axios from 'axios';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import { logCost } from '../../orchestrator/costController/index.js';

class MailerLiteService {
  constructor() {
    this.apiKey = process.env.MAILERLITE_API_KEY;
    this.baseUrl = 'https://connect.mailerlite.com/api';
    this.ownerGroupId = '176972381290498029'; // System Alerts Owner
  }

  getClient() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  async upsertSubscriber(email, fields = {}, groups = []) {
    console.log(`[MailerLiteService] Upserting subscriber: ${email}`);

    try {
      const response = await this.getClient().post('/subscribers', {
        email,
        fields,
        groups,
        status: 'active'
      });

      await logAgent('communication-flow', 'subscriber_upserted', {
        description: `Upserted subscriber ${email}`,
        metadata: { email, groups: groups.length }
      });

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 409) {
        return this.updateSubscriber(email, fields);
      }
      await logError('communication-flow', error, { action: 'upsert_subscriber', email });
      throw error;
    }
  }

  async updateSubscriber(email, fields) {
    console.log(`[MailerLiteService] Updating subscriber: ${email}`);

    try {
      const response = await this.getClient().put(`/subscribers/${email}`, {
        fields
      });

      return response.data.data;
    } catch (error) {
      await logError('communication-flow', error, { action: 'update_subscriber', email });
      throw error;
    }
  }

  async addToGroup(subscriberId, groupId) {
    console.log(`[MailerLiteService] Adding subscriber ${subscriberId} to group ${groupId}`);

    try {
      await this.getClient().post(`/subscribers/${subscriberId}/groups/${groupId}`);
      return { success: true };
    } catch (error) {
      await logError('communication-flow', error, { action: 'add_to_group', subscriberId, groupId });
      throw error;
    }
  }

  async removeFromGroup(subscriberId, groupId) {
    console.log(`[MailerLiteService] Removing subscriber ${subscriberId} from group ${groupId}`);

    try {
      await this.getClient().delete(`/subscribers/${subscriberId}/groups/${groupId}`);
      return { success: true };
    } catch (error) {
      await logError('communication-flow', error, { action: 'remove_from_group', subscriberId, groupId });
      throw error;
    }
  }

  async createGroup(name) {
    console.log(`[MailerLiteService] Creating group: ${name}`);

    try {
      const response = await this.getClient().post('/groups', { name });

      await logAgent('communication-flow', 'group_created', {
        description: `Created group: ${name}`,
        metadata: { name, groupId: response.data.data.id }
      });

      return response.data.data;
    } catch (error) {
      await logError('communication-flow', error, { action: 'create_group', name });
      throw error;
    }
  }

  async getGroups() {
    try {
      const response = await this.getClient().get('/groups?limit=100');
      return response.data.data;
    } catch (error) {
      await logError('communication-flow', error, { action: 'get_groups' });
      throw error;
    }
  }

  async getOrCreateGroup(name) {
    const groups = await this.getGroups();
    const existing = groups.find(g => g.name === name);

    if (existing) {
      return existing;
    }

    return this.createGroup(name);
  }

  async triggerSystemAlert(subject, fields) {
    const ownerEmail = 'info@holidaibutler.com';

    console.log(`[MailerLiteService] Triggering system alert: ${subject}`);

    try {
      try {
        const subscriber = await this.getSubscriber(ownerEmail);
        if (subscriber) {
          await this.removeFromGroup(subscriber.id, this.ownerGroupId);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        // Ignore if not in group
      }

      await this.upsertSubscriber(ownerEmail, {
        last_system_alert: subject,
        last_alert_time: new Date().toISOString(),
        ...fields
      });

      const subscriber = await this.getSubscriber(ownerEmail);
      await this.addToGroup(subscriber.id, this.ownerGroupId);

      await logAgent('communication-flow', 'system_alert_triggered', {
        description: `System alert triggered: ${subject}`,
        metadata: { subject }
      });

      return { success: true, subject };
    } catch (error) {
      await logError('communication-flow', error, { action: 'trigger_system_alert', subject });
      throw error;
    }
  }

  async getSubscriber(email) {
    try {
      const response = await this.getClient().get(`/subscribers/${email}`);
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async sendCampaignToGroup(groupId, subject, htmlContent, options = {}) {
    console.log(`[MailerLiteService] Sending campaign to group ${groupId}`);

    try {
      const campaign = await this.getClient().post('/campaigns', {
        name: options.name || `Campaign ${new Date().toISOString()}`,
        type: 'regular',
        emails: [{
          subject,
          from_name: options.fromName || 'HolidaiButler',
          from: options.from || 'noreply@holidaibutler.com',
          content: htmlContent
        }],
        groups: [groupId]
      });

      const campaignId = campaign.data.data.id;

      if (options.scheduledAt) {
        await this.getClient().post(`/campaigns/${campaignId}/schedule`, {
          delivery: 'scheduled',
          date: options.scheduledAt
        });
      } else {
        await this.getClient().post(`/campaigns/${campaignId}/schedule`, {
          delivery: 'instant'
        });
      }

      await logCost('mailerlite', 'campaign_sent', 0, { campaignId, groupId });

      await logAgent('communication-flow', 'campaign_sent', {
        description: `Campaign sent to group ${groupId}`,
        metadata: { campaignId, groupId, subject }
      });

      return { success: true, campaignId };
    } catch (error) {
      await logError('communication-flow', error, { action: 'send_campaign', groupId });
      throw error;
    }
  }

  async getCampaignStats(campaignId) {
    try {
      const response = await this.getClient().get(`/campaigns/${campaignId}`);
      return response.data.data.stats;
    } catch (error) {
      await logError('communication-flow', error, { action: 'get_campaign_stats', campaignId });
      throw error;
    }
  }

  async syncUsersToMailerLite(sequelize, groupName = 'HolidaiButler Users') {
    console.log('[MailerLiteService] Syncing users to MailerLite...');

    try {
      const group = await this.getOrCreateGroup(groupName);

      // Query uses actual Users table columns: name (not first_name/last_name), is_active (not email_opt_in)
      const [users] = await sequelize.query(`
        SELECT email, name, created_at
        FROM Users
        WHERE email IS NOT NULL AND email != ''
        AND is_active = 1
        LIMIT 500
      `);

      let synced = 0;
      let failed = 0;

      for (const user of users) {
        try {
          await this.upsertSubscriber(user.email, {
            name: user.name || '',
            signup_date: user.created_at
          }, [group.id]);
          synced++;
        } catch (error) {
          console.error(`[MailerLiteService] Failed to sync user ${user.email}:`, error.message);
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await logAgent('communication-flow', 'users_synced', {
        description: `Synced ${synced} users to MailerLite`,
        metadata: { total: users.length, synced, failed, group: groupName }
      });

      return { total: users.length, synced, failed };
    } catch (error) {
      await logError('communication-flow', error, { action: 'sync_users' });
      throw error;
    }
  }

  async sendTransactionalEmail(options) {
    console.log(`[MailerLiteService] Sending transactional email to ${options.to}`);

    // MailerLite doesn't have native transactional emails in the same way
    // We use the campaign approach or subscriber field updates + automation
    // For now, log the intent and use group-trigger automation
    try {
      await this.upsertSubscriber(options.to, {
        last_email_subject: options.subject,
        last_email_template: options.templateId,
        ...options.variables
      });

      await logAgent('communication-flow', 'transactional_email_queued', {
        description: `Queued transactional email to ${options.to}`,
        metadata: { to: options.to, subject: options.subject }
      });

      return { success: true, queued: true };
    } catch (error) {
      await logError('communication-flow', error, { action: 'send_transactional', to: options.to });
      throw error;
    }
  }
}

export default new MailerLiteService();
