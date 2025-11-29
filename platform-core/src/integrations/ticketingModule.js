/**
 * Ticketing Module Integration
 * Connects platform-core with ticketing-module
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import eventBus from '../services/eventBus.js';

const TICKETING_MODULE_URL = process.env.TICKETING_MODULE_URL || 'http://localhost:3004';

class TicketingModuleIntegration {
  constructor() {
    this.baseURL = TICKETING_MODULE_URL;
    this.client = axios.create({
      baseURL: `${this.baseURL}/api/v1/tickets`,
      timeout: 15000,
    });

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for booking events
    eventBus.on('booking.created', async (data) => {
      logger.integration('ticketing.booking.created', data);
    });

    eventBus.on('booking.confirmed', async (data) => {
      logger.integration('ticketing.booking.confirmed', data);
    });

    eventBus.on('ticket.delivered', async (data) => {
      logger.integration('ticketing.ticket.delivered', data);
    });
  }

  /**
   * Check availability
   */
  async checkAvailability(poiId, params = {}) {
    try {
      const response = await this.client.get(`/availability/${poiId}`, { params });
      return response.data;
    } catch (error) {
      logger.error('Ticketing module: Failed to check availability:', error.message);
      throw error;
    }
  }

  /**
   * Create booking
   */
  async createBooking(bookingData, token) {
    try {
      const response = await this.client.post('/bookings', bookingData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Publish event
      await eventBus.publish('booking.created', {
        bookingId: response.data.id,
        userId: response.data.userId,
        email: response.data.guestInfo?.email,
        bookingReference: response.data.bookingReference,
      });

      return response.data;
    } catch (error) {
      logger.error('Ticketing module: Failed to create booking:', error.message);
      throw error;
    }
  }

  /**
   * Get booking
   */
  async getBooking(bookingId, token) {
    try {
      const response = await this.client.get(`/bookings/${bookingId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error) {
      logger.error(`Ticketing module: Failed to get booking ${bookingId}:`, error.message);
      throw error;
    }
  }

  /**
   * Confirm booking
   */
  async confirmBooking(bookingId, paymentData, token) {
    try {
      const response = await this.client.post(
        `/bookings/${bookingId}/confirm`,
        paymentData,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      // Publish event
      await eventBus.publish('booking.confirmed', {
        bookingId,
        paymentId: paymentData.paymentId,
      });

      return response.data;
    } catch (error) {
      logger.error(`Ticketing module: Failed to confirm booking ${bookingId}:`, error.message);
      throw error;
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId, reason, token) {
    try {
      const response = await this.client.put(
        `/bookings/${bookingId}/cancel`,
        { reason },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      // Publish event
      await eventBus.publish('booking.cancelled', {
        bookingId,
        reason,
      });

      return response.data;
    } catch (error) {
      logger.error(`Ticketing module: Failed to cancel booking ${bookingId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get user bookings
   */
  async getUserBookings(userId, token) {
    try {
      const response = await this.client.get(`/bookings/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      logger.error(`Ticketing module: Failed to get user bookings for ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get ticket
   */
  async getTicket(ticketId, token) {
    try {
      const response = await this.client.get(`/${ticketId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error) {
      logger.error(`Ticketing module: Failed to get ticket ${ticketId}:`, error.message);
      throw error;
    }
  }

  /**
   * Resend ticket
   */
  async resendTicket(ticketId, email, token) {
    try {
      const response = await this.client.post(
        `/${ticketId}/resend`,
        { email },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`Ticketing module: Failed to resend ticket ${ticketId}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate ticket
   */
  async validateTicket(qrCodeData) {
    try {
      const response = await this.client.post('/validate', { qrCodeData });
      return response.data;
    } catch (error) {
      logger.error('Ticketing module: Failed to validate ticket:', error.message);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, { timeout: 3000 });
      return response.status === 200;
    } catch (error) {
      logger.error('Ticketing module health check failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
const ticketingModuleIntegration = new TicketingModuleIntegration();
export default ticketingModuleIntegration;
