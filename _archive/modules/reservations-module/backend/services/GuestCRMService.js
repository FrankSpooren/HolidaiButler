/**
 * Guest CRM Service
 * Manages guest profiles, history, preferences, and CRM operations
 */

const { Guest, GuestNote, Reservation, Restaurant } = require('../models');
const { Op } = require('sequelize');
const cacheService = require('./cache');
const logger = require('../utils/logger');

class GuestCRMService {
  /**
   * Create or update guest profile
   */
  async createOrUpdateGuest(guestData) {
    const {
      email,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      preferredLanguage,
      dietaryRestrictions,
      seatingPreferences,
    } = guestData;

    // Check cache first
    const cachedGuest = await cacheService.getGuestByEmail(email);
    if (cachedGuest) {
      // Update if new info provided
      if (firstName || lastName || phone) {
        const guest = await Guest.findByPk(cachedGuest.id);
        if (guest) {
          await guest.update({
            ...(firstName && { first_name: firstName }),
            ...(lastName && { last_name: lastName }),
            ...(phone && { phone }),
            ...(dateOfBirth && { date_of_birth: dateOfBirth }),
            ...(preferredLanguage && { preferred_language: preferredLanguage }),
            ...(dietaryRestrictions && { dietary_restrictions: dietaryRestrictions }),
            ...(seatingPreferences && { seating_preferences: seatingPreferences }),
            last_activity_at: new Date(),
          });
          await cacheService.cacheGuestByEmail(email, guest.toJSON());
          await cacheService.cacheGuest(guest.id, guest.toJSON());
          return guest;
        }
      }
      return Guest.build(cachedGuest);
    }

    // Find existing guest by email
    let guest = await Guest.findOne({ where: { email: email.toLowerCase() } });

    if (guest) {
      // Update existing guest
      await guest.update({
        ...(firstName && { first_name: firstName }),
        ...(lastName && { last_name: lastName }),
        ...(phone && { phone }),
        ...(dateOfBirth && { date_of_birth: dateOfBirth }),
        ...(preferredLanguage && { preferred_language: preferredLanguage }),
        ...(dietaryRestrictions && { dietary_restrictions: dietaryRestrictions }),
        ...(seatingPreferences && { seating_preferences: seatingPreferences }),
        last_activity_at: new Date(),
      });
    } else {
      // Create new guest
      guest = await Guest.create({
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        phone,
        date_of_birth: dateOfBirth,
        preferred_language: preferredLanguage || 'en',
        dietary_restrictions: dietaryRestrictions || [],
        seating_preferences: seatingPreferences || [],
        total_reservations: 0,
        completed_reservations: 0,
        no_show_count: 0,
        cancellation_count: 0,
        reputation_score: 100,
        is_vip: false,
        is_blacklisted: false,
        email_notifications: true,
        sms_notifications: false,
        last_activity_at: new Date(),
      });

      logger.info(`New guest created: ${guest.id} (${email})`);
    }

    // Cache guest
    await cacheService.cacheGuestByEmail(email, guest.toJSON());
    await cacheService.cacheGuest(guest.id, guest.toJSON());

    return guest;
  }

  /**
   * Get guest by ID
   */
  async getGuestById(guestId) {
    // Check cache
    const cachedGuest = await cacheService.getGuest(guestId);
    if (cachedGuest) {
      return Guest.build(cachedGuest);
    }

    const guest = await Guest.findByPk(guestId);

    if (guest) {
      await cacheService.cacheGuest(guestId, guest.toJSON());
    }

    return guest;
  }

  /**
   * Get guest by email
   */
  async getGuestByEmail(email) {
    // Check cache
    const cachedGuest = await cacheService.getGuestByEmail(email);
    if (cachedGuest) {
      return Guest.build(cachedGuest);
    }

    const guest = await Guest.findOne({
      where: { email: email.toLowerCase() },
    });

    if (guest) {
      await cacheService.cacheGuestByEmail(email, guest.toJSON());
      await cacheService.cacheGuest(guest.id, guest.toJSON());
    }

    return guest;
  }

  /**
   * Update guest profile
   */
  async updateGuest(guestId, updates) {
    const guest = await Guest.findByPk(guestId);

    if (!guest) {
      throw new Error('Guest not found');
    }

    const allowedUpdates = [
      'first_name',
      'last_name',
      'phone',
      'date_of_birth',
      'preferred_language',
      'dietary_restrictions',
      'seating_preferences',
      'email_notifications',
      'sms_notifications',
      'is_vip',
    ];

    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    filteredUpdates.last_activity_at = new Date();

    await guest.update(filteredUpdates);

    // Invalidate cache
    await cacheService.invalidateGuest(guestId);
    await cacheService.delByPattern(`res:guest:email:${guest.email}`);

    return guest;
  }

