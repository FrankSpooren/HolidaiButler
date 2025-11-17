/**
 * Data Synchronization Workflows
 * Syncs data between all modules
 */

import workflowManager from '../workflowManager.js';
import eventBus from '../../services/eventBus.js';
import logger from '../../utils/logger.js';
import axios from 'axios';

/**
 * Full Data Sync Workflow
 * Syncs all data across modules
 */
workflowManager.register('data-sync', {
  name: 'Data Sync',
  description: 'Syncs data between all modules',
  handler: async (data) => {
    logger.workflow('data-sync', 'processing', {});

    const results = {
      pois: 0,
      users: 0,
      bookings: 0,
    };

    try {
      // 1. Sync POIs from admin to ticketing/payment modules
      const adminUrl = process.env.ADMIN_MODULE_URL || 'http://localhost:3003';
      const poisResponse = await axios.get(`${adminUrl}/api/admin/pois`);
      const pois = poisResponse.data.pois || [];

      for (const poi of pois) {
        await eventBus.publish('poi.synced', {
          poiId: poi._id,
          name: poi.name,
          data: poi,
        });
        results.pois++;
      }

      // 2. Sync user booking counts
      const ticketingUrl = process.env.TICKETING_MODULE_URL || 'http://localhost:3004';
      const usersResponse = await axios.get(`${ticketingUrl}/api/v1/users/stats`);
      const users = usersResponse.data || [];

      for (const user of users) {
        await eventBus.publish('user.stats.updated', {
          userId: user.id,
          totalBookings: user.totalBookings,
          totalSpent: user.totalSpent,
        });
        results.users++;
      }

      logger.workflow('data-sync', 'completed', results);

      return {
        success: true,
        synced: results,
      };
    } catch (error) {
      logger.error('Data sync failed:', error);
      throw error;
    }
  },
});

/**
 * POI Sync Workflow
 * Syncs POI data from admin module
 */
workflowManager.register('poi-sync', {
  name: 'POI Sync',
  description: 'Syncs POI data from admin module',
  handler: async (data) => {
    const { poiId } = data;

    logger.workflow('poi-sync', 'processing', { poiId });

    // Get POI data from admin module
    const adminUrl = process.env.ADMIN_MODULE_URL || 'http://localhost:3003';
    const response = await axios.get(`${adminUrl}/api/admin/pois/${poiId}`);
    const poi = response.data;

    // Publish to other modules
    await eventBus.publish('poi.updated', {
      poiId: poi._id,
      name: poi.name,
      location: poi.location,
      category: poi.category,
      verified: poi.verified,
      data: poi,
    });

    logger.workflow('poi-sync', 'completed', { poiId });

    return {
      success: true,
      poiId,
      synced: true,
    };
  },
});

/**
 * Payment Recovery Workflow
 * Handles failed payments
 */
workflowManager.register('payment-recovery', {
  name: 'Payment Recovery',
  description: 'Handles failed payment recovery',
  handler: async (data) => {
    const { paymentId, bookingId, email } = data;

    logger.workflow('payment-recovery', 'processing', { paymentId, bookingId });

    // Get payment details
    const paymentUrl = process.env.PAYMENT_MODULE_URL || 'http://localhost:3005';
    const response = await axios.get(`${paymentUrl}/api/v1/payments/${paymentId}`);
    const payment = response.data;

    // Send recovery email (if configured)
    if (process.env.MAILERLITE_PAYMENT_FAILED_TEMPLATE_ID) {
      const mailerLiteService = (await import('../../services/mailerlite.js')).default;

      await mailerLiteService.sendTransactionalEmail(
        email,
        process.env.MAILERLITE_PAYMENT_FAILED_TEMPLATE_ID,
        {
          booking_id: bookingId,
          payment_id: paymentId,
          retry_url: `${process.env.PLATFORM_FRONTEND_URL}/payment/${paymentId}/retry`,
        }
      );
    }

    // Publish event
    await eventBus.publish('payment.recovery.sent', {
      paymentId,
      bookingId,
      email,
    });

    logger.workflow('payment-recovery', 'completed', { paymentId });

    return {
      success: true,
      paymentId,
      recoverySent: true,
    };
  },
});

logger.info('Data sync workflows registered');
