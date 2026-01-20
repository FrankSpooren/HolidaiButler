/**
 * FloorPlan Model
 * Represents visual floor plans for table layout
 */

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const FloorPlan = sequelize.define(
    'FloorPlan',
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

      // Floor Plan Identity
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Main Floor, Patio, Private Room, etc.',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Visual Layout
      layout_image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to floor plan image',
      },
      layout_width: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Image/canvas width in pixels',
      },
      layout_height: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Image/canvas height in pixels',
      },

      // Capacity
      total_tables: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      total_capacity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      // Status
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: 'floor_plans',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_restaurant',
          fields: ['restaurant_id', 'is_active'],
        },
      ],
    }
  );

  return FloorPlan;
};
