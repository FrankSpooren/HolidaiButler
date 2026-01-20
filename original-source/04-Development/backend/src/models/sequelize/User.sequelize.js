/**
 * User Sequelize Model (Wrapper)
 * ===============================
 * Read-only Sequelize model for Users table
 * Used by ticketing module for associations only
 * Main backend continues to use raw SQL for User operations
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uuid: {
      type: DataTypes.STRING(36),
      unique: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    profile_picture: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'moderator'),
      defaultValue: 'user'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    onboarding_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    onboarding_step: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    onboarding_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
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
    tableName: 'Users',
    timestamps: false,
    indexes: [
      { fields: ['email'] },
      { fields: ['uuid'] },
      { fields: ['is_active'] }
    ]
  });

  return User;
};
