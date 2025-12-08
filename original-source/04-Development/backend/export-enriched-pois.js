/**
 * Export Enriched POI Data to SQL
 * ================================
 * Generates SQL file for manual import to Hetzner production database
 *
 * Usage:
 *   node export-enriched-pois.js
 *
 * Output:
 *   enriched-pois-export-YYYY-MM-DD.sql
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function exportEnrichedPOIs() {
  console.log('📤 POI Content Export to SQL');
  console.log('================================================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Fetch all POIs with enriched content
    const [pois] = await connection.query(`
      SELECT
        id,
        name,
        enriched_tile_description,
        enriched_detail_description,
        content_quality_score,
        enriched_highlights,
        enriched_target_audience,
        enriched_best_time,
        enriched_sources,
        enrichment_completed_at
      FROM POI
      WHERE enriched_tile_description IS NOT NULL
        AND enriched_tile_description != ''
        AND enriched_detail_description IS NOT NULL
        AND enriched_detail_description != ''
      ORDER BY id ASC
    `);

    console.log(`✅ Found ${pois.length} enriched POIs to export\n`);

    if (pois.length === 0) {
      console.log('⚠️  No enriched POIs found. Nothing to export.');
      return;
    }

    // Generate SQL file
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `enriched-pois-export-${timestamp}.sql`;
    const filepath = path.join(__dirname, filename);

    let sqlContent = `-- ============================================================================
-- HolidAIbutler POI Content Enrichment Export
-- ============================================================================
-- Generated: ${new Date().toISOString()}
-- Total POIs: ${pois.length}
--
-- Instructions:
-- 1. Upload this file to your Hetzner server
-- 2. Connect to MySQL: mysql -h jotx.your-database.de -u pxoziy_db1 -p pxoziy_db1
-- 3. Execute: SOURCE /path/to/${filename};
-- 4. Verify: SELECT COUNT(*) FROM POI WHERE tile_description IS NOT NULL;
-- ============================================================================

-- Disable foreign key checks for faster import
SET FOREIGN_KEY_CHECKS=0;

-- Set character encoding
SET NAMES utf8mb4;

-- Start transaction for atomic import
START TRANSACTION;

`;

    // Generate UPDATE statements
    let updateCount = 0;
    for (const poi of pois) {
      // Escape strings for SQL
      const escapedTile = mysql.escape(poi.enriched_tile_description);
      const escapedDetail = mysql.escape(poi.enriched_detail_description);
      const escapedHighlights = poi.enriched_highlights ? mysql.escape(poi.enriched_highlights) : 'NULL';
      const escapedTargetAudience = poi.enriched_target_audience ? mysql.escape(poi.enriched_target_audience) : 'NULL';
      const escapedBestTime = poi.enriched_best_time ? mysql.escape(poi.enriched_best_time) : 'NULL';
      const escapedSources = poi.enriched_sources ? mysql.escape(poi.enriched_sources) : 'NULL';
      const qualityScore = poi.content_quality_score || 'NULL';
      const completedAt = poi.enrichment_completed_at ? mysql.escape(poi.enrichment_completed_at) : 'NULL';

      sqlContent += `-- POI ID: ${poi.id} | ${poi.name}
UPDATE POI
SET
  enriched_tile_description = ${escapedTile},
  enriched_detail_description = ${escapedDetail},
  content_quality_score = ${qualityScore},
  enriched_highlights = ${escapedHighlights},
  enriched_target_audience = ${escapedTargetAudience},
  enriched_best_time = ${escapedBestTime},
  enriched_sources = ${escapedSources},
  enrichment_completed_at = ${completedAt}
WHERE id = ${poi.id};

`;
      updateCount++;
    }

    sqlContent += `
-- Commit transaction
COMMIT;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- Export Summary
-- ============================================================================
-- Total POIs updated: ${updateCount}
-- Export completed successfully
-- ============================================================================
`;

    // Write to file
    fs.writeFileSync(filepath, sqlContent, 'utf8');

    console.log('✅ SQL export generated successfully!\n');
    console.log('📁 File location:');
    console.log(`   ${filepath}\n`);
    console.log('📊 Export statistics:');
    console.log(`   - Total POIs exported: ${updateCount}`);
    console.log(`   - File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB\n`);
    console.log('📋 Next steps:');
    console.log('   1. Review the SQL file');
    console.log('   2. Upload to your Hetzner server');
    console.log('   3. Import using MySQL command line or phpMyAdmin');
    console.log('   4. Verify import with: SELECT COUNT(*) FROM POI WHERE enriched_tile_description IS NOT NULL;\n');

    // Sample POIs for verification
    console.log('📝 Sample exported POIs (first 5):');
    pois.slice(0, 5).forEach((poi, index) => {
      console.log(`   ${index + 1}. [${poi.id}] ${poi.name}`);
      console.log(`      Tile: ${poi.enriched_tile_description.substring(0, 60)}...`);
      console.log(`      Quality: ${poi.content_quality_score}/10`);
    });

  } catch (error) {
    console.error('❌ Export failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run export
if (require.main === module) {
  exportEnrichedPOIs()
    .then(() => {
      console.log('\n🎉 Export completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Export failed:', error.message);
      process.exit(1);
    });
}

module.exports = { exportEnrichedPOIs };
