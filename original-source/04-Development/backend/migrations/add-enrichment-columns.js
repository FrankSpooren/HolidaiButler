/**
 * Database Migration: Add POI Content Enrichment Columns
 * ========================================================
 * Adds columns for storing enriched content from multi-source pipeline:
 * - Tile & Detail descriptions
 * - Social media URLs (Facebook, Instagram)
 * - Enrichment metadata (highlights, target audience, etc.)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  console.log('🔄 Starting database migration: Add Enrichment Columns\n');
  console.log('='.repeat(80));

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Check current schema
    console.log('📋 Checking current POI table schema...');
    const [currentColumns] = await pool.query('DESCRIBE POI');
    const existingColumns = currentColumns.map(col => col.Field);
    console.log(`   Found ${existingColumns.length} existing columns\n`);

    // Define new columns to add
    const newColumns = [
      {
        name: 'enriched_tile_description',
        definition: 'TEXT NULL COMMENT "50-100 word description for POI tile display"',
        description: 'Tile description (50-100 words)'
      },
      {
        name: 'enriched_detail_description',
        definition: 'TEXT NULL COMMENT "200-400 word description for POI detail card"',
        description: 'Detail description (200-400 words)'
      },
      {
        name: 'enriched_highlights',
        definition: 'LONGTEXT NULL COMMENT "JSON array of key highlights"',
        description: 'JSON array of key highlights'
      },
      {
        name: 'enriched_target_audience',
        definition: 'VARCHAR(255) NULL COMMENT "Target audience for this POI"',
        description: 'Target audience description'
      },
      {
        name: 'enriched_best_time',
        definition: 'VARCHAR(255) NULL COMMENT "Best time to visit"',
        description: 'Best time to visit'
      },
      {
        name: 'enriched_sources',
        definition: 'LONGTEXT NULL COMMENT "JSON object of data sources used"',
        description: 'JSON metadata about data sources'
      },
      {
        name: 'facebook_url',
        definition: 'VARCHAR(500) NULL COMMENT "Official Facebook page URL"',
        description: 'Facebook page URL'
      },
      {
        name: 'instagram_url',
        definition: 'VARCHAR(500) NULL COMMENT "Official Instagram profile URL"',
        description: 'Instagram profile URL'
      },
      {
        name: 'enrichment_completed_at',
        definition: 'TIMESTAMP NULL COMMENT "When enrichment was completed"',
        description: 'Enrichment completion timestamp'
      }
    ];

    // Add each column if it doesn't exist
    let addedCount = 0;
    let skippedCount = 0;

    for (const column of newColumns) {
      if (existingColumns.includes(column.name)) {
        console.log(`  ⏭️  Skipping ${column.name} (already exists)`);
        skippedCount++;
      } else {
        console.log(`  ➕ Adding column: ${column.name}`);
        console.log(`     ${column.description}`);

        const sql = `ALTER TABLE POI ADD COLUMN ${column.name} ${column.definition}`;
        await pool.query(sql);

        console.log(`     ✅ Added successfully\n`);
        addedCount++;
      }
    }

    console.log('='.repeat(80));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nColumns added: ${addedCount}`);
    console.log(`Columns skipped (already exist): ${skippedCount}`);
    console.log(`Total columns defined: ${newColumns.length}`);

    // Verify final schema
    console.log('\n✅ Verifying final schema...');
    const [finalColumns] = await pool.query('DESCRIBE POI');
    console.log(`   Final column count: ${finalColumns.length}`);

    // Show new enrichment columns
    console.log('\n📋 New Enrichment Columns:');
    for (const column of newColumns) {
      const exists = finalColumns.some(col => col.Field === column.name);
      console.log(`   ${exists ? '✅' : '❌'} ${column.name}`);
    }

    await pool.end();
    console.log('\n✅ Migration completed successfully!\n');
    return true;

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    await pool.end();
    throw error;
  }
}

// Run migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 All done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
