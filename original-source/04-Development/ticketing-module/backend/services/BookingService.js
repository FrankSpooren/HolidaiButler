const { getModels, Sequelize } = require('../models-sequelize');
const { Op } = Sequelize;

// LAZY LOADING: Get models when needed
const getBookingModel = () => getModels().Booking;
const getTicketModel = () => getModels().Ticket;
const AvailabilityService = require('./AvailabilityService');
const TicketService = require('./TicketService');
const logger = require('../utils/logger');
const axios = require('axios');

/**
 * Booking Service (Sequelize Version)
 * Manages ticket bookings lifecycle: create, confirm, cancel
 * Integrates with Availability Service and Payment Engine
 *
 * CONVERTED: Mongoose → Sequelize (2025-11-17)
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

      // Step 3: Create booking record (Sequelize create pattern)
      const bookingRecord = {
        userId: parseInt(userId),
        poiId: parseInt(poiId),
        status: 'pending',
        bookingDate: new Date(date),
        bookingTime: timeslot ? timeslot.split('-')[0] : null,
        durationMinutes: null, // TODO: Get from POI configuration
        adults: quantity,
        children: 0,
        infants: 0,
        pricing,
        experience: {
          productType: productType || 'ticket',
          language: language || 'en',
        },
        guestName: guestInfo.name,
        guestEmail: guestInfo.email,
        guestPhone: guestInfo.phone || null,
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
        reservation: {},
        ticketIds: [],
        deliveryMethod: 'email',
      };

      const booking = await getBookingModel().create(bookingRecord);

      // Step 4: Reserve capacity (15-minute hold)
      try {
        const reservation = await AvailabilityService.reserveSlot(
          getBookingModel().id,
          poiId,
          date,
          quantity,
          timeslot
        );

        getBookingModel().reservation = {
          isLocked: true,
          lockedUntil: reservation.expiresAt,
          lockId: getBookingModel().id,
        };
        await getBookingModel().save();

        // Schedule automatic release if payment not completed
        this._scheduleReservationRelease(getBookingModel().id, this.RESERVATION_TIMEOUT);
      } catch (error) {
        // If reservation fails, delete the booking
        await getBookingModel().destroy();
        throw error;
      }

      // Step 5: Create payment session with Payment Engine
      const paymentSession = await this._createPaymentSession(booking);

      logger.info(`Booking created: ${getBookingModel().bookingReference}`);

      return {
        bookingId: getBookingModel().id,
        bookingReference: getBookingModel().bookingReference,
        status: getBookingModel().status,
        totalPrice: getBookingModel().pricing.totalPrice,
        currency: getBookingModel().pricing.currency,
        expiresAt: getBookingModel().reservation.lockedUntil,
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
   * @param {Number} bookingId - Booking identifier (INT)
   * @param {String} paymentTransactionId - Payment transaction ID from Payment Engine
   * @returns {Promise<Object>} Confirmed booking with tickets
   */
  async confirmBooking(bookingId, paymentTransactionId) {
    try {
      const booking = await getBookingModel().findByPk(bookingId, {
        include: [{ model: POI, as: 'poi' }]
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (getBookingModel().status !== 'pending') {
        throw new Error(`Cannot confirm booking with status: ${getBookingModel().status}`);
      }

      // Step 1: Verify payment with Payment Engine
      const paymentStatus = await this._verifyPayment(paymentTransactionId);

      if (paymentStatus.status !== 'captured' && paymentStatus.status !== 'authorized') {
        throw new Error('Payment not completed');
      }

      // Step 2: Confirm booking (using instance method)
      await getBookingModel().confirmBooking(paymentTransactionId);

      // Step 3: Confirm reservation (convert to booked capacity)
      await AvailabilityService.confirmReservation(bookingId);

      // Step 4: Generate tickets
      const tickets = await TicketService.generateTicketsForBooking(booking);

      getBookingModel().ticketIds = tickets.map(t => t.id);
      getBookingModel().deliveryMethod = 'email'; // Default
      await getBookingModel().save();

      // Step 5: Send tickets to user
      await TicketService.sendTicketsToUser(tickets, getBookingModel().guestEmail);

      getBookingModel().deliveredAt = new Date();
      await getBookingModel().save();

      logger.info(`Booking confirmed: ${getBookingModel().bookingReference}`);

      return {
        bookingId: getBookingModel().id,
        bookingReference: getBookingModel().bookingReference,
        status: getBookingModel().status,
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
   * @param {Number} bookingId - Booking identifier (INT)
   * @param {Number} userId - User initiating cancellation (INT)
   * @param {String} reason - Cancellation reason
   * @returns {Promise<Object>} Cancellation result with refund info
   */
  async cancelBooking(bookingId, userId, reason) {
    try {
      const booking = await getBookingModel().findByPk(bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!getBookingModel().canBeCancelled()) {
        throw new Error('Booking cannot be cancelled');
      }

      // Step 1: Cancel booking (using instance method)
      await getBookingModel().cancelBooking(userId, reason);

      // Step 2: Release or return capacity
      if (getBookingModel().status === 'pending') {
        // Release reservation
        await AvailabilityService.releaseReservation(bookingId);
      } else if (getBookingModel().status === 'confirmed') {
        // Return booked capacity
        const totalGuests = getBookingModel().getTotalGuests();
        await AvailabilityService.cancelBooking(
          getBookingModel().poiId,
          getBookingModel().bookingDate,
          totalGuests,
          getBookingModel().bookingTime
        );
      }

      // Step 3: Process refund if payment was made
      let refundResult = null;
      if (getBookingModel().paymentStatus === 'paid' && getBookingModel().transactionId) {
        refundResult = await this._initiateRefund(booking);
      }

      // Step 4: Cancel tickets
      if (getBookingModel().ticketIds && getBookingModel().ticketIds.length > 0) {
        await TicketService.cancelTickets(getBookingModel().ticketIds, reason);
      }

      logger.info(`Booking cancelled: ${getBookingModel().bookingReference}`);

      return {
        bookingId: getBookingModel().id,
        bookingReference: getBookingModel().bookingReference,
        status: getBookingModel().status,
        refund: refundResult,
      };
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw error;
    }
  }

  /**
   * Get bookings by user
   * @param {Number} userId - User identifier (INT)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of bookings
   */
  async getBookingsByUser(userId, filters = {}) {
    try {
      const where = { userId: parseInt(userId) };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.from && filters.to) {
        where.bookingDate = {
          [Op.gte]: new Date(filters.from),
          [Op.lte]: new Date(filters.to),
        };
      }

      const bookings = await getBookingModel().findAll({
        where,
        include: [
          {
            model: POI,
            as: 'poi',
            attributes: ['id', 'name', 'location', 'images']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: filters.limit || 50
      });

      return bookings;
    } catch (error) {
      logger.error('Error getting bookings:', error);
      throw error;
    }
  }

  /**
   * Get booking by ID
   * @param {Number} bookingId - Booking identifier (INT)
   * @returns {Promise<Object>} Booking details
   */
  async getBookingById(bookingId) {
    try {
      const booking = await getBookingModel().findByPk(bookingId, {
        include: [
          {
            model: POI,
            as: 'poi',
            attributes: ['id', 'name', 'location', 'images', 'description']
          },
          {
            model: Ticket,
            as: 'tickets',
            where: { id: { [Op.in]: Sequelize.col('ticketIds') } },
            required: false
          }
        ]
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
        amount: Math.round(getBookingModel().pricing.totalPrice * 100), // cents
        currency: getBookingModel().pricing.currency,
        resourceType: 'ticket',
        resourceId: getBookingModel().id,
        returnUrl: `${process.env.FRONTEND_URL}/booking/complete`,
        metadata: {
          userId: getBookingModel().userId,
          bookingReference: getBookingModel().bookingReference,
          poiId: getBookingModel().poiId,
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
      const refundAmount = getBookingModel().pricing.totalPrice;

      const response = await axios.post(
        `${this.PAYMENT_ENGINE_URL}/api/v1/payments/${getBookingModel().transactionId}/refunds`,
        {
          amount: Math.round(refundAmount * 100), // cents
          reason: `Booking cancellation: ${getBookingModel().bookingReference}`,
        }
      );

      return {
        refundId: response.data.refundId,
        amount: refundAmount,
        currency: getBookingModel().pricing.currency,
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
        const booking = await getBookingModel().findByPk(bookingId);

        // Only release if still pending
        if (booking && getBookingModel().status === 'pending') {
          logger.info(`Auto-releasing reservation for booking ${bookingId}`);
          await AvailabilityService.releaseReservation(bookingId);

          getBookingModel().status = 'expired';
          getBookingModel().reservation = {
            ...getBookingModel().reservation,
            isLocked: false,
          };
          await getBookingModel().save();
        }
      } catch (error) {
        logger.error('Error in scheduled reservation release:', error);
      }
    }, timeout);
  }
}

module.exports = new BookingService();
