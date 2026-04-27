#!/usr/bin/env node
/**
 * Create missing tables for Fase 3: poi_images, discovery_runs, destination_configs
 */
import { mysqlSequelize } from './src/config/database.js';
import DiscoveryRun from './src/models/DiscoveryRun.js';
import DestinationConfig from './src/models/DestinationConfig.js';
import { DataTypes, QueryTypes } from 'sequelize';

async function createTables() {
  try {
    await mysqlSequelize.authenticate();
    console.log('DB connected');

    // 1. Sync DiscoveryRun + DestinationConfig (from existing Sequelize models)
    await DiscoveryRun.sync({ alter: false });
    console.log('[OK] discovery_runs table created/verified');

    await DestinationConfig.sync({ alter: false });
    console.log('[OK] destination_configs table created/verified');

    // 2. Create poi_images table (raw SQL — no Sequelize model exists)
    const [tables] = await mysqlSequelize.query("SHOW TABLES LIKE 'poi_images'");
    if (tables.length === 0) {
      await mysqlSequelize.query(`
        CREATE TABLE poi_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          poi_id INT NOT NULL,
          image_url VARCHAR(1000),
          local_path VARCHAR(500),
          filename VARCHAR(255),
          source ENUM('google', 'flickr', 'unsplash', 'pexels', 'upload', 'apify') DEFAULT 'google',
          source_url VARCHAR(1000),
          status ENUM('pending', 'approved', 'rejected', 'primary') DEFAULT 'pending',
          quality_score FLOAT DEFAULT 0,
          width INT,
          height INT,
          file_size INT,
          mime_type VARCHAR(50),
          alt_text VARCHAR(500),
          caption VARCHAR(500),
          tags JSON,
          metadata JSON,
          rejection_reason VARCHAR(500),
          is_primary BOOLEAN DEFAULT FALSE,
          verified_by VARCHAR(100),
          verified_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_poi_id (poi_id),
          INDEX idx_status (status),
          INDEX idx_quality (quality_score),
          INDEX idx_source (source),
          FOREIGN KEY (poi_id) REFERENCES POI(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('[OK] poi_images table created');
    } else {
      console.log('[SKIP] poi_images table already exists');
    }

    console.log('\nAll tables ready!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTables();
