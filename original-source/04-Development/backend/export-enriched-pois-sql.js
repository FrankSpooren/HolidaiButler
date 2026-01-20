/**
 * SQL Export Generator for Enriched POI Content
 * ==============================================
 * Generates SQL INSERT/UPDATE statements for all enriched POI content
 * Output: SQL file ready for manual upload to Hetzner database
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuration
const CONFIG = {
  OUTPUT_DIR: path.join(__dirname, '../07-Documentation'),
  OUTPUT_FILE: 'poi-enriched-content-export.sql',
  // Export only enriched POIs or all POIs?
  EXPORT_MODE: process.env.EXPORT_MODE || 'enriched_only', // 'enriched_only' or 'all'
};

/**
 * Escape string for SQL
 */
function escapeSQLString(str) {
  if (str === null || str === undefined) {
    return 'NULL';
  }
  return "'" + String(str).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

/**
 * Generate SQL UPDATE statements
 */
async function generateSQLExport() {
  console.log('📤 POI Enriched Content - SQL Export Generator\n');
  console.log('='.repeat(80));

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Build WHERE clause
    let whereClause = 'is_active = TRUE';
    let exportDescription = '';

    if (CONFIG.EXPORT_MODE === 'enriched_only') {
      whereClause += ' AND enrichment_completed_at IS NOT NULL';
      exportDescription = 'Enriched POIs only';
    } else {
      exportDescription = 'All active POIs';
    }

    // Fetch POIs to export
    console.log(`\n📋 Fetching POIs to export (${exportDescription})...\n`);

    const [pois] = await pool.query(`
      SELECT
        id, name, description,
        enriched_tile_description,
        enriched_detail_description,
        enriched_highlights,
        enriched_target_audience,
        enriched_best_time,
        enriched_sources,
        content_quality_score,
        facebook_url,
        instagram_url,
        enrichment_completed_at
      FROM POI
      WHERE ${whereClause}
      ORDER BY id ASC
    `);

    console.log(`✅ Found ${pois.length} POIs to export\n`);

    if (pois.length === 0) {
      console.log('⚠️  No POIs to export. Exiting.');
      await pool.end();
      return;
    }

    // Generate SQL statements
    console.log('🔨 Generating SQL UPDATE statements...\n');

    let sqlContent = [];

    // Add header
    sqlContent.push('-- ============================================================================');
    sqlContent.push('-- POI Enriched Content Export');
    sqlContent.push('-- ============================================================================');
    sqlContent.push(`-- Generated: ${new Date().toISOString()}`);
    sqlContent.push(`-- Total POIs: ${pois.length}`);
    sqlContent.push(`-- Export mode: ${exportDescription}`);
    sqlContent.push('--');
    sqlContent.push('-- IMPORTANT: Review this file before executing!');
    sqlContent.push('-- Backup your database before running these statements.');
    sqlContent.push('-- ============================================================================\n');

    sqlContent.push('-- Disable safe updates temporarily');
    sqlContent.push('SET SQL_SAFE_UPDATES = 0;\n');

    // Generate UPDATE statements
    const stats = {
      total: pois.length,
      withTileDesc: 0,
      withDetailDesc: 0,
      withFacebook: 0,
      withInstagram: 0,
      avgQualityScore: 0
    };

    let qualityScoreSum = 0;
    let qualityScoreCount = 0;

    for (const poi of pois) {
      // Build UPDATE statement
      const updates = [];

      if (poi.description) {
        updates.push(`description = ${escapeSQLString(poi.description)}`);
      }

      if (poi.enriched_tile_description) {
        updates.push(`enriched_tile_description = ${escapeSQLString(poi.enriched_tile_description)}`);
        stats.withTileDesc++;
      }

      if (poi.enriched_detail_description) {
        updates.push(`enriched_detail_description = ${escapeSQLString(poi.enriched_detail_description)}`);
        stats.withDetailDesc++;
      }

      if (poi.enriched_highlights) {
        updates.push(`enriched_highlights = ${escapeSQLString(poi.enriched_highlights)}`);
      }

      if (poi.enriched_target_audience) {
        updates.push(`enriched_target_audience = ${escapeSQLString(poi.enriched_target_audience)}`);
      }

      if (poi.enriched_best_time) {
        updates.push(`enriched_best_time = ${escapeSQLString(poi.enriched_best_time)}`);
      }

      if (poi.enriched_sources) {
        updates.push(`enriched_sources = ${escapeSQLString(poi.enriched_sources)}`);
      }

      if (poi.content_quality_score !== null) {
        updates.push(`content_quality_score = ${poi.content_quality_score}`);
        qualityScoreSum += parseFloat(poi.content_quality_score);
        qualityScoreCount++;
      }

      if (poi.facebook_url) {
        updates.push(`facebook_url = ${escapeSQLString(poi.facebook_url)}`);
        stats.withFacebook++;
      }

      if (poi.instagram_url) {
        updates.push(`instagram_url = ${escapeSQLString(poi.instagram_url)}`);
        stats.withInstagram++;
      }

      if (poi.enrichment_completed_at) {
        updates.push(`enrichment_completed_at = '${poi.enrichment_completed_at.toISOString().slice(0, 19).replace('T', ' ')}'`);
      }

      updates.push(`last_updated = NOW()`);

      // Generate UPDATE statement
      if (updates.length > 0) {
        sqlContent.push(`-- POI ID: ${poi.id} - ${poi.name}`);
        sqlContent.push(`UPDATE POI SET`);
        sqlContent.push(`  ${updates.join(',\n  ')}`);
        sqlContent.push(`WHERE id = ${poi.id};\n`);
      }
    }

    // Calculate stats
    stats.avgQualityScore = qualityScoreCount > 0 ? (qualityScoreSum / qualityScoreCount).toFixed(2) : 0;

    // Add footer
    sqlContent.push('\n-- ============================================================================');
    sqlContent.push('-- Export Statistics');
    sqlContent.push('-- ============================================================================');
    sqlContent.push(`-- Total POIs exported: ${stats.total}`);
    sqlContent.push(`-- POIs with tile description: ${stats.withTileDesc}`);
    sqlContent.push(`-- POIs with detail description: ${stats.withDetailDesc}`);
    sqlContent.push(`-- POIs with Facebook URL: ${stats.withFacebook}`);
    sqlContent.push(`-- POIs with Instagram URL: ${stats.withInstagram}`);
    sqlContent.push(`-- Average quality score: ${stats.avgQualityScore}/10`);
    sqlContent.push('-- ============================================================================\n');

    sqlContent.push('-- Re-enable safe updates');
    sqlContent.push('SET SQL_SAFE_UPDATES = 1;\n');

    sqlContent.push('-- Done! Review and execute these statements in your database.');

    // Write to file
    const outputPath = path.join(CONFIG.OUTPUT_DIR, CONFIG.OUTPUT_FILE);
    console.log(`💾 Writing SQL file to: ${outputPath}\n`);

    await fs.writeFile(outputPath, sqlContent.join('\n'), 'utf8');

    console.log('='.repeat(80));
    console.log('✅ SQL EXPORT COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nFile: ${outputPath}`);
    console.log(`Size: ${(sqlContent.join('\n').length / 1024).toFixed(2)} KB`);
    console.log('\n📊 Export Statistics:');
    console.log(`  - Total POIs: ${stats.total}`);
    console.log(`  - With tile description: ${stats.withTileDesc}`);
    console.log(`  - With detail description: ${stats.withDetailDesc}`);
    console.log(`  - With Facebook URL: ${stats.withFacebook}`);
    console.log(`  - With Instagram URL: ${stats.withInstagram}`);
    console.log(`  - Avg quality score: ${stats.avgQualityScore}/10`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('  1. Review the SQL file before executing');
    console.log('  2. Backup your database first');
    console.log('  3. Test on a staging environment if possible');
    console.log('  4. Execute the statements manually on Hetzner server\n');

    await pool.end();

  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    console.error('Stack trace:', error.stack);
    await pool.end();
    throw error;
  }
}

// Run export
if (require.main === module) {
  generateSQLExport()
    .then(() => {
      console.log('🎉 Export complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { generateSQLExport };
