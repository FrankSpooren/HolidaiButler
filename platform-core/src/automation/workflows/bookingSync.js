/**
 * Booking Synchronization Workflows
 * Handles booking-related automation across modules
 */

import workflowManager from '../workflowManager.js';
import mailerLiteService from '../../services/mailerlite.js';
import eventBus from '../../services/eventBus.js';
import logger from '../../utils/logger.js';
import axios from 'axios';

/**
 * Booking Confirmation Workflow
 * Triggered when a booking is created
 */
workflowManager.register('booking-confirmation', {
  name: 'Booking Confirmation',
  description: 'Handles booking confirmation and notifications',
  handler: async (data) => {
    const { bookingId, userId, email, bookingReference } = data;

    logger.workflow('booking-confirmation', 'processing', {
      bookingId,
      bookingReference,
    });

    // 1. Update user in MailerLite
    await mailerLiteService.updateSubscriber(email, {
      customFields: {
        last_booking_id: bookingId,
        last_booking_date: new Date().toISOString(),
        booking_status: 'pending',
      },
    });

    // 2. Add to active bookers group
    if (process.env.MAILERLITE_ACTIVE_BOOKERS_GROUP_ID) {
      await mailerLiteService.addToGroup(
        email,
        process.env.MAILERLITE_ACTIVE_BOOKERS_GROUP_ID
      );
    }

    // 3. Publish booking confirmed event
    await eventBus.publish('booking.confirmed', {
      bookingId,
      userId,
      bookingReference,
    });

    logger.workflow('booking-confirmation', 'completed', { bookingId });

    return {
      success: true,
      bookingId,
      bookingReference,
    };
  },
});

/**
 * Ticket Delivery Workflow
 * Triggered when payment is completed
 */
workflowManager.register('ticket-delivery', {
  name: 'Ticket Delivery',
  description: 'Delivers tickets after successful payment',
  handler: async (data) => {
    const { bookingId, userId, email, paymentId } = data;

    logger.workflow('ticket-delivery', 'processing', { bookingId, paymentId });

    // 1. Get booking details from ticketing module
    const ticketingUrl = process.env.TICKETING_MODULE_URL || 'http://localhost:3004';
    const bookingResponse = await axios.get(
      `${ticketingUrl}/api/v1/tickets/bookings/${bookingId}`
    );
    const booking = bookingResponse.data;

    // 2. Confirm booking (this triggers ticket generation in ticketing module)
    await axios.post(
      `${ticketingUrl}/api/v1/tickets/bookings/${bookingId}/confirm`,
      { paymentId }
    );

    // 3. Update MailerLite
    await mailerLiteService.updateSubscriber(email, {
      customFields: {
        booking_status: 'confirmed',
        tickets_count: booking.tickets?.length || 0,
        last_ticket_date: new Date().toISOString(),
      },
    });

    // 4. Publish ticket delivered event
    await eventBus.publish('ticket.delivered', {
      bookingId,
      userId,
      email,
    });

    logger.workflow('ticket-delivery', 'completed', { bookingId });

    return {
      success: true,
      bookingId,
      ticketsDelivered: booking.tickets?.length || 0,
    };
  },
});

/**
 * Booking Cancellation Workflow
 * Handles booking cancellations and refunds
 */
workflowManager.register('booking-cancellation', {
  name: 'Booking Cancellation',
  description: 'Handles booking cancellations and notifications',
  handler: async (data) => {
    const { bookingId, userId, email, reason } = data;

    logger.workflow('booking-cancellation', 'processing', { bookingId, reason });

    // 1. Update booking status in ticketing module
    const ticketingUrl = process.env.TICKETING_MODULE_URL || 'http://localhost:3004';
    await axios.put(`${ticketingUrl}/api/v1/tickets/bookings/${bookingId}/cancel`, {
      reason,
    });

    // 2. Process refund if applicable
    const paymentUrl = process.env.PAYMENT_MODULE_URL || 'http://localhost:3005';
    try {
      const booking = await axios.get(
        `${ticketingUrl}/api/v1/tickets/bookings/${bookingId}`
      );

      if (booking.data.paymentStatus === 'completed') {
        await axios.post(
          `${paymentUrl}/api/v1/payments/${booking.data.paymentId}/refunds`,
          {
            amount: booking.data.totalPrice,
            reason: reason || 'Booking cancelled by customer',
          }
        );
      }
    } catch (error) {
      logger.error('Refund processing failed:', error);
    }

    // 3. Update MailerLite
    await mailerLiteService.updateSubscriber(email, {
      customFields: {
        booking_status: 'cancelled',
        last_cancellation_date: new Date().toISOString(),
      },
    });

    // 4. Send cancellation confirmation email
    if (process.env.MAILERLITE_CANCELLATION_TEMPLATE_ID) {
      await mailerLiteService.sendTransactionalEmail(
        email,
        process.env.MAILERLITE_CANCELLATION_TEMPLATE_ID,
        {
          booking_id: bookingId,
          cancellation_date: new Date().toLocaleDateString(),
        }
      );
    }

    logger.workflow('booking-cancellation', 'completed', { bookingId });

    return {
      success: true,
      bookingId,
      cancelled: true,
    };
  },
});

