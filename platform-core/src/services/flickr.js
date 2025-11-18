/**
 * Flickr API Service
 *
 * Provides geo-based image search for POI enhancement
 * Uses Flickr API to find high-quality, licensed images near POI locations
 *
 * API Documentation: https://www.flickr.com/services/api/
 * Rate Limit: 3,600 requests/hour (free tier)
 */

import axios from 'axios';
import crypto from 'crypto';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/flickr-service.log' })
  ]
});

/**
 * Creative Commons License Types
 * https://www.flickr.com/services/api/flickr.photos.licenses.getInfo.html
 */
const FLICKR_LICENSES = {
  0: { name: 'All Rights Reserved', commercial: false, attribution: true },
  1: { name: 'CC BY-NC-SA 2.0', commercial: false, attribution: true },
  2: { name: 'CC BY-NC 2.0', commercial: false, attribution: true },
  3: { name: 'CC BY-NC-ND 2.0', commercial: false, attribution: true },
  4: { name: 'CC BY 2.0', commercial: true, attribution: true },
  5: { name: 'CC BY-SA 2.0', commercial: true, attribution: true },
  6: { name: 'CC BY-ND 2.0', commercial: true, attribution: true },
  7: { name: 'No known copyright restrictions', commercial: true, attribution: false },
  8: { name: 'United States Government Work', commercial: true, attribution: false },
  9: { name: 'CC0 1.0', commercial: true, attribution: false },
  10: { name: 'PDM', commercial: true, attribution: false }
};

/**
 * Commercial-friendly licenses only
 */
const COMMERCIAL_LICENSES = [4, 5, 6, 7, 8, 9, 10];

class FlickrRateLimiter {
  constructor(requestsPerHour = 3600) {
    this.requestsPerHour = requestsPerHour;
    this.requestWindow = []; // Array of timestamps
  }

  /**
   * Throttle requests to stay within rate limit
   */
  async throttle() {
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour in milliseconds

    // Remove requests older than 1 hour
    this.requestWindow = this.requestWindow.filter(timestamp => timestamp > hourAgo);

    // If at limit, wait until oldest request expires
    if (this.requestWindow.length >= this.requestsPerHour) {
      const oldestRequest = this.requestWindow[0];
      const waitTime = oldestRequest + 3600000 - now + 1000; // +1s buffer

      logger.warn(`Rate limit reached. Waiting ${Math.round(waitTime / 1000)}s`);
      await this.sleep(waitTime);

      // Clean window after waiting
      this.requestWindow = this.requestWindow.filter(t => t > Date.now() - 3600000);
    }

    // Record this request
    this.requestWindow.push(now);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const recentRequests = this.requestWindow.filter(t => t > hourAgo).length;

    return {
      requestsInLastHour: recentRequests,
      remainingRequests: this.requestsPerHour - recentRequests,
      percentUsed: (recentRequests / this.requestsPerHour * 100).toFixed(2)
    };
  }
}

class FlickrService {
  constructor() {
    this.apiKey = process.env.FLICKR_API_KEY;
    this.apiSecret = process.env.FLICKR_API_SECRET;
    this.baseUrl = 'https://api.flickr.com/services/rest/';
    this.rateLimiter = new FlickrRateLimiter(3600);

    if (!this.apiKey) {
      logger.error('FLICKR_API_KEY not configured in environment variables');
      throw new Error('Flickr API key is required');
    }
  }

  /**
   * Make authenticated API request
   */
  async request(method, params = {}) {
    await this.rateLimiter.throttle();

    const requestParams = {
      method,
      api_key: this.apiKey,
      format: 'json',
      nojsoncallback: 1,
      ...params
    };

    try {
      const response = await axios.get(this.baseUrl, {
        params: requestParams,
        timeout: 10000
      });

      if (response.data.stat === 'fail') {
        throw new Error(`Flickr API error: ${response.data.message}`);
      }

      logger.debug(`Flickr API: ${method}`, { params: requestParams });

      return response.data;
    } catch (error) {
      logger.error(`Flickr API request failed: ${method}`, {
        error: error.message,
        params: requestParams
      });
      throw error;
    }
  }

