/**
 * Test Sequelize Models Connection
 */

// Set environment variables manually for this test
process.env.DB_HOST = 'jotx.your-database.de';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'pxoziy_1';
process.env.DB_PASSWORD = 'j8,DrtshJSm$';
process.env.DB_NAME = 'pxoziy_db1';
process.env.NODE_ENV = 'test'; // Prevent auto-connect on module load

const db = require('./models-sequelize');

async function testModels() {
  console.log('🧪 Testing Sequelize Models Connection...\n');

  try {
    // Test connection
    await db.testConnection();

    // List loaded models
    const modelNames = Object.keys(db).filter(
      (k) =>
        ![
          'sequelize',
          'Sequelize',
          'testConnection',
          'syncDatabase',
          'closeConnection',
        ].includes(k)
    );

    console.log('\n📦 Loaded models:');
    modelNames.forEach((name) => {
      console.log(`  ✅ ${name}`);
    });

    // Test model structure
    console.log('\n🔍 Testing model structures...');

    // Check Ticket model
    const ticketFields = Object.keys(db.Ticket.rawAttributes);
    console.log(`  Ticket model has ${ticketFields.length} fields`);
    console.log(`    - id type: ${db.Ticket.rawAttributes.id.type.key}`);
    console.log(`    - userId type: ${db.Ticket.rawAttributes.userId.type.key}`);
    console.log(`    - poiId type: ${db.Ticket.rawAttributes.poiId.type.key}`);

    // Check Booking model
    const bookingFields = Object.keys(db.Booking.rawAttributes);
    console.log(`  Booking model has ${bookingFields.length} fields`);
    console.log(`    - id type: ${db.Booking.rawAttributes.id.type.key}`);

    // Check Availability model
    const availFields = Object.keys(db.Availability.rawAttributes);
    console.log(`  Availability model has ${availFields.length} fields`);
    console.log(`    - id type: ${db.Availability.rawAttributes.id.type.key}`);

    console.log('\n✅ All models configured correctly!\n');

    await db.closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testModels();
