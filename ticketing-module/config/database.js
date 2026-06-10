// POOL-DEFENSIVE-V1: defensive pool + retry config applied 2026-05-20
// Load environment from root .env
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
// Also load local .env for overrides
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'holidaibutler',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306,
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 5000,
      ssl: process.env.DB_SSL === 'false' ? undefined : {
        ca: fs.readFileSync('/etc/ssl/certs/hetzner-mariadb-ca.pem'),
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
    },
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    timezone: '+01:00',
  },
  test: {
    username: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME_TEST || 'pxoziy_db1_test',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306,
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 5000,
      ssl: process.env.DB_SSL === 'false' ? undefined : {
        ca: fs.readFileSync('/etc/ssl/certs/hetzner-mariadb-ca.pem'),
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    timezone: '+01:00',
  },
  production: {
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306,
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 5000,
      ssl: process.env.DB_SSL === 'false' ? undefined : {
        ca: fs.readFileSync('/etc/ssl/certs/hetzner-mariadb-ca.pem'),
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
    },
    logging: false,
    pool: {
      max: 3,
      min: 1,
      acquire: 15000,
      idle: 5000,
      evict: 5000,
    },
    retry: {
      match: [/ETIMEDOUT/, /ECONNRESET/, /ECONNREFUSED/, /SequelizeConnectionError/, /Error: connect/],
      max: 2,
      backoffBase: 1000,
      backoffExponent: 2,
    },
    define: {
      timestamps: true,
      underscored: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    timezone: '+01:00',
  },
};
