/**
 * List all tables in database
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function listTables() {
  const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database:', config.database, '\n');

    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Found ${tables.length} tables:\n`);

    tables.forEach((row, index) => {
      const tableName = Object.values(row)[0];
      console.log(`${index + 1}. ${tableName}`);
    });

    // Check for tables with 'user' in the name
    console.log('\n=== Tables containing "user" ===');
    const userTables = tables.filter((row) =>
      Object.values(row)[0].toLowerCase().includes('user')
    );
    userTables.forEach((row) => console.log(`  - ${Object.values(row)[0]}`));

    // Check for tables with 'poi' in the name
    console.log('\n=== Tables containing "poi" ===');
    const poiTables = tables.filter((row) =>
      Object.values(row)[0].toLowerCase().includes('poi')
    );
    poiTables.forEach((row) => console.log(`  - ${Object.values(row)[0]}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

listTables();
