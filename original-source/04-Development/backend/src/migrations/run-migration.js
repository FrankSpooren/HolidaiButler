/**
 * Migration Runner
 * ================
 * Run database migrations via backend (Enterprise approach)
 *
 * Usage:
 *   node src/migrations/run-migration.js 001_add_poi_search_indexes up
 *   node src/migrations/run-migration.js 001_add_poi_search_indexes down
 *   node src/migrations/run-migration.js 001_add_poi_search_indexes status
 */

const logger = require('../utils/logger');

// Get command line arguments
const [,, migrationName, command = 'up'] = process.argv;

if (!migrationName) {
  console.error('❌ Usage: node run-migration.js <migration-name> [up|down|status]');
  console.error('   Example: node run-migration.js 001_add_poi_search_indexes up');
  process.exit(1);
}

async function runMigration() {
  try {
    // Load migration
    const migration = require(`./${migrationName}`);

    logger.info(`📦 Loading migration: ${migration.name}`);
    logger.info(`📝 Description: ${migration.description}`);

    if (command === 'status') {
      // Check if migration is applied
      const applied = await migration.isApplied();
      if (applied) {
        logger.info('✅ Migration is APPLIED');
      } else {
        logger.info('⏳ Migration is NOT applied');
      }
      process.exit(0);
    }

    if (command === 'up') {
      // Check if already applied
      const applied = await migration.isApplied();
      if (applied) {
        logger.warn('⚠️  Migration already applied. Skipping.');
        process.exit(0);
      }

      // Run migration
      logger.info('▶️  Running migration UP...');
      const result = await migration.up();
      logger.info('✅ Migration completed:', result.message);
      process.exit(0);
    }

    if (command === 'down') {
      // Check if applied
      const applied = await migration.isApplied();
      if (!applied) {
        logger.warn('⚠️  Migration not applied. Nothing to rollback.');
        process.exit(0);
      }

      // Rollback migration
      logger.info('⏮️  Rolling back migration...');
      const result = await migration.down();
      logger.info('✅ Rollback completed:', result.message);
      process.exit(0);
    }

    logger.error(`❌ Unknown command: ${command}`);
    logger.error('   Valid commands: up, down, status');
    process.exit(1);
  } catch (error) {
    logger.error('❌ Migration failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run migration
runMigration();
