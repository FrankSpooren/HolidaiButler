const { query } = require('./src/config/database');

async function checkPOITable() {
  try {
    console.log('Checking POI table structure...\n');

    const result = await query('DESCRIBE POI');
    console.log('POI Table Columns:');
    console.table(result);

    console.log('\nChecking POI 436 and 1:');
    const pois = await query('SELECT id, name, category FROM POI WHERE id IN (436, 1)');
    console.table(pois);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPOITable();
