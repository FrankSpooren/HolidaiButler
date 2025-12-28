/**
 * Image Refresh API Routes
 *
 * Admin endpoints for managing POI image refresh:
 * - GET /api/admin/images/refresh/stats - Get refresh statistics
 * - POST /api/admin/images/refresh/run - Trigger manual refresh job
 * - POST /api/admin/images/refresh/poi/:poiId - Refresh specific POI
 */

import express from 'express';
import poiImageRefreshJob from '../jobs/poiImageRefresh.js';
import apifyService from '../services/apify.js';
import { mysqlSequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/admin/images/refresh/stats
 * Get image refresh statistics and status
 */
router.get('/stats', async (req, res) => {
  try {
    // Get image age statistics
    const [imageStats] = await mysqlSequelize.query(`
      SELECT
        COUNT(DISTINCT iu.poi_id) as total_pois_with_images,
        COUNT(*) as total_images,
        MIN(iu.last_fetched_at) as oldest_image,
        MAX(iu.last_fetched_at) as newest_image,
        SUM(CASE WHEN iu.last_fetched_at IS NULL THEN 1 ELSE 0 END) as images_no_date,
        SUM(CASE WHEN iu.last_fetched_at < DATE_SUB(NOW(), INTERVAL 60 DAY) THEN 1 ELSE 0 END) as images_needing_refresh,
        SUM(CASE WHEN iu.last_fetched_at < DATE_SUB(NOW(), INTERVAL 80 DAY) THEN 1 ELSE 0 END) as images_expiring_soon,
        SUM(CASE WHEN iu.last_fetched_at < DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) as images_likely_expired
      FROM imageurls iu
    `, { type: QueryTypes.SELECT });

    // Get POIs needing refresh
    const poisNeedingRefresh = await poiImageRefreshJob.getPoisNeedingRefresh();

    // Get Apify budget status
    let apifyUsage = null;
    try {
      apifyUsage = await apifyService.getMonthlyUsage();
    } catch (e) {
      logger.warn('Could not get Apify usage', { error: e.message });
    }

    res.json({
      success: true,
      data: {
        images: imageStats,
        pois_needing_refresh: poisNeedingRefresh.length,
        next_refresh_batch: poisNeedingRefresh.slice(0, 10).map(p => ({
          id: p.id,
          name: p.name,
          oldest_image: p.oldest_image
        })),
        apify_budget: apifyUsage,
        config: {
          refresh_threshold_days: 60,
          max_pois_per_run: 50,
          cost_per_poi: '~€0.003'
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get refresh stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/images/refresh/run
 * Trigger manual refresh job
 */
router.post('/run', async (req, res) => {
  try {
    const { maxPois = 10, dryRun = false } = req.body;

    logger.info('Manual image refresh triggered', { maxPois, dryRun });

    if (dryRun) {
      // Just show what would be refreshed
      const pois = await poiImageRefreshJob.getPoisNeedingRefresh();

      return res.json({
        success: true,
        dry_run: true,
        message: `Would refresh ${Math.min(pois.length, maxPois)} POIs`,
        pois: pois.slice(0, maxPois).map(p => ({
          id: p.id,
          name: p.name,
          oldest_image: p.oldest_image
        }))
      });
    }

    // Run the job (async - don't wait)
    poiImageRefreshJob.run()
      .then(result => {
        logger.info('Manual refresh job completed', result);
      })
      .catch(error => {
        logger.error('Manual refresh job failed', { error: error.message });
      });

    res.json({
      success: true,
      message: 'Image refresh job started in background',
      note: 'Check logs for progress'
    });

  } catch (error) {
    logger.error('Failed to start refresh job', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/images/refresh/poi/:poiId
 * Refresh images for a specific POI
 */
router.post('/poi/:poiId', async (req, res) => {
  try {
    const { poiId } = req.params;

    // Get POI details
    const [pois] = await mysqlSequelize.query(`
      SELECT id, name, google_placeid
      FROM POI
      WHERE id = ?
    `, { replacements: [poiId], type: QueryTypes.SELECT });

    if (!pois || pois.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'POI not found'
      });
    }

    const poi = pois[0];

    if (!poi.google_placeid) {
      return res.status(400).json({
        success: false,
        error: 'POI has no Google Place ID'
      });
    }

    // Refresh this POI's images
    const result = await poiImageRefreshJob.refreshPoiImages(poi);

    res.json({
      success: result.success,
      data: {
        poi_id: poi.id,
        poi_name: poi.name,
        ...result
      }
    });

  } catch (error) {
    logger.error('Failed to refresh POI images', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/images/refresh/poi/:poiId/status
 * Get image status for a specific POI
 */
router.get('/poi/:poiId/status', async (req, res) => {
  try {
    const { poiId } = req.params;

    const images = await mysqlSequelize.query(`
      SELECT
        iu.*,
        TIMESTAMPDIFF(DAY, iu.last_fetched_at, NOW()) as days_old,
        CASE
          WHEN iu.last_fetched_at IS NULL THEN 'unknown'
          WHEN iu.last_fetched_at < DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 'expired'
          WHEN iu.last_fetched_at < DATE_SUB(NOW(), INTERVAL 80 DAY) THEN 'expiring_soon'
          WHEN iu.last_fetched_at < DATE_SUB(NOW(), INTERVAL 60 DAY) THEN 'needs_refresh'
          ELSE 'fresh'
        END as status
      FROM imageurls iu
      WHERE iu.poi_id = ?
      ORDER BY iu.image_id
    `, { replacements: [poiId], type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: {
        poi_id: parseInt(poiId),
        image_count: images.length,
        images: images
      }
    });

  } catch (error) {
    logger.error('Failed to get POI image status', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
