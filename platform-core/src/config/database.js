/**
 * Database Configuration
 * Manages connections to both MySQL (Hetzner) and MongoDB
 */

import { Sequelize } from 'sequelize';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// MySQL Connection (Hetzner - Central Database)
export const mysqlSequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timezone: process.env.DB_TIMEZONE || '+01:00',
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      acquire: 30000,
      idle: 10000,
    },
    logging: (msg) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(msg);
      }
    },
    timezone: process.env.DB_TIMEZONE || '+01:00',
  }
);

// MongoDB Connection
let mongoConnection = null;

export async function connectMongoDB() {
  if (!process.env.MONGODB_URI) {
    logger.warn('MongoDB URI not configured, skipping MongoDB connection');
    return null;
  }

  try {
    mongoConnection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info('✅ MongoDB connected successfully');
    return mongoConnection;
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

// Initialize all database connections
export async function initializeDatabase() {
  try {
    // Test MySQL connection
    await mysqlSequelize.authenticate();
    logger.info('✅ MySQL (Hetzner) connected successfully');

    // Sync models (in production, use migrations instead)
    if (process.env.NODE_ENV !== 'production') {
      await mysqlSequelize.sync({ alter: false });
      logger.info('✅ MySQL models synchronized');
    }

    // Connect to MongoDB
    await connectMongoDB();

    return {
      mysql: mysqlSequelize,
      mongodb: mongoConnection,
    };
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase() {
  try {
    await mysqlSequelize.close();
    logger.info('MySQL connection closed');

    if (mongoConnection) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
}

export default {
  mysql: mysqlSequelize,
  connectMongoDB,
  initializeDatabase,
  closeDatabase,
};
