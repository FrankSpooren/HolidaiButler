/**
 * RestaurantAvailability Model
 * Represents real-time availability for specific date/time slots
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const RestaurantAvailability = sequelize.define(
    'RestaurantAvailability',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
      },

      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },

      // Date & Time Slot
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      time_slot: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'E.g., 17:00, 17:15, 17:30, etc.',
      },

      // Capacity Management
      total_covers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Total seats available',
      },
      reserved_covers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Confirmed reservations',
      },
      pending_covers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Pending (payment holds, 15-min locks)',
      },
      available_covers: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.total_covers - this.reserved_covers - this.pending_covers;
        },
        comment: 'Calculated: total - reserved - pending',
      },

      // Table Allocation
      available_tables: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of available table IDs',
      },

      // Status
      is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      is_sold_out: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      override_status: {
        type: DataTypes.ENUM('normal', 'private_event', 'closed', 'maintenance', 'weather'),
        defaultValue: 'normal',
      },

      // Booking Restrictions
      min_party_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Override restaurant default for this slot',
      },
      max_party_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Last Updated
      last_calculated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_reservation_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'restaurant_availability',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'unique_slot',
          unique: true,
          fields: ['restaurant_id', 'date', 'time_slot'],
        },
        {
          name: 'idx_date_available',
          fields: ['restaurant_id', 'date', 'is_available'],
        },
        {
          name: 'idx_covers',
          fields: ['restaurant_id', 'date', 'available_covers'],
        },
      ],
    }
  );

  // Instance Methods
  RestaurantAvailability.prototype.hasCapacityFor = function (partySize) {
    const available = this.total_covers - this.reserved_covers - this.pending_covers;
    return available >= partySize;
  };

  RestaurantAvailability.prototype.reserveCapacity = async function (partySize) {
    if (!this.hasCapacityFor(partySize)) {
      throw new Error('Insufficient capacity');
    }
    this.pending_covers += partySize;
    this.last_reservation_at = new Date();
    await this.save();
  };

  RestaurantAvailability.prototype.confirmReservation = async function (partySize) {
    this.pending_covers = Math.max(0, this.pending_covers - partySize);
    this.reserved_covers += partySize;
    this.is_sold_out = this.reserved_covers >= this.total_covers;
    await this.save();
  };

  RestaurantAvailability.prototype.releaseReservation = async function (partySize, wasConfirmed = false) {
    if (wasConfirmed) {
      this.reserved_covers = Math.max(0, this.reserved_covers - partySize);
    } else {
      this.pending_covers = Math.max(0, this.pending_covers - partySize);
    }
    this.is_sold_out = false;
    await this.save();
  };

  RestaurantAvailability.prototype.recalculateStatus = async function () {
    const available = this.total_covers - this.reserved_covers - this.pending_covers;
    this.is_available = available > 0 && this.override_status === 'normal';
    this.is_sold_out = available <= 0;
    this.last_calculated_at = new Date();
    await this.save();
  };

  return RestaurantAvailability;
};
