const { Availability } = require('../models');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Availability Service (Sequelize/MySQL)
 * Manages real-time inventory and capacity for POI tickets
 * Uses Redis for caching and MySQL for persistence
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

      // Query database using Sequelize
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);

      const where = {
        poiId,
        date: dateObj,
        isActive: true,
      };

      if (timeslot) {
        where.timeslot = timeslot;
      }

      const availability = await Availability.findOne({ where });

      if (!availability) {
        return {
          available: false,
          reason: 'No availability configured for this date/timeslot',
        };
      }

      const result = {
        available: !availability.isSoldOut && availability.availableCapacity > 0,
        capacity: {
          total: availability.totalCapacity,
          available: availability.availableCapacity,
          booked: availability.bookedCapacity,
          reserved: availability.reservedCapacity,
        },
        pricing: {
          basePrice: parseFloat(availability.basePrice),
          finalPrice: parseFloat(availability.finalPrice),
          currency: availability.currency,
        },
        restrictions: {
          minBooking: availability.minBooking,
          maxBooking: availability.maxBooking,
          cutoffHours: availability.cutoffHours,
        },
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
   * @param {Number} quantity - Number of tickets
   * @param {String} timeslot - Optional timeslot
   * @returns {Promise<Object>} Reservation details with expiry
   */
  async reserveSlot(bookingId, poiId, date, quantity, timeslot = null) {
    try {
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);

      const where = {
        poiId,
        date: dateObj,
        isActive: true,
      };

      if (timeslot) {
        where.timeslot = timeslot;
      }

      const availability = await Availability.findOne({ where });

      if (!availability) {
        throw new Error('Availability not found');
      }

      // Check if enough capacity available
      if (availability.availableCapacity < quantity) {
        throw new Error('Not enough capacity available');
      }

      // Reserve capacity (15 minutes lock)
      availability.reservedCapacity += quantity;
      await availability.save(); // Will auto-calculate availableCapacity via hook

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

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

      const where = {
        poiId,
        date: new Date(date),
        isActive: true,
      };

      if (timeslot) {
        where.timeslot = timeslot;
      }

      const availability = await Availability.findOne({ where });

      if (!availability) {
        throw new Error('Availability not found');
      }

      // Confirm booking: move from reserved to booked
      availability.reservedCapacity = Math.max(0, availability.reservedCapacity - quantity);
      availability.bookedCapacity += quantity;
      await availability.save(); // Will auto-calculate availableCapacity via hook

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

      const where = {
        poiId,
        date: new Date(date),
        isActive: true,
      };

      if (timeslot) {
        where.timeslot = timeslot;
      }

      const availability = await Availability.findOne({ where });

      if (availability) {
        // Release reserved capacity
        availability.reservedCapacity = Math.max(0, availability.reservedCapacity - quantity);
        await availability.save(); // Will auto-calculate availableCapacity via hook
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
   * @param {Number} quantity - Number of tickets to release
   * @param {String} timeslot - Optional timeslot
   * @returns {Promise<void>}
   */
  async cancelBooking(poiId, date, quantity, timeslot = null) {
    try {
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);

      const where = {
        poiId,
        date: dateObj,
        isActive: true,
      };

      if (timeslot) {
        where.timeslot = timeslot;
      }

      const availability = await Availability.findOne({ where });

      if (availability) {
        // Return booked capacity
        availability.bookedCapacity = Math.max(0, availability.bookedCapacity - quantity);
        await availability.save(); // Will auto-calculate availableCapacity via hook
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
      const availabilities = await Availability.findAll({
        where: {
          poiId,
          date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
          isActive: true,
        },
        order: [['date', 'ASC'], ['timeslot', 'ASC']],
      });

      return availabilities.map(avail => ({
        date: avail.date,
        timeslot: avail.timeslot,
        available: !avail.isSoldOut && avail.availableCapacity > 0,
        capacity: {
          total: avail.totalCapacity,
          available: avail.availableCapacity,
          booked: avail.bookedCapacity,
          reserved: avail.reservedCapacity,
        },
        pricing: {
          basePrice: parseFloat(avail.basePrice),
          finalPrice: parseFloat(avail.finalPrice),
          currency: avail.currency,
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
