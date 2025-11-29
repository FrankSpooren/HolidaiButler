/**
 * Create POI Discovery Tables
 * Creates DestinationConfig and DiscoveryRun tables in MySQL
 */

import dotenv from 'dotenv';
import { mysqlSequelize } from '../src/config/database.js';
import DestinationConfig from '../src/models/DestinationConfig.js';
import DiscoveryRun from '../src/models/DiscoveryRun.js';
import logger from '../src/utils/logger.js';

dotenv.config();

async function createTables() {
  try {
    logger.info('🚀 Creating POI Discovery tables...');

    // Test connection
    await mysqlSequelize.authenticate();
    logger.info('✅ Database connection established');

    // Create DestinationConfig table
    logger.info('Creating destination_configs table...');
    await DestinationConfig.sync({ alter: true });
    logger.info('✅ destination_configs table created');

    // Create DiscoveryRun table
    logger.info('Creating discovery_runs table...');
    await DiscoveryRun.sync({ alter: true });
    logger.info('✅ discovery_runs table created');

    // Create some default configurations
    logger.info('Creating default configurations...');

    const defaultConfigs = [
      {
        name: 'Standard Beach Destination',
        description: 'Default configuration for beach/coastal destinations',
        categories: ['food_drinks', 'beach', 'activities', 'accommodation', 'nightlife'],
        criteria: {
          minReviews: 50,
          minRating: 4.0,
          priceLevel: [1, 2, 3],
        },
        sources: ['google_places'],
        max_pois_per_category: 50,
        auto_classify: true,
        auto_enrich: true,
        tags: ['beach', 'coastal', 'summer'],
        created_by: 'system',
      },
      {
        name: 'Cultural City Destination',
        description: 'Configuration for cultural/historic city destinations',
        categories: ['food_drinks', 'museum', 'historical', 'shopping', 'activities'],
        criteria: {
          minReviews: 30,
          minRating: 4.2,
          priceLevel: [1, 2, 3, 4],
        },
        sources: ['google_places'],
        max_pois_per_category: 75,
        auto_classify: true,
        auto_enrich: true,
        tags: ['cultural', 'city', 'history'],
        created_by: 'system',
      },
      {
        name: 'Premium Destination',
        description: 'High-quality POIs with strict criteria',
        categories: ['food_drinks', 'museum', 'activities', 'accommodation', 'shopping'],
        criteria: {
          minReviews: 100,
          minRating: 4.5,
          priceLevel: [2, 3, 4],
        },
        sources: ['google_places', 'tripadvisor'],
        max_pois_per_category: 30,
        auto_classify: true,
        auto_enrich: true,
        tags: ['premium', 'quality', 'curated'],
        created_by: 'system',
      },
    ];

    for (const configData of defaultConfigs) {
      const existing = await DestinationConfig.findOne({
        where: { name: configData.name },
      });

      if (!existing) {
        await DestinationConfig.create(configData);
        logger.info(`✅ Created config: ${configData.name}`);
      } else {
        logger.info(`⏭️  Config already exists: ${configData.name}`);
      }
    }

    logger.info('✅ Default configurations created');

    logger.info(`
    ╔═══════════════════════════════════════════════════════════╗
    ║   ✅ POI Discovery Tables Created Successfully           ║
    ╠═══════════════════════════════════════════════════════════╣
    ║   Tables:                                                ║
    ║   - destination_configs                                  ║
    ║   - discovery_runs                                       ║
    ║                                                          ║
    ║   Default Configurations:                                ║
    ║   - Standard Beach Destination                           ║
    ║   - Cultural City Destination                            ║
    ║   - Premium Destination                                  ║
    ╚═══════════════════════════════════════════════════════════╝
    `);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

createTables();