  /**
   * Search for photos by geographic location
   *
   * @param {Object} options
   * @param {number} options.lat - Latitude
   * @param {number} options.lon - Longitude
   * @param {number} options.radius - Search radius in km (default: 0.1)
   * @param {string} options.text - Additional search text
   * @param {string} options.tags - Comma-separated tags
   * @param {number} options.perPage - Results per page (max 500)
   * @param {number} options.page - Page number
   * @param {boolean} options.commercialOnly - Only commercial licenses (default: true)
   * @param {number} options.minTakenDate - Unix timestamp for minimum date taken
   * @returns {Promise<Array>} Array of photo objects
   */
  async searchByLocation(options) {
    const {
      lat,
      lon,
      radius = 0.1, // 100 meters default
      text = '',
      tags = '',
      perPage = 50,
      page = 1,
      commercialOnly = true,
      minTakenDate = null
    } = options;

    const params = {
      lat,
      lon,
      radius,
      radius_units: 'km',
      per_page: Math.min(perPage, 500),
      page,
      extras: 'description,license,date_upload,date_taken,owner_name,icon_server,original_format,last_update,geo,tags,machine_tags,o_dims,views,media,path_alias,url_sq,url_t,url_s,url_q,url_m,url_n,url_z,url_c,url_l,url_o',
      sort: 'relevance', // or 'date-posted-desc', 'interestingness-desc'
      content_type: 1, // Photos only (not screenshots)
      media: 'photos'
    };

    // Add text search if provided
    if (text) {
      params.text = text;
    }

    // Add tags if provided
    if (tags) {
      params.tags = tags;
      params.tag_mode = 'all'; // All tags must match
    }

    // Filter by commercial licenses only
    if (commercialOnly) {
      params.license = COMMERCIAL_LICENSES.join(',');
    }

    // Filter by minimum date
    if (minTakenDate) {
      params.min_taken_date = minTakenDate;
    }

    // Only geotagged photos
    params.has_geo = 1;

    const data = await this.request('flickr.photos.search', params);

    return data.photos.photo.map(photo => this.normalizePhoto(photo));
  }

  /**
   * Get detailed information about a photo
   */
  async getPhotoInfo(photoId) {
    const data = await this.request('flickr.photos.getInfo', {
      photo_id: photoId
    });

    return this.normalizePhotoInfo(data.photo);
  }

  /**
   * Get all available sizes for a photo
   */
  async getPhotoSizes(photoId) {
    const data = await this.request('flickr.photos.getSizes', {
      photo_id: photoId
    });

    return data.sizes.size.map(size => ({
      label: size.label,
      width: parseInt(size.width),
      height: parseInt(size.height),
      source: size.source,
      url: size.url,
      media: size.media
    }));
  }

  /**
   * Get EXIF data for a photo
   */
  async getPhotoExif(photoId) {
    try {
      const data = await this.request('flickr.photos.getExif', {
        photo_id: photoId
      });

      return data.photo.exif.reduce((acc, item) => {
        acc[item.tag] = item.raw?._content || item.clean?._content;
        return acc;
      }, {});
    } catch (error) {
      logger.warn(`Could not fetch EXIF for photo ${photoId}`, { error: error.message });
      return {};
    }
  }

  /**
   * Search for images suitable for a POI
   */
  async searchForPOI(poi, options = {}) {
    const {
      maxResults = 20,
      radiusMeters = 100,
      includeNameSearch = true
    } = options;

    const searches = [];

    // 1. Geo-only search (most accurate)
    searches.push(
      this.searchByLocation({
        lat: poi.latitude,
        lon: poi.longitude,
        radius: radiusMeters / 1000, // Convert to km
        perPage: maxResults,
        commercialOnly: true
      })
    );

    // 2. Geo + name search
    if (includeNameSearch && poi.name) {
      const searchText = `${poi.name} ${poi.city || ''}`.trim();
      searches.push(
        this.searchByLocation({
          lat: poi.latitude,
          lon: poi.longitude,
          radius: radiusMeters / 1000,
          text: searchText,
          perPage: maxResults,
          commercialOnly: true
        })
      );
    }

    // 3. Geo + category tags
    if (poi.category) {
      const categoryTags = this.getCategoryTags(poi.category);
      if (categoryTags.length > 0) {
        searches.push(
          this.searchByLocation({
            lat: poi.latitude,
            lon: poi.longitude,
            radius: radiusMeters / 1000,
            tags: categoryTags.join(','),
            perPage: maxResults,
            commercialOnly: true
          })
        );
      }
    }

    // Execute all searches in parallel
    const results = await Promise.allSettled(searches);

    // Combine and deduplicate results
    const allPhotos = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    const uniquePhotos = this.deduplicatePhotos(allPhotos);

    logger.info(`Found ${uniquePhotos.length} unique Flickr photos for POI`, {
      poi_id: poi.id,
      poi_name: poi.name,
      total_searches: searches.length
    });

    return uniquePhotos.slice(0, maxResults);
  }

