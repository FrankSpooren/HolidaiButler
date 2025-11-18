/**
 * POI Image Aggregation Service
 *
 * Combines multiple image sources (Flickr, Unsplash) to find high-quality
 * images for POIs. Includes quality validation, geo-verification, and
 * automatic approval workflow.
 */

import FlickrService from './flickr.js';
import UnsplashService from './unsplash.js';
import { mysqlSequelize } from '../config/database.js';
import winston from 'winston';
import crypto from 'crypto';
import axios from 'axios';

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/poi-image-aggregation.log' })
  ]
});

class POIImageAggregationService {
  constructor() {
    this.flickr = new FlickrService();
    this.unsplash = new UnsplashService();

    // Quality thresholds
    this.MIN_QUALITY_SCORE = 6.0;
    this.AUTO_APPROVE_THRESHOLD = 8.0;
    this.MIN_RESOLUTION_WIDTH = 1280;
    this.MIN_RESOLUTION_HEIGHT = 720;
    this.MAX_GEO_DISTANCE = 500; // meters
  }

  /**
   * Discover images for a POI from all sources
   */
  async discoverImagesForPOI(poi, options = {}) {
    const {
      sources = ['flickr', 'unsplash'],
      maxPerSource = 10,
      minQualityScore = this.MIN_QUALITY_SCORE
    } = options;

    logger.info(`Starting image discovery for POI`, {
      poi_id: poi.id,
      poi_name: poi.name,
      sources
    });

    const discoveries = [];

    // Flickr search
    if (sources.includes('flickr')) {
      discoveries.push(
        this.discoverFromFlickr(poi, maxPerSource).catch(error => {
          logger.error('Flickr discovery failed', { error: error.message });
          return [];
        })
      );
    }

    // Unsplash search
    if (sources.includes('unsplash')) {
      discoveries.push(
        this.discoverFromUnsplash(poi, maxPerSource).catch(error => {
          logger.error('Unsplash discovery failed', { error: error.message });
          return [];
        })
      );
    }

    // Wait for all discoveries
    const results = await Promise.all(discoveries);
    const allImages = results.flat();

    logger.info(`Discovered ${allImages.length} raw images`, {
      poi_id: poi.id,
      flickr: results[0]?.length || 0,
      unsplash: results[1]?.length || 0
    });

    // Validate and score images
    const validatedImages = await this.validateImages(allImages, poi);

    // Filter by quality
    const qualityImages = validatedImages.filter(
      img => img.quality_score >= minQualityScore
    );

    // Sort by quality
    qualityImages.sort((a, b) => b.quality_score - a.quality_score);

    logger.info(`Validated ${qualityImages.length} quality images`, {
      poi_id: poi.id,
      avg_score: this.calculateAverageScore(qualityImages)
    });

    return qualityImages;
  }

