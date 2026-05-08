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
let aggregationService; try { aggregationService = new POIImageAggregationService(); } catch(e) { console.warn("[poiImages] POIImageAggregationService init skipped:", e.message); }
let discoveryJob; try { discoveryJob = new POIImageDiscoveryJob(); } catch(e) { console.warn("[poiImages] POIImageDiscoveryJob init skipped:", e.message); }
let flickrService; try { flickrService = new FlickrService(); } catch(e) { console.warn("[poiImages] FlickrService init skipped:", e.message); }
let unsplashService; try { unsplashService = new UnsplashService(); } catch(e) { console.warn("[poiImages] UnsplashService init skipped:", e.message); }

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
 * GET /api/poi-images/pending
 * Get all pending images for moderation
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
       JOIN POI p ON pi.poi_id = p.id
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

    // Mark as approved in poi_images
    await mysqlSequelize.query(
      `UPDATE poi_images SET
        status = :status,
        verified_by = :moderator_id,
        verified_at = NOW()
       WHERE id = :id`,
      {
        replacements: {
          id,
          status: setPrimary ? 'primary' : 'approved',
          moderator_id: moderatorId || null
        }
      }
    );

    // Copy approved image to imageurls (live) if not already there
    const [existingLive] = await mysqlSequelize.query(
      'SELECT id FROM imageurls WHERE poi_id = :poi_id AND image_url = :url LIMIT 1',
      { replacements: { poi_id: image.poi_id, url: image.image_url } }
    );

    if (existingLive.length === 0) {
      // Get next image_id and display_order for this POI
      const [maxes] = await mysqlSequelize.query(
        'SELECT COALESCE(MAX(image_id), 0) as max_id, COUNT(*) as cnt FROM imageurls WHERE poi_id = :poi_id',
        { replacements: { poi_id: image.poi_id } }
      );
      const nextId = (maxes[0]?.max_id || 0) + 1;
      const nextOrder = (maxes[0]?.cnt || 0) + 1;

      await mysqlSequelize.query(`
        INSERT INTO imageurls (poi_id, image_id, image_url, local_path, source, file_size, display_order, downloaded_at, keywords_verified)
        VALUES (:poi_id, :image_id, :url, :local_path, 'apify_refresh', :file_size, :display_order, NOW(), :keywords)
      `, {
        replacements: {
          poi_id: image.poi_id,
          image_id: nextId,
          url: image.image_url,
          local_path: image.local_path,
          file_size: image.file_size || null,
          display_order: nextOrder,
          keywords: image.tags || null
        }
      });
    }

    if (setPrimary) {
      // Set as primary in imageurls too
      await mysqlSequelize.query(
        'UPDATE imageurls SET is_primary = 0 WHERE poi_id = :poi_id',
        { replacements: { poi_id: image.poi_id } }
      );
      await mysqlSequelize.query(
        'UPDATE imageurls SET is_primary = 1 WHERE poi_id = :poi_id AND image_url = :url',
        { replacements: { poi_id: image.poi_id, url: image.image_url } }
      );
    }

    res.json({
      success: true,
      message: setPrimary ? 'Image approved + set as primary' : 'Image approved and live'
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

    // Log moderation (optional — aggregationService may not be initialized)
    if (aggregationService?.logModeration) {
      await aggregationService.logModeration(id, image.poi_id, 'reject', moderatorId, false, image.quality_score);
    }

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
    if (!aggregationService) {
      return res.status(503).json({ success: false, error: 'Image discovery service not available' });
    }
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
