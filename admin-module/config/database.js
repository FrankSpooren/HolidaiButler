import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get directory name for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple possible .env locations (root .env first for shared config)
const envPaths = [
  path.resolve(__dirname, '../../../.env'),  // Root .env (centrale config)
  path.resolve(__dirname, '../.env'),         // Module-specific .env
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'admin-module/backend/.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log('[Database Config] Found .env at:', envPath);
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error('[Database Config] Error loading .env:', result.error.message);
    } else {
      console.log('[Database Config] Successfully loaded .env');
      envLoaded = true;
      break;
    }
  }
}

if (!envLoaded) {
  console.warn('[Database Config] No .env file found, using defaults/environment variables');
}

// Extra debug: If password still not set, try to read file directly (Windows BOM issue workaround)
if (!process.env.DATABASE_PASSWORD && envLoaded) {
  console.log('[Database Config] Attempting manual .env parse (BOM workaround)...');
  try {
    const envPath = envPaths.find(p => fs.existsSync(p));
    if (envPath) {
      let content = fs.readFileSync(envPath, 'utf8');
      // Remove BOM if present
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
        console.log('[Database Config] Removed BOM from .env file');
      }
      // Parse manually
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
      console.log('[Database Config] Manual parse complete');
    }
  } catch (err) {
    console.error('[Database Config] Manual parse failed:', err.message);
  }
}

// Debug: Log database config (development only)
if (process.env.NODE_ENV !== 'production') {
  console.log('[Database Config] DATABASE_HOST:', process.env.DATABASE_HOST || '(not set, using localhost)');
  console.log('[Database Config] DATABASE_USER:', process.env.DATABASE_USER || '(not set, using root)');
  console.log('[Database Config] DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD ? '***set***' : '(not set!)');
}

// Database configuration
const config = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  database: process.env.DATABASE_NAME || 'holidaibutler',
  username: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  timezone: '+01:00' // Europe/Amsterdam
};

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    define: config.define,
    timezone: config.timezone
  }
);

// Test connection function
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL database:', error.message);
    return false;
  }
}

// Sync database (development only)
export async function syncDatabase(force = false) {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force, alter: !force });
      console.log('✅ Database synchronized');
      return true;
    }
    console.log('⚠️  Database sync skipped in production mode');
    return false;
  } catch (error) {
    console.error('❌ Database sync error:', error.message);
    return false;
  }
}

export { sequelize, config };
export default sequelize;
