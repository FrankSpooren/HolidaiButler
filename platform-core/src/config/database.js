/**
 * Database Configuration
 * Manages connections to both MySQL (Hetzner) and MongoDB
 */

import { Sequelize } from 'sequelize';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get directory name for ESM - MUST be before dotenv.config()
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env FIRST - with robust path handling for Windows
const envPath = path.resolve(__dirname, '../../.env');

// Check if .env file exists and load it
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn('[Database Config] Warning loading .env:', result.error.message);
  } else {
    console.log('[Database Config] Loaded .env from:', envPath);
  }
} else {
  console.warn('[Database Config] .env file not found at:', envPath);
  // Try alternative paths
  const altPaths = [
    path.join(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../.env'),
  ];
  for (const altPath of altPaths) {
    if (fs.existsSync(altPath)) {
      dotenv.config({ path: altPath });
      console.log('[Database Config] Loaded .env from alternate path:', altPath);
      break;
    }
  }
}

// Debug: Log the loaded values (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('[Database Config] Environment:', process.env.NODE_ENV || 'not set');
  // Support both DB_ and DATABASE_ prefixes
  const dbUser = process.env.DB_USER || process.env.DATABASE_USER;
  const dbHost = process.env.DB_HOST || process.env.DATABASE_HOST;
  const dbName = process.env.DB_NAME || process.env.DATABASE_NAME;
  console.log('[Database Config] DB_USER:', dbUser ? '***' : '(not set, using root)');
  console.log('[Database Config] DB_HOST:', dbHost || '(not set, using localhost)');
  console.log('[Database Config] DB_NAME:', dbName || '(not set, using holidaibutler)');
}

// MySQL Connection (Hetzner - Central Database)
// Support both DB_ and DATABASE_ prefixes for flexibility
const dbConfig = {
  database: process.env.DB_NAME || process.env.DATABASE_NAME || 'holidaibutler',
  username: process.env.DB_USER || process.env.DATABASE_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
  host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.DATABASE_PORT || '3306', 10),
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

// Helper function to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize all database connections with retry logic
export async function initializeDatabase() {
  const maxRetries = parseInt(process.env.DB_CONNECT_RETRIES || '5', 10);
  const retryDelay = parseInt(process.env.DB_CONNECT_RETRY_DELAY || '3000', 10);

  let lastError = null;

  // MySQL connection with retry
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Database] MySQL connection attempt ${attempt}/${maxRetries}...`);
      await mysqlSequelize.authenticate();
      console.log('✅ MySQL connected successfully');

      // Sync models (in production, use migrations instead)
      if (process.env.NODE_ENV !== 'production') {
        await mysqlSequelize.sync({ alter: false });
        console.log('✅ MySQL models synchronized');
      }

      // Connect to MongoDB (optional)
      await connectMongoDB();

      return {
        mysql: mysqlSequelize,
        mongodb: mongoConnection,
      };
    } catch (error) {
      lastError = error;
      const isConnectionError = error.name === 'SequelizeConnectionRefusedError' ||
                                error.name === 'SequelizeConnectionError' ||
                                error.original?.code === 'ECONNREFUSED';

      if (isConnectionError && attempt < maxRetries) {
        console.warn(`[Database] Connection failed, retrying in ${retryDelay/1000}s... (${attempt}/${maxRetries})`);
        await sleep(retryDelay);
      } else {
        console.error('❌ Database initialization failed:', error.message || error);
        throw error;
      }
    }
  }

  throw lastError;
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
