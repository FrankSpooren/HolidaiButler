import dotenv from 'dotenv';
import { AdminUser, PlatformConfig, sequelize } from '../models/index.js';
import { testConnection, syncDatabase } from '../config/database.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MySQL Database
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Failed to connect to MySQL database');
      process.exit(1);
    }

    console.log('✅ Connected to MySQL database');

    // Sync database (create tables if they don't exist)
    await syncDatabase(false); // Set to true to recreate tables
    console.log('✅ Database synchronized');

    // Create default platform admin
    const existingAdmin = await AdminUser.findOne({
      where: { email: 'admin@holidaibutler.com' }
    });

    if (!existingAdmin) {
      const admin = await AdminUser.create({
        email: 'admin@holidaibutler.com',
        password: 'Admin2025', // Change this in production!
        firstName: 'Platform',
        lastName: 'Administrator',
        language: 'en',
        role: 'platform_admin',
        status: 'active',
        emailVerified: true
      });

      console.log('✅ Created platform admin:', admin.email);
      console.log('📧 Email: admin@holidaibutler.com');
      console.log('🔑 Password: Admin2025 (CHANGE THIS!)');
    } else {
      console.log('ℹ️  Platform admin already exists');
    }

    // Create sample POI owner
    const existingPOIOwner = await AdminUser.findOne({
      where: { email: 'poi.owner@example.com' }
    });

    if (!existingPOIOwner) {
      const poiOwner = await AdminUser.create({
        email: 'poi.owner@example.com',
        password: 'POI2025', // Change this in production!
        firstName: 'POI',
        lastName: 'Owner',
        language: 'en',
        role: 'poi_owner',
        status: 'active',
        emailVerified: true,
        ownedPOIs: []
      });

      console.log('✅ Created POI owner:', poiOwner.email);
      console.log('📧 Email: poi.owner@example.com');
      console.log('🔑 Password: POI2025');
    } else {
      console.log('ℹ️  POI owner already exists');
    }

    // Create sample editor
    const existingEditor = await AdminUser.findOne({
      where: { email: 'editor@holidaibutler.com' }
    });

    if (!existingEditor) {
      const editor = await AdminUser.create({
        email: 'editor@holidaibutler.com',
        password: 'Editor2025', // Change this in production!
        firstName: 'Content',
        lastName: 'Editor',
        language: 'en',
        role: 'editor',
        status: 'active',
        emailVerified: true
      });

      console.log('✅ Created editor:', editor.email);
      console.log('📧 Email: editor@holidaibutler.com');
      console.log('🔑 Password: Editor2025');
    } else {
      console.log('ℹ️  Editor already exists');
    }

    // Create sample reviewer
    const existingReviewer = await AdminUser.findOne({
      where: { email: 'reviewer@holidaibutler.com' }
    });

    if (!existingReviewer) {
      const reviewer = await AdminUser.create({
        email: 'reviewer@holidaibutler.com',
        password: 'Reviewer2025', // Change this in production!
        firstName: 'Content',
        lastName: 'Reviewer',
        language: 'en',
        role: 'reviewer',
        status: 'active',
        emailVerified: true
      });

      console.log('✅ Created reviewer:', reviewer.email);
      console.log('📧 Email: reviewer@holidaibutler.com');
      console.log('🔑 Password: Reviewer2025');
    } else {
      console.log('ℹ️  Reviewer already exists');
    }

    // Initialize platform configuration
    const config = await PlatformConfig.getConfig();
    console.log('✅ Platform configuration initialized');

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n⚠️  IMPORTANT: Change default passwords before going to production!');

    // Close database connection
    await sequelize.close();
    console.log('✅ Database connection closed');

    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
