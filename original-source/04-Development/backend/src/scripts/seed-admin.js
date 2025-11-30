/**
 * Seed Development Admin User
 * ============================
 * Creates a verified admin user for development/testing
 *
 * Usage: node src/scripts/seed-admin.js
 *
 * Default credentials:
 * Email: admin@holidaibutler.com
 * Password: Admin123!
 */

// Load environment variables
require('dotenv').config();

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { pool, closePool } = require('../config/database');
const logger = require('../utils/logger');

const ADMIN_USER = {
  email: 'admin@holidaibutler.com',
  password: 'Admin123!',
  name: 'Admin Owner',
  is_admin: true,
  email_verified: true
};

async function seedAdmin() {
  try {
    logger.info('=================================================');
    logger.info('Starting Admin User Seed');
    logger.info('=================================================');

    // Check if admin already exists
    const [existing] = await pool.execute(
      'SELECT id, email FROM Users WHERE email = ?',
      [ADMIN_USER.email]
    );

    if (existing.length > 0) {
      logger.warn(`Admin user already exists: ${ADMIN_USER.email} (ID: ${existing[0].id})`);
      logger.info('Skipping admin creation. Use reset password if needed.');
      return;
    }

    // Hash password
    const password_hash = await bcrypt.hash(ADMIN_USER.password, 12);
    const uuid = uuidv4();

    // Create admin user
    const [result] = await pool.execute(
      `INSERT INTO Users (
        uuid, email, password_hash, name,
        is_admin, email_verified, verified_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        uuid,
        ADMIN_USER.email,
        password_hash,
        ADMIN_USER.name,
        ADMIN_USER.is_admin,
        ADMIN_USER.email_verified
      ]
    );

    const userId = result.insertId;

    // Create user preferences
    await pool.execute(
      `INSERT INTO User_Preferences (user_id, preferred_language, created_at)
       VALUES (?, ?, NOW())`,
      [userId, 'nl'] // Default to Dutch
    );

    logger.info('=================================================');
    logger.info('✅ Admin user created successfully!');
    logger.info('=================================================');
    logger.info(`Email: ${ADMIN_USER.email}`);
    logger.info(`Password: ${ADMIN_USER.password}`);
    logger.info(`User ID: ${userId}`);
    logger.info(`UUID: ${uuid}`);
    logger.info(`Admin: ${ADMIN_USER.is_admin}`);
    logger.info(`Email Verified: ${ADMIN_USER.email_verified}`);
    logger.info('=================================================');
    logger.info('⚠️  DEVELOPMENT ONLY - Change password in production!');
    logger.info('=================================================');

  } catch (error) {
    logger.error('Error seeding admin user:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    // Close database connection
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  seedAdmin()
    .then(() => {
      logger.info('Admin seed completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Admin seed failed:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    });
}

module.exports = seedAdmin;
