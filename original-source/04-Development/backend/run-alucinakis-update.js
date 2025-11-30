require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🎢 Updating Alucinakis reviews...\n');

    const sql = fs.readFileSync('update-alucinakis-reviews.sql', 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    let updated = 0;
    for (const statement of statements) {
      if (statement.includes('UPDATE')) {
        await db.query(statement);
        updated++;
        console.log(`✓ Review ${updated} updated`);
      }
    }

    console.log(`\n✅ All ${updated} reviews updated successfully!\n`);

    console.log('📝 Sample of updated reviews:\n');
    const [reviews] = await db.query(
      'SELECT user_name, rating, review_text FROM reviews WHERE poi_id = 437 ORDER BY helpful_count DESC LIMIT 3'
    );

    reviews.forEach(r => {
      console.log(`\n⭐ ${r.user_name} (${r.rating} stars):`);
      console.log(`   "${r.review_text.substring(0, 120)}..."`);
    });

    console.log('\n\n🎯 All reviews are now contextually relevant to Alucinakis (Terra Mítica wooden coaster)!');

    await db.end();
    console.log('\n✅ Database connection closed.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
