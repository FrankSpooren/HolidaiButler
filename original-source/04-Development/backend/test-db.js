const { query } = require('./src/config/database');

async function test() {
  try {
    console.log('Testing SELECT...');
    const result = await query('SELECT COUNT(*) as count FROM POI');
    console.log('✅ SELECT works:', result[0].count, 'POIs');

    console.log('\nTesting SHOW INDEX...');
    const indexes = await query('SHOW INDEX FROM POI');
    console.log('✅ SHOW INDEX works:', indexes.length, 'indexes');

    console.log('\nTrying to add FULLTEXT index...');
    await query('ALTER TABLE POI ADD FULLTEXT INDEX test_idx (name)');
    console.log('✅ FULLTEXT index added');

    console.log('\nCleaning up test index...');
    await query('DROP INDEX test_idx ON POI');
    console.log('✅ Test index removed');

    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error errno:', err.errno);
    console.error('SQL State:', err.sqlState);
    console.error('SQL Message:', err.sqlMessage);
    process.exit(1);
  }
}

test();
