#!/usr/bin/env node
/**
 * Database Migration Script for HolidaiButler Ticketing Module
 *
 * Usage:
 *   npm run migrate              - Run pending migrations
 *   npm run migrate -- --status  - Show migration status
 *   npm run migrate -- --undo    - Undo last migration
 *   npm run migrate -- --undo-all - Undo all migrations
 */

require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const SEQUELIZE_CLI = path.join(__dirname, '..', 'node_modules', '.bin', 'sequelize-cli');
const args = process.argv.slice(2);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('');
  log('═'.repeat(60), 'cyan');
  log(`  ${message}`, 'bright');
  log('═'.repeat(60), 'cyan');
  console.log('');
}

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    log(`▶ ${description}...`, 'yellow');

    const child = exec(command, { cwd: path.join(__dirname, '..') });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${description} completed successfully`, 'green');
        resolve();
      } else {
        log(`❌ ${description} failed with code ${code}`, 'red');
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function showStatus() {
  logHeader('Migration Status');
  await runCommand(`${SEQUELIZE_CLI} db:migrate:status`, 'Checking migration status');
}

async function runMigrations() {
  logHeader('Running Migrations');

  log('Environment: ' + (process.env.NODE_ENV || 'development'), 'cyan');
  log('Database: ' + (process.env.DATABASE_NAME || 'pxoziy_db1'), 'cyan');
  log('Host: ' + (process.env.DATABASE_HOST || 'localhost'), 'cyan');
  console.log('');

  try {
    await runCommand(`${SEQUELIZE_CLI} db:migrate`, 'Running pending migrations');
    log('', 'reset');
    log('🎉 All migrations completed successfully!', 'green');
  } catch (error) {
    log('', 'reset');
    log('Migration failed. Check the error above.', 'red');
    process.exit(1);
  }
}

async function undoLastMigration() {
  logHeader('Undoing Last Migration');

  log('⚠️  WARNING: This will undo the last migration!', 'yellow');
  console.log('');

  try {
    await runCommand(`${SEQUELIZE_CLI} db:migrate:undo`, 'Undoing last migration');
  } catch (error) {
    process.exit(1);
  }
}

async function undoAllMigrations() {
  logHeader('Undoing All Migrations');

  log('⚠️  WARNING: This will undo ALL migrations!', 'red');
  log('⚠️  All data in migrated tables will be LOST!', 'red');
  console.log('');

  try {
    await runCommand(`${SEQUELIZE_CLI} db:migrate:undo:all`, 'Undoing all migrations');
  } catch (error) {
    process.exit(1);
  }
}

async function createMigration(name) {
  if (!name) {
    log('❌ Please provide a migration name', 'red');
    log('Usage: npm run migrate -- --create migration-name', 'yellow');
    process.exit(1);
  }

  logHeader(`Creating Migration: ${name}`);

  try {
    await runCommand(
      `${SEQUELIZE_CLI} migration:generate --name ${name}`,
      `Creating migration "${name}"`
    );
  } catch (error) {
    process.exit(1);
  }
}

async function main() {
  try {
    if (args.includes('--status') || args.includes('-s')) {
      await showStatus();
    } else if (args.includes('--undo')) {
      await undoLastMigration();
    } else if (args.includes('--undo-all')) {
      await undoAllMigrations();
    } else if (args.includes('--create') || args.includes('-c')) {
      const nameIndex = args.findIndex(a => a === '--create' || a === '-c') + 1;
      const name = args[nameIndex];
      await createMigration(name);
    } else if (args.includes('--help') || args.includes('-h')) {
      logHeader('Migration Help');
      console.log(`
  Usage: npm run migrate [options]

  Options:
    (none)         Run all pending migrations
    --status, -s   Show migration status
    --undo         Undo the last migration
    --undo-all     Undo all migrations (DANGEROUS!)
    --create, -c   Create a new migration file
    --help, -h     Show this help message

  Examples:
    npm run migrate                     # Run migrations
    npm run migrate -- --status         # Check status
    npm run migrate -- --undo           # Rollback last
    npm run migrate -- --create add-field-to-bookings
      `);
    } else {
      await runMigrations();
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
