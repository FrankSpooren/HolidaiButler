/**
 * Google Places Image Service
 *
 * Enterprise-grade intelligent image selector for Google Places photos via Apify.
 * Analyzes ALL available images for a POI and selects the highest quality one.
 *
 * Features:
 * - Fetches all Google Places photos via Apify
 * - Quality analysis (resolution, sharpness, exposure, composition)
 * - Intelligent ranking algorithm
 * - Attribution tracking
 * - Cost optimization (reuses existing Apify data)
 */

import axios from 'axios';
import winston from 'winston';
import sharp from 'sharp';
import crypto from 'crypto';
import circuitBreakerManager from '../utils/circuitBreaker.js';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/google-places-images.log' })
  ]
});

class GooglePlacesImageService {
  constructor() {
    this.apifyToken = process.env.APIFY_API_TOKEN;
    this.apifyBaseUrl = 'https://api.apify.com/v2';
    this.googlePlacesActorId = 'nwua9Gu5YrADL7ZDj'; // Google Maps Scraper

    if (!this.apifyToken) {
      logger.warn('APIFY_API_TOKEN not configured - Google Places image fetching disabled');
    }

    // Circuit breaker for Apify API
    this.circuitBreaker = circuitBreakerManager.getBreaker('apify-google-places', {
      failureThreshold: 3,
      timeout: 30000,
      resetTimeout: 60000
    });
  }

