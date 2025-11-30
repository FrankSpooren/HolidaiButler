/**
 * Check existing table structures
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
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
    console.log('✅ Connected to database\n');

    // Check users table structure
    console.log('=== USERS TABLE ===');
    const [usersDesc] = await connection.query('DESCRIBE users');
    console.log(usersDesc);

    console.log('\n=== POIS TABLE ===');
    const [poisDesc] = await connection.query('DESCRIBE pois');
    console.log(poisDesc);

    console.log('\n=== CHECKING ID COLUMNS ===');
    const [usersId] = usersDesc.filter((col) => col.Field === 'id');
    const [poisId] = poisDesc.filter((col) => col.Field === 'id');

    console.log('\nusers.id:', usersId);
    console.log('pois.id:', poisId);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTables();