  /**
   * Discover images from Flickr
   */
  async discoverFromFlickr(poi, maxResults = 10) {
    try {
      const photos = await this.flickr.searchForPOI(poi, {
        maxResults,
        radiusMeters: 200, // 200m radius
        includeNameSearch: true
      });

      logger.info(`Flickr: Found ${photos.length} photos`, { poi_id: poi.id });

      return photos;
    } catch (error) {
      logger.error('Flickr search failed', {
        poi_id: poi.id,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Discover images from Unsplash
   */
  async discoverFromUnsplash(poi, maxResults = 10) {
    try {
      const photos = await this.unsplash.searchForPOI(poi, {
        maxResults,
        includeCategory: true,
        includeCity: true
      });

      logger.info(`Unsplash: Found ${photos.length} photos`, { poi_id: poi.id });

      return photos;
    } catch (error) {
      logger.error('Unsplash search failed', {
        poi_id: poi.id,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Validate and score images
   */
  async validateImages(images, poi) {
    const validated = [];

    for (const image of images) {
      const validation = await this.validateSingleImage(image, poi);

      if (validation.valid) {
        validated.push({
          ...image,
          ...validation.scores,
          quality_score: validation.qualityScore,
          distance_to_poi: validation.distance,
          geo_accuracy: validation.geoAccuracy
        });
      } else {
        logger.debug('Image rejected', {
          poi_id: poi.id,
          image_id: image.id,
          reason: validation.reason
        });
      }
    }

    return validated;
  }

  /**
   * Validate single image
   */
  async validateSingleImage(image, poi) {
    // Check resolution
    const resolutionScore = this.scoreResolution(image.width, image.height);
    if (resolutionScore < 6) {
      return {
        valid: false,
        reason: 'Resolution too low',
        scores: { resolution_score: resolutionScore }
      };
    }

    // Check geo distance (if available)
    let geoAccuracyScore = 5; // Default medium score if no geo data
    let distance = null;
    let geoAccuracy = 'none';

    if (image.photo_latitude && image.photo_longitude) {
      distance = this.calculateDistance(
        image.photo_latitude,
        image.photo_longitude,
        poi.latitude,
        poi.longitude
      );

      geoAccuracyScore = this.scoreGeoAccuracy(distance);
      geoAccuracy = this.getGeoAccuracyLabel(distance);

      // Reject if too far (unless it's Unsplash which often lacks geo data)
      if (image.source !== 'unsplash' && distance > this.MAX_GEO_DISTANCE) {
        return {
          valid: false,
          reason: `Too far from POI (${Math.round(distance)}m)`,
          scores: { geo_accuracy_score: geoAccuracyScore },
          distance
        };
      }
    }

    // Score tag relevance
    const tagRelevanceScore = this.scoreTagRelevance(image.tags, poi);

    // Score license quality
    const licenseScore = this.scoreLicense(image);

    // Score recency
    const recencyScore = this.scoreRecency(image);

    // Calculate overall quality score
    const qualityScore = this.calculateQualityScore({
      resolutionScore,
      geoAccuracyScore,
      tagRelevanceScore,
      licenseScore,
      recencyScore
    });

    return {
      valid: true,
      qualityScore,
      distance,
      geoAccuracy,
      scores: {
        resolution_score: resolutionScore,
        geo_accuracy_score: geoAccuracyScore,
        tag_relevance_score: tagRelevanceScore,
        license_score: licenseScore,
        recency_score: recencyScore
      }
    };
  }

  /**
   * Score image resolution
   */
  scoreResolution(width, height) {
    if (!width || !height) return 0;

    const pixels = width * height;

    if (pixels >= 3840 * 2160) return 10; // 4K
    if (pixels >= 2560 * 1440) return 9;  // 2K
    if (pixels >= 1920 * 1080) return 8;  // Full HD
    if (pixels >= 1280 * 720) return 6;   // HD
    return 0; // Too low
  }

  /**
   * Score geo accuracy
   */
  scoreGeoAccuracy(distanceMeters) {
    if (distanceMeters === null) return 5; // No geo data = medium score

    if (distanceMeters <= 50) return 10;
    if (distanceMeters <= 100) return 8;
    if (distanceMeters <= 200) return 6;
    if (distanceMeters <= 500) return 3;
    return 0;
  }

  /**
   * Get geo accuracy label
   */
  getGeoAccuracyLabel(distanceMeters) {
    if (distanceMeters === null) return 'none';
    if (distanceMeters <= 50) return 'high';
    if (distanceMeters <= 200) return 'medium';
    if (distanceMeters <= 500) return 'low';
    return 'none';
  }

  /**
   * Score tag relevance
   */
  scoreTagRelevance(imageTags, poi) {
    if (!imageTags || imageTags.length === 0) return 5;

    // Extract POI keywords
    const poiKeywords = this.extractPOIKeywords(poi);

    // Convert to lowercase for comparison
    const lowerTags = imageTags.map(t => t.toLowerCase());
    const lowerKeywords = poiKeywords.map(k => k.toLowerCase());

    // Count matches
    const matches = lowerTags.filter(tag =>
      lowerKeywords.some(keyword => tag.includes(keyword) || keyword.includes(tag))
    ).length;

    // Score based on matches
    return Math.min(10, matches * 2);
  }

  /**
   * Extract keywords from POI
   */
  extractPOIKeywords(poi) {
    const keywords = [];

    // Add name words (filter common words)
    if (poi.name) {
      const nameWords = poi.name.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['the', 'and', 'for', 'with'].includes(word));
      keywords.push(...nameWords);
    }

    // Add category
    if (poi.category) {
      keywords.push(poi.category.toLowerCase());
    }

    // Add city
    if (poi.city) {
      keywords.push(poi.city.toLowerCase());
    }

    return keywords;
  }

  /**
   * Score license quality
   */
  scoreLicense(image) {
    if (!image.commercial_use_allowed) return 0;

    const licenseScores = {
      'CC0': 10,
      'PDM': 10,
      'Public Domain': 10,
      'Unsplash License': 10,
      'CC BY': 9,
      'CC BY-SA': 8,
      'CC BY-ND': 7,
      'CC BY-NC': 5,
      'CC BY-NC-SA': 4,
      'CC BY-NC-ND': 3
    };

    const licenseType = image.license_type || '';

    for (const [key, score] of Object.entries(licenseScores)) {
      if (licenseType.includes(key)) {
        return score;
      }
    }

    return 5; // Default medium score
  }

  /**
   * Score image recency
   */
  scoreRecency(image) {
    const dateField = image.date_taken || image.created_at || image.date_uploaded;

    if (!dateField) return 5; // No date = medium score

    const photoDate = new Date(dateField);
    const now = new Date();
    const ageYears = (now - photoDate) / (1000 * 60 * 60 * 24 * 365);

    if (ageYears < 1) return 10;      // Less than 1 year
    if (ageYears < 2) return 8;       // 1-2 years
    if (ageYears < 5) return 6;       // 2-5 years
    if (ageYears < 10) return 4;      // 5-10 years
    return 2;                          // Older than 10 years
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore(scores) {
    const {
      resolutionScore,
      geoAccuracyScore,
      tagRelevanceScore,
      licenseScore,
      recencyScore
    } = scores;

    // Weighted average
    const weighted =
      resolutionScore * 0.25 +
      geoAccuracyScore * 0.30 +
      tagRelevanceScore * 0.25 +
      licenseScore * 0.10 +
      recencyScore * 0.10;

    return parseFloat(weighted.toFixed(2));
  }

  /**
   * Calculate average score of images
   */
  calculateAverageScore(images) {
    if (images.length === 0) return 0;

    const sum = images.reduce((acc, img) => acc + img.quality_score, 0);
    return (sum / images.length).toFixed(2);
  }

  /**
   * Calculate distance between coordinates (Haversine)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // meters
  }

  /**
   * Save images to database
   */
  async saveImages(images, poiId) {
    const saved = [];
    const errors = [];

    for (const image of images) {
      try {
        // Check for duplicates
        const [existing] = await mysqlSequelize.query(
          `SELECT id FROM poi_images
           WHERE poi_id = :poi_id
           AND source_type = :source_type
           AND source_id = :source_id
           LIMIT 1`,
          {
            replacements: {
              poi_id: poiId,
              source_type: image.source,
              source_id: image.source_id
            }
          }
        );

        if (existing.length > 0) {
          logger.debug('Image already exists, skipping', {
            poi_id: poiId,
            source: image.source,
            source_id: image.source_id
          });
          continue;
        }

        // Generate UUID
        const imageId = crypto.randomUUID();

        // Determine auto-approval
        const autoApprove = image.quality_score >= this.AUTO_APPROVE_THRESHOLD;
        const status = autoApprove ? 'approved' : 'pending';

        // Calculate aspect ratio
        const aspectRatio = image.width && image.height
          ? (image.width / image.height).toFixed(3)
          : null;

        // Prepare tags JSON
        const tagsJson = JSON.stringify(image.tags || []);

        // Insert into database
        await mysqlSequelize.query(
          `INSERT INTO poi_images (
            id, poi_id,
            source_type, source_id, source_url, source_page_url,
            url_original, url_large, url_medium, url_thumbnail,
            width, height, aspect_ratio,
            author_name, author_username, author_url, author_profile_url,
            license_type, license_url,
            attribution_required, commercial_use_allowed,
            photo_latitude, photo_longitude, distance_to_poi, geo_accuracy,
            quality_score, resolution_score, geo_accuracy_score,
            tag_relevance_score, license_score, recency_score,
            status, auto_approved,
            tags, caption, alt_text, title,
            date_taken,
            source_views, source_likes, source_downloads,
            created_at
          ) VALUES (
            :id, :poi_id,
            :source_type, :source_id, :source_url, :source_page_url,
            :url_original, :url_large, :url_medium, :url_thumbnail,
            :width, :height, :aspect_ratio,
            :author_name, :author_username, :author_url, :author_profile_url,
            :license_type, :license_url,
            :attribution_required, :commercial_use_allowed,
            :photo_latitude, :photo_longitude, :distance_to_poi, :geo_accuracy,
            :quality_score, :resolution_score, :geo_accuracy_score,
            :tag_relevance_score, :license_score, :recency_score,
            :status, :auto_approved,
            :tags, :caption, :alt_text, :title,
            :date_taken,
            :source_views, :source_likes, :source_downloads,
            NOW()
          )`,
          {
            replacements: {
              id: imageId,
              poi_id: poiId,
              source_type: image.source,
              source_id: image.source_id,
              source_url: image.source_url,
              source_page_url: image.author_url,
              url_original: image.url_original || null,
              url_large: image.url_large,
              url_medium: image.url_medium || image.url_small || null,
              url_thumbnail: image.url_thumbnail,
              width: image.width,
              height: image.height,
              aspect_ratio: aspectRatio,
              author_name: image.author_name,
              author_username: image.author_username,
              author_url: image.author_url,
              author_profile_url: image.author_profile_url || image.author_url,
              license_type: image.license_type,
              license_url: image.license_url || null,
              attribution_required: image.attribution_required !== false,
              commercial_use_allowed: image.commercial_use_allowed === true,
              photo_latitude: image.photo_latitude,
              photo_longitude: image.photo_longitude,
              distance_to_poi: image.distance_to_poi,
              geo_accuracy: image.geo_accuracy || 'none',
              quality_score: image.quality_score,
              resolution_score: image.resolution_score,
              geo_accuracy_score: image.geo_accuracy_score,
              tag_relevance_score: image.tag_relevance_score,
              license_score: image.license_score,
              recency_score: image.recency_score,
              status,
              auto_approved: autoApprove,
              tags: tagsJson,
              caption: image.description || image.caption || null,
              alt_text: image.alt_text || image.title || null,
              title: image.title || null,
              date_taken: image.date_taken || image.created_at || null,
              source_views: image.views || 0,
              source_likes: image.likes || 0,
              source_downloads: image.downloads || 0
            }
          }
        );

        // Log moderation if auto-approved
        if (autoApprove) {
          await this.logModeration(imageId, poiId, 'approve', null, true, image.quality_score);
        }

        saved.push({
          id: imageId,
          source: image.source,
          quality_score: image.quality_score,
          status,
          auto_approved: autoApprove
        });

        logger.info('Image saved', {
          poi_id: poiId,
          image_id: imageId,
          source: image.source,
          quality_score: image.quality_score,
          auto_approved: autoApprove
        });

      } catch (error) {
        logger.error('Failed to save image', {
          poi_id: poiId,
          source: image.source,
          error: error.message
        });
        errors.push({ image, error: error.message });
      }
    }

    return { saved, errors };
  }

  /**
   * Log moderation action
   */
  async logModeration(imageId, poiId, action, moderatorId = null, isAutomated = false, qualityScore = null) {
    const logId = crypto.randomUUID();

    await mysqlSequelize.query(
      `INSERT INTO poi_image_moderation_log (
        id, poi_image_id, poi_id,
        action, new_status,
        moderator_id, is_automated,
        quality_score_at_decision,
        created_at
      ) VALUES (
        :id, :poi_image_id, :poi_id,
        :action, :new_status,
        :moderator_id, :is_automated,
        :quality_score,
        NOW()
      )`,
      {
        replacements: {
          id: logId,
          poi_image_id: imageId,
          poi_id: poiId,
          action,
          new_status: action === 'approve' ? 'approved' : 'rejected',
          moderator_id: moderatorId,
          is_automated: isAutomated,
          quality_score: qualityScore
        }
      }
    );
  }

  /**
   * Process POI from queue
   */
  async processQueueItem(queueItem) {
    const startTime = Date.now();

    try {
      // Update status to processing
      await mysqlSequelize.query(
        `UPDATE poi_image_queue
         SET status = 'processing', started_at = NOW()
         WHERE id = :id`,
        { replacements: { id: queueItem.id } }
      );

      // Get POI details
      const [poiRows] = await mysqlSequelize.query(
        `SELECT * FROM pois WHERE id = :poi_id LIMIT 1`,
        { replacements: { poi_id: queueItem.poi_id } }
      );

      if (poiRows.length === 0) {
        throw new Error('POI not found');
      }

      const poi = poiRows[0];

      // Discover images
      const sources = JSON.parse(queueItem.sources_to_check || '["flickr", "unsplash"]');
      const images = await this.discoverImagesForPOI(poi, {
        sources,
        maxPerSource: queueItem.max_images_per_source || 10,
        minQualityScore: queueItem.min_quality_score || 6.0
      });

      // Save images
      const { saved, errors } = await this.saveImages(images, poi.id);

      // Count by status
      const approved = saved.filter(img => img.status === 'approved').length;
      const pending = saved.filter(img => img.status === 'pending').length;

      // Update queue item
      await mysqlSequelize.query(
        `UPDATE poi_image_queue SET
          status = 'completed',
          completed_at = NOW(),
          images_found = :images_found,
          images_approved = :images_approved,
          images_pending = :images_pending,
          images_rejected = :images_rejected
         WHERE id = :id`,
        {
          replacements: {
            id: queueItem.id,
            images_found: images.length,
            images_approved: approved,
            images_pending: pending,
            images_rejected: errors.length
          }
        }
      );

      const duration = Date.now() - startTime;

      logger.info('Queue item processed successfully', {
        queue_id: queueItem.id,
        poi_id: poi.id,
        images_found: images.length,
        images_saved: saved.length,
        auto_approved: approved,
        duration_ms: duration
      });

      return { success: true, saved, errors };

    } catch (error) {
      // Update queue with error
      const attempts = queueItem.attempts + 1;
      const maxAttempts = queueItem.max_attempts || 3;
      const nextStatus = attempts >= maxAttempts ? 'failed' : 'pending';
      const nextRetry = attempts < maxAttempts
        ? new Date(Date.now() + Math.pow(2, attempts) * 60000) // Exponential backoff
        : null;

      await mysqlSequelize.query(
        `UPDATE poi_image_queue SET
          status = :status,
          attempts = :attempts,
          last_error = :error,
          next_retry_at = :next_retry
         WHERE id = :id`,
        {
          replacements: {
            id: queueItem.id,
            status: nextStatus,
            attempts,
            error: error.message,
            next_retry: nextRetry
          }
        }
      );

      logger.error('Queue item processing failed', {
        queue_id: queueItem.id,
        poi_id: queueItem.poi_id,
        attempts,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }
}

export default POIImageAggregationService;
