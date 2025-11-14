import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminUser from '../models/AdminUser.js';
import PlatformConfig from '../models/PlatformConfig.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/holidaibutler';

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    // Create default platform admin
    const existingAdmin = await AdminUser.findOne({ email: 'admin@holidaibutler.com' });

    if (!existingAdmin) {
      const admin = await AdminUser.create({
        email: 'admin@holidaibutler.com',
        password: 'Admin123!@#', // Change this in production!
        profile: {
          firstName: 'Platform',
          lastName: 'Administrator',
          language: 'en'
        },
        role: 'platform_admin',
        status: 'active',
        security: {
          emailVerified: true
        }
      });

      console.log('✅ Created platform admin:', admin.email);
      console.log('📧 Email: admin@holidaibutler.com');
      console.log('🔑 Password: Admin123!@# (CHANGE THIS!)');
    } else {
      console.log('ℹ️  Platform admin already exists');
    }

    // Create sample POI owner
    const existingPOIOwner = await AdminUser.findOne({ email: 'poi.owner@example.com' });

    if (!existingPOIOwner) {
      const poiOwner = await AdminUser.create({
        email: 'poi.owner@example.com',
        password: 'POI123!@#', // Change this in production!
        profile: {
          firstName: 'POI',
          lastName: 'Owner',
          language: 'en'
        },
        role: 'poi_owner',
        status: 'active',
        security: {
          emailVerified: true
        },
        ownedPOIs: [] // Will be populated when POIs are created
      });

      console.log('✅ Created POI owner:', poiOwner.email);
      console.log('📧 Email: poi.owner@example.com');
      console.log('🔑 Password: POI123!@#');
    } else {
      console.log('ℹ️  POI owner already exists');
    }

    // Create sample editor
    const existingEditor = await AdminUser.findOne({ email: 'editor@holidaibutler.com' });

    if (!existingEditor) {
      const editor = await AdminUser.create({
        email: 'editor@holidaibutler.com',
        password: 'Editor123!@#', // Change this in production!
        profile: {
          firstName: 'Content',
          lastName: 'Editor',
          language: 'en'
        },
        role: 'editor',
        status: 'active',
        security: {
          emailVerified: true
        }
      });

      console.log('✅ Created editor:', editor.email);
      console.log('📧 Email: editor@holidaibutler.com');
      console.log('🔑 Password: Editor123!@#');
    } else {
      console.log('ℹ️  Editor already exists');
    }

    // Create sample reviewer
    const existingReviewer = await AdminUser.findOne({ email: 'reviewer@holidaibutler.com' });

    if (!existingReviewer) {
      const reviewer = await AdminUser.create({
        email: 'reviewer@holidaibutler.com',
        password: 'Reviewer123!@#', // Change this in production!
        profile: {
          firstName: 'Content',
          lastName: 'Reviewer',
          language: 'en'
        },
        role: 'reviewer',
        status: 'active',
        security: {
          emailVerified: true
        }
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

    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
