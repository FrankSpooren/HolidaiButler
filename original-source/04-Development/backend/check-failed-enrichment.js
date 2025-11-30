/**
 * Check Failed POI Enrichment
 * ============================
 * Analyzes which POIs failed during enrichment
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFailedEnrichment() {
  console.log('🔍 Analyzing Failed POI Enrichment\n');
  console.log('================================================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Total statistics
    const [totalWithWebsite] = await connection.query(`
      SELECT COUNT(*) as count
      FROM POI
      WHERE website IS NOT NULL AND website != ''
    `);

    const [successfullyEnriched] = await connection.query(`
      SELECT COUNT(*) as count
      FROM POI
      WHERE enriched_tile_description IS NOT NULL
        AND enriched_tile_description != ''
    `);

    const [failed] = await connection.query(`
      SELECT COUNT(*) as count
      FROM POI
      WHERE website IS NOT NULL
        AND website != ''
        AND (enriched_tile_description IS NULL OR enriched_tile_description = '')
    `);

    console.log('📊 Overview:');
    console.log(`   Total POIs with website:     ${totalWithWebsite[0].count}`);
    console.log(`   Successfully enriched:       ${successfullyEnriched[0].count}`);
    console.log(`   Failed/Not enriched yet:     ${failed[0].count}`);
    console.log(`   Success rate:                ${((successfullyEnriched[0].count / totalWithWebsite[0].count) * 100).toFixed(1)}%\n`);

    // Sample failed POIs
    const [failedSamples] = await connection.query(`
      SELECT id, name, category, website
      FROM POI
      WHERE website IS NOT NULL
        AND website != ''
        AND (enriched_tile_description IS NULL OR enriched_tile_description = '')
      ORDER BY id ASC
      LIMIT 20
    `);

    console.log('📋 Sample POIs that need enrichment (first 20):\n');
    failedSamples.forEach((poi, index) => {
      console.log(`   ${index + 1}. [ID ${poi.id}] ${poi.name}`);
      console.log(`      Category: ${poi.category}`);
      console.log(`      Website: ${poi.website.substring(0, 60)}${poi.website.length > 60 ? '...' : ''}`);
      console.log('');
    });

    // Breakdown by category
    const [categoryBreakdown] = await connection.query(`
      SELECT
        category,
        COUNT(*) as failed_count
      FROM POI
      WHERE website IS NOT NULL
        AND website != ''
        AND (enriched_tile_description IS NULL OR enriched_tile_description = '')
      GROUP BY category
      ORDER BY failed_count DESC
    `);

    console.log('📁 Failed POIs by Category:\n');
    categoryBreakdown.forEach(cat => {
      console.log(`   ${cat.category.padEnd(30)} ${cat.failed_count} POIs`);
    });

    console.log('\n================================================================================');
    console.log('💡 Recommendation:');
    console.log('   Run enrichment again for failed POIs using:');
    console.log('   node poi-content-enrichment.js --limit=0 --phase=phase1 --retry-failed\n');

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run analysis
if (require.main === module) {
  checkFailedEnrichment()
    .then(() => {
      console.log('✅ Analysis completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error:', error.message);
      process.exit(1);
    });
}

module.exports = { checkFailedEnrichment };
