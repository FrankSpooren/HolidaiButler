/**
 * Sequelize Models Index
 * =======================
 * Initializes and exports Sequelize models for User and POI
 * These are wrapper models that coexist with raw SQL approach
 * Used by ticketing module for Sequelize associations
 */

const { sequelize, Sequelize } = require('../../config/sequelize');
const logger = require('../../utils/logger');

// Import model definitions
const UserModel = require('./User.sequelize');
const POIModel = require('./POI.sequelize');

// Initialize models
const User = UserModel(sequelize);
const POI = POIModel(sequelize);

// No associations needed here - User and POI are standalone
// Ticketing module will create associations TO these models

logger.info('Sequelize wrapper models initialized (User, POI)');

module.exports = {
  sequelize,
  Sequelize,
  User,
  POI
};