  /**
   * Get guest reservation history
   */
  async getGuestHistory(guestId, options = {}) {
    const { page = 1, limit = 20, status, restaurantId } = options;

    const where = { guest_id: guestId };

    if (status) {
      where.status = status;
    }

    if (restaurantId) {
      where.restaurant_id = restaurantId;
    }

    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'cuisine_type', 'price_range'],
        },
      ],
      order: [['reservation_date', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      reservations: rows,
      total: count,
      page,
      pages: Math.ceil(count / limit),
    };
  }

  /**
   * Get guest statistics
   */
  async getGuestStats(guestId) {
    const guest = await Guest.findByPk(guestId);

    if (!guest) {
      throw new Error('Guest not found');
    }

    // Get reservation stats
    const [reservationStats] = await Reservation.findAll({
      where: { guest_id: guestId },
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total'],
        [require('sequelize').fn('SUM', require('sequelize').literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'completed'],
        [require('sequelize').fn('SUM', require('sequelize').literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'cancelled'],
        [require('sequelize').fn('SUM', require('sequelize').literal("CASE WHEN status = 'no_show' THEN 1 ELSE 0 END")), 'noShows'],
        [require('sequelize').fn('AVG', require('sequelize').col('party_size')), 'avgPartySize'],
      ],
      raw: true,
    });

    // Get favorite restaurants
    const favoriteRestaurants = await Reservation.findAll({
      where: {
        guest_id: guestId,
        status: 'completed',
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
      attributes: [
        'restaurant_id',
        [require('sequelize').fn('COUNT', require('sequelize').col('Reservation.id')), 'visits'],
      ],
      group: ['restaurant_id', 'restaurant.id', 'restaurant.name'],
      order: [[require('sequelize').literal('visits'), 'DESC']],
      limit: 5,
      raw: true,
      nest: true,
    });

    return {
      guest: {
        id: guest.id,
        name: `${guest.first_name} ${guest.last_name}`,
        email: guest.email,
        phone: guest.phone,
        isVip: guest.is_vip,
        reputationScore: guest.reputation_score,
        memberSince: guest.createdAt,
      },
      reservations: {
        total: parseInt(reservationStats?.total) || 0,
        completed: parseInt(reservationStats?.completed) || 0,
        cancelled: parseInt(reservationStats?.cancelled) || 0,
        noShows: parseInt(reservationStats?.noShows) || 0,
        avgPartySize: parseFloat(reservationStats?.avgPartySize) || 0,
      },
      favoriteRestaurants,
      preferences: {
        dietary: guest.dietary_restrictions,
        seating: guest.seating_preferences,
        language: guest.preferred_language,
      },
    };
  }

  /**
   * Add note to guest profile
   */
  async addGuestNote(guestId, restaurantId, noteData, staffId) {
    const guest = await Guest.findByPk(guestId);

    if (!guest) {
      throw new Error('Guest not found');
    }

    const note = await GuestNote.create({
      guest_id: guestId,
      restaurant_id: restaurantId,
      staff_id: staffId,
      note_type: noteData.note_type,
      content: noteData.content,
      is_alert: noteData.is_alert || false,
      alert_message: noteData.alert_message,
    });

    logger.info(`Guest note added: ${note.id} for guest ${guestId}`);

    return note;
  }

  /**
   * Get guest notes for a restaurant
   */
  async getGuestNotes(guestId, restaurantId = null, options = {}) {
    const { includeAlerts = true, noteType } = options;

    const where = { guest_id: guestId };

    if (restaurantId) {
      where.restaurant_id = restaurantId;
    }

    if (noteType) {
      where.note_type = noteType;
    }

    const notes = await GuestNote.findAll({
      where,
      order: [
        ['is_alert', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    if (includeAlerts) {
      // Get all alerts regardless of restaurant
      const alerts = await GuestNote.findAll({
        where: {
          guest_id: guestId,
          is_alert: true,
        },
        order: [['createdAt', 'DESC']],
      });

      return {
        notes,
        alerts,
      };
    }

    return { notes };
  }

  /**
   * Update guest reputation score
   */
  async updateReputationScore(guestId) {
    const guest = await Guest.findByPk(guestId);

    if (!guest) {
      throw new Error('Guest not found');
    }

    // Calculate new reputation score
    // Base: 100, penalties for no-shows and late cancellations
    let score = 100;

    // -10 points per no-show
    score -= guest.no_show_count * 10;

    // -5 points per late cancellation (assuming tracked in cancellation_count)
    score -= guest.cancellation_count * 2;

    // Bonus for completed reservations
    score += Math.min(guest.completed_reservations * 2, 20);

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    await guest.update({ reputation_score: score });

    // Auto-blacklist if score too low
    if (score <= 20 && !guest.is_blacklisted) {
      await guest.update({
        is_blacklisted: true,
        blacklist_reason: 'Automatic blacklist due to low reputation score',
      });
      logger.warn(`Guest ${guestId} auto-blacklisted due to low reputation score: ${score}`);
    }

    // Invalidate cache
    await cacheService.invalidateGuest(guestId);

    return { guestId, newScore: score };
  }

  /**
   * Toggle VIP status
   */
  async toggleVipStatus(guestId, isVip, reason = null) {
    const guest = await Guest.findByPk(guestId);

    if (!guest) {
      throw new Error('Guest not found');
    }

    await guest.update({
      is_vip: isVip,
      vip_notes: reason,
    });

    // Invalidate cache
    await cacheService.invalidateGuest(guestId);

    logger.info(`Guest ${guestId} VIP status changed to: ${isVip}`);

    return guest;
  }

  /**
   * Blacklist guest
   */
  async blacklistGuest(guestId, reason, staffId) {
    const guest = await Guest.findByPk(guestId);

    if (!guest) {
      throw new Error('Guest not found');
    }

    await guest.update({
      is_blacklisted: true,
      blacklist_reason: reason,
      blacklisted_at: new Date(),
      blacklisted_by: staffId,
    });

    // Invalidate cache
    await cacheService.invalidateGuest(guestId);

    logger.warn(`Guest ${guestId} blacklisted. Reason: ${reason}`);

    return guest;
  }

  /**
   * Remove from blacklist
   */
  async removeFromBlacklist(guestId, staffId) {
    const guest = await Guest.findByPk(guestId);

    if (!guest) {
      throw new Error('Guest not found');
    }

    await guest.update({
      is_blacklisted: false,
      blacklist_reason: null,
      blacklisted_at: null,
      blacklisted_by: null,
    });

    // Invalidate cache
    await cacheService.invalidateGuest(guestId);

    logger.info(`Guest ${guestId} removed from blacklist by ${staffId}`);

    return guest;
  }

  /**
   * Search guests
   */
  async searchGuests(query, options = {}) {
    const { page = 1, limit = 20, restaurantId } = options;

    const where = {
      [Op.or]: [
        { email: { [Op.like]: `%${query}%` } },
        { first_name: { [Op.like]: `%${query}%` } },
        { last_name: { [Op.like]: `%${query}%` } },
        { phone: { [Op.like]: `%${query}%` } },
      ],
    };

    if (options.isVip !== undefined) {
      where.is_vip = options.isVip;
    }

    if (options.isBlacklisted !== undefined) {
      where.is_blacklisted = options.isBlacklisted;
    }

    const { count, rows } = await Guest.findAndCountAll({
      where,
      order: [['last_activity_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      guests: rows,
      total: count,
      page,
      pages: Math.ceil(count / limit),
    };
  }

  /**
   * Get VIP guests
   */
  async getVipGuests(options = {}) {
    const { page = 1, limit = 50 } = options;

    const { count, rows } = await Guest.findAndCountAll({
      where: { is_vip: true },
      order: [['last_activity_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      guests: rows,
      total: count,
      page,
      pages: Math.ceil(count / limit),
    };
  }

  /**
   * Merge duplicate guest profiles
   */
  async mergeGuestProfiles(primaryGuestId, secondaryGuestId) {
    const primaryGuest = await Guest.findByPk(primaryGuestId);
    const secondaryGuest = await Guest.findByPk(secondaryGuestId);

    if (!primaryGuest || !secondaryGuest) {
      throw new Error('One or both guests not found');
    }

    // Update all reservations from secondary to primary
    await Reservation.update(
      { guest_id: primaryGuestId },
      { where: { guest_id: secondaryGuestId } }
    );

    // Move guest notes
    await GuestNote.update(
      { guest_id: primaryGuestId },
      { where: { guest_id: secondaryGuestId } }
    );

    // Merge statistics
    await primaryGuest.update({
      total_reservations: primaryGuest.total_reservations + secondaryGuest.total_reservations,
      completed_reservations: primaryGuest.completed_reservations + secondaryGuest.completed_reservations,
      no_show_count: primaryGuest.no_show_count + secondaryGuest.no_show_count,
      cancellation_count: primaryGuest.cancellation_count + secondaryGuest.cancellation_count,
    });

    // Update reputation score
    await this.updateReputationScore(primaryGuestId);

    // Delete secondary guest
    await secondaryGuest.destroy();

    // Invalidate cache
    await cacheService.invalidateGuest(primaryGuestId);
    await cacheService.invalidateGuest(secondaryGuestId);

    logger.info(`Guest profiles merged: ${secondaryGuestId} -> ${primaryGuestId}`);

    return primaryGuest;
  }
}

module.exports = new GuestCRMService();
