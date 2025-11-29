/**
 * Guest Model
 * Represents a guest profile with preferences and history
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Guest = sequelize.define(
    'Guest',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
      },

      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Link to users table if registered, NULL for guest checkouts',
      },

      // Identity
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(200),
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      // Preferences
      default_party_size: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
      },
      preferred_seating_areas: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array: patio, window, quiet, etc.',
      },
      dietary_restrictions: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array: vegetarian, vegan, gluten_free, etc.',
      },

      // Statistics
      total_reservations: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      completed_reservations: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      no_show_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      cancellation_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      // Status
      is_vip: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_blacklisted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      blacklist_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Communication Preferences
      marketing_consent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      sms_notifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      email_notifications: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      // Metadata
      language: {
        type: DataTypes.STRING(5),
        defaultValue: 'en',
      },
      timezone: {
        type: DataTypes.STRING(50),
        defaultValue: 'Europe/Amsterdam',
      },
    },
    {
      tableName: 'guests',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_email',
          unique: true,
          fields: ['email'],
        },
        {
          name: 'idx_stats',
          fields: ['total_reservations', 'no_show_count'],
        },
        {
          name: 'idx_vip',
          fields: ['is_vip', 'is_blacklisted'],
        },
      ],
    }
  );

  // Instance Methods
  Guest.prototype.getFullName = function () {
    return `${this.first_name} ${this.last_name}`;
  };

  Guest.prototype.getReputationScore = function () {
    if (this.total_reservations === 0) return 100;

    const completionRate = (this.completed_reservations / this.total_reservations) * 100;
    const noShowPenalty = this.no_show_count * 5;
    const cancellationPenalty = this.cancellation_count * 2;

    return Math.max(0, Math.min(100, completionRate - noShowPenalty - cancellationPenalty));
  };

  Guest.prototype.isReliable = function () {
    return this.getReputationScore() >= 70;
  };

  Guest.prototype.canMakeReservation = function () {
    return !this.is_blacklisted && this.isReliable();
  };

  return Guest;
};
