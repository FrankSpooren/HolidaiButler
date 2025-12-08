/**
 * Booking Model (Sequelize)
 * Converted to MySQL for HolidaiButler platform integration
 * Enhanced booking model for ticketing module with full lifecycle management
 *
 * UPDATED: 2025-11-17 - Changed from UUID to INT(11) to match platform schema
 */

module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define(
    'Booking',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Auto-increment primary key (INT)',
      },

      // Unique booking reference
      bookingReference: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'booking_reference',
        comment: 'Format: BK-YYYY-NNNNNN (e.g., BK-2025-001234)',
      },

      // References
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Foreign key to Users table (capitalized)',
      },

      poiId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'poi_id',
        references: {
          model: 'POI',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Foreign key to POI table (capitalized)',
      },

      // Booking status
      status: {
        type: DataTypes.ENUM(
          'pending',
          'confirmed',
          'cancelled',
          'completed',
          'no-show',
          'expired'
        ),
        defaultValue: 'pending',
        allowNull: false,
      },

      // Booking details
      bookingDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'booking_date',
      },

      bookingTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'booking_time',
        comment: 'Format: HH:MM',
      },

      durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'duration_minutes',
        comment: 'Duration in minutes',
      },

      adults: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },

      children: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },

      infants: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },

      specialRequests: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'special_requests',
      },

      // Pricing information (JSON for flexibility)
      pricing: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: 'Contains basePrice, taxes, fees, discount, totalPrice, currency, commission',
      },

      // Payment information
      paymentStatus: {
        type: DataTypes.ENUM(
          'pending',
          'authorized',
          'paid',
          'failed',
          'refunded',
          'partially_refunded'
        ),
        defaultValue: 'pending',
        field: 'payment_status',
      },

      paymentMethod: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'payment_method',
        comment: 'e.g., card, ideal, paypal',
      },

      transactionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'transaction_id',
        comment: 'Reference to Payment Module transaction',
      },

      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'paid_at',
      },

      // Tickets (JSON array of ticket IDs)
      ticketIds: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        field: 'ticket_ids',
      },

      deliveryMethod: {
        type: DataTypes.ENUM('email', 'sms', 'app', 'wallet'),
        defaultValue: 'email',
        field: 'delivery_method',
      },

      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'delivered_at',
      },

      // Experience details (JSON)
      experience: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Contains productType, meetingPoint, duration, language, groupSize',
      },

      // Cancellation (JSON)
      cancellation: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Contains allowCancellation, deadline, policy, cancelledAt, cancelledBy, reason',
      },

      // Voucher/discount code (JSON)
      voucher: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Contains code, discountAmount, discountPercentage',
      },

      // Partner information (JSON)
      partner: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Contains name, email, confirmationMethod, confirmedAt, externalReference',
      },

      // AI context (JSON) - integration with main HolidaiButler AI
      aiContext: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        field: 'ai_context',
        comment: 'Contains generatedFromMessage, recommendationScore, conversationContext',
      },

      // Reservation lock (JSON)
      reservation: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Contains isLocked, lockedUntil, lockId for pending payments',
      },

      // Guest information
      guestName: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'guest_name',
      },

      guestEmail: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'guest_email',
        validate: {
          isEmail: true,
        },
      },

      guestPhone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'guest_phone',
      },

      guestNationality: {
        type: DataTypes.STRING(2),
        allowNull: true,
        field: 'guest_nationality',
        comment: 'ISO 3166-1 alpha-2 code',
      },

      // Metadata (JSON)
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Contains source, ipAddress, userAgent',
      },
    },
    {
      tableName: 'bookings',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_booking_ref',
          unique: true,
          fields: ['booking_reference'],
        },
        {
          name: 'idx_user_status',
          fields: ['user_id', 'status'],
        },
        {
          name: 'idx_poi_date',
          fields: ['poi_id', 'booking_date'],
        },
        {
          name: 'idx_transaction',
          fields: ['transaction_id'],
        },
        {
          name: 'idx_status_created',
          fields: ['status', 'created_at'],
        },
      ],
    }
  );

  // Associations (conditional for standalone/integrated mode)
  Booking.associate = (models) => {
    // Optional associations (only when integrated with main backend)
    if (models.User) {
      Booking.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }

    if (models.POI) {
      Booking.belongsTo(models.POI, {
        foreignKey: 'poiId',
        as: 'poi',
      });
    }

    // Core association (always available)
    if (models.Ticket) {
      Booking.hasMany(models.Ticket, {
        foreignKey: 'bookingId',
        as: 'tickets',
      });
    }
  };

  // Instance Methods

  /**
   * Get total number of guests
   */
  Booking.prototype.getTotalGuests = function () {
    return (this.adults || 0) + (this.children || 0) + (this.infants || 0);
  };

  /**
   * Check if booking can be cancelled
   */
  Booking.prototype.canBeCancelled = function () {
    if (!this.cancellation?.allowCancellation) return false;
    if (this.status === 'cancelled' || this.status === 'completed') return false;

    const now = new Date();
    if (
      this.cancellation.cancellationDeadline &&
      now > new Date(this.cancellation.cancellationDeadline)
    ) {
      return false;
    }

    return true;
  };

  /**
   * Confirm booking after successful payment
   * @param {string} transactionId - Payment transaction ID
   */
  Booking.prototype.confirmBooking = async function (transactionId) {
    this.status = 'confirmed';
    this.paymentStatus = 'paid';
    this.transactionId = transactionId;
    this.paidAt = new Date();

    // Release reservation lock
    if (this.reservation) {
      this.reservation = {
        ...this.reservation,
        isLocked: false,
        lockedUntil: null,
      };
    }

    await this.save();
    return this;
  };

  /**
   * Cancel booking
   * @param {string} userId - User ID who is cancelling
   * @param {string} reason - Cancellation reason
   */
  Booking.prototype.cancelBooking = async function (userId, reason) {
    if (!this.canBeCancelled()) {
      throw new Error('Booking cannot be cancelled');
    }

    this.status = 'cancelled';
    this.cancellation = {
      ...this.cancellation,
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancellationReason: reason,
    };

    await this.save();
    return this;
  };

  // Static Methods

  /**
   * Generate unique booking reference
   * Format: BK-YYYY-NNNNNN
   */
  Booking.generateBookingReference = async function () {
    const year = new Date().getFullYear();
    const { Op } = require('sequelize');

    const count = await this.count({
      where: {
        bookingReference: {
          [Op.like]: `BK-${year}-%`,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(6, '0');
    return `BK-${year}-${sequence}`;
  };

  // Hooks

  /**
   * Before create - Auto-generate booking reference
   */
  Booking.beforeCreate(async (booking) => {
    if (!booking.bookingReference) {
      booking.bookingReference = await Booking.generateBookingReference();
    }
  });

  /**
   * Before save - Check reservation expiry
   */
  Booking.beforeSave((booking) => {
    const now = new Date();

    // Auto-expire pending bookings with expired locks
    if (
      booking.status === 'pending' &&
      booking.reservation?.lockedUntil &&
      now > new Date(booking.reservation.lockedUntil)
    ) {
      booking.status = 'expired';
      booking.reservation = {
        ...booking.reservation,
        isLocked: false,
      };
    }
  });

  return Booking;
};
