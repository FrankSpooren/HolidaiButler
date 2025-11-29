/**
 * Database Configuration
 * Manages connections to both MySQL (Hetzner) and MongoDB
 */

import { Sequelize } from 'sequelize';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ESM - MUST be before dotenv.config()
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env FIRST - before any other code
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Debug: Log the loaded values
console.log('[Database Config] Loading from:', envPath);
console.log('[Database Config] DB_USER:', process.env.DB_USER || '(not set, using root)');
console.log('[Database Config] DB_HOST:', process.env.DB_HOST || '(not set, using localhost)');
console.log('[Database Config] DB_NAME:', process.env.DB_NAME || '(not set, using holidaibutler)');

// MySQL Connection (Hetzner - Central Database)
// Use explicit defaults as fallbacks
const dbConfig = {
  database: process.env.DB_NAME || 'holidaibutler',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

console.log('[Database Config] Connecting as:', dbConfig.username, 'to', dbConfig.host + ':' + dbConfig.port);

export const mysqlSequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
      timezone: process.env.DB_TIMEZONE || '+01:00',
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      acquire: 30000,
      idle: 10000,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: process.env.DB_TIMEZONE || '+01:00',
  }
);

// MongoDB Connection
let mongoConnection = null;

export async function connectMongoDB() {
  if (!process.env.MONGODB_URI) {
    console.log('[Database] MongoDB URI not configured, skipping MongoDB connection');
    return null;
  }

  try {
    mongoConnection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ MongoDB connected successfully');
    return mongoConnection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

// Initialize all database connections
export async function initializeDatabase() {
  try {
    // Test MySQL connection
    await mysqlSequelize.authenticate();
    console.log('✅ MySQL (Hetzner) connected successfully');

    // Sync models (in production, use migrations instead)
    if (process.env.NODE_ENV !== 'production') {
      await mysqlSequelize.sync({ alter: false });
      console.log('✅ MySQL models synchronized');
    }

    // Connect to MongoDB
    await connectMongoDB();

    return {
      mysql: mysqlSequelize,
      mongodb: mongoConnection,
    };
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase() {
  try {
    await mysqlSequelize.close();
    console.log('MySQL connection closed');

    if (mongoConnection) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}

export default {
  mysql: mysqlSequelize,
  connectMongoDB,
  initializeDatabase,
  closeDatabase,
};
