const { Booking, Ticket } = require('../models');
const AvailabilityService = require('./AvailabilityService');
const TicketService = require('./TicketService');
const logger = require('../utils/logger');
const axios = require('axios');
const { Op } = require('sequelize');

/**
 * Booking Service (Sequelize/MySQL)
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

      // Step 3: Create booking record using Sequelize
      const booking = await Booking.create({
        userId,
        poiId,
        status: 'pending',
        bookingDate: new Date(date),
        bookingTime: timeslot ? timeslot.split('-')[0] : null,
        duration: null, // TODO: Get from POI configuration
        adultsCount: quantity,
        childrenCount: 0,
        infantsCount: 0,
        basePrice: pricing.basePrice,
        taxes: pricing.taxes,
        fees: pricing.fees,
        discount: pricing.discount,
        totalPrice: pricing.totalPrice,
        currency: pricing.currency,
        commission: pricing.commission,
        paymentStatus: 'pending',
        productType: productType || 'ticket',
        experienceLanguage: language || 'en',
        allowCancellation: true,
        cancellationDeadline: new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000), // 24h before
        refundPolicy: 'full',
        guestName: guestInfo.name,
        guestEmail: guestInfo.email,
        guestPhone: guestInfo.phone || null,
        source: bookingData.source || 'mobile',
        ipAddress: bookingData.ipAddress,
        userAgent: bookingData.userAgent,
        voucherCode: voucherCode || null,
        voucherDiscountAmount: pricing.voucherDiscountAmount || null,
        voucherDiscountPercentage: pricing.voucherDiscountPercentage || null,
      });

      // Step 4: Reserve capacity (15-minute hold)
      try {
        const reservation = await AvailabilityService.reserveSlot(
          booking.id,
          poiId,
          date,
          quantity,
          timeslot
        );

        booking.isLocked = true;
        booking.lockedUntil = reservation.expiresAt;
        booking.lockId = booking.id;
        await booking.save();

        // Schedule automatic release if payment not completed
        this._scheduleReservationRelease(booking.id, this.RESERVATION_TIMEOUT);
      } catch (error) {
        // If reservation fails, delete the booking
        await booking.destroy();
        throw error;
      }

      // Step 5: Create payment session with Payment Engine
      const paymentSession = await this._createPaymentSession(booking);

      logger.info(`Booking created: ${booking.bookingReference}`);

      return {
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        totalPrice: booking.totalPrice,
        currency: booking.currency,
        expiresAt: booking.lockedUntil,
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
      const booking = await Booking.findByPk(bookingId);

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
      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      booking.paymentMethod = paymentStatus.paymentMethod || 'card';
      booking.transactionId = paymentTransactionId;
      booking.paidAt = new Date();
      await booking.save();

      // Step 3: Confirm reservation (convert to booked capacity)
      await AvailabilityService.confirmReservation(bookingId);

      // Step 4: Generate tickets
      const tickets = await TicketService.generateTicketsForBooking(booking);

      booking.deliveryMethod = 'email'; // Default
      await booking.save();

      // Step 5: Send tickets to user
      await TicketService.sendTicketsToUser(tickets, booking.guestEmail);

      booking.deliveredAt = new Date();
      await booking.save();

      logger.info(`Booking confirmed: ${booking.bookingReference}`);

      return {
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        tickets: tickets.map(t => ({
          ticketId: t.id,
          ticketNumber: t.ticketNumber,
          qrCodeUrl: t.qrCodeImageUrl,
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
      const booking = await Booking.findByPk(bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Check if booking can be cancelled
      if (!booking.allowCancellation) {
        throw new Error('Booking cannot be cancelled');
      }

      if (booking.cancellationDeadline && new Date() > booking.cancellationDeadline) {
        throw new Error('Cancellation deadline has passed');
      }

      // Step 1: Cancel booking
      booking.status = 'cancelled';
      booking.cancelledAt = new Date();
      booking.cancelledBy = userId;
      booking.cancellationReason = reason;
      await booking.save();

      // Step 2: Release or return capacity
      if (booking.isLocked) {
        // Release reservation
        await AvailabilityService.releaseReservation(bookingId);
      } else {
        // Return booked capacity
        const totalGuests = booking.adultsCount + booking.childrenCount;
        await AvailabilityService.cancelBooking(
          booking.poiId,
          booking.bookingDate,
          totalGuests,
          booking.bookingTime
        );
      }

      // Step 3: Process refund if payment was made
      let refundResult = null;
      if (booking.paymentStatus === 'paid' && booking.transactionId) {
        refundResult = await this._initiateRefund(booking);
      }

      // Step 4: Cancel tickets
      const tickets = await Ticket.findAll({ where: { bookingId: booking.id } });
      if (tickets.length > 0) {
        await TicketService.cancelTickets(tickets.map(t => t.id), reason);
      }

      logger.info(`Booking cancelled: ${booking.bookingReference}`);

      return {
        bookingId: booking.id,
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
      const where = { userId };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.from && filters.to) {
        where.bookingDate = {
          [Op.gte]: new Date(filters.from),
          [Op.lte]: new Date(filters.to),
        };
      }

      const bookings = await Booking.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: filters.limit || 50,
      });

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
      const booking = await Booking.findByPk(bookingId, {
        include: [
          {
            model: Ticket,
            as: 'tickets',
          },
        ],
      });

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
    let voucherDiscountAmount = null;
    let voucherDiscountPercentage = null;

    if (voucherCode) {
      // TODO: Validate voucher code against voucher system
      // Placeholder: 10% discount
      discount = baseTotal * 0.10;
      voucherDiscountAmount = discount;
      voucherDiscountPercentage = 10;
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
      voucherDiscountAmount,
      voucherDiscountPercentage,
    };
  }

  /**
   * Create payment session with Payment Engine
   * @private
   */
  async _createPaymentSession(booking) {
    try {
      const response = await axios.post(`${this.PAYMENT_ENGINE_URL}/api/v1/payments`, {
        amount: Math.round(booking.totalPrice * 100), // cents
        currency: booking.currency,
        resourceType: 'ticket',
        resourceId: booking.id,
        returnUrl: `${process.env.FRONTEND_URL}/booking/complete`,
        metadata: {
          userId: booking.userId,
          bookingReference: booking.bookingReference,
          poiId: booking.poiId,
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
      const refundAmount = booking.totalPrice;

      const response = await axios.post(
        `${this.PAYMENT_ENGINE_URL}/api/v1/payments/${booking.transactionId}/refunds`,
        {
          amount: Math.round(refundAmount * 100), // cents
          reason: `Booking cancellation: ${booking.bookingReference}`,
        }
      );

      return {
        refundId: response.data.refundId,
        amount: refundAmount,
        currency: booking.currency,
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
        const booking = await Booking.findByPk(bookingId);

        // Only release if still pending
        if (booking && booking.status === 'pending') {
          logger.info(`Auto-releasing reservation for booking ${bookingId}`);
          await AvailabilityService.releaseReservation(bookingId);

          booking.status = 'expired';
          booking.isLocked = false;
          await booking.save();
        }
      } catch (error) {
        logger.error('Error in scheduled reservation release:', error);
      }
    }, timeout);
  }
}

module.exports = new BookingService();
