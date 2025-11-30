/**
 * Migration: Add Chat Session Tables
 * Creates ChatSession and ChatSessionCleanupLog tables
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('🔄 Starting Chat Sessions Migration...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Check if table exists
    const [tables] = await connection.query(
      `SHOW TABLES LIKE 'ChatSession'`
    );

    if (tables.length > 0) {
      console.log('⚠️  ChatSession table already exists. Skipping...');
      return;
    }

    console.log('Creating ChatSession table...');

    // Create ChatSession table (without foreign key constraint for flexibility)
    await connection.query(`
      CREATE TABLE ChatSession (
        id VARCHAR(36) PRIMARY KEY,
        user_id INT NULL,
        context LONGTEXT NOT NULL COMMENT 'JSON: conversationHistory, lastIntent, displayedPOIs',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        INDEX idx_expires (expires_at),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Chat session storage for conversational AI'
    `);

    console.log('✅ ChatSession table created successfully');

    // Create cleanup log table
    console.log('Creating ChatSessionCleanupLog table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ChatSessionCleanupLog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sessions_deleted INT NOT NULL,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ ChatSessionCleanupLog table created');

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('\n🎉 All migrations complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration error:', error);
      process.exit(1);
    });
}

module.exports = { migrate };
