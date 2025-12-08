/**
 * Reservation Service
 * Handles reservation lifecycle: create, confirm, modify, cancel, check-in, complete
 */

const { Reservation, Restaurant, Guest, Table, RestaurantAvailability } = require('../models');
const TableManagementService = require('./TableManagementService');
const GuestCRMService = require('./GuestCRMService');
const AvailabilityService = require('./AvailabilityService');
const PaymentService = require('./PaymentService');
const NotificationService = require('./NotificationService');
const moment = require('moment-timezone');

class ReservationService {
  /**
   * Create a new reservation
   */
  async createReservation(reservationData) {
    const {
      restaurantId,
      guestEmail,
      date,
      time,
      partySize,
      guestInfo,
      specialOccasion,
      specialRequests,
      dietaryRestrictions,
      seatingAreaPreference,
      source = 'web',
      aiMessageId,
    } = reservationData;

    // 1. Validate restaurant exists and accepts reservations
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }
    if (!restaurant.canAcceptReservations()) {
      throw new Error('Restaurant is not accepting reservations');
    }

    // 2. Validate party size
    if (partySize < restaurant.min_party_size || partySize > restaurant.max_party_size) {
      throw new Error(
        `Party size must be between ${restaurant.min_party_size} and ${restaurant.max_party_size}`
      );
    }

    // 3. Check availability
    const availability = await AvailabilityService.checkAvailability({
      restaurantId,
      date,
      time,
      partySize,
    });

    if (!availability.available) {
      throw new Error('No availability for the selected date/time');
    }

    // 4. Get or create guest profile
    const guest = await GuestCRMService.createOrUpdateGuest({
      email: guestEmail,
      firstName: guestInfo.firstName,
      lastName: guestInfo.lastName,
      phone: guestInfo.phone,
      dietaryRestrictions,
    });

    // Check guest reputation
    if (!guest.canMakeReservation()) {
      throw new Error('Guest is not eligible to make reservations');
    }

    // 5. Create reservation
    const reservationReference = await Reservation.generateReference();
    const reservation = await Reservation.create({
      reservation_reference: reservationReference,
      restaurant_id: restaurantId,
      guest_id: guest.id,
      reservation_date: date,
      reservation_time: time,
      party_size: partySize,
      seating_duration: restaurant.default_seating_duration,
      guest_name: `${guestInfo.firstName} ${guestInfo.lastName}`,
      guest_email: guestEmail,
      guest_phone: guestInfo.phone,
      guest_language: guestInfo.language || 'en',
      special_occasion: specialOccasion || 'none',
      special_requests: specialRequests,
      dietary_restrictions: dietaryRestrictions || [],
      seating_area_preference: seatingAreaPreference,
      confirmation_method: restaurant.pos_integration_enabled ? 'manual' : 'instant',
      status: restaurant.pos_integration_enabled ? 'pending_confirmation' : 'confirmed',
      source,
      ai_message_id: aiMessageId,
      is_repeat_guest: guest.total_reservations > 0,
      previous_visits_count: guest.total_reservations,
      vip_status: guest.is_vip,
    });

    // 6. Reserve capacity (15-minute lock if deposit required)
    await AvailabilityService.reserveCapacity({
      restaurantId,
      date,
      time,
      partySize,
      reservationId: reservation.id,
    });

    // 7. Auto-assign tables if enabled
    if (restaurant.pos_integration_enabled === false) {
      try {
        await TableManagementService.autoAssignTables(reservation.id);
      } catch (error) {
        console.warn('Table auto-assignment failed:', error.message);
        // Non-critical, continue
      }
    }

    // 8. Handle deposit if required
    let paymentSession = null;
    if (restaurant.deposit_required) {
      const depositAmount = this.calculateDepositAmount(restaurant, partySize);
      paymentSession = await PaymentService.createDepositSession({
        reservationId: reservation.id,
        amount: depositAmount,
        currency: 'EUR',
        metadata: {
          restaurantName: restaurant.name,
          guestEmail,
          date,
          time,
          partySize,
        },
      });

      await reservation.update({
        deposit_required: true,
        deposit_amount: depositAmount,
        deposit_status: 'pending',
        payment_transaction_id: paymentSession.id,
      });
    } else {
      // Instant confirmation
      await reservation.confirm();
      await AvailabilityService.confirmReservation(reservation.id);
      await guest.update({ total_reservations: guest.total_reservations + 1 });
      await restaurant.incrementReservationCount();
    }

    // 9. Send confirmation email
    await NotificationService.sendReservationConfirmation(reservation, restaurant, guest);

