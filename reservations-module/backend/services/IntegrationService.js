/**
 * Integration Service
 * Handles external integrations: TheFork, Google Reservations, POS systems
 */

const axios = require('axios');
const crypto = require('crypto');
const { Restaurant, Reservation } = require('../models');
const { getCircuitBreaker } = require('../utils/circuitBreaker');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class IntegrationService {
  constructor() {
    // TheFork configuration
    this.theForkApiKey = process.env.THEFORK_API_KEY;
    this.theForkApiUrl = process.env.THEFORK_API_URL || 'https://api.thefork.com/v1';
    this.theForkWebhookSecret = process.env.THEFORK_WEBHOOK_SECRET;

    // Google Reservations configuration
    this.googleApiKey = process.env.GOOGLE_RESERVATIONS_API_KEY;
    this.googlePartnerId = process.env.GOOGLE_RESERVATIONS_PARTNER_ID;
    this.googleApiUrl = 'https://www.googleapis.com/maps/business/v1';

    // POS configurations
    this.posConfigs = {
      toast: {
        apiKey: process.env.TOAST_API_KEY,
        apiUrl: 'https://api.toasttab.com/v1',
      },
      square: {
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        apiUrl: 'https://connect.squareup.com/v2',
      },
      lightspeed: {
        apiKey: process.env.LIGHTSPEED_API_KEY,
        apiUrl: 'https://api.lightspeedhq.com/v1',
      },
    };

    // Circuit breakers for external services
    this.theForkBreaker = getCircuitBreaker('thefork', {
      failureThreshold: 5,
      resetTimeout: 120000,
    });

    this.googleBreaker = getCircuitBreaker('google-reservations', {
      failureThreshold: 5,
      resetTimeout: 120000,
    });

    this.posBreaker = getCircuitBreaker('pos', {
      failureThreshold: 3,
      resetTimeout: 60000,
    });
  }

  // ========== THEFORK INTEGRATION ==========

  /**
   * Sync reservation to TheFork
   */
  async syncToTheFork(reservation, action = 'create') {
    if (!this.theForkApiKey || !process.env.ENABLE_THEFORK_SYNC) {
      return { synced: false, reason: 'TheFork sync disabled' };
    }

    const restaurant = await Restaurant.findByPk(reservation.restaurant_id);
    if (!restaurant?.thefork_id) {
      return { synced: false, reason: 'Restaurant not linked to TheFork' };
    }

    const payload = {
      restaurant_id: restaurant.thefork_id,
      reservation: {
        external_id: reservation.id,
        reference: reservation.reservation_reference,
        date: reservation.reservation_date,
        time: reservation.reservation_time,
        covers: reservation.party_size,
        guest: {
          name: reservation.guest_name,
          email: reservation.guest_email,
          phone: reservation.guest_phone,
        },
        status: this.mapStatusToTheFork(reservation.status),
        special_requests: reservation.special_requests,
      },
    };

    try {
      const result = await this.theForkBreaker.execute(
        () => this.makeTheForkRequest(`/reservations/${action}`, 'POST', payload),
        () => ({ synced: false, queued: true })
      );

      logger.info(`TheFork sync (${action}): ${reservation.id} -> ${result.thefork_id || 'queued'}`);

      // Store TheFork reference
      if (result.thefork_id) {
        await reservation.update({
          external_reference: result.thefork_id,
          external_source: 'thefork',
        });
      }

      return { synced: true, externalId: result.thefork_id };
    } catch (error) {
      logger.error(`TheFork sync failed for ${reservation.id}:`, error);
      return { synced: false, error: error.message };
    }
  }

  /**
   * Process TheFork webhook
   */
  async processTheForkWebhook(event, payload, signature) {
    // Verify signature
    if (!this.verifyTheForkSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    logger.info(`TheFork webhook received: ${event}`);

    switch (event) {
      case 'reservation.created':
        return this.handleTheForkReservationCreated(payload);

      case 'reservation.modified':
        return this.handleTheForkReservationModified(payload);

      case 'reservation.cancelled':
        return this.handleTheForkReservationCancelled(payload);

      case 'reservation.confirmed':
        return this.handleTheForkReservationConfirmed(payload);

      default:
        logger.warn(`Unknown TheFork event: ${event}`);
        return { processed: false, reason: 'Unknown event' };
    }
  }

  /**
   * Handle TheFork reservation created
   */
  async handleTheForkReservationCreated(payload) {
    // Find restaurant by TheFork ID
    const restaurant = await Restaurant.findOne({
      where: { thefork_id: payload.restaurant_id },
    });

    if (!restaurant) {
      throw new Error(`Restaurant not found for TheFork ID: ${payload.restaurant_id}`);
    }

    // Import to our system
    const ReservationService = require('./ReservationService');

    const reservation = await ReservationService.createReservation({
      restaurantId: restaurant.id,
      guestEmail: payload.guest.email,
      date: payload.date,
      time: payload.time,
      partySize: payload.covers,
      guestInfo: {
        firstName: payload.guest.first_name,
        lastName: payload.guest.last_name,
        phone: payload.guest.phone,
      },
      specialRequests: payload.special_requests,
      source: 'thefork',
    });

    // Store external reference
    await reservation.reservation.update({
      external_reference: payload.thefork_reservation_id,
      external_source: 'thefork',
    });

    return { processed: true, reservationId: reservation.reservation.id };
  }

  /**
   * Handle TheFork reservation modified
   */
  async handleTheForkReservationModified(payload) {
    const reservation = await Reservation.findOne({
      where: { external_reference: payload.thefork_reservation_id },
    });

    if (!reservation) {
      logger.warn(`Reservation not found for TheFork modification: ${payload.thefork_reservation_id}`);
      return { processed: false, reason: 'Reservation not found' };
    }

    const ReservationService = require('./ReservationService');

    await ReservationService.modifyReservation(reservation.id, {
      date: payload.date,
      time: payload.time,
      partySize: payload.covers,
      specialRequests: payload.special_requests,
    });

    return { processed: true, reservationId: reservation.id };
  }

  /**
   * Handle TheFork reservation cancelled
   */
  async handleTheForkReservationCancelled(payload) {
    const reservation = await Reservation.findOne({
      where: { external_reference: payload.thefork_reservation_id },
    });

    if (!reservation) {
      return { processed: false, reason: 'Reservation not found' };
    }

    const ReservationService = require('./ReservationService');

    await ReservationService.cancelReservation(
      reservation.id,
      'thefork',
      payload.cancellation_reason
    );

    return { processed: true, reservationId: reservation.id };
  }

  /**
   * Handle TheFork reservation confirmed
   */
  async handleTheForkReservationConfirmed(payload) {
    const reservation = await Reservation.findOne({
      where: { external_reference: payload.thefork_reservation_id },
    });

    if (!reservation) {
      return { processed: false, reason: 'Reservation not found' };
    }

    if (reservation.status === 'pending_confirmation') {
      const ReservationService = require('./ReservationService');
      await ReservationService.confirmReservation(reservation.id);
    }

    return { processed: true, reservationId: reservation.id };
  }

  /**
   * Verify TheFork webhook signature
   */
  verifyTheForkSignature(payload, signature) {
    if (!this.theForkWebhookSecret) return true; // Skip if not configured

    const expectedSignature = crypto
      .createHmac('sha256', this.theForkWebhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Map status to TheFork format
   */
  mapStatusToTheFork(status) {
    const mapping = {
      pending_confirmation: 'PENDING',
      confirmed: 'CONFIRMED',
      seated: 'CHECKED_IN',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
      no_show: 'NO_SHOW',
    };
    return mapping[status] || 'PENDING';
  }

  /**
   * Make TheFork API request
   */
  async makeTheForkRequest(endpoint, method = 'GET', data = null) {
    const config = {
      method,
      url: `${this.theForkApiUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.theForkApiKey}`,
      },
      timeout: 30000,
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  // ========== GOOGLE RESERVATIONS INTEGRATION ==========

  /**
   * Sync availability to Google
   */
  async syncAvailabilityToGoogle(restaurantId, dateRange) {
    if (!this.googleApiKey || !process.env.ENABLE_GOOGLE_SYNC) {
      return { synced: false, reason: 'Google sync disabled' };
    }

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant?.google_place_id) {
      return { synced: false, reason: 'Restaurant not linked to Google' };
    }

    const AvailabilityService = require('./AvailabilityService');

    const availability = await AvailabilityService.getAvailabilityRange(
      restaurantId,
      dateRange.start,
      dateRange.end,
      2 // Minimum party size
    );

    const slots = availability.flatMap(day =>
      day.slots.map(slot => ({
        date: day.date,
        time: slot.time,
        available: slot.available_capacity > 0,
        max_party_size: Math.min(slot.available_capacity, restaurant.max_party_size),
      }))
    );

    try {
      const result = await this.googleBreaker.execute(
        () => this.makeGoogleRequest('/availability', 'POST', {
          merchant_id: restaurant.google_place_id,
          slots,
        }),
        () => ({ synced: false, queued: true })
      );

      logger.info(`Google availability sync: ${restaurantId} (${slots.length} slots)`);

      return { synced: true, slotsUpdated: slots.length };
    } catch (error) {
      logger.error(`Google sync failed for ${restaurantId}:`, error);
      return { synced: false, error: error.message };
    }
  }

  /**
   * Process Google reservation webhook
   */
  async processGoogleWebhook(event, payload) {
    logger.info(`Google webhook received: ${event}`);

    switch (event) {
      case 'booking.created':
        return this.handleGoogleBookingCreated(payload);

      case 'booking.cancelled':
        return this.handleGoogleBookingCancelled(payload);

      default:
        return { processed: false, reason: 'Unknown event' };
    }
  }

  /**
   * Handle Google booking created
   */
  async handleGoogleBookingCreated(payload) {
    const restaurant = await Restaurant.findOne({
      where: { google_place_id: payload.merchant_id },
    });

    if (!restaurant) {
      throw new Error(`Restaurant not found for Google Place ID: ${payload.merchant_id}`);
    }

    const ReservationService = require('./ReservationService');

    const reservation = await ReservationService.createReservation({
      restaurantId: restaurant.id,
      guestEmail: payload.user.email,
      date: payload.slot.date,
      time: payload.slot.time,
      partySize: payload.party_size,
      guestInfo: {
        firstName: payload.user.given_name,
        lastName: payload.user.family_name,
        phone: payload.user.phone,
      },
      source: 'google',
    });

    await reservation.reservation.update({
      external_reference: payload.booking_id,
      external_source: 'google',
    });

    return { processed: true, reservationId: reservation.reservation.id };
  }

  /**
   * Handle Google booking cancelled
   */
  async handleGoogleBookingCancelled(payload) {
    const reservation = await Reservation.findOne({
      where: { external_reference: payload.booking_id },
    });

    if (!reservation) {
      return { processed: false, reason: 'Reservation not found' };
    }

    const ReservationService = require('./ReservationService');

    await ReservationService.cancelReservation(
      reservation.id,
      'google',
      'Cancelled via Google'
    );

    return { processed: true };
  }

  /**
   * Make Google API request
   */
  async makeGoogleRequest(endpoint, method = 'GET', data = null) {
    const config = {
      method,
      url: `${this.googleApiUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.googleApiKey}`,
      },
      params: {
        partnerId: this.googlePartnerId,
      },
      timeout: 30000,
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  // ========== POS INTEGRATION ==========

  /**
   * Sync reservation to POS
   */
  async syncToPOS(reservation, posType = 'toast') {
    const posConfig = this.posConfigs[posType];

    if (!posConfig?.apiKey || !process.env.ENABLE_POS_INTEGRATION) {
      return { synced: false, reason: 'POS integration disabled' };
    }

    const restaurant = await Restaurant.findByPk(reservation.restaurant_id);
    if (!restaurant?.pos_location_id) {
      return { synced: false, reason: 'Restaurant not linked to POS' };
    }

    const posPayload = this.buildPOSPayload(reservation, restaurant, posType);

    try {
      const result = await this.posBreaker.execute(
        () => this.makePOSRequest(posType, '/reservations', 'POST', posPayload),
        () => ({ synced: false, queued: true })
      );

      logger.info(`POS sync (${posType}): ${reservation.id}`);

      return { synced: true, posReference: result.id };
    } catch (error) {
      logger.error(`POS sync failed for ${reservation.id}:`, error);
      return { synced: false, error: error.message };
    }
  }

  /**
   * Build POS-specific payload
   */
  buildPOSPayload(reservation, restaurant, posType) {
    const basePayload = {
      location_id: restaurant.pos_location_id,
      reservation_date: reservation.reservation_date,
      reservation_time: reservation.reservation_time,
      party_size: reservation.party_size,
      guest_name: reservation.guest_name,
      guest_phone: reservation.guest_phone,
      notes: reservation.special_requests,
      reference: reservation.reservation_reference,
    };

    // POS-specific transformations
    switch (posType) {
      case 'toast':
        return {
          ...basePayload,
          restaurantGuid: restaurant.pos_location_id,
          covers: reservation.party_size,
        };

      case 'square':
        return {
          ...basePayload,
          customer_note: reservation.special_requests,
          start_at: `${reservation.reservation_date}T${reservation.reservation_time}:00`,
        };

      case 'lightspeed':
        return {
          ...basePayload,
          covers: reservation.party_size,
          datetime: `${reservation.reservation_date} ${reservation.reservation_time}`,
        };

      default:
        return basePayload;
    }
  }

  /**
   * Make POS API request
   */
  async makePOSRequest(posType, endpoint, method = 'GET', data = null) {
    const posConfig = this.posConfigs[posType];

    const config = {
      method,
      url: `${posConfig.apiUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${posConfig.accessToken || posConfig.apiKey}`,
      },
      timeout: 15000,
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get integration status
   */
  getIntegrationStatus() {
    return {
      thefork: {
        enabled: !!this.theForkApiKey && process.env.ENABLE_THEFORK_SYNC === 'true',
        circuitBreaker: this.theForkBreaker.getStatus(),
      },
      google: {
        enabled: !!this.googleApiKey && process.env.ENABLE_GOOGLE_SYNC === 'true',
        circuitBreaker: this.googleBreaker.getStatus(),
      },
      pos: {
        enabled: process.env.ENABLE_POS_INTEGRATION === 'true',
        configured: Object.keys(this.posConfigs).filter(k => this.posConfigs[k].apiKey),
        circuitBreaker: this.posBreaker.getStatus(),
      },
    };
  }

  /**
   * Health check for all integrations
   */
  async healthCheck() {
    const results = {
      thefork: { healthy: false },
      google: { healthy: false },
      pos: { healthy: false },
    };

    // Check TheFork
    if (this.theForkApiKey) {
      try {
        await axios.get(`${this.theForkApiUrl}/health`, {
          headers: { Authorization: `Bearer ${this.theForkApiKey}` },
          timeout: 5000,
        });
        results.thefork.healthy = true;
      } catch (error) {
        results.thefork.error = error.message;
      }
    }

    // Check Google
    if (this.googleApiKey) {
      try {
        await axios.get(`${this.googleApiUrl}/health`, {
          headers: { Authorization: `Bearer ${this.googleApiKey}` },
          timeout: 5000,
        });
        results.google.healthy = true;
      } catch (error) {
        results.google.error = error.message;
      }
    }

    return results;
  }
}

module.exports = new IntegrationService();
