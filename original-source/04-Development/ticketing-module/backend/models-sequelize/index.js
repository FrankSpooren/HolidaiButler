/**
 * Ticketing Module - Sequelize Models Index (Enterprise DI Pattern)
 * ===================================================================
 * Supports Dependency Injection of external models (User, POI)
 * from main backend while maintaining standalone capability
 * HolidaiButler Platform Integration
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Module state
let _initialized = false;
let _models = null;
let _sequelize = null;

/**
 * Initialize Sequelize instance (used when standalone)
 */
function createSequelizeInstance() {
  return new Sequelize(
    process.env.DB_NAME || 'pxoziy_db1',
    process.env.DB_USER || 'pxoziy_1',
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'jotx.your-database.de',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      pool: {
        max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: false,
      },
      timezone: '+01:00', // Europe/Amsterdam
    }
  );
}

/**
 * Initialize models with Dependency Injection support
 * @param {Sequelize} sequelizeInstance - Optional external Sequelize instance
 * @param {Object} externalModels - Optional external models {User, POI}
 * @returns {Object} Initialized models
 */
function initialize(sequelizeInstance = null, externalModels = {}) {
  // Prevent duplicate initialization
  if (_initialized && _models) {
    console.log('ℹ️  Ticketing models already initialized, returning cached instance');
    return _models;
  }

  // Use provided Sequelize instance or create new one
  const sequelize = sequelizeInstance || createSequelizeInstance();
  _sequelize = sequelize;

  const models = {};

  // Import ticketing models
  const Ticket = require('./Ticket')(sequelize, Sequelize.DataTypes);
  const Booking = require('./Booking')(sequelize, Sequelize.DataTypes);
  const Availability = require('./Availability')(sequelize, Sequelize.DataTypes);

  models.Ticket = Ticket;
  models.Booking = Booking;
  models.Availability = Availability;

  // Inject external models (User, POI) from main backend
  if (externalModels.User) {
    models.User = externalModels.User;
    console.log('✅ Injected User model from main backend');
  } else {
    // Standalone mode: User/POI data accessible via main backend API
    // Foreign key associations work, but direct Sequelize includes are not available
  }

  if (externalModels.POI) {
    models.POI = externalModels.POI;
    console.log('✅ Injected POI model from main backend');
  } else {
    // Standalone mode: User/POI data accessible via main backend API
    // Foreign key associations work, but direct Sequelize includes are not available
  }

  // Set up associations (now includes User and POI)
  Object.keys(models).forEach((modelName) => {
    if (models[modelName].associate) {
      models[modelName].associate(models);
    }
  });

  models.sequelize = sequelize;
  models.Sequelize = Sequelize;

  _models = models;
  _initialized = true;

  console.log('✅ Ticketing models initialized with', Object.keys(models).filter(k => !['sequelize', 'Sequelize'].includes(k)).join(', '));

  return models;
}

/**
 * Get initialized models
 * @returns {Object} Models or null if not initialized
 */
function getModels() {
  if (!_initialized || !_models) {
    throw new Error('Ticketing models not initialized. Call initialize() first.');
  }
  return _models;
}

/**
 * Reset initialization state (for testing)
 */
function reset() {
  _initialized = false;
  _models = null;
  _sequelize = null;
}

/**
 * Test database connection
 */
async function testConnection(sequelize = _sequelize) {
  try {
    await sequelize.authenticate();
    console.log('✅ Ticketing Module: MySQL database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Ticketing Module: Unable to connect to MySQL database:', error.message);
    throw error;
  }
}

/**
 * Sync database (create tables if they don't exist)
 * WARNING: Use with caution in production
 */
async function syncDatabase(options = {}) {
  const sequelize = _sequelize;
  if (!sequelize) {
    throw new Error('Sequelize not initialized');
  }

  try {
    const syncOptions = {
      force: options.force || false,
      alter: options.alter || false,
    };

    await sequelize.sync(syncOptions);
    console.log('✅ Ticketing Module: Database synchronized successfully');
    return true;
  } catch (error) {
    console.error('❌ Ticketing Module: Database sync failed:', error.message);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeConnection() {
  const sequelize = _sequelize;
  if (!sequelize) {
    return;
  }

  try {
    await sequelize.close();
    console.log('✅ Ticketing Module: Database connection closed');
  } catch (error) {
    console.error('❌ Ticketing Module: Error closing database connection:', error.message);
  }
}

// Export factory functions and utilities
module.exports = {
  initialize,
  getModels,
  reset,
  testConnection,
  syncDatabase,
  closeConnection,
  Sequelize,
};