  /**
   * Get category-specific tags
   */
  getCategoryTags(category) {
    const tagMap = {
      restaurant: ['restaurant', 'dining', 'food', 'cuisine'],
      hotel: ['hotel', 'accommodation', 'resort', 'lodging'],
      attraction: ['tourist', 'attraction', 'landmark', 'monument'],
      beach: ['beach', 'coast', 'seaside', 'playa'],
      museum: ['museum', 'gallery', 'exhibition', 'art'],
      park: ['park', 'garden', 'nature', 'outdoor'],
      shopping: ['shopping', 'store', 'boutique', 'market'],
      nightlife: ['bar', 'club', 'nightlife', 'entertainment'],
      spa: ['spa', 'wellness', 'relaxation', 'treatment']
    };

    return tagMap[category?.toLowerCase()] || [];
  }

  /**
   * Deduplicate photos by ID
   */
  deduplicatePhotos(photos) {
    const seen = new Set();
    return photos.filter(photo => {
      if (seen.has(photo.id)) {
        return false;
      }
      seen.add(photo.id);
      return true;
    });
  }

  /**
   * Normalize photo data from search results
   */
  normalizePhoto(photo) {
    const license = FLICKR_LICENSES[photo.license] || FLICKR_LICENSES[0];

    return {
      id: photo.id,
      source: 'flickr',
      source_id: photo.id,
      source_url: `https://www.flickr.com/photos/${photo.owner}/${photo.id}`,

      // URLs (different sizes)
      url_thumbnail: photo.url_sq || photo.url_t,
      url_medium: photo.url_z || photo.url_c,
      url_large: photo.url_l || photo.url_c,
      url_original: photo.url_o,

      // Dimensions
      width: parseInt(photo.width_o || photo.width_l || 0),
      height: parseInt(photo.height_o || photo.height_l || 0),

      // Attribution
      author_name: photo.ownername,
      author_username: photo.owner,
      author_url: `https://www.flickr.com/people/${photo.owner}`,
      license_type: license.name,
      license_url: `https://creativecommons.org/licenses/${this.getLicenseSlug(photo.license)}/2.0/`,
      commercial_use_allowed: license.commercial,
      attribution_required: license.attribution,

      // Geo
      photo_latitude: parseFloat(photo.latitude) || null,
      photo_longitude: parseFloat(photo.longitude) || null,

      // Metadata
      title: photo.title,
      description: photo.description?._content || '',
      tags: photo.tags ? photo.tags.split(' ') : [],
      date_taken: photo.datetaken,
      date_uploaded: new Date(parseInt(photo.dateupload) * 1000),
      views: parseInt(photo.views) || 0,

      // Raw data for reference
      raw: photo
    };
  }

  /**
   * Normalize detailed photo info
   */
  normalizePhotoInfo(photo) {
    const license = FLICKR_LICENSES[photo.license] || FLICKR_LICENSES[0];

    return {
      id: photo.id,
      source: 'flickr',
      source_id: photo.id,
      source_url: `https://www.flickr.com/photos/${photo.owner.nsid}/${photo.id}`,

      // Attribution
      author_name: photo.owner.realname || photo.owner.username,
      author_username: photo.owner.username,
      author_url: `https://www.flickr.com/people/${photo.owner.nsid}`,
      license_type: license.name,
      commercial_use_allowed: license.commercial,
      attribution_required: license.attribution,

      // Geo
      photo_latitude: parseFloat(photo.location?.latitude) || null,
      photo_longitude: parseFloat(photo.location?.longitude) || null,
      location_accuracy: parseInt(photo.location?.accuracy) || null,

      // Metadata
      title: photo.title?._content || '',
      description: photo.description?._content || '',
      tags: photo.tags?.tag?.map(t => t._content) || [],
      date_taken: photo.dates?.taken,
      date_uploaded: new Date(parseInt(photo.dates?.posted) * 1000),
      views: parseInt(photo.views) || 0,
      comments: parseInt(photo.comments?._content) || 0,

      // Camera info
      camera: photo.camera || 'Unknown',

      raw: photo
    };
  }

  /**
   * Get license slug for URL
   */
  getLicenseSlug(licenseId) {
    const slugs = {
      4: 'by',
      5: 'by-sa',
      6: 'by-nd',
      7: 'publicdomain',
      9: 'zero',
      10: 'publicdomain'
    };
    return slugs[licenseId] || 'by';
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
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

    return R * c; // Distance in meters
  }

  /**
   * Generate perceptual hash for image deduplication
   */
  generateHash(imageUrl) {
    return crypto
      .createHash('md5')
      .update(imageUrl)
      .digest('hex');
  }

  /**
   * Get rate limiter status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }
}

export default FlickrService;
