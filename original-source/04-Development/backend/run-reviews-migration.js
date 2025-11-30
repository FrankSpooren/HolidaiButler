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

    console.log('✓ Connected to database');
    console.log('Checking if reviews table exists...');

    const [tables] = await db.query('SHOW TABLES LIKE "reviews"');

    if (tables.length > 0) {
      console.log('⚠ Reviews table exists, dropping it first...');
      await db.query('DROP TABLE reviews');
      console.log('✓ Reviews table dropped successfully');
    } else {
      console.log('✓ Reviews table does not exist (clean state)');
    }

    console.log('\n📦 Running migration v3...');
    const sql = fs.readFileSync('src/migrations/add-reviews-table-mysql-v3-FIXED.sql', 'utf8');

    // Remove all comment lines first
    const cleanedSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split by semicolons
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`   Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await db.query(statement);
        successCount++;
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          console.log(`   ✓ Created reviews table`);
        } else if (statement.toUpperCase().includes('INSERT INTO')) {
          // Count rows in this insert
          const matches = statement.match(/\),\s*\(/g);
          const rowCount = matches ? matches.length + 1 : 1;
          console.log(`   ✓ Inserted ${rowCount} rows`);
        }
      } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('   Statement:', statement.substring(0, 100) + '...');
        errorCount++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`   Statements executed: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);

    // Verify the data
    const [reviewCount] = await db.query('SELECT COUNT(*) as count FROM reviews');
    console.log(`\n📊 Total reviews inserted: ${reviewCount[0].count}`);

    const [poi437Reviews] = await db.query('SELECT COUNT(*) as count FROM reviews WHERE poi_id = 437');
    console.log(`   Reviews for POI 437: ${poi437Reviews[0].count}`);

    const [poi454Reviews] = await db.query('SELECT COUNT(*) as count FROM reviews WHERE poi_id = 454');
    console.log(`   Reviews for POI 454: ${poi454Reviews[0].count}`);

    const [poi507Reviews] = await db.query('SELECT COUNT(*) as count FROM reviews WHERE poi_id = 507');
    console.log(`   Reviews for POI 507: ${poi507Reviews[0].count}`);

    // Verify the table structure
    console.log('\n🔍 Verifying table structure...');
    const [tableInfo] = await db.query('DESCRIBE reviews');
    console.log('✓ Table has', tableInfo.length, 'columns');

    // Check foreign key
    const [fkInfo] = await db.query(`
      SELECT
        CONSTRAINT_NAME,
        TABLE_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'reviews' AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [process.env.DB_NAME]);

    if (fkInfo.length > 0) {
      console.log('✓ Foreign key constraint:', fkInfo[0].CONSTRAINT_NAME);
      console.log(`  References: ${fkInfo[0].REFERENCED_TABLE_NAME}(${fkInfo[0].REFERENCED_COLUMN_NAME})`);
    } else {
      console.log('⚠ No foreign key constraints found');
    }

    await db.end();
    console.log('\n✅ All done! Database connection closed.');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
})();
