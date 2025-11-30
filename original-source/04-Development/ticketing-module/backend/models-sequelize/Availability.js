/**
 * Availability Model (Sequelize)
 * Converted to MySQL for HolidaiButler platform integration
 * Manages inventory and capacity for POIs by date and timeslot
 * Cached in Redis for real-time checks, persisted in MySQL for durability
 *
 * UPDATED: 2025-11-17 - Changed from UUID to INT(11) to match platform schema
 */

module.exports = (sequelize, DataTypes) => {
  const Availability = sequelize.define(
    'Availability',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Auto-increment primary key (INT)',
      },

      // POI reference
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

      // Date (YYYY-MM-DD)
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      // Optional timeslot (for timed entry tickets)
      timeslot: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Format: HH:MM-HH:MM (e.g., 09:00-10:00), null for all-day tickets',
      },

      // Capacity management
      totalCapacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'total_capacity',
        validate: {
          min: 0,
        },
      },

      bookedCapacity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'booked_capacity',
        validate: {
          min: 0,
        },
      },

      reservedCapacity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'reserved_capacity',
        comment: 'Pending payments (locked for 15 minutes)',
        validate: {
          min: 0,
        },
      },

      availableCapacity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'available_capacity',
        comment: 'Computed: total - booked - reserved',
        validate: {
          min: 0,
        },
      },

      // Dynamic pricing
      basePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'base_price',
      },

      currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'EUR',
      },

      dynamicPriceMultiplier: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 1.0,
        field: 'dynamic_price_multiplier',
        comment: 'Multiplier based on demand, season, day of week',
        validate: {
          min: 0.5,
          max: 3.0,
        },
      },

      finalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'final_price',
        comment: 'Computed: basePrice * dynamicPriceMultiplier',
      },

      // Booking restrictions
      minBooking: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: 'min_booking',
        validate: {
          min: 1,
        },
      },

      maxBooking: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        field: 'max_booking',
      },

      cutoffHours: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
        field: 'cutoff_hours',
        comment: 'Hours before event when booking closes',
      },

      // Status
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
      },

      isSoldOut: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_sold_out',
      },

      // Partner sync (JSON)
      partnerSync: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        field: 'partner_sync',
        comment: 'Contains lastSyncedAt, externalInventoryId, syncEnabled',
      },

      // Metadata (JSON)
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Contains createdBy (system/admin/partner-sync), notes',
      },
    },
    {
      tableName: 'availability',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_poi_date_timeslot',
          unique: true,
          fields: ['poi_id', 'date', 'timeslot'],
        },
        {
          name: 'idx_date_active',
          fields: ['date', 'is_active'],
        },
        {
          name: 'idx_poi_date_soldout',
          fields: ['poi_id', 'date', 'is_sold_out'],
        },
        {
          name: 'idx_poi_id',
          fields: ['poi_id'],
        },
      ],
    }
  );

  // Associations (conditional for standalone/integrated mode)
  Availability.associate = (models) => {
    // Optional association (only when integrated with main backend)
    if (models.POI) {
      Availability.belongsTo(models.POI, {
        foreignKey: 'poiId',
        as: 'poi',
      });
    }
  };

  // Instance Methods

  /**
   * Check if this availability slot is currently bookable
   */
  Availability.prototype.isBookable = function () {
    const now = new Date();
    const eventDateTime = new Date(this.date);
    const cutoffTime = new Date(
      eventDateTime.getTime() - this.cutoffHours * 60 * 60 * 1000
    );

    return (
      this.isActive &&
      !this.isSoldOut &&
      this.availableCapacity > 0 &&
      now < cutoffTime
    );
  };

  /**
   * Check if specified quantity is available
   * @param {number} quantity - Number of spots requested
   */
  Availability.prototype.hasAvailability = function (quantity) {
    if (!this.isActive || this.isSoldOut) return false;
    if (quantity < this.minBooking || quantity > this.maxBooking) return false;
    if (this.availableCapacity < quantity) return false;

    const now = new Date();
    const eventDateTime = new Date(this.date);
    const cutoffTime = new Date(
      eventDateTime.getTime() - this.cutoffHours * 60 * 60 * 1000
    );
    if (now >= cutoffTime) return false;

    return true;
  };

  /**
   * Reserve capacity for pending booking
   * @param {number} quantity - Number of spots to reserve
   * @param {number} lockDuration - Duration in seconds (default 900 = 15 minutes)
   * @returns {Date} Lock expiry time
   */
  Availability.prototype.reserveCapacity = async function (
    quantity,
    lockDuration = 900
  ) {
    if (!this.hasAvailability(quantity)) {
      throw new Error('Insufficient availability');
    }

    this.reservedCapacity += quantity;
    this.availableCapacity =
      this.totalCapacity - this.bookedCapacity - this.reservedCapacity;

    if (this.availableCapacity <= 0) {
      this.isSoldOut = true;
    }

    await this.save();

    // Return lock expiry time
    return new Date(Date.now() + lockDuration * 1000);
  };

  /**
   * Confirm booking - convert reservation to booked
   * @param {number} quantity - Number of spots to confirm
   */
  Availability.prototype.confirmBooking = async function (quantity) {
    this.reservedCapacity = Math.max(0, this.reservedCapacity - quantity);
    this.bookedCapacity += quantity;
    this.availableCapacity =
      this.totalCapacity - this.bookedCapacity - this.reservedCapacity;

    if (this.availableCapacity <= 0) {
      this.isSoldOut = true;
    } else {
      this.isSoldOut = false;
    }

    await this.save();
    return this;
  };

  /**
   * Release reservation (e.g., payment timeout)
   * @param {number} quantity - Number of spots to release
   */
  Availability.prototype.releaseReservation = async function (quantity) {
    this.reservedCapacity = Math.max(0, this.reservedCapacity - quantity);
    this.availableCapacity =
      this.totalCapacity - this.bookedCapacity - this.reservedCapacity;

    if (this.availableCapacity > 0) {
      this.isSoldOut = false;
    }

    await this.save();
    return this;
  };

  /**
   * Cancel booking - return booked capacity
   * @param {number} quantity - Number of spots to return
   */
  Availability.prototype.cancelBooking = async function (quantity) {
    this.bookedCapacity = Math.max(0, this.bookedCapacity - quantity);
    this.availableCapacity =
      this.totalCapacity - this.bookedCapacity - this.reservedCapacity;

    if (this.availableCapacity > 0) {
      this.isSoldOut = false;
    }

    await this.save();
    return this;
  };

  // Static Methods

  /**
   * Get availability for a date range
   * @param {string} poiId - POI UUID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  Availability.getAvailabilityRange = async function (
    poiId,
    startDate,
    endDate
  ) {
    const { Op } = require('sequelize');

    return await this.findAll({
      where: {
        poiId,
        date: {
          [Op.between]: [startDate, endDate],
        },
        isActive: true,
      },
      order: [
        ['date', 'ASC'],
        ['timeslot', 'ASC'],
      ],
    });
  };

  // Hooks

  /**
   * Before save - compute available capacity and final price
   */
  Availability.beforeSave((availability) => {
    // Compute available capacity
    availability.availableCapacity = Math.max(
      0,
      availability.totalCapacity -
        availability.bookedCapacity -
        availability.reservedCapacity
    );

    // Compute final price
    availability.finalPrice = Math.round(
      parseFloat(availability.basePrice) *
        parseFloat(availability.dynamicPriceMultiplier) *
        100
    ) / 100;

    // Update sold out status
    if (availability.availableCapacity <= 0) {
      availability.isSoldOut = true;
    } else {
      availability.isSoldOut = false;
    }
  });

  return Availability;
};
