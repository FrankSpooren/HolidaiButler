const { getModels, Sequelize } = require('../models-sequelize');
const { Op } = Sequelize;
const Redis = require('ioredis');
const logger = require('../utils/logger');

// LAZY LOADING: Get models when needed, not at module load time
const getAvailabilityModel = () => {
  const models = getModels();
  return models.Availability;
};

/**
 * Availability Service (Sequelize Version)
 * Manages real-time inventory and capacity for POI tickets
 * Uses Redis for caching and MySQL for persistence
 *
 * CONVERTED: Mongoose → Sequelize (2025-11-17)
 */
class AvailabilityService {
  constructor() {
    this.redisAvailable = false;
    this.CACHE_PREFIX = 'availability:';
    this.CACHE_TTL = 300; // 5 minutes

    // Initialize Redis with error handling (optional)
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB_AVAILABILITY || 1,
        maxRetriesPerRequest: 3, // Limit retries
        enableReadyCheck: true,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('Redis connection failed after 3 attempts. Running without cache.');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.redis.on('connect', () => {
        this.redisAvailable = true;
        logger.info('Redis connected - caching enabled for AvailabilityService');
      });

      this.redis.on('error', (err) => {
        this.redisAvailable = false;
        logger.warn(`Redis error: ${err.message} - Running without cache`);
      });

      this.redis.on('close', () => {
        this.redisAvailable = false;
        logger.debug('Redis connection closed - caching disabled');
      });
    } catch (error) {
      logger.warn(`Failed to initialize Redis: ${error.message} - Running without cache`);
      this.redis = null;
    }
  }

  /**
   * Check availability for a specific POI, date, and optional timeslot
   * @param {Number} poiId - POI identifier (INT)
   * @param {Date} date - Date to check
   * @param {String} timeslot - Optional timeslot (e.g., "09:00-10:00")
   * @returns {Promise<Object>} Availability data
   */
  async checkAvailability(poiId, date, timeslot = null) {
    try {
      const cacheKey = this._getCacheKey(poiId, date, timeslot);

      // Try cache first (only if Redis is available)
      if (this.redisAvailable && this.redis) {
        try {
          const cached = await this.redis.get(cacheKey);
          if (cached) {
            logger.debug(`Cache hit for availability: ${cacheKey}`);
            return JSON.parse(cached);
          }
        } catch (cacheError) {
          logger.warn(`Redis cache read failed: ${cacheError.message}`);
          // Continue without cache
        }
      }

      // Query database
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);

      const where = {
        poiId: parseInt(poiId),
        date: dateObj,
        isActive: true,
      };

      if (timeslot) {
        where.timeslot = timeslot;
      }

      const availability = await getAvailabilityModel().findOne({ where });

      if (!availability) {
        return {
          available: false,
          reason: 'No availability configured for this date/timeslot',
        };
      }

      const result = {
        available: getAvailabilityModel().isBookable(),
        capacity: {
          total: getAvailabilityModel().totalCapacity,
          available: getAvailabilityModel().availableCapacity,
        },
        pricing: {
          basePrice: getAvailabilityModel().basePrice,
          finalPrice: getAvailabilityModel().finalPrice,
          currency: getAvailabilityModel().currency,
        },
        restrictions: {
          minBooking: getAvailabilityModel().minBooking,
          maxBooking: getAvailabilityModel().maxBooking,
          cutoffHours: getAvailabilityModel().cutoffHours,
        },
        isSoldOut: getAvailabilityModel().isSoldOut,
      };

      // Cache the result (only if Redis is available)
      if (this.redisAvailable && this.redis) {
        try {
          await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
        } catch (cacheError) {
          logger.warn(`Redis cache write failed: ${cacheError.message}`);
          // Continue without cache
        }
      }

      return result;
    } catch (error) {
      logger.error('Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Reserve capacity for a booking (15-minute hold)
   * @param {Number} bookingId - Booking identifier (INT)
   * @param {Number} poiId - POI identifier (INT)
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
        poiId: parseInt(poiId),
        date: dateObj,
        isActive: true,
      };

      if (timeslot) {
        where.timeslot = timeslot;
      }

      const availability = await getAvailabilityModel().findOne({ where });

      if (!availability) {
        throw new Error('Availability not found');
      }

      // Reserve capacity (15 minutes lock) - using instance method
      const expiresAt = await getAvailabilityModel().reserveCapacity(quantity, 900);

      // Store reservation in Redis (only if available)
      if (this.redisAvailable && this.redis) {
        try {
          const reservationKey = `reservation:${bookingId}`;
          await this.redis.setex(
            reservationKey,
            900, // 15 minutes
            JSON.stringify({
              poiId: parseInt(poiId),
              date: dateObj,
              timeslot,
              quantity,
              expiresAt,
            })
          );
        } catch (cacheError) {
          logger.warn(`Redis reservation write failed: ${cacheError.message}`);
          // Continue without cache
        }
      }

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
   * @param {Number} bookingId - Booking identifier (INT)
   * @returns {Promise<void>}
   */
  async confirmReservation(bookingId) {
    try {
      const reservationKey = `reservation:${bookingId}`;
      let reservation = null;

      // Try to get reservation from Redis (only if available)
      if (this.redisAvailable && this.redis) {
        try {
          reservation = await this.redis.get(reservationKey);
        } catch (cacheError) {
          logger.warn(`Redis reservation read failed: ${cacheError.message}`);
          // Continue without cache
        }
      }

      if (!reservation) {
        throw new Error('Reservation not found or expired');
      }

      const { poiId, date, timeslot, quantity } = JSON.parse(reservation);

      const where = {
        poiId: parseInt(poiId),
        date: new Date(date),
        isActive: true,
      };

      if (timeslot) {
        where.timeslot = timeslot;
      }

      const availability = await getAvailabilityModel().findOne({ where });

      if (!availability) {
        throw new Error('Availability not found');
      }

      // Confirm booking - using instance method
      await getAvailabilityModel().confirmBooking(quantity);

      // Remove reservation from Redis (only if available)
      if (this.redisAvailable && this.redis) {
        try {
          await this.redis.del(reservationKey);
        } catch (cacheError) {
          logger.warn(`Redis reservation delete failed: ${cacheError.message}`);
          // Continue without cache
        }
      }

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
   * @param {Number} bookingId - Booking identifier (INT)
   * @returns {Promise<void>}
   */
  async releaseReservation(bookingId) {
    try {
      const reservationKey = `reservation:${bookingId}`;
      let reservation = null;

      // Try to get reservation from Redis (only if available)
      if (this.redisAvailable && this.redis) {
        try {
          reservation = await this.redis.get(reservationKey);
        } catch (cacheError) {
          logger.warn(`Redis reservation read failed: ${cacheError.message}`);
          // Continue without cache
        }
      }

      if (!reservation) {
        logger.warn(`Reservation ${bookingId} not found, may have already expired`);
        return;
      }

      const { poiId, date, timeslot, quantity } = JSON.parse(reservation);

      const where = {
        poiId: parseInt(poiId),
        date: new Date(date),
        isActive: true,
      };

      if (timeslot) {
        where.timeslot = timeslot;
      }

      const availability = await getAvailabilityModel().findOne({ where });

      if (availability) {
        // Release reservation - using instance method
        await getAvailabilityModel().releaseReservation(quantity);
        await this._invalidateCache(poiId, new Date(date), timeslot);
      }

      // Remove reservation from Redis (only if available)
      if (this.redisAvailable && this.redis) {
        try {
          await this.redis.del(reservationKey);
        } catch (cacheError) {
          logger.warn(`Redis reservation delete failed: ${cacheError.message}`);
          // Continue without cache
        }
      }

      logger.info(`Released reservation for booking ${bookingId}`);
    } catch (error) {
      logger.error('Error releasing reservation:', error);
      throw error;
    }
  }

  /**
   * Cancel confirmed booking (return capacity)
   * @param {Number} poiId - POI identifier (INT)
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
        poiId: parseInt(poiId),
        date: dateObj,
        isActive: true,
      };

      if (timeslot) {
        where.timeslot = timeslot;
      }

      const availability = await getAvailabilityModel().findOne({ where });

      if (availability) {
        // Cancel booking - using instance method
        await getAvailabilityModel().cancelBooking(quantity);
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
   * @param {Number} poiId - POI identifier (INT)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of availability data
   */
  async getAvailabilityRange(poiId, startDate, endDate) {
    try {
      // Using static method from Availability model
      const availabilities = await getAvailabilityModel().getAvailabilityRange(
        parseInt(poiId),
        startDate,
        endDate
      );

      return availabilities.map(avail => ({
        date: avail.date,
        timeslot: avail.timeslot,
        available: avail.isBookable(),
        capacity: {
          total: avail.totalCapacity,
          available: avail.availableCapacity,
        },
        pricing: {
          basePrice: avail.basePrice,
          finalPrice: avail.finalPrice,
          currency: avail.currency,
        },
        restrictions: {
          minBooking: avail.minBooking,
          maxBooking: avail.maxBooking,
          cutoffHours: avail.cutoffHours,
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
    if (this.redisAvailable && this.redis) {
      try {
        const cacheKey = this._getCacheKey(poiId, date, timeslot);
        await this.redis.del(cacheKey);
        logger.debug(`Invalidated cache: ${cacheKey}`);
      } catch (cacheError) {
        logger.warn(`Redis cache invalidation failed: ${cacheError.message}`);
        // Continue without cache
      }
    }
  }

  /**
   * Cleanup: Close Redis connection
   */
  async close() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {
        logger.warn(`Error closing Redis connection: ${error.message}`);
      }
    }
  }
}

module.exports = new AvailabilityService();
