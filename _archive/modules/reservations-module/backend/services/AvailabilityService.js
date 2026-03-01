/**
 * Availability Service
 * Manages real-time capacity checking, slot locking, and availability calculations
 */

const { RestaurantAvailability, Restaurant, Reservation, Table } = require('../models');
const { Op } = require('sequelize');
const cacheService = require('./cache');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class AvailabilityService {
  /**
   * Check availability for a specific date/time
   */
  async checkAvailability({ restaurantId, date, time, partySize }) {
    // Check cache first
    const cacheKey = `${restaurantId}:${date}`;
    const cachedAvailability = await cacheService.getAvailability(restaurantId, date);

    if (cachedAvailability && time) {
      const slot = cachedAvailability.slots?.find(s => s.time === time);
      if (slot) {
        return {
          available: slot.available_capacity >= partySize && !slot.is_locked,
          capacity: slot,
          cached: true,
        };
      }
    }

    // Get restaurant settings
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Check if restaurant accepts reservations
    if (!restaurant.canAcceptReservations || (typeof restaurant.canAcceptReservations === 'function' && !restaurant.canAcceptReservations())) {
      return {
        available: false,
        reason: 'Restaurant is not accepting reservations',
      };
    }

    // Validate booking date
    const requestedDate = moment(date);
    const today = moment().startOf('day');
    const maxBookingDate = moment().add(restaurant.advance_booking_days || 90, 'days');

    if (requestedDate.isBefore(today)) {
      return {
        available: false,
        reason: 'Cannot book in the past',
      };
    }

    if (requestedDate.isAfter(maxBookingDate)) {
      return {
        available: false,
        reason: `Bookings can only be made up to ${restaurant.advance_booking_days || 90} days in advance`,
      };
    }

    // Check same-day booking cutoff
    if (requestedDate.isSame(today, 'day') && time) {
      const cutoffHours = restaurant.same_day_booking_cutoff || 2;
      const requestedTime = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
      const cutoffTime = moment().add(cutoffHours, 'hours');

      if (requestedTime.isBefore(cutoffTime)) {
        return {
          available: false,
          reason: `Same-day bookings require ${cutoffHours} hours advance notice`,
        };
      }
    }

    // Get or create availability slots for the date
    const availability = await this.getOrCreateDailyAvailability(restaurantId, date, restaurant);

    // Find specific time slot if provided
    if (time) {
      const slot = availability.find(a => a.time_slot === time);

      if (!slot) {
        return {
          available: false,
          reason: 'Time slot not available',
        };
      }

      // Check if slot is locked
      const isLocked = await cacheService.isLocked(restaurantId, date, time);

      if (isLocked) {
        return {
          available: false,
          reason: 'Time slot is temporarily held',
        };
      }

      const availableCapacity = slot.total_capacity - slot.booked_capacity - slot.reserved_capacity;

      return {
        available: availableCapacity >= partySize,
        capacity: {
          time: time,
          total_capacity: slot.total_capacity,
          booked_capacity: slot.booked_capacity,
          reserved_capacity: slot.reserved_capacity,
          available_capacity: availableCapacity,
        },
        slot,
      };
    }

    // Return all available slots for the day
    const availableSlots = availability
      .filter(a => (a.total_capacity - a.booked_capacity - a.reserved_capacity) >= partySize)
      .map(a => ({
        time: a.time_slot,
        available_capacity: a.total_capacity - a.booked_capacity - a.reserved_capacity,
      }));

    // Cache results
    await cacheService.cacheAvailability(restaurantId, date, {
      slots: availability.map(a => ({
        time: a.time_slot,
        total_capacity: a.total_capacity,
        booked_capacity: a.booked_capacity,
        reserved_capacity: a.reserved_capacity,
        available_capacity: a.total_capacity - a.booked_capacity - a.reserved_capacity,
      })),
    });

    return {
      available: availableSlots.length > 0,
      slots: availableSlots,
      date,
      partySize,
    };
  }

  /**
   * Get or create daily availability slots
   */
  async getOrCreateDailyAvailability(restaurantId, date, restaurant = null) {
    if (!restaurant) {
      restaurant = await Restaurant.findByPk(restaurantId);
    }

    // Check existing slots
    const existingSlots = await RestaurantAvailability.findAll({
      where: {
        restaurant_id: restaurantId,
        date,
      },
      order: [['time_slot', 'ASC']],
    });

    if (existingSlots.length > 0) {
      return existingSlots;
    }

    // Generate slots based on restaurant opening hours
    const slots = await this.generateDailySlots(restaurantId, date, restaurant);

    return slots;
  }

  /**
   * Generate time slots for a day
   */
  async generateDailySlots(restaurantId, date, restaurant = null) {
    if (!restaurant) {
      restaurant = await Restaurant.findByPk(restaurantId);
    }

    const dayOfWeek = moment(date).format('dddd').toLowerCase();
    const openingHours = restaurant.opening_hours?.[dayOfWeek];

    if (!openingHours || openingHours.closed) {
      return [];
    }

    // Get total table capacity
    const tables = await Table.findAll({
      where: {
        restaurant_id: restaurantId,
        is_active: true,
      },
    });

    const totalCapacity = tables.reduce((sum, table) => sum + table.max_capacity, 0);
    const slotDuration = 30; // 30-minute slots

    const slots = [];
    let currentTime = moment(`${date} ${openingHours.open}`, 'YYYY-MM-DD HH:mm');
    const closeTime = moment(`${date} ${openingHours.close}`, 'YYYY-MM-DD HH:mm');

    // Last booking should be at least seating_duration before closing
    const lastBookingTime = closeTime.clone().subtract(restaurant.default_seating_duration || 90, 'minutes');

    while (currentTime.isSameOrBefore(lastBookingTime)) {
      const timeSlot = currentTime.format('HH:mm');

      // Check existing reservations for this slot
      const reservationCount = await Reservation.count({
        where: {
          restaurant_id: restaurantId,
          reservation_date: date,
          reservation_time: timeSlot,
          status: {
            [Op.in]: ['pending_confirmation', 'confirmed', 'seated'],
          },
        },
      });

      const slot = await RestaurantAvailability.create({
        restaurant_id: restaurantId,
        date,
        time_slot: timeSlot,
        total_capacity: totalCapacity,
        booked_capacity: reservationCount,
        reserved_capacity: 0,
        is_open: true,
      });

      slots.push(slot);
      currentTime.add(slotDuration, 'minutes');
    }

    return slots;
  }

  /**
   * Reserve capacity (15-minute hold)
   */
  async reserveCapacity({ restaurantId, date, time, partySize, reservationId }) {
    const lockId = reservationId || `lock_${Date.now()}`;

    // Try to acquire lock
    const lockAcquired = await cacheService.acquireLock(restaurantId, date, time, lockId);

    if (!lockAcquired) {
      throw new Error('Time slot is already being held by another reservation');
    }

    // Update availability
    const slot = await RestaurantAvailability.findOne({
      where: {
        restaurant_id: restaurantId,
        date,
        time_slot: time,
      },
    });

    if (slot) {
      await slot.update({
        reserved_capacity: slot.reserved_capacity + partySize,
      });
    }

    // Invalidate cache
    await cacheService.invalidateAvailability(restaurantId, date);

    logger.info(`Capacity reserved: ${restaurantId}/${date}/${time} for ${partySize} (lock: ${lockId})`);

    return { lockId, expiresAt: Date.now() + 15 * 60 * 1000 };
  }

  /**
   * Confirm reservation (move from reserved to booked)
   */
  async confirmReservation(reservationId) {
    const reservation = await Reservation.findByPk(reservationId);

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const slot = await RestaurantAvailability.findOne({
      where: {
        restaurant_id: reservation.restaurant_id,
        date: reservation.reservation_date,
        time_slot: reservation.reservation_time,
      },
    });

    if (slot) {
      await slot.update({
        reserved_capacity: Math.max(0, slot.reserved_capacity - reservation.party_size),
        booked_capacity: slot.booked_capacity + reservation.party_size,
      });
    }

    // Release lock
    await cacheService.releaseLock(
      reservation.restaurant_id,
      reservation.reservation_date,
      reservation.reservation_time,
      reservationId
    );

    // Invalidate cache
    await cacheService.invalidateAvailability(reservation.restaurant_id, reservation.reservation_date);

    logger.info(`Reservation confirmed: ${reservationId}`);

    return true;
  }

  /**
   * Release reservation (cancel or no-show)
   */
  async releaseReservation(reservationId, wasConfirmed = false) {
    const reservation = await Reservation.findByPk(reservationId);

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const slot = await RestaurantAvailability.findOne({
      where: {
        restaurant_id: reservation.restaurant_id,
        date: reservation.reservation_date,
        time_slot: reservation.reservation_time,
      },
    });

    if (slot) {
      if (wasConfirmed) {
        await slot.update({
          booked_capacity: Math.max(0, slot.booked_capacity - reservation.party_size),
        });
      } else {
        await slot.update({
          reserved_capacity: Math.max(0, slot.reserved_capacity - reservation.party_size),
        });
      }
    }

    // Release lock
    await cacheService.releaseLock(
      reservation.restaurant_id,
      reservation.reservation_date,
      reservation.reservation_time,
      reservationId
    );

    // Invalidate cache
    await cacheService.invalidateAvailability(reservation.restaurant_id, reservation.reservation_date);

    logger.info(`Reservation released: ${reservationId}`);

    return true;
  }

  /**
   * Get availability for a date range
   */
  async getAvailabilityRange(restaurantId, startDate, endDate, partySize) {
    const dates = [];
    let currentDate = moment(startDate);
    const end = moment(endDate);

    while (currentDate.isSameOrBefore(end)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const availability = await this.checkAvailability({
        restaurantId,
        date: dateStr,
        partySize,
      });

      dates.push({
        date: dateStr,
        dayOfWeek: currentDate.format('dddd'),
        available: availability.available,
        slots: availability.slots || [],
      });

      currentDate.add(1, 'day');
    }

    return dates;
  }

  /**
   * Expire pending reservations (cron job)
   */
  async expirePendingReservations() {
    const lockTimeout = parseInt(process.env.RESERVATION_LOCK_DURATION) || 900; // 15 minutes
    const expireTime = new Date(Date.now() - lockTimeout * 1000);

    // Find expired pending reservations
    const expiredReservations = await Reservation.findAll({
      where: {
        status: 'pending_confirmation',
        deposit_status: 'pending',
        createdAt: {
          [Op.lt]: expireTime,
        },
      },
    });

    for (const reservation of expiredReservations) {
      try {
        // Release capacity
        await this.releaseReservation(reservation.id, false);

        // Update reservation status
        await reservation.update({
          status: 'cancelled',
          cancellation_reason: 'Payment timeout - reservation expired',
          cancelled_at: new Date(),
          cancelled_by: 'system',
        });

        logger.info(`Expired pending reservation: ${reservation.id}`);
      } catch (error) {
        logger.error(`Failed to expire reservation ${reservation.id}:`, error);
      }
    }

    return { expired: expiredReservations.length };
  }

  /**
   * Block time slot manually
   */
  async blockTimeSlot(restaurantId, date, time, reason = 'Manually blocked') {
    let slot = await RestaurantAvailability.findOne({
      where: {
        restaurant_id: restaurantId,
        date,
        time_slot: time,
      },
    });

    if (!slot) {
      // Create blocked slot
      slot = await RestaurantAvailability.create({
        restaurant_id: restaurantId,
        date,
        time_slot: time,
        total_capacity: 0,
        booked_capacity: 0,
        reserved_capacity: 0,
        is_open: false,
        block_reason: reason,
      });
    } else {
      await slot.update({
        is_open: false,
        block_reason: reason,
      });
    }

    // Invalidate cache
    await cacheService.invalidateAvailability(restaurantId, date);

    logger.info(`Time slot blocked: ${restaurantId}/${date}/${time}`);

    return slot;
  }

  /**
   * Unblock time slot
   */
  async unblockTimeSlot(restaurantId, date, time) {
    const slot = await RestaurantAvailability.findOne({
      where: {
        restaurant_id: restaurantId,
        date,
        time_slot: time,
      },
    });

    if (!slot) {
      throw new Error('Time slot not found');
    }

    await slot.update({
      is_open: true,
      block_reason: null,
    });

    // Invalidate cache
    await cacheService.invalidateAvailability(restaurantId, date);

    logger.info(`Time slot unblocked: ${restaurantId}/${date}/${time}`);

    return slot;
  }

  /**
   * Get restaurant capacity stats
   */
  async getCapacityStats(restaurantId, date) {
    const slots = await RestaurantAvailability.findAll({
      where: {
        restaurant_id: restaurantId,
        date,
      },
    });

    const totalSlots = slots.length;
    const openSlots = slots.filter(s => s.is_open).length;

    const totalCapacity = slots.reduce((sum, s) => sum + s.total_capacity, 0);
    const bookedCapacity = slots.reduce((sum, s) => sum + s.booked_capacity, 0);
    const reservedCapacity = slots.reduce((sum, s) => sum + s.reserved_capacity, 0);

    return {
      date,
      totalSlots,
      openSlots,
      blockedSlots: totalSlots - openSlots,
      capacity: {
        total: totalCapacity,
        booked: bookedCapacity,
        reserved: reservedCapacity,
        available: totalCapacity - bookedCapacity - reservedCapacity,
      },
      utilizationRate: totalCapacity > 0
        ? Math.round((bookedCapacity / totalCapacity) * 100)
        : 0,
    };
  }
}

module.exports = new AvailabilityService();
