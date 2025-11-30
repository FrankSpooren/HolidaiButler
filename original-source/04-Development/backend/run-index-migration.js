const fs = require('fs');
const path = require('path');
const { query } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('🚀 Running index optimization migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '22_OPTIMIZE_POI_INDEXES.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments (line comments and block comments)
    let cleanSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))  // Remove line comments
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');  // Remove block comments

    // Split into individual statements
    const statements = cleanSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && stmt.toUpperCase().includes('CREATE'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip comments and empty statements
      if (!stmt || stmt.startsWith('--') || stmt.match(/^\/\*/)) {
        continue;
      }

      try {
        console.log(`[${i + 1}/${statements.length}] Executing...`);

        const result = await query(stmt);

        if (Array.isArray(result) && result.length > 0) {
          console.log('Result:', JSON.stringify(result[0], null, 2));
        }

        console.log('✅ Success\n');
      } catch (err) {
        // Ignore "Duplicate key" errors (index already exists)
        if (err.code === 'ER_DUP_KEYNAME' || err.message.includes('Duplicate key name')) {
          console.log('⚠️ Index already exists (skipping)\n');
        } else {
          console.error('❌ Error Code:', err.code);
          console.error('❌ Error Message:', err.message);
          console.error('Statement:', stmt.substring(0, 150) + '...\n');
          // Don't exit, continue with other indexes
        }
      }
    }

    console.log('✅ Index optimization migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
