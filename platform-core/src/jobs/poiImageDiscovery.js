/**
 * POI Image Discovery Job
 *
 * Automated job for discovering and processing POI images
 * Runs on schedule based on POI tier classification
 */

import POIImageAggregationService from '../services/poiImageAggregation.js';
import { mysqlSequelize } from '../config/database.js';
import winston from 'winston';
import crypto from 'crypto';

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/poi-image-discovery-job.log' })
  ]
});

class POIImageDiscoveryJob {
  constructor() {
    this.aggregationService = new POIImageAggregationService();
  }

  /**
   * Add POIs to image discovery queue
   */
  async addPOIsToQueue(options = {}) {
    const {
      tiers = [1, 2, 3, 4],
      maxPOIs = 100,
      forceReprocess = false,
      sources = ['flickr', 'unsplash']
    } = options;

    logger.info('Starting POI queue population', {
      tiers,
      maxPOIs,
      forceReprocess
    });

    try {
      // Build tier condition
      const tierConditions = tiers.map(() => '?').join(',');

      // Query to find POIs needing images
      let query = `
        SELECT
          p.id,
          p.name,
          p.tier,
          COUNT(pi.id) AS image_count
        FROM pois p
        LEFT JOIN poi_images pi ON p.id = pi.poi_id AND pi.status = 'approved'
        WHERE p.tier IN (${tierConditions})
          AND p.active = TRUE
          AND p.verified = TRUE
      `;

      // If not forcing reprocess, only get POIs with few/no images
      if (!forceReprocess) {
        query += ' GROUP BY p.id HAVING image_count < 5';
      } else {
        query += ' GROUP BY p.id';
      }

      query += `
        ORDER BY
          p.tier ASC,
          p.poi_score DESC
        LIMIT ${maxPOIs}
      `;

      const [pois] = await mysqlSequelize.query(query, {
        replacements: tiers
      });

      logger.info(`Found ${pois.length} POIs to process`, { tiers });

      // Add each POI to queue
      let added = 0;
      let skipped = 0;

      for (const poi of pois) {
        try {
          // Calculate priority based on tier
          const priority = 11 - poi.tier; // Tier 1 = priority 10, Tier 4 = priority 1

          // Add to queue using stored procedure
          await mysqlSequelize.query(
            `CALL AddPOIToImageQueue(:poi_id, :sources, :max_images)`,
            {
              replacements: {
                poi_id: poi.id,
                sources: JSON.stringify(sources),
                max_images: 10
              }
            }
          );

          added++;

          logger.debug('Added POI to queue', {
            poi_id: poi.id,
            poi_name: poi.name,
            tier: poi.tier,
            priority
          });

        } catch (error) {
          logger.warn('Failed to add POI to queue', {
            poi_id: poi.id,
            error: error.message
          });
          skipped++;
        }
      }

      logger.info('Queue population completed', {
        total_pois: pois.length,
        added,
        skipped
      });

      return { added, skipped, total: pois.length };

    } catch (error) {
      logger.error('Queue population failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Process image queue
   */
  async processQueue(options = {}) {
    const {
      batchSize = 10,
      maxProcessingTime = 300000 // 5 minutes
    } = options;

    logger.info('Starting queue processing', { batchSize, maxProcessingTime });

    const startTime = Date.now();
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      while (Date.now() - startTime < maxProcessingTime) {
        // Get next batch from queue
        const [queueItems] = await mysqlSequelize.query(
          `SELECT * FROM poi_image_queue
           WHERE status = 'pending'
             AND (next_retry_at IS NULL OR next_retry_at <= NOW())
           ORDER BY priority DESC, created_at ASC
           LIMIT :batch_size`,
          {
            replacements: { batch_size: batchSize }
          }
        );

        if (queueItems.length === 0) {
          logger.info('No more items in queue');
          break;
        }

        logger.info(`Processing batch of ${queueItems.length} items`);

        // Process each item
        for (const item of queueItems) {
          try {
            const result = await this.aggregationService.processQueueItem(item);

            if (result.success) {
              successful++;
            } else {
              failed++;
            }

            processed++;

          } catch (error) {
            logger.error('Failed to process queue item', {
              queue_id: item.id,
              error: error.message
            });
            failed++;
            processed++;
          }

          // Check if time limit reached
          if (Date.now() - startTime >= maxProcessingTime) {
            logger.warn('Max processing time reached, stopping');
            break;
          }
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Queue processing completed', {
        processed,
        successful,
        failed,
        duration_ms: duration
      });

      return { processed, successful, failed, duration };

    } catch (error) {
      logger.error('Queue processing failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Discover images for specific POI tiers
   */
  async discoverByTiers(tiers, maxPOIs = 100) {
    logger.info('Starting tier-based image discovery', { tiers, maxPOIs });

    // Add POIs to queue
    const addResult = await this.addPOIsToQueue({
      tiers,
      maxPOIs,
      forceReprocess: false
    });

    // Process queue
    const processResult = await this.processQueue({
      batchSize: 10,
      maxProcessingTime: 600000 // 10 minutes
    });

    return {
      queue: addResult,
      processing: processResult
    };
  }

  /**
   * Daily job for Tier 1 & 2 POIs
   */
  async runDailyJob() {
    logger.info('=== Starting Daily Image Discovery Job ===');

    try {
      const result = await this.discoverByTiers([1, 2], 100);

      logger.info('=== Daily Job Completed ===', result);

      return result;
    } catch (error) {
      logger.error('=== Daily Job Failed ===', { error: error.message });
      throw error;
    }
  }

  /**
   * Weekly job for Tier 3 POIs
   */
  async runWeeklyJob() {
    logger.info('=== Starting Weekly Image Discovery Job ===');

    try {
      const result = await this.discoverByTiers([3], 500);

      logger.info('=== Weekly Job Completed ===', result);

      return result;
    } catch (error) {
      logger.error('=== Weekly Job Failed ===', { error: error.message });
      throw error;
    }
  }

  /**
   * Monthly job for Tier 4 POIs
   */
  async runMonthlyJob() {
    logger.info('=== Starting Monthly Image Discovery Job ===');

    try {
      const result = await this.discoverByTiers([4], 1000);

      logger.info('=== Monthly Job Completed ===', result);

      return result;
    } catch (error) {
      logger.error('=== Monthly Job Failed ===', { error: error.message });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [stats] = await mysqlSequelize.query(`
      SELECT
        status,
        COUNT(*) AS count,
        AVG(priority) AS avg_priority,
        SUM(images_found) AS total_images_found,
        SUM(images_approved) AS total_images_approved
      FROM poi_image_queue
      GROUP BY status
    `);

    return stats;
  }

  /**
   * Clean up old completed queue entries
   */
  async cleanupQueue(daysOld = 30) {
    logger.info('Cleaning up old queue entries', { daysOld });

    await mysqlSequelize.query(
      `CALL CleanupOldQueueEntries(:days)`,
      { replacements: { days: daysOld } }
    );

    logger.info('Queue cleanup completed');
  }
}

export default POIImageDiscoveryJob;

// CLI execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const job = new POIImageDiscoveryJob();

  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  (async () => {
    try {
      switch (command) {
        case 'daily':
          await job.runDailyJob();
          break;

        case 'weekly':
          await job.runWeeklyJob();
          break;

        case 'monthly':
          await job.runMonthlyJob();
          break;

        case 'queue':
          const batchSize = parseInt(args[1]) || 10;
          await job.processQueue({ batchSize });
          break;

        case 'stats':
          const stats = await job.getQueueStats();
          console.log(JSON.stringify(stats, null, 2));
          break;

        case 'cleanup':
          const days = parseInt(args[1]) || 30;
          await job.cleanupQueue(days);
          break;

        default:
          console.log(`
POI Image Discovery Job

Usage:
  node poiImageDiscovery.js <command> [options]

Commands:
  daily              Run daily job (Tier 1 & 2 POIs)
  weekly             Run weekly job (Tier 3 POIs)
  monthly            Run monthly job (Tier 4 POIs)
  queue [batchSize]  Process queue with optional batch size
  stats              Show queue statistics
  cleanup [days]     Clean up queue entries older than X days
  help               Show this help message

Examples:
  node poiImageDiscovery.js daily
  node poiImageDiscovery.js queue 20
  node poiImageDiscovery.js cleanup 30
          `);
      }

      process.exit(0);
    } catch (error) {
      console.error('Job failed:', error.message);
      process.exit(1);
    }
  })();
}
