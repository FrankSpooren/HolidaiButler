/**
 * Table Model
 * Represents a physical table in a restaurant
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Table = sequelize.define(
    'Table',
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

      // Table Identity
      table_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Table number or identifier (e.g., "1", "A1", "Patio-3")',
      },
      table_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Descriptive name (e.g., "Window Table 1", "Corner Booth")',
      },

      // Capacity
      min_capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
        comment: 'Minimum number of guests',
      },
      max_capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
        comment: 'Maximum number of guests',
      },

      // Location in Restaurant
      seating_area: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Main Dining, Patio, Bar, Private Room, etc.',
      },
      floor_plan_x: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'X coordinate on floor plan canvas',
      },
      floor_plan_y: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Y coordinate on floor plan canvas',
      },

      // Attributes
      table_type: {
        type: DataTypes.ENUM('standard', 'bar', 'high_top', 'booth', 'outdoor', 'private'),
        defaultValue: 'standard',
      },
      features: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment:
          'Array of features: window_view, quiet, round, wheelchair_accessible, power_outlet, etc.',
      },

      // Priority & Status
      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Higher priority tables assigned first (0 = lowest)',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Can this table be used?',
      },
      is_available_for_online: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Can this table be booked online?',
      },

      // Combination Rules
      can_combine_with: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of table IDs that can be combined with this table',
      },
      combined_capacity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total capacity when combined with another table',
      },

      // Metadata
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Internal notes about the table',
      },
    },
    {
      tableName: 'tables',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'unique_table',
          unique: true,
          fields: ['restaurant_id', 'table_number'],
        },
        {
          name: 'idx_capacity',
          fields: ['restaurant_id', 'min_capacity', 'max_capacity'],
        },
        {
          name: 'idx_area',
          fields: ['restaurant_id', 'seating_area'],
        },
        {
          name: 'idx_availability',
          fields: ['restaurant_id', 'is_active', 'is_available_for_online'],
        },
      ],
    }
  );

  // Instance Methods
  Table.prototype.canAccommodate = function (partySize) {
    return partySize >= this.min_capacity && partySize <= this.max_capacity;
  };

  Table.prototype.isAvailableForBooking = function () {
    return this.is_active && this.is_available_for_online;
  };

  Table.prototype.hasFeature = function (feature) {
    return this.features.includes(feature);
  };

  Table.prototype.canCombineWith = function (tableId) {
    return this.can_combine_with.includes(tableId);
  };

  // Validation
  Table.beforeValidate((table) => {
    if (table.min_capacity > table.max_capacity) {
      throw new Error('min_capacity cannot be greater than max_capacity');
    }
  });

  return Table;
};
