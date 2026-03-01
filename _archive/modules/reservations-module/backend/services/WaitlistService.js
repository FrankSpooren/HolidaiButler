/**
 * Waitlist Service
 * Manages waitlist entries, notifications, and conversions to reservations
 */

const { Waitlist, Guest, Restaurant, Reservation } = require('../models');
const { Op } = require('sequelize');
const NotificationService = require('./NotificationService');
const AvailabilityService = require('./AvailabilityService');
const GuestCRMService = require('./GuestCRMService');
const cacheService = require('./cache');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class WaitlistService {
  /**
   * Add entry to waitlist
   */
  async addToWaitlist(waitlistData) {
    const {
      restaurantId,
      guestEmail,
      guestInfo,
      preferred_date,
      preferred_time_start,
      preferred_time_end,
      party_size,
      flexibility,
      notes,
    } = waitlistData;

    // Validate restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Get or create guest
    const guest = await GuestCRMService.createOrUpdateGuest({
      email: guestEmail,
      firstName: guestInfo.firstName,
      lastName: guestInfo.lastName,
      phone: guestInfo.phone,
    });

    // Check if already on waitlist for this date
    const existingEntry = await Waitlist.findOne({
      where: {
        restaurant_id: restaurantId,
        guest_id: guest.id,
        preferred_date,
        status: { [Op.in]: ['waiting', 'notified'] },
      },
    });

    if (existingEntry) {
      throw new Error('You are already on the waitlist for this date');
    }

    // Calculate position
    const position = await this.calculatePosition(restaurantId, preferred_date);

    // Create waitlist entry
    const entry = await Waitlist.create({
      restaurant_id: restaurantId,
      guest_id: guest.id,
      guest_name: `${guestInfo.firstName} ${guestInfo.lastName}`,
      guest_email: guestEmail,
      guest_phone: guestInfo.phone,
      preferred_date,
      preferred_time_start,
      preferred_time_end,
      party_size,
      flexibility: flexibility || 'flexible_time',
      notes,
      status: 'waiting',
      position,
      expires_at: moment(preferred_date).add(7, 'days').toDate(),
    });

    logger.info(`Waitlist entry created: ${entry.id} for ${restaurantId} on ${preferred_date}`);

    return entry;
  }

  /**
   * Calculate waitlist position
   */
  async calculatePosition(restaurantId, date) {
    const count = await Waitlist.count({
      where: {
        restaurant_id: restaurantId,
        preferred_date: date,
        status: { [Op.in]: ['waiting', 'notified'] },
      },
    });

    return count + 1;
  }

  /**
   * Get waitlist entry by ID
   */
  async getWaitlistEntry(entryId) {
    const entry = await Waitlist.findByPk(entryId, {
      include: [
        { model: Guest, as: 'guest' },
        { model: Restaurant, as: 'restaurant' },
      ],
    });

    return entry;
  }

  /**
   * Get waitlist for restaurant
   */
  async getWaitlistByRestaurant(restaurantId, options = {}) {
    const { date, status, page = 1, limit = 50 } = options;

    const where = { restaurant_id: restaurantId };

    if (date) {
      where.preferred_date = date;
    }

    if (status) {
      where.status = status;
    } else {
      where.status = { [Op.in]: ['waiting', 'notified'] };
    }

    const { count, rows } = await Waitlist.findAndCountAll({
      where,
      include: [{ model: Guest, as: 'guest' }],
      order: [
        ['preferred_date', 'ASC'],
        ['position', 'ASC'],
      ],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      entries: rows,
      total: count,
      page,
      pages: Math.ceil(count / limit),
    };
  }

  /**
   * Get waitlist for guest
   */
  async getWaitlistByGuest(guestId, options = {}) {
    const { status, page = 1, limit = 20 } = options;

    const where = { guest_id: guestId };

    if (status) {
      where.status = status;
    }

    const { count, rows } = await Waitlist.findAndCountAll({
      where,
      include: [{ model: Restaurant, as: 'restaurant' }],
      order: [['preferred_date', 'ASC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      entries: rows,
      total: count,
      page,
      pages: Math.ceil(count / limit),
    };
  }

  /**
   * Remove from waitlist
   */
  async removeFromWaitlist(entryId, reason = 'guest_cancelled') {
    const entry = await Waitlist.findByPk(entryId);

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    await entry.update({
      status: reason === 'converted' ? 'converted' : 'cancelled',
      cancelled_at: new Date(),
      cancellation_reason: reason,
    });

    // Update positions for remaining entries
    await this.recalculatePositions(entry.restaurant_id, entry.preferred_date);

    logger.info(`Waitlist entry removed: ${entryId} (${reason})`);

    return entry;
  }

  /**
   * Recalculate positions after removal
   */
  async recalculatePositions(restaurantId, date) {
    const entries = await Waitlist.findAll({
      where: {
        restaurant_id: restaurantId,
        preferred_date: date,
        status: { [Op.in]: ['waiting', 'notified'] },
      },
      order: [['position', 'ASC']],
    });

    for (let i = 0; i < entries.length; i++) {
      await entries[i].update({ position: i + 1 });
    }
  }

  /**
   * Check availability and notify waitlist
   */
  async checkAndNotifyWaitlist(restaurantId, date) {
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) return;

    // Get waiting entries for this date
    const waitingEntries = await Waitlist.findAll({
      where: {
        restaurant_id: restaurantId,
        preferred_date: date,
        status: 'waiting',
      },
      order: [['position', 'ASC']],
    });

    for (const entry of waitingEntries) {
      // Check if availability exists for their preferred time
      const availability = await AvailabilityService.checkAvailability({
        restaurantId,
        date,
        time: entry.preferred_time_start,
        partySize: entry.party_size,
      });

      if (availability.available) {
        // Notify guest
        await this.notifyAvailability(entry, restaurant);

        // Update status
        await entry.update({
          status: 'notified',
          notified_at: new Date(),
          notification_expires_at: moment().add(24, 'hours').toDate(),
        });

        logger.info(`Waitlist notification sent: ${entry.id}`);
      } else if (entry.flexibility === 'very_flexible' || entry.flexibility === 'flexible_time') {
        // Check alternative times
        const altAvailability = await AvailabilityService.checkAvailability({
          restaurantId,
          date,
          partySize: entry.party_size,
        });

        if (altAvailability.available && altAvailability.slots?.length > 0) {
          // Find slot within their time range
          const suitableSlot = altAvailability.slots.find(slot => {
            const slotTime = moment(slot.time, 'HH:mm');
            const startTime = moment(entry.preferred_time_start, 'HH:mm');
            const endTime = moment(entry.preferred_time_end, 'HH:mm');
            return slotTime.isSameOrAfter(startTime) && slotTime.isSameOrBefore(endTime);
          });

          if (suitableSlot) {
            await this.notifyAvailability(entry, restaurant, suitableSlot.time);
            await entry.update({
              status: 'notified',
              notified_at: new Date(),
              notification_expires_at: moment().add(24, 'hours').toDate(),
            });
          }
        }
      }
    }
  }

  /**
   * Notify guest of availability
   */
  async notifyAvailability(entry, restaurant, alternativeTime = null) {
    const notificationData = {
      ...entry.toJSON(),
      alternative_time: alternativeTime,
    };

    await NotificationService.sendWaitlistNotification(notificationData, restaurant);
  }

  /**
   * Convert waitlist entry to reservation
   */
  async convertToReservation(entryId, reservationData) {
    const entry = await Waitlist.findByPk(entryId, {
      include: [
        { model: Guest, as: 'guest' },
        { model: Restaurant, as: 'restaurant' },
      ],
    });

    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    if (entry.status !== 'notified') {
      throw new Error('Entry must be notified before converting');
    }

    // Check if notification hasn't expired
    if (entry.notification_expires_at && moment().isAfter(entry.notification_expires_at)) {
      await entry.update({ status: 'expired' });
      throw new Error('Notification has expired');
    }

    // Create reservation using ReservationService
    const ReservationService = require('./ReservationService');

    const reservation = await ReservationService.createReservation({
      restaurantId: entry.restaurant_id,
      guestEmail: entry.guest_email,
      date: reservationData.date || entry.preferred_date,
      time: reservationData.time || entry.preferred_time_start,
      partySize: entry.party_size,
      guestInfo: {
        firstName: entry.guest.first_name,
        lastName: entry.guest.last_name,
        phone: entry.guest_phone,
      },
      specialRequests: entry.notes,
      source: 'waitlist',
    });

    // Update waitlist entry
    await entry.update({
      status: 'converted',
      converted_to_reservation_id: reservation.reservation.id,
      converted_at: new Date(),
    });

    logger.info(`Waitlist converted to reservation: ${entryId} -> ${reservation.reservation.id}`);

    return {
      waitlistEntry: entry,
      reservation: reservation.reservation,
    };
  }

  /**
   * Expire old waitlist entries (cron job)
   */
  async expireOldEntries() {
    const expiryDays = parseInt(process.env.WAITLIST_EXPIRY_DAYS) || 7;

    // Expire entries past their date
    const expiredByDate = await Waitlist.update(
      {
        status: 'expired',
        expired_at: new Date(),
      },
      {
        where: {
          status: { [Op.in]: ['waiting', 'notified'] },
          preferred_date: { [Op.lt]: moment().format('YYYY-MM-DD') },
        },
      }
    );

    // Expire entries with expired notifications
    const expiredByNotification = await Waitlist.update(
      {
        status: 'expired',
        expired_at: new Date(),
      },
      {
        where: {
          status: 'notified',
          notification_expires_at: { [Op.lt]: new Date() },
        },
      }
    );

    // Expire very old waiting entries
    const expiredByAge = await Waitlist.update(
      {
        status: 'expired',
        expired_at: new Date(),
      },
      {
        where: {
          status: 'waiting',
          createdAt: { [Op.lt]: moment().subtract(expiryDays, 'days').toDate() },
        },
      }
    );

    const totalExpired = (expiredByDate[0] || 0) + (expiredByNotification[0] || 0) + (expiredByAge[0] || 0);

    logger.info(`Waitlist entries expired: ${totalExpired}`);

    return { expired: totalExpired };
  }

  /**
   * Get waitlist statistics
   */
  async getWaitlistStats(restaurantId, dateRange = null) {
    const where = { restaurant_id: restaurantId };

    if (dateRange) {
      where.preferred_date = {
        [Op.between]: [dateRange.start, dateRange.end],
      };
    }

    const stats = await Waitlist.findAll({
      where,
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const totalWaiting = stats.find(s => s.status === 'waiting')?.count || 0;
    const totalNotified = stats.find(s => s.status === 'notified')?.count || 0;
    const totalConverted = stats.find(s => s.status === 'converted')?.count || 0;
    const totalExpired = stats.find(s => s.status === 'expired')?.count || 0;
    const totalCancelled = stats.find(s => s.status === 'cancelled')?.count || 0;

    const total = parseInt(totalWaiting) + parseInt(totalNotified) + parseInt(totalConverted) +
                  parseInt(totalExpired) + parseInt(totalCancelled);

    return {
      total,
      waiting: parseInt(totalWaiting),
      notified: parseInt(totalNotified),
      converted: parseInt(totalConverted),
      expired: parseInt(totalExpired),
      cancelled: parseInt(totalCancelled),
      conversionRate: total > 0 ? Math.round((parseInt(totalConverted) / total) * 100) : 0,
    };
  }

  /**
   * Get average wait time
   */
  async getAverageWaitTime(restaurantId) {
    const convertedEntries = await Waitlist.findAll({
      where: {
        restaurant_id: restaurantId,
        status: 'converted',
        converted_at: { [Op.not]: null },
      },
      attributes: ['createdAt', 'converted_at'],
      raw: true,
    });

    if (convertedEntries.length === 0) {
      return { averageHours: 0, count: 0 };
    }

    const totalHours = convertedEntries.reduce((sum, entry) => {
      const waitTime = moment(entry.converted_at).diff(moment(entry.createdAt), 'hours');
      return sum + waitTime;
    }, 0);

    return {
      averageHours: Math.round(totalHours / convertedEntries.length),
      count: convertedEntries.length,
    };
  }
}

module.exports = new WaitlistService();
