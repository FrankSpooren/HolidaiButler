/**
 * Sequelize Configuration
 * =======================
 * Sequelize ORM instance for ticketing module integration
 * Coexists with raw SQL approach used by main backend
 */

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Create Sequelize instance using same DB credentials
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    pool: {
      max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ?
      (msg) => logger.debug(msg) : false,
    define: {
      timestamps: false, // Use custom timestamp columns
      underscored: false // Use camelCase (matches existing schema)
    }
  }
);

// Test Sequelize connection
async function testSequelizeConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Sequelize connection established successfully');
    return true;
  } catch (error) {
    logger.error('Unable to connect to database via Sequelize:', error.message);
    throw error;
  }
}

module.exports = {
  sequelize,
  testSequelizeConnection,
  Sequelize
};
