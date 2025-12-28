/**
 * POI Image Refresh Job
 *
 * Proactively refreshes Google Places images before they expire.
 * Google Places photo URLs expire after ~90 days. This job:
 * 1. Identifies POIs with images older than 60 days
 * 2. Fetches fresh images via Apify Google Maps Scraper
 * 3. Updates the imageurls table with new URLs
 *
 * Run weekly via cron: 0 3 * * 0 (Sunday 3 AM)
 */

import { mysqlSequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import apifyService from '../services/apify.js';
import logger from '../utils/logger.js';

class POIImageRefreshJob {
  constructor() {
    // Refresh images older than this many days (before 90 day expiration)
    this.refreshThresholdDays = parseInt(process.env.IMAGE_REFRESH_DAYS || '60');

    // Max POIs to refresh per run (budget control)
    this.maxPoisPerRun = parseInt(process.env.IMAGE_REFRESH_BATCH_SIZE || '50');

    // Cost estimate per POI (Apify compute units)
    this.costPerPoi = 0.003; // ~€0.003 per POI
  }

  /**
   * Get POIs that need image refresh
   */
  async getPoisNeedingRefresh() {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - this.refreshThresholdDays);

    // Find POIs with old images
    const pois = await mysqlSequelize.query(`
      SELECT DISTINCT
        p.id,
        p.name,
        p.google_placeid,
        MIN(iu.last_fetched_at) as oldest_image
      FROM POI p
      JOIN imageurls iu ON iu.poi_id = p.id
      WHERE
        p.google_placeid IS NOT NULL
        AND p.is_active = 1
        AND (
          iu.last_fetched_at IS NULL
          OR iu.last_fetched_at < :threshold
        )
      GROUP BY p.id
      ORDER BY oldest_image ASC
      LIMIT :limit
    `, {
      replacements: {
        threshold: thresholdDate.toISOString(),
        limit: this.maxPoisPerRun
      },
      type: QueryTypes.SELECT
    });

    return pois;
  }

  /**
   * Fetch fresh images for a POI via Apify
   */
  async refreshPoiImages(poi) {
    logger.info('Refreshing images for POI', {
      poi_id: poi.id,
      poi_name: poi.name,
      google_place_id: poi.google_placeid
    });

    try {
      // Search for the POI on Google Places
      const searchQuery = `${poi.name} Calpe Spain`;

      const results = await apifyService.scrapeGooglePlaces(searchQuery, {
        maxResults: 1,
        poiId: poi.id,
        triggeredBy: 'image_refresh_job',
        additionalParams: {
          maxImages: 10, // Fetch up to 10 images
          includeImages: true
        }
      });

      if (!results || results.length === 0) {
        logger.warn('No results from Apify for POI', { poi_id: poi.id });
        return { success: false, reason: 'no_results' };
      }

      const placeData = results[0];
      const imageUrls = placeData.imageUrls || placeData.images || [];

      if (imageUrls.length === 0) {
        logger.warn('No images in Apify response', { poi_id: poi.id });
        return { success: false, reason: 'no_images' };
      }

      // Delete old images
      await mysqlSequelize.query(
        `DELETE FROM imageurls WHERE poi_id = ?`,
        { replacements: [poi.id] }
      );

      // Insert new images
      for (let i = 0; i < imageUrls.length; i++) {
        const url = typeof imageUrls[i] === 'string' ? imageUrls[i] : imageUrls[i].url;

        await mysqlSequelize.query(`
          INSERT INTO imageurls (poi_id, image_id, image_url, last_fetched_at, source, google_place_id)
          VALUES (?, ?, ?, NOW(), 'google_places', ?)
        `, {
          replacements: [poi.id, i + 1, url, poi.google_placeid]
        });
      }

      logger.info('Successfully refreshed images for POI', {
        poi_id: poi.id,
        poi_name: poi.name,
        image_count: imageUrls.length
      });

      return {
        success: true,
        images_added: imageUrls.length
      };

    } catch (error) {
      logger.error('Failed to refresh POI images', {
        poi_id: poi.id,
        error: error.message
      });

      return {
        success: false,
        reason: 'error',
        error: error.message
      };
    }
  }

  /**
   * Run the refresh job
   */
  async run() {
    logger.info('=== POI Image Refresh Job Started ===');
    const startTime = Date.now();

    const stats = {
      pois_checked: 0,
      pois_refreshed: 0,
      pois_failed: 0,
      images_added: 0,
      estimated_cost: 0
    };

    try {
      // Check budget first
      const usage = await apifyService.getMonthlyUsage();
      logger.info('Current Apify usage', {
        spent: usage.spent,
        remaining: usage.remaining,
        percentage: usage.percentage.toFixed(1) + '%'
      });

      if (usage.remaining < 5) {
        logger.warn('Insufficient budget for image refresh');
        return { success: false, reason: 'budget_exceeded', stats };
      }

      // Get POIs needing refresh
      const pois = await this.getPoisNeedingRefresh();
      stats.pois_checked = pois.length;

      logger.info(`Found ${pois.length} POIs needing image refresh`);

      if (pois.length === 0) {
        logger.info('No POIs need image refresh');
        return { success: true, stats };
      }

      // Process each POI
      for (const poi of pois) {
        // Check budget before each POI
        const currentUsage = await apifyService.getMonthlyUsage();
        if (currentUsage.remaining < 2) {
          logger.warn('Stopping: budget running low');
          break;
        }

        const result = await this.refreshPoiImages(poi);

        if (result.success) {
          stats.pois_refreshed++;
          stats.images_added += result.images_added;
          stats.estimated_cost += this.costPerPoi;
        } else {
          stats.pois_failed++;
        }

        // Rate limiting: wait between requests
        await new Promise(r => setTimeout(r, 2000));
      }

      const duration = Math.floor((Date.now() - startTime) / 1000);

      logger.info('=== POI Image Refresh Job Completed ===', {
        duration_seconds: duration,
        ...stats
      });

      return { success: true, duration, stats };

    } catch (error) {
      logger.error('POI Image Refresh Job failed', { error: error.message });
      return { success: false, error: error.message, stats };
    }
  }

  /**
   * Get job status/stats
   */
  async getStats() {
    const [stats] = await mysqlSequelize.query(`
      SELECT
        COUNT(DISTINCT iu.poi_id) as total_pois_with_images,
        COUNT(*) as total_images,
        MIN(iu.last_fetched_at) as oldest_image,
        MAX(iu.last_fetched_at) as newest_image,
        SUM(CASE WHEN iu.last_fetched_at < DATE_SUB(NOW(), INTERVAL 60 DAY) THEN 1 ELSE 0 END) as images_needing_refresh,
        SUM(CASE WHEN iu.last_fetched_at < DATE_SUB(NOW(), INTERVAL 80 DAY) THEN 1 ELSE 0 END) as images_expiring_soon
      FROM imageurls iu
    `, { type: QueryTypes.SELECT });

    return stats;
  }
}

// Export singleton
const poiImageRefreshJob = new POIImageRefreshJob();
export default poiImageRefreshJob;

// CLI runner
if (process.argv[1].includes('poiImageRefresh')) {
  poiImageRefreshJob.run()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}
