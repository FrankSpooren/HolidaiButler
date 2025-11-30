/**
 * Check ID column structures
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkIdColumns() {
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
    console.log('✅ Connected\n');

    console.log('=== Users TABLE ===');
    const [usersDesc] = await connection.query('DESCRIBE Users');
    const usersId = usersDesc.find((col) => col.Field === 'id');
    console.log('id column:', usersId);

    console.log('\n=== POI TABLE ===');
    const [poiDesc] = await connection.query('DESCRIBE POI');
    const poiId = poiDesc.find((col) => col.Field === 'id');
    console.log('id column:', poiId);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkIdColumns();
