const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('POIs WITHOUT Description - Analysis');
  console.log('='.repeat(80));

  console.log('\n📊 Breakdown by Category:');
  const [byCategory] = await conn.query(`
    SELECT
      category,
      COUNT(*) as count,
      AVG(popularity_score) as avg_popularity,
      MAX(popularity_score) as max_popularity
    FROM POI
    WHERE is_active = TRUE
      AND (description IS NULL OR LENGTH(description) = 0)
    GROUP BY category
    ORDER BY count DESC
  `);

  byCategory.forEach(cat => {
    console.log(`  ${cat.category.padEnd(25)} ${cat.count.toString().padStart(4)} POIs  (avg popularity: ${Number(cat.avg_popularity || 0).toFixed(1)}, max: ${Number(cat.max_popularity || 0).toFixed(1)})`);
  });

  console.log(`\n📈 High Priority POIs (popularity_score >= 5.0):`);
  const [highPriority] = await conn.query(`
    SELECT
      id,
      name,
      category,
      popularity_score
    FROM POI
    WHERE is_active = TRUE
      AND (description IS NULL OR LENGTH(description) = 0)
      AND popularity_score >= 5.0
    ORDER BY popularity_score DESC
    LIMIT 20
  `);

  console.log(`  Found ${highPriority.length} high-priority POIs without description\n`);
  highPriority.forEach((poi, idx) => {
    console.log(`  ${(idx+1).toString().padStart(2)}. [${poi.popularity_score.toFixed(1)}] ${poi.name.substring(0, 50)}`);
    console.log(`      Category: ${poi.category}`);
  });

  console.log(`\n📉 All POIs without description (by popularity):`);
  const [allMissing] = await conn.query(`
    SELECT
      id,
      name,
      category,
      popularity_score
    FROM POI
    WHERE is_active = TRUE
      AND (description IS NULL OR LENGTH(description) = 0)
    ORDER BY popularity_score DESC
  `);

  console.log(`  Total: ${allMissing.length} POIs\n`);
  console.log(`  Top 30 by popularity:`);
  allMissing.slice(0, 30).forEach((poi, idx) => {
    console.log(`  ${(idx+1).toString().padStart(2)}. [${(poi.popularity_score || 0).toFixed(1)}] ${poi.name.substring(0, 55).padEnd(55)} (${poi.category})`);
  });

  console.log(`\n💡 Recommendations:`);
  console.log(`  1. Prioritize ${highPriority.length} high-popularity POIs (score >= 5.0) first`);
  console.log(`  2. Focus on categories with most missing descriptions`);
  console.log(`  3. Use Apify/webscraping to generate initial descriptions`);
  console.log(`  4. Total POIs needing descriptions: ${allMissing.length}`);

  await conn.end();
})();