/**
 * Booking Reminders Workflow
 * Sends reminder emails for upcoming bookings
 */
workflowManager.register('booking-reminders', {
  name: 'Booking Reminders',
  description: 'Sends reminder emails for upcoming bookings',
  handler: async (data) => {
    logger.workflow('booking-reminders', 'processing', {});

    // Get upcoming bookings from ticketing module
    const ticketingUrl = process.env.TICKETING_MODULE_URL || 'http://localhost:3004';
    const response = await axios.get(
      `${ticketingUrl}/api/v1/tickets/bookings/upcoming`,
      {
        params: {
          days: 7, // Next 7 days
          status: 'confirmed',
        },
      }
    );

    const upcomingBookings = response.data;
    let sentCount = 0;

    // Send reminder for each booking
    for (const booking of upcomingBookings) {
      try {
        if (process.env.MAILERLITE_REMINDER_TEMPLATE_ID) {
          await mailerLiteService.sendTransactionalEmail(
            booking.email,
            process.env.MAILERLITE_REMINDER_TEMPLATE_ID,
            {
              booking_reference: booking.bookingReference,
              booking_date: new Date(booking.bookingDate).toLocaleDateString(),
              poi_name: booking.poiName,
              tickets_count: booking.ticketsCount,
            }
          );

          sentCount++;
        }
      } catch (error) {
        logger.error(`Failed to send reminder for booking ${booking.id}:`, error);
      }
    }

    logger.workflow('booking-reminders', 'completed', {
      total: upcomingBookings.length,
      sent: sentCount,
    });

    return {
      success: true,
      totalBookings: upcomingBookings.length,
      remindersSent: sentCount,
    };
  },
});

/**
 * Abandoned Cart Recovery Workflow
 * Sends emails to users with incomplete bookings
 */
workflowManager.register('abandoned-cart-recovery', {
  name: 'Abandoned Cart Recovery',
  description: 'Recovers abandoned bookings',
  handler: async (data) => {
    logger.workflow('abandoned-cart-recovery', 'processing', {});

    // Get abandoned bookings (created > 2 hours ago, status = pending)
    const ticketingUrl = process.env.TICKETING_MODULE_URL || 'http://localhost:3004';
    const response = await axios.get(
      `${ticketingUrl}/api/v1/tickets/bookings/abandoned`,
      {
        params: {
          hoursAgo: 2,
          status: 'pending',
        },
      }
    );

    const abandonedBookings = response.data;
    let recoveredCount = 0;

    // Send recovery email for each abandoned booking
    for (const booking of abandonedBookings) {
      try {
        if (process.env.MAILERLITE_CART_RECOVERY_TEMPLATE_ID) {
          await mailerLiteService.sendTransactionalEmail(
            booking.email,
            process.env.MAILERLITE_CART_RECOVERY_TEMPLATE_ID,
            {
              booking_reference: booking.bookingReference,
              poi_name: booking.poiName,
              total_price: booking.totalPrice,
              checkout_url: `${process.env.PLATFORM_FRONTEND_URL}/checkout/${booking.id}`,
            }
          );

          recoveredCount++;
        }
      } catch (error) {
        logger.error(
          `Failed to send recovery email for booking ${booking.id}:`,
          error
        );
      }
    }

    logger.workflow('abandoned-cart-recovery', 'completed', {
      total: abandonedBookings.length,
      sent: recoveredCount,
    });

    return {
      success: true,
      totalAbandoned: abandonedBookings.length,
      recoverySent: recoveredCount,
    };
  },
});

logger.info('Booking sync workflows registered');
