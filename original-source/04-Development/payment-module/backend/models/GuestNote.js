/**
 * GuestNote Model
 * Represents staff notes about guests (preferences, incidents, etc.)
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const GuestNote = sequelize.define(
    'GuestNote',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
      },

      guest_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'guests',
          key: 'id',
        },
        onDelete: 'CASCADE',
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

      // Note Content
      note: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      note_type: {
        type: DataTypes.ENUM('preference', 'allergy', 'incident', 'vip', 'general'),
        defaultValue: 'general',
      },

      // Context
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Staff member user ID who created the note',
      },
      is_alert: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Show as alert when guest books',
      },
    },
    {
      tableName: 'guest_notes',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_guest_restaurant',
          fields: ['guest_id', 'restaurant_id'],
        },
        {
          name: 'idx_alerts',
          fields: ['restaurant_id', 'is_alert'],
        },
      ],
    }
  );

  return GuestNote;
};
