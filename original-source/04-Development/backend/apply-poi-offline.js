const { query } = require('./src/config/database');

async function applyPOIOffline() {
  try {
    console.log('Applying POI offline migration...\n');

    // Step 1: Add is_active column
    console.log('Step 1: Adding is_active column...');
    try {
      await query(`
        ALTER TABLE POI
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL
        COMMENT 'Whether the POI is currently active/online'
      `);
      console.log('✓ Column added successfully');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('⚠ Column already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Step 2: Add index
    console.log('\nStep 2: Adding index on is_active...');
    try {
      await query('ALTER TABLE POI ADD INDEX idx_is_active (is_active)');
      console.log('✓ Index added successfully');
    } catch (err) {
      if (err.message.includes('Duplicate key')) {
        console.log('⚠ Index already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Step 3: Set all existing POIs to active
    console.log('\nStep 3: Setting all POIs to active by default...');
    const updateResult = await query('UPDATE POI SET is_active = TRUE WHERE is_active IS NULL');
    console.log(`✓ Updated ${updateResult.affectedRows || 0} POIs to active`);

    // Step 4: Mark POI 436 and 1 as inactive
    console.log('\nStep 4: Marking POI 436 and POI 1 as inactive...');
    const offlineResult = await query('UPDATE POI SET is_active = FALSE WHERE id IN (436, 1)');
    console.log(`✓ Marked ${offlineResult.affectedRows} POIs as inactive`);

    // Step 5: Verification
    console.log('\n=== VERIFICATION ===');
    const stats = await query(`
      SELECT
        COUNT(*) AS total_pois,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active_pois,
        SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive_pois
      FROM POI
    `);
    console.log('\nPOI Statistics:');
    console.table(stats);

    const inactivePOIs = await query(`
      SELECT id, name, category, is_active
      FROM POI
      WHERE is_active = FALSE
    `);
    console.log('\nInactive POIs:');
    console.table(inactivePOIs);

    console.log('\n✓ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration error:', error);
    process.exit(1);
  }
}

applyPOIOffline();
