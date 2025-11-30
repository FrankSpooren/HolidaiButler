const fs = require('fs');
const { query } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('Running Migration 25: Add is_active field...\n');

    // Read the migration SQL file
    const migrationSQL = fs.readFileSync('./migrations/25_ADD_POI_IS_ACTIVE.sql', 'utf8');

    // Split into statements (simple split by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip USE statements and comments
      if (stmt.startsWith('USE') || stmt.startsWith('--') || stmt.length < 10) {
        continue;
      }

      try {
        const result = await query(stmt);
        console.log(`✓ Statement ${i + 1} executed successfully`);

        // If it's a SELECT, show the results
        if (stmt.toUpperCase().includes('SELECT')) {
          console.table(result);
        }
      } catch (err) {
        console.error(`✗ Error in statement ${i + 1}:`, err.message);
        // Continue with other statements
      }
    }

    console.log('\n✓ Migration 25 completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigration();
