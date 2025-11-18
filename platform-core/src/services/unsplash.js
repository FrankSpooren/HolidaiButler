/**
 * Unsplash API Service
 *
 * Provides high-quality professional photography for POI enhancement
 * Uses Unsplash API to find curated, free-to-use images
 *
 * API Documentation: https://unsplash.com/documentation
 * Rate Limit: 50 requests/hour (free tier)
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
    new winston.transports.File({ filename: 'logs/unsplash-service.log' })
  ]
});

class UnsplashRateLimiter {
  constructor(requestsPerHour = 50) {
    this.requestsPerHour = requestsPerHour;
    this.requestWindow = [];
  }

  async throttle() {
    const now = Date.now();
    const hourAgo = now - 3600000;

    // Remove old requests
    this.requestWindow = this.requestWindow.filter(timestamp => timestamp > hourAgo);

    // Check if at limit
    if (this.requestWindow.length >= this.requestsPerHour) {
      const oldestRequest = this.requestWindow[0];
      const waitTime = oldestRequest + 3600000 - now + 1000;

      logger.warn(`Unsplash rate limit reached. Waiting ${Math.round(waitTime / 1000)}s`);
      await this.sleep(waitTime);

      this.requestWindow = this.requestWindow.filter(t => t > Date.now() - 3600000);
    }

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

class UnsplashService {
  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY;
    this.secretKey = process.env.UNSPLASH_SECRET_KEY;
    this.baseUrl = 'https://api.unsplash.com';
    this.rateLimiter = new UnsplashRateLimiter(50);

    if (!this.accessKey) {
      logger.error('UNSPLASH_ACCESS_KEY not configured in environment variables');
      throw new Error('Unsplash access key is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Client-ID ${this.accessKey}`,
        'Accept-Version': 'v1'
      },
      timeout: 10000
    });
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, params = {}) {
    await this.rateLimiter.throttle();

    try {
      const response = await this.client.get(endpoint, { params });

      logger.debug(`Unsplash API: ${endpoint}`, { params });

      // Track rate limit from headers
      const rateLimit = {
        limit: parseInt(response.headers['x-ratelimit-limit']),
        remaining: parseInt(response.headers['x-ratelimit-remaining'])
      };

      logger.debug('Unsplash rate limit', rateLimit);

      return response.data;
    } catch (error) {
      logger.error(`Unsplash API request failed: ${endpoint}`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Search for photos
   *
   * @param {Object} options
   * @param {string} options.query - Search query
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.perPage - Results per page (max 30)
   * @param {string} options.orientation - landscape|portrait|squarish
   * @param {string} options.color - Filter by color
   * @param {string} options.orderBy - latest|relevant (default: relevant)
   * @returns {Promise<Array>} Array of photo objects
   */
  async searchPhotos(options) {
    const {
      query,
      page = 1,
      perPage = 30,
      orientation = 'landscape',
      color = null,
      orderBy = 'relevant'
    } = options;

    if (!query) {
      throw new Error('Search query is required');
    }

    const params = {
      query,
      page,
      per_page: Math.min(perPage, 30),
      orientation,
      order_by: orderBy
    };

    if (color) {
      params.color = color;
    }

    const data = await this.request('/search/photos', params);

    return {
      total: data.total,
      totalPages: data.total_pages,
      results: data.results.map(photo => this.normalizePhoto(photo))
    };
  }

  /**
   * Get photo details by ID
   */
  async getPhoto(photoId) {
    const photo = await this.request(`/photos/${photoId}`);
    return this.normalizePhoto(photo);
  }

  /**
   * Download tracking (required by Unsplash API)
   * Must be called when photo is downloaded/used
   */
  async trackDownload(photoId, downloadLocation) {
    try {
      if (downloadLocation) {
        await this.client.get(downloadLocation);
        logger.info(`Tracked download for Unsplash photo ${photoId}`);
      }
    } catch (error) {
      logger.warn(`Failed to track download for photo ${photoId}`, {
        error: error.message
      });
    }
  }

  /**
   * Search for images suitable for a POI
   */
  async searchForPOI(poi, options = {}) {
    const {
      maxResults = 10,
      includeCategory = true,
      includeCity = true
    } = options;

    const searches = [];

    // Build search query variations
    const queryParts = [];

    // Always include POI name if available
    if (poi.name) {
      queryParts.push(poi.name);
    }

    // Add city/region for context
    if (includeCity && poi.city) {
      queryParts.push(poi.city);
    }

    // Add country
    if (poi.country) {
      const countryNames = {
        'ES': 'Spain',
        'FR': 'France',
        'IT': 'Italy',
        'PT': 'Portugal',
        'NL': 'Netherlands',
        'DE': 'Germany',
        'UK': 'United Kingdom'
      };
      queryParts.push(countryNames[poi.country] || poi.country);
    }

    // Add category-specific keywords
    if (includeCategory && poi.category) {
      const categoryKeywords = this.getCategoryKeywords(poi.category);
      queryParts.push(...categoryKeywords);
    }

    // Search 1: Full query
    const fullQuery = queryParts.join(' ');
    searches.push(
      this.searchPhotos({
        query: fullQuery,
        perPage: maxResults,
        orientation: 'landscape',
        orderBy: 'relevant'
      })
    );

    // Search 2: Location + category only (more generic)
    if (poi.city && poi.category) {
      const locationQuery = `${poi.city} ${poi.country} ${poi.category}`;
      searches.push(
        this.searchPhotos({
          query: locationQuery,
          perPage: maxResults,
          orientation: 'landscape',
          orderBy: 'relevant'
        })
      );
    }

    // Execute searches
    const results = await Promise.allSettled(searches);

    // Combine results
    const allPhotos = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value.results);

    // Deduplicate
    const uniquePhotos = this.deduplicatePhotos(allPhotos);

    logger.info(`Found ${uniquePhotos.length} unique Unsplash photos for POI`, {
      poi_id: poi.id,
      poi_name: poi.name,
      query: fullQuery
    });

    return uniquePhotos.slice(0, maxResults);
  }

  /**
   * Get category-specific keywords
   */
  getCategoryKeywords(category) {
    const keywordMap = {
      restaurant: ['restaurant', 'dining', 'food'],
      hotel: ['hotel', 'resort', 'accommodation'],
      attraction: ['landmark', 'tourist attraction', 'monument'],
      beach: ['beach', 'coastline', 'seaside'],
      museum: ['museum', 'art gallery', 'exhibition'],
      park: ['park', 'garden', 'nature'],
      shopping: ['shopping', 'market', 'boutique'],
      nightlife: ['nightlife', 'bar', 'club'],
      spa: ['spa', 'wellness', 'relaxation']
    };

    return keywordMap[category?.toLowerCase()] || [];
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
   * Normalize photo data
   */
  normalizePhoto(photo) {
    return {
      id: photo.id,
      source: 'unsplash',
      source_id: photo.id,
      source_url: photo.links.html,
      download_location: photo.links.download_location,

      // URLs (different sizes)
      url_original: photo.urls.raw,
      url_large: photo.urls.full,
      url_medium: photo.urls.regular,
      url_small: photo.urls.small,
      url_thumbnail: photo.urls.thumb,

      // Dimensions
      width: photo.width,
      height: photo.height,
      aspect_ratio: (photo.width / photo.height).toFixed(3),
      color: photo.color,

      // Attribution (Unsplash License - always free for commercial use)
      author_name: photo.user.name,
      author_username: photo.user.username,
      author_url: photo.user.links.html,
      author_profile_url: `https://unsplash.com/@${photo.user.username}`,
      license_type: 'Unsplash License',
      license_url: 'https://unsplash.com/license',
      commercial_use_allowed: true,
      attribution_required: true, // Best practice, though not strictly required

      // Metadata
      title: photo.alt_description || photo.description || '',
      description: photo.description || photo.alt_description || '',
      alt_text: photo.alt_description || '',
      tags: photo.tags?.map(t => t.title) || [],

      // Location data (if available)
      photo_latitude: photo.location?.position?.latitude || null,
      photo_longitude: photo.location?.position?.longitude || null,
      location_name: photo.location?.name || null,
      location_city: photo.location?.city || null,
      location_country: photo.location?.country || null,

      // Engagement metrics
      views: photo.views || 0,
      downloads: photo.downloads || 0,
      likes: photo.likes || 0,

      // Dates
      created_at: new Date(photo.created_at),
      updated_at: new Date(photo.updated_at),

      // EXIF data
      exif: photo.exif ? {
        make: photo.exif.make,
        model: photo.exif.model,
        exposure_time: photo.exif.exposure_time,
        aperture: photo.exif.aperture,
        focal_length: photo.exif.focal_length,
        iso: photo.exif.iso
      } : null,

      // Raw data for reference
      raw: photo
    };
  }

  /**
   * Build attribution text (required by Unsplash)
   */
  buildAttributionText(photo) {
    return `Photo by ${photo.author_name} on Unsplash`;
  }

  /**
   * Build attribution HTML (required by Unsplash)
   */
  buildAttributionHTML(photo) {
    return `
      Photo by
      <a href="${photo.author_url}?utm_source=holidaibutler&utm_medium=referral" target="_blank" rel="noopener noreferrer">
        ${photo.author_name}
      </a>
      on
      <a href="https://unsplash.com?utm_source=holidaibutler&utm_medium=referral" target="_blank" rel="noopener noreferrer">
        Unsplash
      </a>
    `.trim();
  }

  /**
   * Get UTM-tagged URL for proper attribution
   */
  getAttributedURL(url, utmSource = 'holidaibutler') {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}utm_source=${utmSource}&utm_medium=referral`;
  }

  /**
   * Calculate distance between photo location and POI (if available)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return null;
    }

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
   * Generate hash for deduplication
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

  /**
   * Get random photos (for testing or fallback)
   */
  async getRandomPhotos(options = {}) {
    const {
      count = 10,
      query = null,
      orientation = 'landscape'
    } = options;

    const params = {
      count: Math.min(count, 30),
      orientation
    };

    if (query) {
      params.query = query;
    }

    const photos = await this.request('/photos/random', params);

    // Response can be single photo or array
    const photoArray = Array.isArray(photos) ? photos : [photos];

    return photoArray.map(photo => this.normalizePhoto(photo));
  }

  /**
   * Get curated collections (high-quality editorial photos)
   */
  async getCuratedCollections(page = 1, perPage = 10) {
    const params = {
      page,
      per_page: Math.min(perPage, 30)
    };

    const collections = await this.request('/collections', params);

    return collections.map(collection => ({
      id: collection.id,
      title: collection.title,
      description: collection.description,
      total_photos: collection.total_photos,
      cover_photo: this.normalizePhoto(collection.cover_photo),
      tags: collection.tags?.map(t => t.title) || [],
      links: collection.links
    }));
  }

  /**
   * Get photos from a specific collection
   */
  async getCollectionPhotos(collectionId, page = 1, perPage = 30) {
    const params = {
      page,
      per_page: Math.min(perPage, 30)
    };

    const photos = await this.request(`/collections/${collectionId}/photos`, params);

    return photos.map(photo => this.normalizePhoto(photo));
  }
}

export default UnsplashService;