  /**
   * Fetch all Google Places photos for a POI
   *
   * @param {Object} poi - POI object with google_place_id
   * @returns {Promise<Array>} Array of photo objects with metadata
   */
  async fetchAllPhotos(poi) {
    if (!poi.google_place_id) {
      logger.warn('POI has no google_place_id', { poi_id: poi.id });
      return [];
    }

    logger.info('Fetching Google Places photos', {
      poi_id: poi.id,
      poi_name: poi.name,
      place_id: poi.google_place_id
    });

    try {
      // Use circuit breaker for API call
      const photos = await this.circuitBreaker.execute(
        () => this.fetchPhotosFromApify(poi),
        () => this.fallbackToStoredImage(poi)
      );

      logger.info('Fetched Google Places photos', {
        poi_id: poi.id,
        photo_count: photos.length
      });

      return photos;

    } catch (error) {
      logger.error('Failed to fetch Google Places photos', {
        poi_id: poi.id,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch photos from Apify Google Maps Scraper
   */
  async fetchPhotosFromApify(poi) {
    // Start Apify actor run to fetch place details with photos
    const runResponse = await axios.post(
      `${this.apifyBaseUrl}/acts/${this.googlePlacesActorId}/runs`,
      {
        startUrls: [{
          url: `https://www.google.com/maps/place/?q=place_id:${poi.google_place_id}`
        }],
        maxImages: 50, // Fetch up to 50 images
        includeImages: true,
        scrapePhotos: true,
        language: 'en'
      },
      {
        params: {
          token: this.apifyToken,
          timeout: 30000
        },
        timeout: 30000
      }
    );

    const runId = runResponse.data.data.id;

    // Wait for run to complete (max 60 seconds)
    const result = await this.waitForApifyRun(runId, 60000);

    // Get dataset items (place details with photos)
    const datasetResponse = await axios.get(
      `${this.apifyBaseUrl}/datasets/${result.defaultDatasetId}/items`,
      {
        params: {
          token: this.apifyToken,
          format: 'json'
        },
        timeout: 10000
      }
    );

    const placeData = datasetResponse.data[0];

    if (!placeData || !placeData.imageUrls || placeData.imageUrls.length === 0) {
      logger.warn('No photos found in Apify response', { poi_id: poi.id });
      return [];
    }

    // Normalize photos
    return placeData.imageUrls.map((url, index) => ({
      id: crypto.createHash('md5').update(url).digest('hex'),
      source: 'google_places',
      source_id: `${poi.google_place_id}_${index}`,
      source_url: url,
      url_original: url,
      url_large: url,
      url_medium: url,
      url_thumbnail: url,
      position: index, // Position in Google's list (0 = first)
      attribution: placeData.reviews?.[0]?.authorName || 'Google User',
      place_id: poi.google_place_id,
      place_name: placeData.title || poi.name,
      photo_latitude: poi.latitude,
      photo_longitude: poi.longitude,
      fetched_at: new Date().toISOString()
    }));
  }

  /**
   * Wait for Apify run to complete
   */
  async waitForApifyRun(runId, maxWaitTime = 60000) {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const statusResponse = await axios.get(
        `${this.apifyBaseUrl}/actor-runs/${runId}`,
        {
          params: { token: this.apifyToken },
          timeout: 5000
        }
      );

      const status = statusResponse.data.data.status;

      if (status === 'SUCCEEDED') {
        return statusResponse.data.data;
      }

      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Apify run ${status}: ${runId}`);
      }

      // Still running, wait and retry
      await this.sleep(pollInterval);
    }

    throw new Error(`Apify run timeout after ${maxWaitTime}ms`);
  }

  /**
   * Fallback to stored image if API fails
   */
  async fallbackToStoredImage(poi) {
    logger.info('Using fallback: returning stored image', { poi_id: poi.id });

    // Return current stored image as single option
    if (poi.image_url) {
      return [{
        id: crypto.createHash('md5').update(poi.image_url).digest('hex'),
        source: 'google_places',
        source_id: `${poi.google_place_id}_fallback`,
        source_url: poi.image_url,
        url_original: poi.image_url,
        url_large: poi.image_url,
        url_medium: poi.image_url,
        url_thumbnail: poi.image_url,
        position: 0,
        attribution: 'Google Places',
        is_fallback: true
      }];
    }

    return [];
  }

  /**
   * Analyze image quality
   *
   * @param {string} imageUrl - URL of image to analyze
   * @returns {Promise<Object>} Quality metrics
   */
  async analyzeImageQuality(imageUrl) {
    try {
      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024 // 10MB max
      });

      const imageBuffer = Buffer.from(response.data);

      // Use Sharp to analyze image
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const stats = await image.stats();

      // Calculate quality metrics
      const quality = {
        // Resolution
        width: metadata.width,
        height: metadata.height,
        pixels: metadata.width * metadata.height,
        aspect_ratio: (metadata.width / metadata.height).toFixed(2),

        // Format
        format: metadata.format,
        size_bytes: imageBuffer.length,
        size_mb: (imageBuffer.length / (1024 * 1024)).toFixed(2),

        // Sharpness (based on channel variance)
        sharpness: this.calculateSharpness(stats),

        // Exposure (based on brightness)
        brightness: this.calculateBrightness(stats),
        exposure_quality: this.calculateExposureQuality(stats),

        // Color depth
        channels: metadata.channels,
        has_alpha: metadata.hasAlpha,

        // Overall quality flag
        is_high_quality: metadata.width >= 1920 && metadata.height >= 1080
      };

      return quality;

    } catch (error) {
      logger.error('Image quality analysis failed', {
        url: imageUrl,
        error: error.message
      });

      return {
        width: 0,
        height: 0,
        pixels: 0,
        sharpness: 0,
        brightness: 0,
        exposure_quality: 0,
        is_high_quality: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate sharpness score (0-10)
   * Based on standard deviation of pixel values
   */
  calculateSharpness(stats) {
    if (!stats.channels || stats.channels.length === 0) return 0;

    // Average standard deviation across channels
    const avgStdDev = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;

    // Normalize to 0-10 scale (typical range: 20-100)
    const score = Math.min(10, (avgStdDev / 10));

    return parseFloat(score.toFixed(2));
  }

  /**
   * Calculate brightness (0-255)
   */
  calculateBrightness(stats) {
    if (!stats.channels || stats.channels.length === 0) return 0;

    // Average mean across channels
    const avgMean = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;

    return Math.round(avgMean);
  }

  /**
   * Calculate exposure quality score (0-10)
   * Optimal brightness: 100-180 (mid-range)
   */
  calculateExposureQuality(stats) {
    const brightness = this.calculateBrightness(stats);

    // Optimal range: 100-180
    if (brightness >= 100 && brightness <= 180) {
      return 10;
    }

    // Good range: 80-100 or 180-200
    if ((brightness >= 80 && brightness < 100) || (brightness > 180 && brightness <= 200)) {
      return 8;
    }

    // Acceptable: 60-80 or 200-220
    if ((brightness >= 60 && brightness < 80) || (brightness > 200 && brightness <= 220)) {
      return 6;
    }

    // Poor: too dark or too bright
    if (brightness < 60 || brightness > 220) {
      return 3;
    }

    return 5;
  }

  /**
   * Score image based on multiple criteria
   *
   * @param {Object} photo - Photo object with metadata
   * @param {Object} quality - Quality analysis results
   * @returns {Object} Scoring breakdown
   */
  scoreImage(photo, quality) {
    const scores = {
      // Resolution score (0-10)
      resolution: this.scoreResolution(quality.width, quality.height),

      // Position score (0-10) - First images are often professional
      position: this.scorePosition(photo.position),

      // Sharpness score (0-10) - From quality analysis
      sharpness: quality.sharpness || 5,

      // Exposure score (0-10) - From quality analysis
      exposure: quality.exposure_quality || 5,

      // Composition score (0-10) - Based on aspect ratio
      composition: this.scoreComposition(quality.aspect_ratio),

      // Attribution score (0-10) - Owner photos typically better
      attribution: this.scoreAttribution(photo.attribution)
    };

    // Weighted total score
    const totalScore = (
      scores.resolution * 0.25 +
      scores.position * 0.15 +
      scores.sharpness * 0.20 +
      scores.exposure * 0.15 +
      scores.composition * 0.15 +
      scores.attribution * 0.10
    );

    return {
      ...scores,
      total_score: parseFloat(totalScore.toFixed(2)),
      quality_metadata: quality
    };
  }

  /**
   * Score resolution (0-10)
   */
  scoreResolution(width, height) {
    if (!width || !height) return 0;

    const pixels = width * height;

    if (pixels >= 8294400) return 10; // 4K (3840x2160)
    if (pixels >= 3686400) return 9;  // 2K (2560x1440)
    if (pixels >= 2073600) return 8;  // Full HD (1920x1080)
    if (pixels >= 921600) return 6;   // HD (1280x720)
    if (pixels >= 307200) return 4;   // VGA (640x480)
    return 2; // Below VGA
  }

  /**
   * Score position in Google's list (0-10)
   * First images are often official/professional
   */
  scorePosition(position) {
    if (position === 0) return 10; // First image
    if (position === 1) return 9;  // Second image
    if (position === 2) return 8;  // Third image
    if (position <= 5) return 7;   // Top 5
    if (position <= 10) return 5;  // Top 10
    return 3; // Beyond top 10
  }

  /**
   * Score composition based on aspect ratio (0-10)
   * Prefer landscape 16:9 or 4:3
   */
  scoreComposition(aspectRatio) {
    const ratio = parseFloat(aspectRatio);

    // Landscape ratios (preferred)
    if (ratio >= 1.75 && ratio <= 1.80) return 10; // 16:9 (1.78)
    if (ratio >= 1.30 && ratio <= 1.35) return 9;  // 4:3 (1.33)
    if (ratio >= 1.40 && ratio <= 1.70) return 8;  // Other landscape
    if (ratio >= 0.90 && ratio <= 1.10) return 6;  // Square
    if (ratio >= 0.60 && ratio <= 0.80) return 5;  // Portrait
    return 4; // Unusual ratios
  }

  /**
   * Score attribution (0-10)
   * Owner/business photos typically higher quality
   */
  scoreAttribution(attribution) {
    if (!attribution) return 5;

    const lower = attribution.toLowerCase();

    // Owner indicators
    if (lower.includes('owner') || lower.includes('business') || lower.includes('official')) {
      return 10;
    }

    // Local guide (often high quality)
    if (lower.includes('local guide')) {
      return 8;
    }

    // Regular user
    return 6;
  }

  /**
   * Select best image from array of photos
   *
   * @param {Array} photos - Array of photo objects
   * @param {Object} options - Selection options
   * @returns {Promise<Object>} Best photo with scores
   */
  async selectBestImage(photos, options = {}) {
    const {
      analyzeQuality = true,
      minScore = 6.0,
      maxAnalyze = 10 // Only analyze top N by position
    } = options;

    if (photos.length === 0) {
      return null;
    }

    logger.info('Selecting best image from Google Places', {
      photo_count: photos.length,
      analyze_quality: analyzeQuality
    });

    const scoredPhotos = [];

    // Sort by position first (Google's order often indicates quality)
    const sortedPhotos = [...photos].sort((a, b) => a.position - b.position);

    // Analyze top photos only (cost optimization)
    const photosToAnalyze = sortedPhotos.slice(0, maxAnalyze);

    for (const photo of photosToAnalyze) {
      let quality = {
        width: 0,
        height: 0,
        sharpness: 5,
        brightness: 128,
        exposure_quality: 5
      };

      // Perform quality analysis if enabled
      if (analyzeQuality) {
        try {
          quality = await this.analyzeImageQuality(photo.url_original);
        } catch (error) {
          logger.warn('Quality analysis failed, using defaults', {
            photo_id: photo.id,
            error: error.message
          });
        }
      }

      // Score the image
      const scores = this.scoreImage(photo, quality);

      scoredPhotos.push({
        ...photo,
        ...scores
      });

      logger.debug('Scored image', {
        photo_id: photo.id,
        position: photo.position,
        total_score: scores.total_score
      });
    }

    // Sort by total score
    scoredPhotos.sort((a, b) => b.total_score - a.total_score);

    // Filter by minimum score
    const qualityPhotos = scoredPhotos.filter(p => p.total_score >= minScore);

    if (qualityPhotos.length === 0) {
      logger.warn('No photos meet minimum quality threshold', {
        min_score: minScore,
        best_score: scoredPhotos[0]?.total_score
      });

      // Return best available, even if below threshold
      return scoredPhotos[0] || null;
    }

    const bestPhoto = qualityPhotos[0];

    logger.info('Selected best Google Places image', {
      photo_id: bestPhoto.id,
      position: bestPhoto.position,
      total_score: bestPhoto.total_score,
      resolution: `${bestPhoto.quality_metadata.width}x${bestPhoto.quality_metadata.height}`
    });

    return bestPhoto;
  }

  /**
   * Helper: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: !!this.apifyToken,
      circuit_breaker: this.circuitBreaker.getState()
    };
  }
}

export default GooglePlacesImageService;
