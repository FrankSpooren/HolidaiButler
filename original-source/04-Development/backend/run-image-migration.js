/**
 * Run Enhanced Images Migration
 * Adds enhanced_images and enhanced_at columns to pois table
 */

require('dotenv').config();
const db = require('./src/config/database');

async function runMigration() {
  console.log('🚀 Running Enhanced Images Migration...\n');

  try {
    // Check if columns already exist
    const columns = await db.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'POI'
       AND COLUMN_NAME IN ('enhanced_images', 'enhanced_at')`,
      [process.env.DB_NAME]
    );

    const columnResults = Array.isArray(columns[0]) ? columns[0] : columns;

    if (columnResults && columnResults.length === 2) {
      console.log('✅ Migration already applied - enhanced_images and enhanced_at columns exist');
      process.exit(0);
    }

    // Run migration
    console.log('📝 Adding enhanced_images column...');
    await db.query(`
      ALTER TABLE POI
      ADD COLUMN enhanced_images JSON NULL COMMENT 'Enhanced images from Flickr/Unsplash with categories'
    `);

    console.log('📝 Adding enhanced_at column...');
    await db.query(`
      ALTER TABLE POI
      ADD COLUMN enhanced_at TIMESTAMP NULL COMMENT 'When images were last enhanced'
    `);

    console.log('📝 Adding index on enhanced_at...');
    await db.query(`
      ALTER TABLE POI
      ADD INDEX idx_enhanced_at (enhanced_at)
    `);

    console.log('\n✅ Migration completed successfully!');
    console.log('   - enhanced_images column added');
    console.log('   - enhanced_at column added');
    console.log('   - idx_enhanced_at index created');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runMigration();
