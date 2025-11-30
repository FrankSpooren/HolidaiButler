/**
 * POI Sequelize Model (Wrapper)
 * ==============================
 * Read-only Sequelize model for POI table
 * Used by ticketing module for associations only
 * Main backend continues to use raw SQL for POI operations
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const POI = sequelize.define('POI', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    subcategory_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    location: {
      type: DataTypes.JSON,
      allowNull: true
    },
    coordinates: {
      type: DataTypes.JSON,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    contact: {
      type: DataTypes.JSON,
      allowNull: true
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true
    },
    opening_hours: {
      type: DataTypes.JSON,
      allowNull: true
    },
    pricing: {
      type: DataTypes.JSON,
      allowNull: true
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ratings: {
      type: DataTypes.JSON,
      allowNull: true
    },
    reviews: {
      type: DataTypes.JSON,
      allowNull: true
    },
    accessibility: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'POI',
    timestamps: false,
    indexes: [
      { fields: ['name'] },
      { fields: ['category_id'] },
      { fields: ['subcategory_id'] },
      { fields: ['is_active'] }
    ]
  });

  return POI;
};
