const { Sequelize } = require('sequelize');

/**
 * Database Configuration - MySQL/Sequelize
 * Migrated from MongoDB for platform consistency
 */

const sequelize = new Sequelize(
  process.env.DATABASE_NAME || 'holidaibutler',
  process.env.DATABASE_USER || 'root',
  process.env.DATABASE_PASSWORD || '',
  {
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    timezone: '+01:00',
  }
);

/**
 * Connect to database
 */
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL database connected successfully');

    if (process.env.DB_SYNC === 'true') {
      console.log('⚠️  DEV MODE: Syncing database models');
      await sequelize.sync({ alter: false });
      console.log('✅ Database models synchronized');
    }

    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    throw error;
  }
};

/**
 * Close database connection
 */
const closeDB = async () => {
  try {
    await sequelize.close();
    console.log('MySQL connection closed');
  } catch (error) {
    console.error('Error closing MySQL connection:', error);
  }
};

module.exports = {
  sequelize,
  connectDB,
  closeDB,
};