    // 10. Return reservation with payment URL if needed
    return {
      reservation,
      paymentSession,
      requiresPayment: restaurant.deposit_required,
    };
  }

  /**
   * Confirm reservation after payment
   */
  async confirmReservation(reservationId, paymentTransactionId = null) {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Guest, as: 'guest' },
      ],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Verify payment if required
    if (reservation.deposit_required && paymentTransactionId) {
      const paymentVerified = await PaymentService.verifyPayment(paymentTransactionId);
      if (!paymentVerified) {
        throw new Error('Payment verification failed');
      }

      await reservation.update({
        deposit_status: 'paid',
        paid_at: new Date(),
      });
    }

    // Confirm reservation
    await reservation.confirm();
    await AvailabilityService.confirmReservation(reservationId);

    // Update statistics
    await reservation.guest.update({
      total_reservations: reservation.guest.total_reservations + 1,
    });
    await reservation.restaurant.incrementReservationCount();

    // Send confirmation email
    await NotificationService.sendReservationConfirmed(
      reservation,
      reservation.restaurant,
      reservation.guest
    );

    return reservation;
  }

  /**
   * Check in guest (mark as seated)
   */
  async checkInGuest(reservationId, staffId, actualPartySize = null) {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Guest, as: 'guest' },
      ],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status !== 'confirmed') {
      throw new Error('Only confirmed reservations can be checked in');
    }

    await reservation.checkIn(staffId, actualPartySize);

    return reservation;
  }

  /**
   * Complete reservation
   */
  async completeReservation(reservationId) {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Guest, as: 'guest' },
      ],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status !== 'seated') {
      throw new Error('Only seated reservations can be completed');
    }

    await reservation.complete();

    // Update guest statistics
    await reservation.guest.update({
      completed_reservations: reservation.guest.completed_reservations + 1,
    });

    // Send post-visit email (review request)
    await NotificationService.sendPostVisitEmail(
      reservation,
      reservation.restaurant,
      reservation.guest
    );

    return reservation;
  }

  /**
   * Mark reservation as no-show
   */
  async markNoShow(reservationId, staffId) {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Guest, as: 'guest' },
      ],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    await reservation.markNoShow();

    // Update guest no-show count
    await reservation.guest.update({
      no_show_count: reservation.guest.no_show_count + 1,
    });

    // Release capacity
    await AvailabilityService.releaseReservation(reservationId, true);

    // Charge no-show fee if applicable
    if (reservation.restaurant.no_show_fee > 0 && reservation.deposit_status === 'paid') {
      await PaymentService.forfeitDeposit(reservation.payment_transaction_id);
      await reservation.update({ deposit_status: 'forfeited' });
    }

    return reservation;
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(reservationId, cancelledBy, reason = null) {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Guest, as: 'guest' },
      ],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (!['pending_confirmation', 'confirmed'].includes(reservation.status)) {
      throw new Error('Reservation cannot be cancelled');
    }

    const withinDeadline = reservation.canBeCancelled(reservation.restaurant);

    await reservation.cancel(cancelledBy, reason);
    await reservation.update({ cancellation_within_deadline: withinDeadline });

    // Release capacity
    const wasConfirmed = reservation.status === 'confirmed';
    await AvailabilityService.releaseReservation(reservationId, wasConfirmed);

    // Update guest statistics
    if (cancelledBy === 'guest') {
      await reservation.guest.update({
        cancellation_count: reservation.guest.cancellation_count + 1,
      });
    }

    // Process refund if applicable
    if (
      reservation.deposit_status === 'paid' &&
      withinDeadline &&
      cancelledBy === 'guest'
    ) {
      await PaymentService.refundDeposit(reservation.payment_transaction_id);
      await reservation.update({ deposit_status: 'refunded' });
    } else if (
      reservation.deposit_status === 'paid' &&
      !withinDeadline &&
      cancelledBy === 'guest'
    ) {
      await PaymentService.forfeitDeposit(reservation.payment_transaction_id);
      await reservation.update({ deposit_status: 'forfeited' });
    } else if (cancelledBy === 'restaurant') {
      // Always refund if restaurant cancels
      if (reservation.deposit_status === 'paid') {
        await PaymentService.refundDeposit(reservation.payment_transaction_id);
        await reservation.update({ deposit_status: 'refunded' });
      }
    }

    // Send cancellation email
    await NotificationService.sendCancellationEmail(
      reservation,
      reservation.restaurant,
      reservation.guest,
      cancelledBy
    );

    return reservation;
  }

  /**
   * Modify reservation
   */
  async modifyReservation(reservationId, updates) {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Restaurant, as: 'restaurant' }],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (!reservation.canBeModified()) {
      throw new Error('Reservation cannot be modified');
    }

    const { date, time, partySize, specialRequests, dietaryRestrictions } = updates;

    // If date/time/partySize changed, check availability
    if (date || time || partySize) {
      const newDate = date || reservation.reservation_date;
      const newTime = time || reservation.reservation_time;
      const newPartySize = partySize || reservation.party_size;

      const availability = await AvailabilityService.checkAvailability({
        restaurantId: reservation.restaurant_id,
        date: newDate,
        time: newTime,
        partySize: newPartySize,
      });

      if (!availability.available) {
        throw new Error('No availability for the new date/time');
      }

      // Release old capacity
      await AvailabilityService.releaseReservation(reservationId, true);

      // Reserve new capacity
      await AvailabilityService.reserveCapacity({
        restaurantId: reservation.restaurant_id,
        date: newDate,
        time: newTime,
        partySize: newPartySize,
        reservationId: reservation.id,
      });
      await AvailabilityService.confirmReservation(reservationId);
    }

    // Update reservation
    await reservation.update({
      ...(date && { reservation_date: date }),
      ...(time && { reservation_time: time }),
      ...(partySize && { party_size: partySize }),
      ...(specialRequests && { special_requests: specialRequests }),
      ...(dietaryRestrictions && { dietary_restrictions: dietaryRestrictions }),
    });

    // Send modification confirmation
    await NotificationService.sendModificationConfirmation(
      reservation,
      reservation.restaurant
    );

    return reservation;
  }

  /**
   * Get reservations by restaurant
   */
  async getReservationsByRestaurant(restaurantId, filters = {}) {
    const { date, status, seatingArea, source, page = 1, limit = 50 } = filters;

    const where = { restaurant_id: restaurantId };

    if (date) where.reservation_date = date;
    if (status) where.status = status;
    if (seatingArea) where.seating_area_preference = seatingArea;
    if (source) where.source = source;

    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [
        { model: Guest, as: 'guest' },
        { model: Restaurant, as: 'restaurant' },
      ],
      order: [
        ['reservation_date', 'ASC'],
        ['reservation_time', 'ASC'],
      ],
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
   * Get reservations by guest
   */
  async getReservationsByGuest(guestId, filters = {}) {
    const { status, upcoming = true, page = 1, limit = 20 } = filters;

    const where = { guest_id: guestId };

    if (status) where.status = status;

    if (upcoming) {
      where.reservation_date = { [Op.gte]: new Date() };
    }

    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [{ model: Restaurant, as: 'restaurant' }],
      order: [['reservation_date', upcoming ? 'ASC' : 'DESC']],
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
   * Find reservation by reference and email
   */
  async findReservationByReference(reference, email) {
    const reservation = await Reservation.findOne({
      where: {
        reservation_reference: reference,
        guest_email: email,
      },
      include: [{ model: Restaurant, as: 'restaurant' }],
    });

    return reservation;
  }

  /**
   * Send reminders (automated job)
   */
  async sendReminders() {
    const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');

    const reservations = await Reservation.findAll({
      where: {
        reservation_date: tomorrow,
        status: 'confirmed',
        reminder_sent_at: null,
      },
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Guest, as: 'guest' },
      ],
    });

    for (const reservation of reservations) {
      try {
        await NotificationService.sendReservationReminder(
          reservation,
          reservation.restaurant,
          reservation.guest
        );

        await reservation.update({
          reminder_sent_at: new Date(),
          email_reminder_sent: reservation.guest.email_notifications,
          sms_reminder_sent: reservation.guest.sms_notifications,
        });
      } catch (error) {
        console.error(`Failed to send reminder for reservation ${reservation.id}:`, error);
      }
    }

    console.log(`✅ Sent ${reservations.length} reminders`);
  }

  /**
   * Calculate deposit amount
   */
  calculateDepositAmount(restaurant, partySize) {
    if (restaurant.deposit_amount) {
      return restaurant.deposit_amount * partySize;
    }

    if (restaurant.deposit_percentage) {
      // Estimate bill based on price range
      const priceRangeValues = {
        '€': 20,
        '€€': 40,
        '€€€': 70,
        '€€€€': 120,
      };
      const estimatedBillPerPerson = priceRangeValues[restaurant.price_range] || 40;
      const estimatedTotal = estimatedBillPerPerson * partySize;
      return (estimatedTotal * restaurant.deposit_percentage) / 100;
    }

    return 10; // Default minimum deposit
  }
}

module.exports = new ReservationService();
