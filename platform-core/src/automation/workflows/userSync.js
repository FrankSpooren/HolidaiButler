/**
 * User Synchronization Workflows
 * Syncs user data between modules and MailerLite
 */

import workflowManager from '../workflowManager.js';
import mailerLiteService from '../../services/mailerlite.js';
import eventBus from '../../services/eventBus.js';
import logger from '../../utils/logger.js';
import axios from 'axios';

/**
 * User Onboarding Workflow
 * Triggered when a new user registers
 */
workflowManager.register('user-onboarding', {
  name: 'User Onboarding',
  description: 'Handles new user registration and onboarding',
  handler: async (data) => {
    const { userId, email, name, lastName, phone } = data;

    logger.workflow('user-onboarding', 'processing', { userId, email });

    // 1. Subscribe to MailerLite welcome campaign
    const subscriber = await mailerLiteService.subscribeUser(email, {
      name,
      lastName,
      phone,
      customFields: {
        user_id: userId,
        registration_date: new Date().toISOString(),
        source: 'platform',
      },
    });

    // 2. Add to welcome email group
    if (process.env.MAILERLITE_WELCOME_GROUP_ID) {
      await mailerLiteService.addToGroup(
        email,
        process.env.MAILERLITE_WELCOME_GROUP_ID
      );
    }

    // 3. Publish user synced event
    await eventBus.publish('user.synced', {
      userId,
      email,
      mailerLiteId: subscriber.id,
    });

    logger.workflow('user-onboarding', 'completed', { userId });

    return {
      success: true,
      userId,
      mailerLiteId: subscriber.id,
    };
  },
});

/**
 * User Profile Update Workflow
 * Syncs user profile changes to MailerLite
 */
workflowManager.register('user-profile-update', {
  name: 'User Profile Update',
  description: 'Syncs user profile changes to MailerLite',
  handler: async (data) => {
    const { userId, email, updates } = data;

    logger.workflow('user-profile-update', 'processing', { userId, email });

    // Update subscriber in MailerLite
    await mailerLiteService.updateSubscriber(email, {
      name: updates.name,
      lastName: updates.lastName,
      phone: updates.phone,
      customFields: {
        last_updated: new Date().toISOString(),
        ...updates.customFields,
      },
    });

    logger.workflow('user-profile-update', 'completed', { userId });

    return {
      success: true,
      userId,
      email,
    };
  },
});

/**
 * User Data Sync Workflow
 * Syncs all user data across modules
 */
workflowManager.register('user-data-sync', {
  name: 'User Data Sync',
  description: 'Syncs user data between all modules',
  handler: async (data) => {
    const { userId } = data;

    logger.workflow('user-data-sync', 'processing', { userId });

    // Get user data from admin module
    const adminUrl = process.env.ADMIN_MODULE_URL || 'http://localhost:3003';
    const adminResponse = await axios.get(`${adminUrl}/api/admin/users/${userId}`);
    const userData = adminResponse.data;

    // Sync to MailerLite
    await mailerLiteService.updateSubscriber(userData.email, {
      name: userData.name,
      lastName: userData.lastName,
      phone: userData.phone,
      customFields: {
        total_bookings: userData.totalBookings || 0,
        total_spent: userData.totalSpent || 0,
        last_booking_date: userData.lastBookingDate || null,
      },
    });

    logger.workflow('user-data-sync', 'completed', { userId });

    return {
      success: true,
      userId,
      synced: ['admin', 'mailerlite'],
    };
  },
});

logger.info('User sync workflows registered');
