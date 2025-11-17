/**
 * POI Migration Script
 * Migrates POIs from MongoDB (admin module) to MySQL (platform-core)
 *
 * Usage: node scripts/migrate-pois-to-mysql.js
 */

import mongoose from 'mongoose';
import { mysqlSequelize } from '../src/config/database.js';
import POI from '../src/models/POI.js';
import logger from '../src/utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB POI Schema (from admin module)
const mongoPoiSchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String,
  category: String,
  address: String,
  city: String,
  region: String,
  country: String,
  latitude: Number,
  longitude: Number,
  phone: String,
  email: String,
  website: String,
  verified: Boolean,
  active: Boolean,
  images: [String],
  amenities: [String],
  openingHours: Object,
  price_range: String,
  rating: Number,
  createdAt: Date,
  updatedAt: Date,
});

const MongoPOI = mongoose.model('POI', mongoPoiSchema, 'pois');

// Category mapping from MongoDB to MySQL
const categoryMapping = {
  'restaurant': 'food_drinks',
  'food': 'food_drinks',
  'drinks': 'food_drinks',
  'cafe': 'food_drinks',
  'museum': 'museum',
  'beach': 'beach',
  'historical': 'historical',
  'hiking': 'routes',
  'cycling': 'routes',
  'walking': 'routes',
  'healthcare': 'healthcare',
  'hospital': 'healthcare',
  'shop': 'shopping',
  'shopping': 'shopping',
  'activities': 'activities',
  'hotel': 'accommodation',
  'accommodation': 'accommodation',
  'nightlife': 'nightlife',
  'bar': 'nightlife',
  'club': 'nightlife',
};

async function migratePOIs() {
  logger.info('Starting POI migration from MongoDB to MySQL');

  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ MongoDB connected');

    // Connect to MySQL
    logger.info('Connecting to MySQL...');
    await mysqlSequelize.authenticate();
    logger.info('✅ MySQL connected');

    // Sync MySQL tables (create if not exist)
    await mysqlSequelize.sync({ alter: true });
    logger.info('✅ MySQL tables synchronized');

    // Get all POIs from MongoDB
    logger.info('Fetching POIs from MongoDB...');
    const mongoPOIs = await MongoPOI.find({});
    logger.info(`Found ${mongoPOIs.length} POIs in MongoDB`);

    const results = {
      total: mongoPOIs.length,
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // Migrate each POI
    for (const mongoPOI of mongoPOIs) {
      try {
        // Check if POI already exists in MySQL
        const existing = await POI.findOne({
          where: { slug: mongoPOI.slug },
        });

        if (existing) {
          logger.info(`POI already exists, skipping: ${mongoPOI.name}`);
          results.skipped++;
          continue;
        }

        // Map category
        const category = categoryMapping[mongoPOI.category?.toLowerCase()] || 'activities';

        // Create POI in MySQL
        const mysqlPOI = await POI.create({
          name: mongoPOI.name,
          slug: mongoPOI.slug || mongoPOI.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: mongoPOI.description,
          category,
          address: mongoPOI.address,
          city: mongoPOI.city || 'Unknown',
          region: mongoPOI.region,
          country: mongoPOI.country || 'Netherlands',
          latitude: mongoPOI.latitude,
          longitude: mongoPOI.longitude,
          phone: mongoPOI.phone,
          email: mongoPOI.email,
          website: mongoPOI.website,
          verified: mongoPOI.verified || false,
          active: mongoPOI.active !== false,
          // Start with default scores (will be calculated later)
          tier: 4,
          poi_score: 0,
          review_count: 0,
          average_rating: mongoPOI.rating || 0,
          tourist_relevance: 0,
          booking_frequency: 0,
        });

        logger.info(`✅ Migrated POI: ${mysqlPOI.name} (${mysqlPOI.id})`);
        results.migrated++;
      } catch (error) {
        logger.error(`Failed to migrate POI ${mongoPOI.name}:`, error.message);
        results.failed++;
        results.errors.push({
          name: mongoPOI.name,
          error: error.message,
        });
      }
    }

    // Print summary
    logger.info('\n=== Migration Summary ===');
    logger.info(`Total POIs in MongoDB: ${results.total}`);
    logger.info(`Successfully migrated: ${results.migrated}`);
    logger.info(`Skipped (already exists): ${results.skipped}`);
    logger.info(`Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      logger.info('\nErrors:');
      results.errors.forEach(err => {
        logger.info(`- ${err.name}: ${err.error}`);
      });
    }

    // Close connections
    await mongoose.connection.close();
    await mysqlSequelize.close();

    logger.info('\n✅ Migration completed successfully');

    return results;
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
migratePOIs()
  .then((results) => {
    console.log('\nMigration Results:', results);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration Error:', error);
    process.exit(1);
  });
