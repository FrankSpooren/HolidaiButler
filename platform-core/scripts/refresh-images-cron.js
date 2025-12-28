#!/usr/bin/env node
/**
 * POI Image Refresh Cron Script
 *
 * Proactively refreshes Google Places images before they expire.
 *
 * Schedule: Weekly on Sunday at 3 AM
 * Crontab: 0 3 * * 0 cd /var/www/api.holidaibutler.com/platform-core && node scripts/refresh-images-cron.js >> /var/log/holidaibutler/image-refresh.log 2>&1
 *
 * Or add to server's cron:
 * crontab -e
 * 0 3 * * 0 cd /var/www/api.holidaibutler.com/platform-core && node scripts/refresh-images-cron.js >> /var/log/holidaibutler/image-refresh.log 2>&1
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
dotenv.config({ path: join(__dirname, '..', '.env') });

// Import after env is loaded
import { mysqlSequelize } from '../src/config/database.js';
import poiImageRefreshJob from '../src/jobs/poiImageRefresh.js';

async function main() {
  console.log('='.repeat(60));
  console.log(`POI Image Refresh Job - ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    // Connect to database
    await mysqlSequelize.authenticate();
    console.log('Database connected\n');

    // Run refresh job
    const result = await poiImageRefreshJob.run();

    console.log('\n' + '='.repeat(60));
    console.log('Job Result:', JSON.stringify(result, null, 2));
    console.log('='.repeat(60));

    // Exit cleanly
    await mysqlSequelize.close();
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('Job failed:', error);
    process.exit(1);
  }
}

main();
