/**
 * Seed Admin Users Script - MySQL Version
 * =========================================
 * Creates initial admin users for HolidaiButler Admin Module
 * Run with: npm run seed
 */

import dotenv from 'dotenv';
import AdminUser from '../models/AdminUser.js';
import PlatformConfig from '../models/PlatformConfig.js';
import { testDatabaseConnection, closePool } from '../config/database.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MySQL
    await testDatabaseConnection();

    console.log('🌱 Starting admin users seeding...\n');

    // Create default platform admin
    const existingAdmin = await AdminUser.findByEmail('admin@holidaibutler.com');

    if (!existingAdmin) {
      const admin = await AdminUser.create({
        email: 'admin@holidaibutler.com',
        password: 'Admin123!@#', // Change this in production!
        firstName: 'Platform',
        lastName: 'Administrator',
        language: 'en',
        role: 'platform_admin'
      });

      // Update to active and verified
      await AdminUser.update(admin.id, {
        status: 'active',
        email_verified: true
      });

      console.log('✅ Created platform admin:', admin.email);
      console.log('📧 Email: admin@holidaibutler.com');
      console.log('🔑 Password: Admin123!@# (CHANGE THIS!)');
    } else {
      console.log('ℹ️  Platform admin already exists');
    }

    // Create sample POI owner
    const existingPOIOwner = await AdminUser.findByEmail('poi.owner@example.com');

    if (!existingPOIOwner) {
      const poiOwner = await AdminUser.create({
        email: 'poi.owner@example.com',
        password: 'POI123!@#', // Change this in production!
        firstName: 'POI',
        lastName: 'Owner',
        language: 'en',
        role: 'poi_owner'
      });

      // Update to active and verified
      await AdminUser.update(poiOwner.id, {
        status: 'active',
        email_verified: true
      });

      console.log('✅ Created POI owner:', poiOwner.email);
      console.log('📧 Email: poi.owner@example.com');
      console.log('🔑 Password: POI123!@#');
    } else {
      console.log('ℹ️  POI owner already exists');
    }

    // Create sample editor
    const existingEditor = await AdminUser.findByEmail('editor@holidaibutler.com');

    if (!existingEditor) {
      const editor = await AdminUser.create({
        email: 'editor@holidaibutler.com',
        password: 'Editor123!@#', // Change this in production!
        firstName: 'Content',
        lastName: 'Editor',
        language: 'en',
        role: 'editor'
      });

      // Update to active and verified
      await AdminUser.update(editor.id, {
        status: 'active',
        email_verified: true
      });

      console.log('✅ Created editor:', editor.email);
      console.log('📧 Email: editor@holidaibutler.com');
      console.log('🔑 Password: Editor123!@#');
    } else {
      console.log('ℹ️  Editor already exists');
    }

    // Create sample reviewer
    const existingReviewer = await AdminUser.findByEmail('reviewer@holidaibutler.com');

    if (!existingReviewer) {
      const reviewer = await AdminUser.create({
        email: 'reviewer@holidaibutler.com',
        password: 'Reviewer123!@#', // Change this in production!
        firstName: 'Content',
        lastName: 'Reviewer',
        language: 'en',
        role: 'reviewer'
      });

      // Update to active and verified
      await AdminUser.update(reviewer.id, {
        status: 'active',
        email_verified: true
      });

      console.log('✅ Created reviewer:', reviewer.email);
      console.log('📧 Email: reviewer@holidaibutler.com');
      console.log('🔑 Password: Reviewer123!@#');
    } else {
      console.log('ℹ️  Reviewer already exists');
    }

    // Initialize platform configuration
    const config = await PlatformConfig.getConfig();
    console.log('✅ Platform configuration initialized');

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n⚠️  IMPORTANT: Change default passwords before going to production!');

    await closePool();
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    await closePool();
    process.exit(1);
  }
};

seedData();
