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

  console.log('POI Table Structure:');
  console.log('='.repeat(80));

  const [cols] = await conn.query('DESCRIBE POI');
  cols.forEach(c => {
    console.log(`${c.Field.padEnd(35)} ${c.Type.padEnd(25)} ${c.Null.padEnd(5)} ${c.Key}`);
  });

  console.log('\n\nURL Fields Analysis:');
  console.log('='.repeat(80));

  // Check which URL-related fields exist and have data
  const urlFields = cols
    .filter(c => c.Field.toLowerCase().includes('url') || c.Field.toLowerCase().includes('website') || c.Field.toLowerCase().includes('link'))
    .map(c => c.Field);

  console.log('Found URL-related fields:', urlFields.join(', '));

  // Count POIs with URLs
  for (const field of urlFields) {
    const [count] = await conn.query(`SELECT COUNT(*) as count FROM POI WHERE ${field} IS NOT NULL AND ${field} != ''`);
    console.log(`${field.padEnd(35)} ${count[0].count} POIs`);
  }

  console.log('\n\nSample POIs with Website URLs:');
  console.log('='.repeat(80));

  const [sample] = await conn.query(`
    SELECT id, name, category, website
    FROM POI
    WHERE website IS NOT NULL AND website != ''
    LIMIT 10
  `);

  sample.forEach(p => {
    console.log(`\n${p.id}. ${p.name}`);
    console.log(`   Category: ${p.category}`);
    console.log(`   Website: ${p.website}`);
  });

  await conn.end();
})();
