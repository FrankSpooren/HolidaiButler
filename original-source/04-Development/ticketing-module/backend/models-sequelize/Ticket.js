/**
 * Ticket Model (Sequelize)
 * Converted from MongoDB to MySQL for HolidaiButler platform integration
 * Represents a digital ticket for POI entry, tours, experiences
 *
 * UPDATED: 2025-11-17 - Changed from UUID to INT(11) to match platform schema
 */

module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define(
    'Ticket',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Auto-increment primary key (INT)',
      },

      // Unique ticket identifier
      ticketNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'ticket_number',
        comment: 'Format: HB-YYYY-NNNNNN (e.g., HB-2025-001234)',
      },

      // References
      bookingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'booking_id',
        references: {
          model: 'bookings',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Foreign key to bookings table',
      },

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

      // Ticket type
      type: {
        type: DataTypes.ENUM(
          'single',
          'multi-day',
          'group',
          'guided-tour',
          'experience',
          'combo'
        ),
        allowNull: false,
      },

      // Validity period
      validFrom: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'valid_from',
      },

      validUntil: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'valid_until',
      },

      timeslot: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Format: HH:MM-HH:MM (e.g., 14:00-15:00)',
      },

      timezone: {
        type: DataTypes.STRING(50),
        defaultValue: 'Europe/Amsterdam',
      },

      // QR Code data for validation
      qrCodeData: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'qr_code_data',
        comment: 'Encrypted payload containing ticket verification data',
      },

      qrCodeImageUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'qr_code_image_url',
        comment: 'S3/CloudFront URL to QR code image',
      },

      qrCodeFormat: {
        type: DataTypes.ENUM('QR', 'Barcode128'),
        defaultValue: 'QR',
        field: 'qr_code_format',
      },

      // Ticket holder information
      holderName: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'holder_name',
      },

      holderEmail: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'holder_email',
        validate: {
          isEmail: true,
        },
      },

      holderPhone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'holder_phone',
      },

      // Product details (JSON)
      details: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: 'Contains productName, description, quantity, language, specialRequirements',
      },

      // Validation status
      isValidated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_validated',
      },

      validatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'validated_at',
      },

      validatedBy: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'validated_by',
        comment: 'Staff member ID or device ID',
      },

      validationLocation: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'validation_location',
        comment: 'GPS coordinates or location identifier',
      },

      // Ticket status
      status: {
        type: DataTypes.ENUM('active', 'used', 'expired', 'cancelled', 'refunded'),
        defaultValue: 'active',
        allowNull: false,
      },

      // Mobile wallet integration
      appleWalletUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'apple_wallet_url',
      },

      googlePayUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'google_pay_url',
      },

      // Metadata (JSON)
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Contains source, isTransferred, originalHolder, etc.',
      },
    },
    {
      tableName: 'tickets',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_ticket_number',
          fields: ['ticket_number'],
        },
        {
          name: 'idx_booking_id',
          fields: ['booking_id'],
        },
        {
          name: 'idx_user_status',
          fields: ['user_id', 'status'],
        },
        {
          name: 'idx_poi_date',
          fields: ['poi_id', 'valid_from'],
        },
        {
          name: 'idx_qr_code',
          fields: [{ name: 'qr_code_data', length: 255 }],
        },
        {
          name: 'idx_status_validity',
          fields: ['status', 'valid_until'],
        },
        {
          name: 'idx_validated',
          fields: ['is_validated'],
        },
      ],
    }
  );

  // Associations (conditional for standalone/integrated mode)
  Ticket.associate = (models) => {
    // Core association (always available)
    if (models.Booking) {
      Ticket.belongsTo(models.Booking, {
        foreignKey: 'bookingId',
        as: 'booking',
      });
    }

    // Optional associations (only when integrated with main backend)
    if (models.User) {
      Ticket.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }

    if (models.POI) {
      Ticket.belongsTo(models.POI, {
        foreignKey: 'poiId',
        as: 'poi',
      });
    }
  };

  // Instance Methods

  /**
   * Check if ticket is currently valid
   */
  Ticket.prototype.isCurrentlyValid = function () {
    const now = new Date();
    return (
      this.status === 'active' &&
      this.validFrom <= now &&
      this.validUntil >= now &&
      !this.isValidated
    );
  };

  /**
   * Validate ticket at venue
   * @param {string} validatorId - Staff member or device ID
   * @param {string} location - GPS coordinates or location identifier
   */
  Ticket.prototype.validateTicket = async function (validatorId, location) {
    if (this.isValidated) {
      throw new Error('Ticket already validated');
    }

    if (this.status !== 'active') {
      throw new Error(`Cannot validate ticket with status: ${this.status}`);
    }

    const now = new Date();
    if (now < this.validFrom || now > this.validUntil) {
      throw new Error('Ticket is not valid at this time');
    }

    this.isValidated = true;
    this.validatedAt = now;
    this.validatedBy = validatorId;
    this.validationLocation = location;
    this.status = 'used';

    await this.save();
    return this;
  };

  /**
   * Cancel/refund ticket
   * @param {string} reason - Cancellation reason
   */
  Ticket.prototype.cancelTicket = async function (reason) {
    if (this.isValidated) {
      throw new Error('Cannot cancel a validated ticket');
    }

    this.status = 'cancelled';
    this.metadata = {
      ...this.metadata,
      cancellationReason: reason,
      cancelledAt: new Date(),
    };

    await this.save();
    return this;
  };

  // Static Methods

  /**
   * Generate unique ticket number
   * Format: HB-YYYY-NNNNNN
   */
  Ticket.generateTicketNumber = async function () {
    const year = new Date().getFullYear();
    const { Op } = require('sequelize');

    const count = await this.count({
      where: {
        ticketNumber: {
          [Op.like]: `HB-${year}-%`,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(6, '0');
    return `HB-${year}-${sequence}`;
  };

  // Hooks

  /**
   * Before create - Auto-generate ticket number
   */
  Ticket.beforeCreate(async (ticket) => {
    if (!ticket.ticketNumber) {
      ticket.ticketNumber = await Ticket.generateTicketNumber();
    }
  });

  /**
   * Before save - Check expiry and update status
   */
  Ticket.beforeSave((ticket) => {
    const now = new Date();
    if (ticket.status === 'active' && now > ticket.validUntil) {
      ticket.status = 'expired';
    }
  });

  return Ticket;
};
