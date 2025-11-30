require('dotenv').config();

console.log('Testing ticketing integration with Dependency Injection...\n');

console.log('1. Environment Check:');
console.log('   - MAILERLITE_API_KEY:', process.env.MAILERLITE_API_KEY ? '✓ SET' : '✗ NOT SET');
console.log('   - MISTRAL_API_KEY:', process.env.MISTRAL_API_KEY ? '✓ SET' : '✗ NOT SET');

try {
  console.log('\n2. Loading main backend Sequelize models (User, POI)...');
  const { sequelize, User, POI } = require('./src/models/sequelize');
  console.log('   ✓ User model loaded');
  console.log('   ✓ POI model loaded');
  console.log('   ✓ Sequelize instance ready');

  console.log('\n3. Initializing ticketing models with dependency injection...');
  const ticketingModels = require('../ticketing-module/backend/models-sequelize');
  const models = ticketingModels.initialize(sequelize, { User, POI });
  console.log('   ✓ Ticketing models initialized');
  console.log('   ✓ Models available:', Object.keys(models).filter(k => !['sequelize', 'Sequelize'].includes(k)).join(', '));

  console.log('\n4. Loading ticketing routes...');
  const ticketingRoutes = require('../ticketing-module/backend/routes');
  console.log('   ✓ Ticketing routes loaded successfully');
  console.log('   ✓ Routes type:', typeof ticketingRoutes);

  console.log('\n✅ ALL TESTS PASSED - Integration successful!\n');
  process.exit(0);
} catch (error) {
  console.error('\n✗ Error during integration test:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
