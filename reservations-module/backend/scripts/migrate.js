#!/usr/bin/env node
/**
 * Database Migration Script
 * Handles Sequelize migrations for the Reservations Module
 *
 * Usage:
 *   npm run migrate              - Run pending migrations
 *   npm run migrate -- --status  - Check migration status
 *   npm run migrate -- --undo    - Rollback last migration
 *   npm run migrate -- --undo-all - Rollback all migrations
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');

// Database configuration
const sequelize = new Sequelize(
  process.env.DATABASE_NAME || 'pxoziy_db1',
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

// Migration configuration
const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../migrations/*.js'),
    resolve: ({ name, path: migrationPath, context }) => {
      const migration = require(migrationPath);
      return {
        name,
        up: async () => migration.up(context.queryInterface, context.Sequelize),
        down: async () => migration.down(context.queryInterface, context.Sequelize),
      };
    },
  },
  context: {
    queryInterface: sequelize.getQueryInterface(),
    Sequelize,
  },
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// CLI handling
const command = process.argv[2];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.\n');

    switch (command) {
      case '--status':
        const pending = await umzug.pending();
        const executed = await umzug.executed();

        console.log('=== Migration Status ===\n');
        console.log('Executed migrations:');
        if (executed.length === 0) {
          console.log('  (none)');
        } else {
          executed.forEach(m => console.log(`  ✅ ${m.name}`));
        }

        console.log('\nPending migrations:');
        if (pending.length === 0) {
          console.log('  (none)');
        } else {
          pending.forEach(m => console.log(`  ⏳ ${m.name}`));
        }
        break;

      case '--undo':
        console.log('Rolling back last migration...\n');
        const undone = await umzug.down();
        if (undone.length === 0) {
          console.log('No migrations to rollback.');
        } else {
          console.log(`Rolled back: ${undone.map(m => m.name).join(', ')}`);
        }
        break;

      case '--undo-all':
        console.log('Rolling back all migrations...\n');
        const allUndone = await umzug.down({ to: 0 });
        if (allUndone.length === 0) {
          console.log('No migrations to rollback.');
        } else {
          console.log(`Rolled back ${allUndone.length} migrations.`);
        }
        break;

      case '--create':
        const migrationName = process.argv[3];
        if (!migrationName) {
          console.error('Please provide a migration name: npm run migrate -- --create <name>');
          process.exit(1);
        }

        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const fileName = `${timestamp}-${migrationName}.js`;
        const filePath = path.join(__dirname, '../migrations', fileName);

        const template = `'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add migration logic here
  },

  async down(queryInterface, Sequelize) {
    // Add rollback logic here
  },
};
`;

        require('fs').writeFileSync(filePath, template);
        console.log(`Created migration: ${fileName}`);
        break;

      default:
        console.log('Running pending migrations...\n');
        const migrations = await umzug.up();
        if (migrations.length === 0) {
          console.log('No pending migrations.');
        } else {
          console.log(`Executed ${migrations.length} migration(s):`);
          migrations.forEach(m => console.log(`  ✅ ${m.name}`));
        }
    }

    console.log('\nDone.');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

main();
