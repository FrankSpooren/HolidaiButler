/**
 * POI Images API Routes
 *
 * Admin endpoints for managing POI images
 */

import express from 'express';
import POIImageAggregationService from '../services/poiImageAggregation.js';
import POIImageDiscoveryJob from '../jobs/poiImageDiscovery.js';
import FlickrService from '../services/flickr.js';
import UnsplashService from '../services/unsplash.js';
import { mysqlSequelize } from '../config/database.js';
import winston from 'winston';

const router = express.Router();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Services
const aggregationService = new POIImageAggregationService();
const discoveryJob = new POIImageDiscoveryJob();
const flickrService = new FlickrService();
const unsplashService = new UnsplashService();

/**
 * GET /api/poi-images/poi/:poiId
 * Get all images for a POI
 */
router.get('/poi/:poiId', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let whereClause = 'poi_id = :poi_id';
    const replacements = { poi_id: poiId, limit: parseInt(limit), offset: parseInt(offset) };

    if (status) {
      whereClause += ' AND status = :status';
      replacements.status = status;
    }

    const [images] = await mysqlSequelize.query(
      `SELECT * FROM poi_images
       WHERE ${whereClause}
       ORDER BY quality_score DESC, created_at DESC
       LIMIT :limit OFFSET :offset`,
      { replacements }
    );

    const [countResult] = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM poi_images WHERE ${whereClause}`,
      { replacements: { poi_id: poiId, status: replacements.status } }
    );

    res.json({
      success: true,
      data: images,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Failed to get POI images', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/poi-images/:id
 * Get single image details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [images] = await mysqlSequelize.query(
      `SELECT * FROM poi_images WHERE id = :id LIMIT 1`,
      { replacements: { id } }
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    res.json({
      success: true,
      data: images[0]
    });

  } catch (error) {
    logger.error('Failed to get image', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/poi-images/pending
 * Get images pending manual review
 */
router.get('/pending', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const [images] = await mysqlSequelize.query(
      `SELECT
         pi.*,
         p.name as poi_name,
         p.category as poi_category,
         p.city as poi_city
       FROM poi_images pi
       JOIN pois p ON pi.poi_id = p.id
       WHERE pi.status = 'pending'
       ORDER BY pi.quality_score DESC, pi.created_at DESC
       LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    );

    const [countResult] = await mysqlSequelize.query(
      `SELECT COUNT(*) as total FROM poi_images WHERE status = 'pending'`
    );

    res.json({
      success: true,
      data: images,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Failed to get pending images', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/poi-images/:id/approve
 * Approve an image
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { moderatorId, setPrimary = false } = req.body;

    // Get image and POI info
    const [images] = await mysqlSequelize.query(
      `SELECT * FROM poi_images WHERE id = :id LIMIT 1`,
      { replacements: { id } }
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    const image = images[0];

    if (setPrimary) {
      // Use stored procedure to set primary
      await mysqlSequelize.query(
        `CALL SetPrimaryImage(:image_id, :moderator_id)`,
        {
          replacements: {
            image_id: id,
            moderator_id: moderatorId || null
          }
        }
      );
    } else {
      // Just approve
      await mysqlSequelize.query(
        `UPDATE poi_images SET
          status = 'approved',
          verified_by = :moderator_id,
          verified_at = NOW()
         WHERE id = :id`,
        {
          replacements: {
            id,
            moderator_id: moderatorId || null
          }
        }
      );

      // Log moderation
      await aggregationService.logModeration(
        id,
        image.poi_id,
        'approve',
        moderatorId,
        false,
        image.quality_score
      );
    }

    res.json({
      success: true,
      message: 'Image approved successfully'
    });

  } catch (error) {
    logger.error('Failed to approve image', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/poi-images/:id/reject
 * Reject an image
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { moderatorId, reason } = req.body;

    // Get image info
    const [images] = await mysqlSequelize.query(
      `SELECT * FROM poi_images WHERE id = :id LIMIT 1`,
      { replacements: { id } }
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    const image = images[0];

    // Reject image
    await mysqlSequelize.query(
      `UPDATE poi_images SET
        status = 'rejected',
        rejection_reason = :reason,
        verified_by = :moderator_id,
        verified_at = NOW()
       WHERE id = :id`,
      {
        replacements: {
          id,
          reason: reason || 'Rejected by moderator',
          moderator_id: moderatorId || null
        }
      }
    );

    // Log moderation
    await aggregationService.logModeration(
      id,
      image.poi_id,
      'reject',
      moderatorId,
      false,
      image.quality_score
    );

    res.json({
      success: true,
      message: 'Image rejected successfully'
    });

  } catch (error) {
    logger.error('Failed to reject image', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/poi-images/:id/set-primary
 * Set image as primary for POI
 */
router.post('/:id/set-primary', async (req, res) => {
  try {
    const { id } = req.params;
    const { moderatorId } = req.body;

    await mysqlSequelize.query(
      `CALL SetPrimaryImage(:image_id, :moderator_id)`,
      {
        replacements: {
          image_id: id,
          moderator_id: moderatorId || null
        }
      }
    );

    res.json({
      success: true,
      message: 'Image set as primary successfully'
    });

  } catch (error) {
    logger.error('Failed to set primary image', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/poi-images/discover/:poiId
 * Trigger image discovery for a specific POI
 */
router.post('/discover/:poiId', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { sources = ['flickr', 'unsplash'], maxImages = 10 } = req.body;

    // Get POI
    const [pois] = await mysqlSequelize.query(
      `SELECT * FROM pois WHERE id = :poi_id LIMIT 1`,
      { replacements: { poi_id: poiId } }
    );

    if (pois.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'POI not found'
      });
    }

    const poi = pois[0];

    // Discover images
    const images = await aggregationService.discoverImagesForPOI(poi, {
      sources,
      maxPerSource: maxImages
    });

    // Save images
    const { saved, errors } = await aggregationService.saveImages(images, poi.id);

    res.json({
      success: true,
      data: {
        discovered: images.length,
        saved: saved.length,
        errors: errors.length,
        images: saved
      }
    });

  } catch (error) {
    logger.error('Failed to discover images', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/poi-images/stats/overview
 * Get overall statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const [stats] = await mysqlSequelize.query(`
      SELECT
        COUNT(*) as total_images,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN is_primary = TRUE THEN 1 ELSE 0 END) as primary_images,
        AVG(quality_score) as avg_quality_score,
        SUM(CASE WHEN source_type = 'flickr' THEN 1 ELSE 0 END) as flickr_count,
        SUM(CASE WHEN source_type = 'unsplash' THEN 1 ELSE 0 END) as unsplash_count,
        SUM(CASE WHEN auto_approved = TRUE THEN 1 ELSE 0 END) as auto_approved_count
      FROM poi_images
    `);

    const [poiStats] = await mysqlSequelize.query(`
      SELECT
        COUNT(DISTINCT poi_id) as pois_with_images,
        (SELECT COUNT(*) FROM pois WHERE active = TRUE) as total_active_pois
      FROM poi_images
      WHERE status = 'approved'
    `);

    const [queueStats] = await mysqlSequelize.query(`
      SELECT * FROM poi_image_queue_status
    `);

    res.json({
      success: true,
      data: {
        images: stats[0],
        pois: poiStats[0],
        queue: queueStats
      }
    });

  } catch (error) {
    logger.error('Failed to get stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/poi-images/stats/sources
 * Get source API rate limit status
 */
router.get('/stats/sources', async (req, res) => {
  try {
    const flickrStatus = flickrService.getRateLimitStatus();
    const unsplashStatus = unsplashService.getRateLimitStatus();

    const [dbSources] = await mysqlSequelize.query(`
      SELECT * FROM poi_image_sources
      ORDER BY enabled DESC, source_name ASC
    `);

    res.json({
      success: true,
      data: {
        rateLimits: {
          flickr: flickrStatus,
          unsplash: unsplashStatus
        },
        sources: dbSources
      }
    });

  } catch (error) {
    logger.error('Failed to get source stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/poi-images/queue/add
 * Add POIs to discovery queue
 */
router.post('/queue/add', async (req, res) => {
  try {
    const { tiers = [1, 2, 3, 4], maxPOIs = 100, forceReprocess = false } = req.body;

    const result = await discoveryJob.addPOIsToQueue({
      tiers,
      maxPOIs,
      forceReprocess
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to add to queue', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/poi-images/queue/process
 * Process discovery queue
 */
router.post('/queue/process', async (req, res) => {
  try {
    const { batchSize = 10, maxProcessingTime = 300000 } = req.body;

    // Run async (don't wait)
    discoveryJob.processQueue({ batchSize, maxProcessingTime })
      .then(result => {
        logger.info('Queue processing completed', result);
      })
      .catch(error => {
        logger.error('Queue processing failed', { error: error.message });
      });

    res.json({
      success: true,
      message: 'Queue processing started in background'
    });

  } catch (error) {
    logger.error('Failed to start queue processing', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/poi-images/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', async (req, res) => {
  try {
    const stats = await discoveryJob.getQueueStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get queue stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/poi-images/:id
 * Delete an image
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await mysqlSequelize.query(
      `DELETE FROM poi_images WHERE id = :id`,
      { replacements: { id } }
    );

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete image', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
