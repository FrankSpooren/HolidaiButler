const { Availability } = require('../models');
const Redis = require('ioredis');
const logger = require('../utils/logger');

/**
 * Availability Service
 * Manages real-time inventory and capacity for POI tickets
 * Uses Redis for caching and MongoDB for persistence
 */
class AvailabilityService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB_AVAILABILITY || 1,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.CACHE_PREFIX = 'availability:';
    this.CACHE_TTL = 300; // 5 minutes
  }

  /**
   * Check availability for a specific POI, date, and optional timeslot
   * @param {String} poiId - POI identifier
   * @param {Date} date - Date to check
   * @param {String} timeslot - Optional timeslot (e.g., "09:00-10:00")
   * @returns {Promise<Object>} Availability data
   */
  async checkAvailability(poiId, date, timeslot = null) {
    try {
      const cacheKey = this._getCacheKey(poiId, date, timeslot);

      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for availability: ${cacheKey}`);
        return JSON.parse(cached);
      }

      // Query database
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);

      const query = {
        poiId,
        date: dateObj,
        isActive: true,
      };

      if (timeslot) {
        query.timeslot = timeslot;
      }

      const availability = await Availability.findOne(query);

      if (!availability) {
        return {
          available: false,
          reason: 'No availability configured for this date/timeslot',
        };
      }

      const result = {
        available: availability.isBookable,
        capacity: {
          total: availability.capacity.total,
          available: availability.capacity.available,
        },
        pricing: {
          basePrice: availability.pricing.basePrice,
          finalPrice: availability.pricing.finalPrice,
          currency: availability.pricing.currency,
        },
        restrictions: availability.restrictions,
        isSoldOut: availability.isSoldOut,
      };

      // Cache the result
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error('Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Reserve capacity for a booking (15-minute hold)
   * @param {String} bookingId - Booking identifier
   * @param {String} poiId - POI identifier
   * @param {Date} date - Date
   * @param {String} timeslot - Optional timeslot
   * @param {Number} quantity - Number of tickets
   * @returns {Promise<Object>} Reservation details with expiry
   */
  async reserveSlot(bookingId, poiId, date, quantity, timeslot = null) {
    try {
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);

      const query = {
        poiId,
        date: dateObj,
        isActive: true,
      };

      if (timeslot) {
        query.timeslot = timeslot;
      }

      const availability = await Availability.findOne(query);

      if (!availability) {
        throw new Error('Availability not found');
      }

      // Reserve capacity (15 minutes lock)
      const expiresAt = await availability.reserveCapacity(quantity, 900);

      // Store reservation in Redis
      const reservationKey = `reservation:${bookingId}`;
      await this.redis.setex(
        reservationKey,
        900, // 15 minutes
        JSON.stringify({
          poiId,
          date: dateObj,
          timeslot,
          quantity,
          expiresAt,
        })
      );

      // Invalidate cache
      await this._invalidateCache(poiId, dateObj, timeslot);

      logger.info(`Reserved ${quantity} slots for booking ${bookingId}`);

      return {
        reservationId: bookingId,
        expiresAt,
        quantity,
      };
    } catch (error) {
      logger.error('Error reserving slot:', error);
      throw error;
    }
  }

  /**
   * Confirm booking (convert reservation to booked)
   * @param {String} bookingId - Booking identifier
   * @returns {Promise<void>}
   */
  async confirmReservation(bookingId) {
    try {
      const reservationKey = `reservation:${bookingId}`;
      const reservation = await this.redis.get(reservationKey);

      if (!reservation) {
        throw new Error('Reservation not found or expired');
      }

      const { poiId, date, timeslot, quantity } = JSON.parse(reservation);

      const query = {
        poiId,
        date: new Date(date),
        isActive: true,
      };

      if (timeslot) {
        query.timeslot = timeslot;
      }

      const availability = await Availability.findOne(query);

      if (!availability) {
        throw new Error('Availability not found');
      }

      // Confirm booking
      await availability.confirmBooking(quantity);

      // Remove reservation from Redis
      await this.redis.del(reservationKey);

      // Invalidate cache
      await this._invalidateCache(poiId, new Date(date), timeslot);

      logger.info(`Confirmed reservation for booking ${bookingId}`);
    } catch (error) {
      logger.error('Error confirming reservation:', error);
      throw error;
    }
  }

  /**
   * Release reservation (timeout or cancellation)
   * @param {String} bookingId - Booking identifier
   * @returns {Promise<void>}
   */
  async releaseReservation(bookingId) {
    try {
      const reservationKey = `reservation:${bookingId}`;
      const reservation = await this.redis.get(reservationKey);

      if (!reservation) {
        logger.warn(`Reservation ${bookingId} not found, may have already expired`);
        return;
      }

      const { poiId, date, timeslot, quantity } = JSON.parse(reservation);

      const query = {
        poiId,
        date: new Date(date),
        isActive: true,
      };

      if (timeslot) {
        query.timeslot = timeslot;
      }

      const availability = await Availability.findOne(query);

      if (availability) {
        await availability.releaseReservation(quantity);
        await this._invalidateCache(poiId, new Date(date), timeslot);
      }

      // Remove reservation from Redis
      await this.redis.del(reservationKey);

      logger.info(`Released reservation for booking ${bookingId}`);
    } catch (error) {
      logger.error('Error releasing reservation:', error);
      throw error;
    }
  }

  /**
   * Cancel confirmed booking (return capacity)
   * @param {String} poiId - POI identifier
   * @param {Date} date - Date
   * @param {String} timeslot - Optional timeslot
   * @param {Number} quantity - Number of tickets to release
   * @returns {Promise<void>}
   */
  async cancelBooking(poiId, date, quantity, timeslot = null) {
    try {
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);

      const query = {
        poiId,
        date: dateObj,
        isActive: true,
      };

      if (timeslot) {
        query.timeslot = timeslot;
      }

      const availability = await Availability.findOne(query);

      if (availability) {
        await availability.cancelBooking(quantity);
        await this._invalidateCache(poiId, dateObj, timeslot);
      }

      logger.info(`Cancelled booking: returned ${quantity} slots`);
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw error;
    }
  }

  /**
   * Get availability for a date range (calendar view)
   * @param {String} poiId - POI identifier
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of availability data
   */
  async getAvailabilityRange(poiId, startDate, endDate) {
    try {
      const availabilities = await Availability.getAvailabilityRange(poiId, startDate, endDate);

      return availabilities.map(avail => ({
        date: avail.date,
        timeslot: avail.timeslot,
        available: avail.isBookable,
        capacity: {
          total: avail.capacity.total,
          available: avail.capacity.available,
        },
        pricing: {
          basePrice: avail.pricing.basePrice,
          finalPrice: avail.pricing.finalPrice,
          currency: avail.pricing.currency,
        },
        isSoldOut: avail.isSoldOut,
      }));
    } catch (error) {
      logger.error('Error getting availability range:', error);
      throw error;
    }
  }

  /**
   * Sync partner inventory (scheduled job)
   * @param {String} partnerId - Partner identifier
   * @returns {Promise<Object>} Sync result
   */
  async syncPartnerInventory(partnerId) {
    try {
      // This would integrate with partner APIs
      // For now, placeholder implementation
      logger.info(`Syncing inventory for partner ${partnerId}`);

      // TODO: Implement partner-specific sync logic
      // - Fetch inventory from partner API
      // - Update Availability records
      // - Handle conflicts

      return {
        success: true,
        partnerId,
        syncedAt: new Date(),
        itemsUpdated: 0,
      };
    } catch (error) {
      logger.error('Error syncing partner inventory:', error);
      throw error;
    }
  }

  /**
   * Helper: Generate cache key
   * @private
   */
  _getCacheKey(poiId, date, timeslot) {
    const dateStr = new Date(date).toISOString().split('T')[0];
    const key = `${this.CACHE_PREFIX}${poiId}:${dateStr}`;
    return timeslot ? `${key}:${timeslot}` : key;
  }

  /**
   * Helper: Invalidate cache
   * @private
   */
  async _invalidateCache(poiId, date, timeslot = null) {
    const cacheKey = this._getCacheKey(poiId, date, timeslot);
    await this.redis.del(cacheKey);
    logger.debug(`Invalidated cache: ${cacheKey}`);
  }

  /**
   * Cleanup: Close Redis connection
   */
  async close() {
    await this.redis.quit();
  }
}

module.exports = new AvailabilityService();
