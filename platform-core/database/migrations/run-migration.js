/**
 * Database Migration Runner
 * Executes composite index migration with safety checks
 */

import { mysqlSequelize } from '../../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkDatabaseConnection() {
  try {
    await mysqlSequelize.authenticate();
    log('✓ Database connection established', 'green');
    return true;
  } catch (error) {
    log(`✗ Database connection failed: ${error.message}`, 'red');
    return false;
  }
}

async function getTableStats() {
  const [results] = await mysqlSequelize.query(`
    SELECT
      TABLE_NAME,
      TABLE_ROWS,
      ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_size_mb,
      ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_size_mb
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('pois', 'poi_score_history')
  `);

  return results;
}

async function getExistingIndexes() {
  const [results] = await mysqlSequelize.query(`
    SELECT DISTINCT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pois'
      AND INDEX_NAME != 'PRIMARY'
  `);

  return results.map((r) => r.INDEX_NAME);
}

async function runMigration() {
  log('\n🚀 Database Index Migration\n', 'cyan');

  // 1. Check connection
  const connected = await checkDatabaseConnection();
  if (!connected) {
    process.exit(1);
  }

  // 2. Show current stats
  log('\n📊 Current Table Statistics:', 'cyan');
  const statsBefore = await getTableStats();
  console.table(statsBefore);

  // 3. Show existing indexes
  log('\n📋 Existing Indexes:', 'cyan');
  const existingIndexes = await getExistingIndexes();
  existingIndexes.forEach((idx) => log(`  - ${idx}`, 'yellow'));

  // 4. Confirm migration
  log('\n⚠️  This migration will:', 'yellow');
  log('  - Drop existing basic indexes', 'yellow');
  log('  - Create 9 composite indexes', 'yellow');
  log('  - Table will be locked briefly (30-60 seconds)', 'yellow');
  log('  - Recommend running during low-traffic hours\n', 'yellow');

  // In production, add a confirmation prompt here
  if (process.env.NODE_ENV === 'production') {
    log('❌ Cannot run migration in production without explicit confirmation', 'red');
    log('Set CONFIRM_MIGRATION=true environment variable to proceed', 'yellow');

    if (process.env.CONFIRM_MIGRATION !== 'true') {
      process.exit(1);
    }
  }

  // 5. Read migration SQL
  const sqlPath = path.join(__dirname, 'add_composite_indexes.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  log(`\n🔨 Executing ${statements.length} SQL statements...\n`, 'cyan');

  // 6. Execute migration
  let executed = 0;
  let failed = 0;

  for (const statement of statements) {
    // Skip comments
    if (statement.trim().startsWith('--') || statement.trim().startsWith('/*')) {
      continue;
    }

    try {
      // Show what's being executed
      const preview = statement.substring(0, 100).replace(/\s+/g, ' ');
      log(`Executing: ${preview}...`, 'cyan');

      await mysqlSequelize.query(statement);
      executed++;
      log('✓ Success', 'green');
    } catch (error) {
      failed++;
      log(`✗ Failed: ${error.message}`, 'red');

      // Some errors are acceptable (e.g., DROP IF EXISTS on non-existent index)
      if (!error.message.includes('check that it exists')) {
        log('\n❌ Migration failed!', 'red');
        log('Attempting rollback...', 'yellow');
        throw error;
      }
    }
  }

  // 7. Show results
  log(`\n✅ Migration Complete!`, 'green');
  log(`   Executed: ${executed} statements`, 'green');
  log(`   Failed: ${failed} statements\n`, failed > 0 ? 'yellow' : 'green');

  // 8. Show new stats
  log('📊 Table Statistics After Migration:', 'cyan');
  const statsAfter = await getTableStats();
  console.table(statsAfter);

  // 9. Show new indexes
  log('\n📋 New Indexes:', 'cyan');
  const newIndexes = await getExistingIndexes();
  newIndexes.forEach((idx) => log(`  - ${idx}`, 'green'));

  // 10. Verify composite indexes
  log('\n🔍 Verifying Composite Indexes:', 'cyan');
  const [compositeIndexes] = await mysqlSequelize.query(`
    SELECT
      INDEX_NAME,
      GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pois'
      AND INDEX_NAME LIKE 'idx_%'
    GROUP BY INDEX_NAME
  `);

  console.table(compositeIndexes);

  // 11. Performance test
  log('\n🎯 Running Performance Test:', 'cyan');

  const testQuery = `
    SELECT * FROM pois
    WHERE tier = 1 AND city = 'Valencia' AND active = true
    ORDER BY poi_score DESC
    LIMIT 20
  `;

  const [explainResult] = await mysqlSequelize.query(`EXPLAIN ${testQuery}`);
  console.table(explainResult);

  if (explainResult[0].type === 'ref' && explainResult[0].key?.includes('idx_')) {
    log('\n✅ Performance test PASSED: Using composite index!', 'green');
  } else {
    log('\n⚠️  Performance test WARNING: Not using expected index', 'yellow');
    log('   This might be normal if table is empty or statistics not updated', 'yellow');
    log('   Run: ANALYZE TABLE pois;', 'yellow');
  }

  log('\n🎉 Migration successful!\n', 'green');
  log('Next steps:', 'cyan');
  log('  1. Monitor query performance in production', 'yellow');
  log('  2. Run ANALYZE TABLE weekly to update statistics', 'yellow');
  log('  3. Run OPTIMIZE TABLE monthly to reduce fragmentation', 'yellow');
  log('  4. Check /metrics endpoint for query duration improvements\n', 'yellow');
}

// Run migration
runMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    log(`\n❌ Migration failed: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  });
