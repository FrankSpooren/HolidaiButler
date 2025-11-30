/**
 * Migration Runner Script
 * Executes SQL migration files on Hetzner MySQL database
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  console.log('🚀 Starting migration deployment...\n');

  // Database connection configuration
  const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true, // Required for executing multiple SQL statements
  };

  let connection;

  try {
    // Create database connection
    console.log(`📡 Connecting to database: ${config.host}/${config.database}...`);
    connection = await mysql.createConnection(config);
    console.log('✅ Database connection established\n');

    // Migration files to execute
    const migrations = [
      {
        name: 'Ticketing Module Tables',
        file: path.join(
          __dirname,
          '../ticketing-module/backend/migrations/001_create_ticketing_tables_FIXED.sql'
        ),
      },
      // NOTE: Restaurant reservation tables already exist in database - skipping
      // {
      //   name: 'Restaurant Reservations Module Tables',
      //   file: path.join(
      //     __dirname,
      //     '../payment-module/backend/migrations/001_create_restaurant_reservations_tables.sql'
      //   ),
      // },
    ];

    // Execute each migration
    for (const migration of migrations) {
      try {
        console.log(`\n📄 Executing migration: ${migration.name}`);
        console.log(`   File: ${path.basename(migration.file)}\n`);

        // Read SQL file
        const sql = await fs.readFile(migration.file, 'utf8');

        // Execute SQL
        const [results] = await connection.query(sql);

        // Log success message from migration (if any)
        if (Array.isArray(results) && results.length > 0) {
          const lastResult = results[results.length - 1];
          if (lastResult && lastResult.length > 0) {
            console.log('   Migration Result:', lastResult[0]);
          }
        }

        console.log(`   ✅ ${migration.name} - COMPLETED`);
      } catch (migrationError) {
        // Check if error is "table already exists" - not a critical error
        if (migrationError.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`   ⚠️  ${migration.name} - Tables already exist (skipped)`);
        } else {
          console.error(`   ❌ ${migration.name} - FAILED`);
          console.error(`   Error: ${migrationError.message}`);
          throw migrationError; // Re-throw to stop execution
        }
      }
    }

    console.log('\n\n🎉 All migrations completed successfully!');
    console.log('\n📊 Verifying created tables...\n');

    // Verify tables were created
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Total tables in database: ${tables.length}`);

    // Check for ticketing module tables
    const ticketingTables = ['bookings', 'tickets', 'availability'];
    const reservationsTables = [
      'restaurants',
      'tables',
      'guests',
      'guest_notes',
      'reservations',
      'waitlist',
      'floor_plans',
      'restaurant_availability',
    ];

    console.log('\nTicketing Module Tables:');
    for (const tableName of ticketingTables) {
      const exists = tables.some((row) => Object.values(row)[0] === tableName);
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
    }

    console.log('\nReservations Module Tables:');
    for (const tableName of reservationsTables) {
      const exists = tables.some((row) => Object.values(row)[0] === tableName);
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
    }

    console.log('\n✅ Migration deployment complete!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📡 Database connection closed');
    }
  }
}

// Run migrations
runMigrations();
