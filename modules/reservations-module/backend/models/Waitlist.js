/**
 * Waitlist Model
 * Represents waitlist entries for fully booked time slots
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Waitlist = sequelize.define(
    'Waitlist',
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

      // Guest Info
      guest_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'guests',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
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

      // Waitlist Details
      desired_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      desired_time_start: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Flexible time range start',
      },
      desired_time_end: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Flexible time range end',
      },
      party_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },

      // Special Requests
      special_occasion: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      special_requests: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Status
      status: {
        type: DataTypes.ENUM('active', 'notified', 'converted', 'expired', 'cancelled'),
        defaultValue: 'active',
      },

      // Notifications
      notification_sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notification_method: {
        type: DataTypes.ENUM('email', 'sms', 'both'),
        allowNull: true,
      },
      guest_responded_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // Conversion
      converted_to_reservation_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'reservations',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      converted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // Expiry
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Auto-expire after 7 days',
      },
    },
    {
      tableName: 'waitlist',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_restaurant_date',
          fields: ['restaurant_id', 'desired_date', 'status'],
        },
        {
          name: 'idx_guest',
          fields: ['guest_id', 'status'],
        },
        {
          name: 'idx_status_expiry',
          fields: ['status', 'expires_at'],
        },
      ],
    }
  );

  // Instance Methods
  Waitlist.prototype.isActive = function () {
    return this.status === 'active' && new Date() < new Date(this.expires_at);
  };

  Waitlist.prototype.notify = async function (method = 'both') {
    this.status = 'notified';
    this.notification_sent_at = new Date();
    this.notification_method = method;
    await this.save();
  };

  Waitlist.prototype.convert = async function (reservationId) {
    this.status = 'converted';
    this.converted_to_reservation_id = reservationId;
    this.converted_at = new Date();
    await this.save();
  };

  Waitlist.prototype.expire = async function () {
    this.status = 'expired';
    await this.save();
  };

  // Hooks
  Waitlist.beforeCreate((waitlist) => {
    if (!waitlist.expires_at) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days
      waitlist.expires_at = expiryDate;
    }
  });

  return Waitlist;
};
