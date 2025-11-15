const Booking = require('../models/Booking');
const AvailabilityService = require('./AvailabilityService');
const TicketService = require('./TicketService');
const logger = require('../utils/logger');
const axios = require('axios');

/**
 * Booking Service
 * Manages ticket bookings lifecycle: create, confirm, cancel
 * Integrates with Availability Service and Payment Engine
 */
class BookingService {
  constructor() {
    this.PAYMENT_ENGINE_URL = process.env.PAYMENT_ENGINE_URL || 'http://localhost:3005';
    this.RESERVATION_TIMEOUT = 900000; // 15 minutes in milliseconds
  }

  /**
   * Create a new booking
   * @param {Object} bookingData - Booking details
   * @returns {Promise<Object>} Created booking with payment URL
   */
  async createBooking(bookingData) {
    try {
      const {
        userId,
        poiId,
        date,
        timeslot,
        quantity,
        guestInfo,
        voucherCode,
        productType,
        language,
      } = bookingData;

      // Step 1: Check availability
      const availability = await AvailabilityService.checkAvailability(poiId, date, timeslot);

      if (!availability.available) {
        throw new Error('Not available for booking');
      }

      if (availability.capacity.available < quantity) {
        throw new Error(`Only ${availability.capacity.available} tickets available`);
      }

      // Step 2: Calculate pricing (apply voucher if provided)
      let pricing = await this._calculatePricing(
        availability.pricing.finalPrice,
        quantity,
        voucherCode
      );

      // Step 3: Create booking record
      const booking = new Booking({
        userId,
        poiId,
        status: 'pending',
        details: {
          date: new Date(date),
          time: timeslot ? timeslot.split('-')[0] : null,
          duration: null, // TODO: Get from POI configuration
          guests: {
            adults: quantity,
            children: 0,
            infants: 0,
          },
        },
        pricing,
        experience: {
          productType: productType || 'ticket',
          language: language || 'en',
        },
        guestInfo: {
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone || null,
        },
        cancellation: {
          allowCancellation: true,
          cancellationDeadline: new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000), // 24h before
          refundPolicy: 'full',
        },
        metadata: {
          source: bookingData.source || 'mobile',
          ipAddress: bookingData.ipAddress,
          userAgent: bookingData.userAgent,
        },
      });

      await booking.save();

      // Step 4: Reserve capacity (15-minute hold)
      try {
        const reservation = await AvailabilityService.reserveSlot(
          booking._id.toString(),
          poiId,
          date,
          quantity,
          timeslot
        );

        booking.reservation.isLocked = true;
        booking.reservation.lockedUntil = reservation.expiresAt;
        booking.reservation.lockId = booking._id.toString();
        await booking.save();

        // Schedule automatic release if payment not completed
        this._scheduleReservationRelease(booking._id.toString(), this.RESERVATION_TIMEOUT);
      } catch (error) {
        // If reservation fails, delete the booking
        await Booking.findByIdAndDelete(booking._id);
        throw error;
      }

      // Step 5: Create payment session with Payment Engine
      const paymentSession = await this._createPaymentSession(booking);

      logger.info(`Booking created: ${booking.bookingReference}`);

      return {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        totalPrice: booking.pricing.totalPrice,
        currency: booking.pricing.currency,
        expiresAt: booking.reservation.lockedUntil,
        paymentUrl: paymentSession.redirectUrl,
        paymentId: paymentSession.paymentId,
      };
    } catch (error) {
      logger.error('Error creating booking:', error);
      throw error;
    }
  }

  /**
   * Confirm booking after successful payment
   * @param {String} bookingId - Booking identifier
   * @param {String} paymentTransactionId - Payment transaction ID from Payment Engine
   * @returns {Promise<Object>} Confirmed booking with tickets
   */
  async confirmBooking(bookingId, paymentTransactionId) {
    try {
      const booking = await Booking.findById(bookingId).populate('poiId');

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'pending') {
        throw new Error(`Cannot confirm booking with status: ${booking.status}`);
      }

      // Step 1: Verify payment with Payment Engine
      const paymentStatus = await this._verifyPayment(paymentTransactionId);

      if (paymentStatus.status !== 'captured' && paymentStatus.status !== 'authorized') {
        throw new Error('Payment not completed');
      }

      // Step 2: Confirm booking
      await booking.confirmBooking(paymentTransactionId);

      // Step 3: Confirm reservation (convert to booked capacity)
      await AvailabilityService.confirmReservation(bookingId);

      // Step 4: Generate tickets
      const tickets = await TicketService.generateTicketsForBooking(booking);

      booking.tickets.ticketIds = tickets.map(t => t._id);
      booking.tickets.deliveryMethod = 'email'; // Default
      await booking.save();

      // Step 5: Send tickets to user
      await TicketService.sendTicketsToUser(tickets, booking.guestInfo.email);

      booking.tickets.deliveredAt = new Date();
      await booking.save();

      logger.info(`Booking confirmed: ${booking.bookingReference}`);

      return {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        tickets: tickets.map(t => ({
          ticketId: t._id,
          ticketNumber: t.ticketNumber,
          qrCodeUrl: t.qrCode.imageUrl,
        })),
      };
    } catch (error) {
      logger.error('Error confirming booking:', error);
      throw error;
    }
  }

  /**
   * Cancel booking
   * @param {String} bookingId - Booking identifier
   * @param {String} userId - User initiating cancellation
   * @param {String} reason - Cancellation reason
   * @returns {Promise<Object>} Cancellation result with refund info
   */
  async cancelBooking(bookingId, userId, reason) {
    try {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!booking.canBeCancelled) {
        throw new Error('Booking cannot be cancelled');
      }

      // Step 1: Cancel booking
      await booking.cancelBooking(userId, reason);

      // Step 2: Release or return capacity
      if (booking.status === 'pending') {
        // Release reservation
        await AvailabilityService.releaseReservation(bookingId);
      } else if (booking.status === 'confirmed') {
        // Return booked capacity
        const totalGuests = booking.totalGuests;
        await AvailabilityService.cancelBooking(
          booking.poiId,
          booking.details.date,
          totalGuests,
          booking.details.time
        );
      }

      // Step 3: Process refund if payment was made
      let refundResult = null;
      if (booking.payment.status === 'paid' && booking.payment.transactionId) {
        refundResult = await this._initiateRefund(booking);
      }

      // Step 4: Cancel tickets
      if (booking.tickets.ticketIds.length > 0) {
        await TicketService.cancelTickets(booking.tickets.ticketIds, reason);
      }

      logger.info(`Booking cancelled: ${booking.bookingReference}`);

      return {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        refund: refundResult,
      };
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw error;
    }
  }

  /**
   * Get bookings by user
   * @param {String} userId - User identifier
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of bookings
   */
  async getBookingsByUser(userId, filters = {}) {
    try {
      const query = { userId };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.from && filters.to) {
        query['details.date'] = {
          $gte: new Date(filters.from),
          $lte: new Date(filters.to),
        };
      }

      const bookings = await Booking.find(query)
        .populate('poiId', 'name location images')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return bookings;
    } catch (error) {
      logger.error('Error getting bookings:', error);
      throw error;
    }
  }

  /**
   * Get booking by ID
   * @param {String} bookingId - Booking identifier
   * @returns {Promise<Object>} Booking details
   */
  async getBookingById(bookingId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate('poiId', 'name location images description')
        .populate('tickets.ticketIds');

      if (!booking) {
        throw new Error('Booking not found');
      }

      return booking;
    } catch (error) {
      logger.error('Error getting booking:', error);
      throw error;
    }
  }

  // ========== Private Helper Methods ==========

  /**
   * Calculate pricing with voucher discounts
   * @private
   */
  async _calculatePricing(basePrice, quantity, voucherCode = null) {
    let baseTotal = basePrice * quantity;
    let discount = 0;
    let voucher = {};

    if (voucherCode) {
      // TODO: Validate voucher code against voucher system
      // Placeholder: 10% discount
      discount = baseTotal * 0.10;
      voucher = {
        code: voucherCode,
        discountPercentage: 10,
        discountAmount: discount,
      };
    }

    const taxes = baseTotal * 0.09; // 9% VAT (example)
    const fees = 2.50; // Booking fee

    return {
      basePrice,
      taxes: Math.round(taxes * 100) / 100,
      fees,
      discount: Math.round(discount * 100) / 100,
      totalPrice: Math.round((baseTotal + taxes + fees - discount) * 100) / 100,
      currency: 'EUR',
      commission: Math.round(baseTotal * 0.08 * 100) / 100, // 8% platform commission
    };
  }

  /**
   * Create payment session with Payment Engine
   * @private
   */
  async _createPaymentSession(booking) {
    try {
      const response = await axios.post(`${this.PAYMENT_ENGINE_URL}/api/v1/payments`, {
        amount: Math.round(booking.pricing.totalPrice * 100), // cents
        currency: booking.pricing.currency,
        resourceType: 'ticket',
        resourceId: booking._id.toString(),
        returnUrl: `${process.env.FRONTEND_URL}/booking/complete`,
        metadata: {
          userId: booking.userId.toString(),
          bookingReference: booking.bookingReference,
          poiId: booking.poiId.toString(),
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Error creating payment session:', error);
      // If payment engine is unavailable, provide fallback
      return {
        paymentId: 'pending',
        redirectUrl: `${process.env.FRONTEND_URL}/booking/payment-pending`,
      };
    }
  }

  /**
   * Verify payment status with Payment Engine
   * @private
   */
  async _verifyPayment(transactionId) {
    try {
      const response = await axios.get(`${this.PAYMENT_ENGINE_URL}/api/v1/payments/${transactionId}`);
      return response.data;
    } catch (error) {
      logger.error('Error verifying payment:', error);
      throw new Error('Payment verification failed');
    }
  }

  /**
   * Initiate refund with Payment Engine
   * @private
   */
  async _initiateRefund(booking) {
    try {
      const refundAmount = booking.pricing.totalPrice;

      const response = await axios.post(
        `${this.PAYMENT_ENGINE_URL}/api/v1/payments/${booking.payment.transactionId}/refunds`,
        {
          amount: Math.round(refundAmount * 100), // cents
          reason: `Booking cancellation: ${booking.bookingReference}`,
        }
      );

      return {
        refundId: response.data.refundId,
        amount: refundAmount,
        currency: booking.pricing.currency,
        status: 'pending',
      };
    } catch (error) {
      logger.error('Error initiating refund:', error);
      return {
        error: 'Refund initiation failed',
        message: error.message,
      };
    }
  }

  /**
   * Schedule automatic reservation release
   * @private
   */
  _scheduleReservationRelease(bookingId, timeout) {
    setTimeout(async () => {
      try {
        const booking = await Booking.findById(bookingId);

        // Only release if still pending
        if (booking && booking.status === 'pending') {
          logger.info(`Auto-releasing reservation for booking ${bookingId}`);
          await AvailabilityService.releaseReservation(bookingId);

          booking.status = 'expired';
          booking.reservation.isLocked = false;
          await booking.save();
        }
      } catch (error) {
        logger.error('Error in scheduled reservation release:', error);
      }
    }, timeout);
  }
}

module.exports = new BookingService();
