/**
 * Reservation Model
 * Represents a restaurant table reservation
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Reservation = sequelize.define(
    'Reservation',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
      },

      reservation_reference: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        comment: 'Format: RES-YYYY-NNNNNN',
      },

      // Restaurant & Guest
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      guest_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'guests',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'NULL for guest checkouts (no account)',
      },

      // Reservation Details
      reservation_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      reservation_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      party_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      seating_duration: {
        type: DataTypes.INTEGER,
        defaultValue: 90,
        comment: 'Expected seating duration in minutes',
      },
      expected_departure_time: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Calculated: reservation_time + seating_duration',
      },

      // Table Assignment
      table_ids: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of assigned table IDs (can be multiple for large parties)',
      },
      seating_area_preference: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Patio, Window, Quiet Corner, etc.',
      },

      // Guest Information
      guest_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      guest_email: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      guest_phone: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      guest_language: {
        type: DataTypes.STRING(5),
        defaultValue: 'en',
        comment: 'ISO 639-1 language code',
      },

      // Special Requests
      special_occasion: {
        type: DataTypes.ENUM(
          'birthday',
          'anniversary',
          'business',
          'date_night',
          'celebration',
          'none'
        ),
        defaultValue: 'none',
      },
      special_requests: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dietary_restrictions: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array: vegetarian, vegan, gluten_free, nut_allergy, etc.',
      },

      // Status & Lifecycle
      status: {
        type: DataTypes.ENUM(
          'pending_confirmation',
          'confirmed',
          'seated',
          'completed',
          'no_show',
          'cancelled_by_guest',
          'cancelled_by_restaurant',
          'waitlist'
        ),
        defaultValue: 'pending_confirmation',
      },

      // Confirmation
      confirmation_method: {
        type: DataTypes.ENUM('instant', 'manual', 'partner_api'),
        defaultValue: 'instant',
      },
      confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      confirmed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Restaurant staff user ID',
      },

      // Check-in
      checked_in_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      seated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      departed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      actual_party_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'May differ from booked party_size',
      },

      // Cancellation
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      cancellation_within_deadline: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },

      // Payment & Deposits
      deposit_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      deposit_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      deposit_status: {
        type: DataTypes.ENUM('not_required', 'pending', 'paid', 'refunded', 'forfeited'),
        defaultValue: 'not_required',
      },
      payment_transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // No-Show Prevention
      confirmation_sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      confirmation_method_used: {
        type: DataTypes.ENUM('email', 'sms', 'both'),
        allowNull: true,
      },
      guest_confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Guest clicked "Confirm" in email/SMS',
      },
      reminder_sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      sms_reminder_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      email_reminder_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      // Source & Attribution
      source: {
        type: DataTypes.ENUM(
          'web',
          'mobile',
          'phone',
          'walk_in',
          'thefork',
          'google',
          'instagram',
          'facebook',
          'partner_api'
        ),
        defaultValue: 'web',
      },
      partner_reference_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Reference from TheFork, Google, etc.',
      },

      // AI Context
      ai_message_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      ai_recommendation_score: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
      },

      // Guest History Context
      is_repeat_guest: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      previous_visits_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      // Internal Notes
      internal_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'For restaurant staff only',
      },
      vip_status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      // Metadata
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'reservations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_restaurant_date',
          fields: ['restaurant_id', 'reservation_date', 'reservation_time'],
        },
        {
          name: 'idx_guest',
          fields: ['guest_id', 'status'],
        },
        {
          name: 'idx_status',
          fields: ['status', 'reservation_date'],
        },
        {
          name: 'idx_reference',
          unique: true,
          fields: ['reservation_reference'],
        },
        {
          name: 'idx_guest_email',
          fields: ['guest_email', 'reservation_date'],
        },
        {
          name: 'idx_source',
          fields: ['restaurant_id', 'source', 'created_at'],
        },
      ],
    }
  );

  // Static Methods
  Reservation.generateReference = async function () {
    const year = new Date().getFullYear();
    const count = await this.count({
      where: sequelize.where(
        sequelize.fn('YEAR', sequelize.col('created_at')),
        year
      ),
    });
    const number = String(count + 1).padStart(6, '0');
    return `RES-${year}-${number}`;
  };

  // Instance Methods
  Reservation.prototype.isUpcoming = function () {
    const now = new Date();
    const reservationDateTime = new Date(`${this.reservation_date} ${this.reservation_time}`);
    return reservationDateTime > now;
  };

  Reservation.prototype.isPast = function () {
    return !this.isUpcoming();
  };

  Reservation.prototype.canBeCancelled = function (restaurant) {
    if (!this.isUpcoming()) return false;
    if (!['pending_confirmation', 'confirmed'].includes(this.status)) return false;

    const now = new Date();
    const reservationDateTime = new Date(`${this.reservation_date} ${this.reservation_time}`);
    const hoursUntilReservation = (reservationDateTime - now) / (1000 * 60 * 60);

    return hoursUntilReservation >= restaurant.cancellation_deadline_hours;
  };

  Reservation.prototype.canBeModified = function () {
    return this.isUpcoming() && ['pending_confirmation', 'confirmed'].includes(this.status);
  };

  Reservation.prototype.calculateExpectedDepartureTime = function () {
    if (!this.reservation_time || !this.seating_duration) return null;

    const [hours, minutes] = this.reservation_time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + this.seating_duration;
    const departureHours = Math.floor(totalMinutes / 60) % 24;
    const departureMinutes = totalMinutes % 60;

    return `${String(departureHours).padStart(2, '0')}:${String(departureMinutes).padStart(2, '0')}:00`;
  };

  Reservation.prototype.confirm = async function (staffId = null) {
    this.status = 'confirmed';
    this.confirmed_at = new Date();
    this.confirmed_by = staffId;
    await this.save();
  };

  Reservation.prototype.checkIn = async function (staffId, actualPartySize = null) {
    this.status = 'seated';
    this.checked_in_at = new Date();
    this.seated_at = new Date();
    this.actual_party_size = actualPartySize || this.party_size;
    await this.save();
  };

  Reservation.prototype.complete = async function () {
    this.status = 'completed';
    this.departed_at = new Date();
    await this.save();
  };

  Reservation.prototype.markNoShow = async function () {
    this.status = 'no_show';
    await this.save();
  };

  Reservation.prototype.cancel = async function (cancelledBy, reason = null) {
    if (cancelledBy === 'guest') {
      this.status = 'cancelled_by_guest';
    } else if (cancelledBy === 'restaurant') {
      this.status = 'cancelled_by_restaurant';
    }

    this.cancelled_at = new Date();
    this.cancellation_reason = reason;
    await this.save();
  };

  // Hooks
  Reservation.beforeCreate(async (reservation) => {
    if (!reservation.reservation_reference) {
      reservation.reservation_reference = await Reservation.generateReference();
    }

    if (!reservation.expected_departure_time) {
      reservation.expected_departure_time = reservation.calculateExpectedDepartureTime();
    }
  });

  Reservation.beforeUpdate((reservation) => {
    if (reservation.changed('reservation_time') || reservation.changed('seating_duration')) {
      reservation.expected_departure_time = reservation.calculateExpectedDepartureTime();
    }
  });

  return Reservation;
};
