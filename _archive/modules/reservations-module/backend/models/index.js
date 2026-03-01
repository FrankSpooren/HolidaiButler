/**
 * Database Models Index - Reservations Module
 * Exports all Sequelize models for restaurant reservations
 * Shared MySQL connection with ticketing module
 */

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance (shared with ticketing module)
const sequelize = new Sequelize(
  process.env.DATABASE_NAME || 'pxoziy_db1',
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
    },
    timezone: '+00:00',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      underscored: false,
      timestamps: true,
    },
  }
);

// Import models
const Restaurant = require('./Restaurant')(sequelize, DataTypes);
const Table = require('./Table')(sequelize, DataTypes);
const Reservation = require('./Reservation')(sequelize, DataTypes);
const Guest = require('./Guest')(sequelize, DataTypes);
const GuestNote = require('./GuestNote')(sequelize, DataTypes);
const Waitlist = require('./Waitlist')(sequelize, DataTypes);
const FloorPlan = require('./FloorPlan')(sequelize, DataTypes);
const RestaurantAvailability = require('./RestaurantAvailability')(sequelize, DataTypes);

// Define associations
const setupAssociations = () => {
  // Restaurant has many Tables
  Restaurant.hasMany(Table, { foreignKey: 'restaurant_id', as: 'tables' });
  Table.belongsTo(Restaurant, { foreignKey: 'restaurant_id', as: 'restaurant' });

  // Restaurant has many Reservations
  Restaurant.hasMany(Reservation, { foreignKey: 'restaurant_id', as: 'reservations' });
  Reservation.belongsTo(Restaurant, { foreignKey: 'restaurant_id', as: 'restaurant' });

  // Guest has many Reservations
  Guest.hasMany(Reservation, { foreignKey: 'guest_id', as: 'reservations' });
  Reservation.belongsTo(Guest, { foreignKey: 'guest_id', as: 'guest' });

  // Restaurant has many Guests (through GuestNotes)
  Restaurant.belongsToMany(Guest, {
    through: GuestNote,
    foreignKey: 'restaurant_id',
    otherKey: 'guest_id',
    as: 'guests',
  });
  Guest.belongsToMany(Restaurant, {
    through: GuestNote,
    foreignKey: 'guest_id',
    otherKey: 'restaurant_id',
    as: 'visitedRestaurants',
  });

  // GuestNote associations
  GuestNote.belongsTo(Guest, { foreignKey: 'guest_id', as: 'guest' });
  GuestNote.belongsTo(Restaurant, { foreignKey: 'restaurant_id', as: 'restaurant' });

  // Restaurant has many Waitlist entries
  Restaurant.hasMany(Waitlist, { foreignKey: 'restaurant_id', as: 'waitlist' });
  Waitlist.belongsTo(Restaurant, { foreignKey: 'restaurant_id', as: 'restaurant' });

  // Guest has many Waitlist entries
  Guest.hasMany(Waitlist, { foreignKey: 'guest_id', as: 'waitlistEntries' });
  Waitlist.belongsTo(Guest, { foreignKey: 'guest_id', as: 'guest' });

  // Waitlist can convert to Reservation
  Waitlist.belongsTo(Reservation, {
    foreignKey: 'converted_to_reservation_id',
    as: 'convertedReservation',
  });

  // Restaurant has many FloorPlans
  Restaurant.hasMany(FloorPlan, { foreignKey: 'restaurant_id', as: 'floorPlans' });
  FloorPlan.belongsTo(Restaurant, { foreignKey: 'restaurant_id', as: 'restaurant' });

  // Restaurant has many Availability slots
  Restaurant.hasMany(RestaurantAvailability, {
    foreignKey: 'restaurant_id',
    as: 'availabilitySlots',
  });
  RestaurantAvailability.belongsTo(Restaurant, {
    foreignKey: 'restaurant_id',
    as: 'restaurant',
  });
};

// Execute association setup
setupAssociations();

// Sync database (create tables if not exist)
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    if (options.force) {
      console.warn('⚠️  FORCE SYNC: Dropping all tables and recreating...');
    }

    await sequelize.sync(options);
    console.log('✅ Database synchronized successfully.');

    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection test successful.');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  DataTypes,

  // Models
  Restaurant,
  Table,
  Reservation,
  Guest,
  GuestNote,
  Waitlist,
  FloorPlan,
  RestaurantAvailability,

  // Utilities
  syncDatabase,
  testConnection,
};
