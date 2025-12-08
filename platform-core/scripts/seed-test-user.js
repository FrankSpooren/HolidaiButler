/**
 * Seed Test User Script
 * Creates a test user for the customer portal
 *
 * Run with: node platform-core/scripts/seed-test-user.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { mysqlSequelize } from '../src/config/database.js';
import User from '../src/models/User.js';

async function seedTestUser() {
  console.log('🌱 Starting test user seed...\n');

  try {
    // Connect to database
    console.log('📊 Connecting to database...');
    await mysqlSequelize.authenticate();
    console.log('✅ Database connected\n');

    // Sync User model
    console.log('📋 Syncing User model...');
    await User.sync({ alter: true });
    console.log('✅ User model synced\n');

    // Test user data
    const testUserData = {
      email: 'test@holidaibutler.com',
      password: 'Test1234',
      firstName: 'Test',
      lastName: 'Gebruiker',
      language: 'nl',
      status: 'active',
      emailVerified: true,
      subscriptionType: 'premium',
      preferences: {
        interests: ['beaches', 'restaurants', 'cultural'],
        budget: 'moderate',
        groupSize: 2,
        notifications: true
      }
    };

    // Check if user already exists
    console.log('🔍 Checking if test user exists...');
    const existingUser = await User.findOne({
      where: { email: testUserData.email }
    });

    if (existingUser) {
      console.log('⚠️  Test user already exists, updating...');
      await existingUser.update({
        firstName: testUserData.firstName,
        lastName: testUserData.lastName,
        status: 'active',
        emailVerified: true,
        subscriptionType: 'premium'
      });
      console.log('✅ Test user updated\n');
    } else {
      console.log('➕ Creating test user...');
      await User.create(testUserData);
      console.log('✅ Test user created\n');
    }

    // Show credentials
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🔐 TEST ACCOUNT CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Email:    ${testUserData.email}`);
    console.log(`  Password: ${testUserData.password}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n✅ Test user seeding completed!');
    console.log('📝 You can now login at: https://test.holidaibutler.com/login\n');

  } catch (error) {
    console.error('❌ Error seeding test user:', error);
    process.exit(1);
  } finally {
    await mysqlSequelize.close();
    process.exit(0);
  }
}

seedTestUser();
