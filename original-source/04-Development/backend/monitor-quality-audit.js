/**
 * Monitor Quality Audit Progress
 * ===============================
 * Real-time monitoring of the quality audit process
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function monitorProgress() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('📊 Quality Audit Progress Monitor\n');
  console.log('='.repeat(80));

  try {
    // Get total POIs with descriptions
    const [[{ total }]] = await connection.query(`
      SELECT COUNT(*) as total
      FROM POI
      WHERE is_active = TRUE
        AND description IS NOT NULL
        AND LENGTH(description) > 0
    `);

    // Get assessed POIs
    const [[{ assessed }]] = await connection.query(`
      SELECT COUNT(*) as assessed
      FROM POI
      WHERE content_quality_score IS NOT NULL
    `);

    // Get breakdown by recommendation
    const [breakdown] = await connection.query(`
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(content_quality_data, '$.recommendation')) as recommendation,
        COUNT(*) as count,
        ROUND(AVG(content_quality_score), 2) as avg_score
      FROM POI
      WHERE content_quality_score IS NOT NULL
      GROUP BY recommendation
      ORDER BY
        CASE recommendation
          WHEN 'keep' THEN 1
          WHEN 'improve' THEN 2
          WHEN 'replace' THEN 3
        END
    `);

    // Calculate progress
    const progress = (assessed / total * 100).toFixed(1);
    const remaining = total - assessed;

    // Display statistics
    console.log(`\nProgress: ${assessed} / ${total} POIs (${progress}%)`);
    console.log(`Remaining: ${remaining} POIs`);

    if (assessed > 0) {
      console.log('\nQuality Breakdown:');
      breakdown.forEach(item => {
        const icon = item.recommendation === 'keep' ? '✅' :
                    item.recommendation === 'improve' ? '⚠️' : '❌';
        console.log(`  ${icon} ${item.recommendation.toUpperCase()}: ${item.count} POIs (avg: ${item.avg_score}/10)`);
      });

      // Get latest assessed POI
      const [latest] = await connection.query(`
        SELECT id, name, content_quality_score, content_quality_assessed_at
        FROM POI
        WHERE content_quality_score IS NOT NULL
        ORDER BY content_quality_assessed_at DESC
        LIMIT 1
      `);

      if (latest.length > 0) {
        console.log(`\nLatest Assessed:`);
        console.log(`  POI ${latest[0].id}: ${latest[0].name}`);
        console.log(`  Score: ${latest[0].content_quality_score}/10`);
        console.log(`  Time: ${latest[0].content_quality_assessed_at}`);
      }

      // Estimate time remaining (assume ~10 POIs/minute)
      const minutesElapsed = assessed / 10;
      const minutesRemaining = remaining / 10;
      console.log(`\nEstimated Time:`);
      console.log(`  Elapsed: ~${minutesElapsed.toFixed(0)} minutes`);
      console.log(`  Remaining: ~${minutesRemaining.toFixed(0)} minutes`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\nRefresh this script to see updated progress.`);
    console.log(`Run: node monitor-quality-audit.js\n`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

monitorProgress()
  .then(() => process.exit(0))
  .catch(console.error);
