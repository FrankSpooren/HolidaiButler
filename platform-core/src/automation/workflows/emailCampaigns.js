/**
 * Email Campaign Workflows
 * Automated email campaigns via MailerLite
 */

import workflowManager from '../workflowManager.js';
import mailerLiteService from '../../services/mailerlite.js';
import logger from '../../utils/logger.js';
import axios from 'axios';

/**
 * Email Campaign Check Workflow
 * Checks and triggers scheduled email campaigns
 */
workflowManager.register('email-campaign-check', {
  name: 'Email Campaign Check',
  description: 'Checks and triggers scheduled email campaigns',
  handler: async (data) => {
    logger.workflow('email-campaign-check', 'processing', {});

    // This would typically check for scheduled campaigns in database
    // For now, we'll just log that it ran successfully

    logger.workflow('email-campaign-check', 'completed', {});

    return {
      success: true,
      checked: true,
    };
  },
});

/**
 * Newsletter Subscription Workflow
 * Handles newsletter subscriptions
 */
workflowManager.register('newsletter-subscription', {
  name: 'Newsletter Subscription',
  description: 'Handles newsletter subscriptions',
  handler: async (data) => {
    const { email, name, source } = data;

    logger.workflow('newsletter-subscription', 'processing', { email });

    // Subscribe to newsletter group
    await mailerLiteService.subscribeUser(email, {
      name,
      customFields: {
        subscription_source: source || 'website',
        subscription_date: new Date().toISOString(),
      },
    });

    // Add to newsletter group
    if (process.env.MAILERLITE_NEWSLETTER_GROUP_ID) {
      await mailerLiteService.addToGroup(
        email,
        process.env.MAILERLITE_NEWSLETTER_GROUP_ID
      );
    }

    logger.workflow('newsletter-subscription', 'completed', { email });

    return {
      success: true,
      email,
      subscribed: true,
    };
  },
});

/**
 * Promotional Campaign Workflow
 * Sends promotional emails based on user segments
 */
workflowManager.register('promotional-campaign', {
  name: 'Promotional Campaign',
  description: 'Sends promotional emails to user segments',
  handler: async (data) => {
    const { segment, campaignName, templateId } = data;

    logger.workflow('promotional-campaign', 'processing', { segment, campaignName });

    // Get users from segment (this would query the database)
    const ticketingUrl = process.env.TICKETING_MODULE_URL || 'http://localhost:3004';
    const response = await axios.get(`${ticketingUrl}/api/v1/users/segment/${segment}`);
    const users = response.data;

    let sentCount = 0;

    // Send campaign email to each user
    for (const user of users) {
      try {
        await mailerLiteService.sendTransactionalEmail(user.email, templateId, {
          name: user.name,
          campaign_name: campaignName,
        });

        sentCount++;
      } catch (error) {
        logger.error(`Failed to send campaign email to ${user.email}:`, error);
      }
    }

    logger.workflow('promotional-campaign', 'completed', {
      segment,
      total: users.length,
      sent: sentCount,
    });

    return {
      success: true,
      segment,
      totalUsers: users.length,
      emailsSent: sentCount,
    };
  },
});

logger.info('Email campaign workflows registered');
