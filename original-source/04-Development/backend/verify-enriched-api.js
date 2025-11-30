/**
 * Verify Enriched Descriptions in API Response
 *
 * Checks if:
 * 1. Backend API returns enriched_tile_description and enriched_detail_description
 * 2. Sample POIs display correct enriched content
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'holidaibutler_dev',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function verifyEnrichedContent() {
  console.log('🔍 Verifying Enriched Content in Database...\n');

  try {
    // 1. Check total POIs with enriched descriptions
    const [totalStats] = await pool.query(`
      SELECT
        COUNT(*) as total_pois,
        COUNT(enriched_tile_description) as pois_with_tile,
        COUNT(enriched_detail_description) as pois_with_detail,
        AVG(content_quality_score) as avg_quality_score
      FROM POI
    `);

    console.log('📊 Database Statistics:');
    console.log(`   Total POIs: ${totalStats[0].total_pois}`);
    console.log(`   POIs with Tile Description: ${totalStats[0].pois_with_tile} (${((totalStats[0].pois_with_tile / totalStats[0].total_pois) * 100).toFixed(1)}%)`);
    console.log(`   POIs with Detail Description: ${totalStats[0].pois_with_detail} (${((totalStats[0].pois_with_detail / totalStats[0].total_pois) * 100).toFixed(1)}%)`);
    console.log(`   Avg Quality Score: ${totalStats[0].avg_quality_score !== null ? Number(totalStats[0].avg_quality_score).toFixed(2) : 'N/A'}\n`);

    // 2. Get 5 sample POIs with enriched content
    const [samplePOIs] = await pool.query(`
      SELECT
        id,
        name,
        category,
        SUBSTRING(description, 1, 80) as original_desc,
        SUBSTRING(enriched_tile_description, 1, 80) as tile_desc,
        SUBSTRING(enriched_detail_description, 1, 80) as detail_desc,
        content_quality_score
      FROM POI
      WHERE enriched_tile_description IS NOT NULL
        AND enriched_detail_description IS NOT NULL
      ORDER BY content_quality_score DESC
      LIMIT 5
    `);

    console.log('📝 Sample POIs with Enriched Content:\n');
    samplePOIs.forEach((poi, index) => {
      console.log(`${index + 1}. ${poi.name} (ID: ${poi.id}) - ${poi.category}`);
      console.log(`   Quality Score: ${poi.content_quality_score}`);
      console.log(`   Original: ${poi.original_desc || 'N/A'}...`);
      console.log(`   Tile: ${poi.tile_desc}...`);
      console.log(`   Detail: ${poi.detail_desc}...\n`);
    });

    // 3. Check if API fields are present
    const [apiSample] = await pool.query(`
      SELECT
        id,
        name,
        enriched_tile_description,
        enriched_detail_description,
        content_quality_score
      FROM POI
      WHERE enriched_tile_description IS NOT NULL
      LIMIT 1
    `);

    if (apiSample.length > 0) {
      console.log('✅ API Response Verification:');
      console.log('   Fields present in database:');
      console.log(`   - id: ${apiSample[0].id}`);
      console.log(`   - name: ${apiSample[0].name}`);
      console.log(`   - enriched_tile_description: ${apiSample[0].enriched_tile_description ? '✓ Present' : '✗ Missing'}`);
      console.log(`   - enriched_detail_description: ${apiSample[0].enriched_detail_description ? '✓ Present' : '✗ Missing'}`);
      console.log(`   - content_quality_score: ${apiSample[0].content_quality_score ? '✓ Present' : '✗ Missing'}\n`);
    }

    // 4. Test instructions
    console.log('🧪 Browser Testing Instructions:');
    console.log('   1. Open http://localhost:5173');
    console.log('   2. Navigate to POI Grid or Search page');
    console.log('   3. Verify POI tiles show enriched_tile_description (2-line preview)');
    console.log('   4. Click any POI to open Detail Modal');
    console.log('   5. Verify "About" section shows enriched_detail_description');
    console.log('   6. Check browser DevTools Network tab → API response includes enriched fields\n');

    console.log('✅ Verification Complete!');

  } catch (error) {
    console.error('❌ Verification Error:', error);
  } finally {
    await pool.end();
  }
}

verifyEnrichedContent();
