/**
 * Image Downloader Service
 *
 * Downloads external POI images and stores them locally on the server.
 * This eliminates dependency on ephemeral external URLs (especially Google's
 * gps-cs-s format which has a ~32% failure rate).
 *
 * Storage structure:
 *   /var/www/api.holidaibutler.com/storage/poi-images/{poi_id}/{hash}.jpg
 *
 * Images are served via nginx at:
 *   https://api.holidaibutler.com/poi-images/{poi_id}/{hash}.jpg
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

class ImageDownloaderService {
  constructor() {
    // Base storage path on server
    this.storagePath = process.env.IMAGE_STORAGE_PATH ||
      '/var/www/api.holidaibutler.com/storage/poi-images';

    // Base URL for serving images
    this.baseUrl = process.env.IMAGE_BASE_URL ||
      'https://api.holidaibutler.com/poi-images';

    // Download timeout in ms
    this.downloadTimeout = 15000;

    // Max file size (10MB)
    this.maxFileSize = 10 * 1024 * 1024;

    // Supported image types
    this.supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  }

  /**
   * Download an image from URL and save locally
   *
   * @param {string} imageUrl - External image URL
   * @param {number} poiId - POI ID for directory structure
   * @returns {Promise<Object>} Download result with local_path, file_size, file_hash
   */
  async downloadImage(imageUrl, poiId) {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    try {
      // Download image data
      const imageData = await this.fetchImage(imageUrl);

      if (!imageData || imageData.length === 0) {
        throw new Error('Empty image data received');
      }

      // Generate hash for deduplication and filename
      const hash = crypto.createHash('sha256').update(imageData).digest('hex').substring(0, 16);

      // Determine file extension from content or URL
      const ext = this.getExtension(imageUrl, imageData);

      // Create directory structure
      const poiDir = path.join(this.storagePath, String(poiId));
      await fs.mkdir(poiDir, { recursive: true });

      // Save file
      const filename = `${hash}${ext}`;
      const filePath = path.join(poiDir, filename);
      await fs.writeFile(filePath, imageData);

      // Generate public URL
      const localPath = `/poi-images/${poiId}/${filename}`;
      const publicUrl = `${this.baseUrl}/${poiId}/${filename}`;

      logger.info('Image downloaded successfully', {
        poi_id: poiId,
        original_url: imageUrl.substring(0, 80),
        local_path: localPath,
        file_size: imageData.length,
        hash: hash
      });

      return {
        local_path: localPath,
        public_url: publicUrl,
        file_path: filePath,
        file_size: imageData.length,
        file_hash: hash,
        downloaded_at: new Date()
      };

    } catch (error) {
      logger.error('Image download failed', {
        poi_id: poiId,
        url: imageUrl.substring(0, 80),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch image data from URL
   */
  async fetchImage(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const timeout = this.downloadTimeout;
      const maxSize = this.maxFileSize;

      const request = client.get(url, { timeout }, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          this.fetchImage(response.headers.location)
            .then(resolve)
            .catch(reject);
          return;
        }

        // Check status
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        // Check content type
        const contentType = response.headers['content-type'];
        if (contentType && !this.supportedTypes.some(t => contentType.includes(t))) {
          reject(new Error(`Unsupported content type: ${contentType}`));
          return;
        }

        // Collect data
        const chunks = [];
        let totalSize = 0;

        response.on('data', (chunk) => {
          totalSize += chunk.length;
          if (totalSize > maxSize) {
            request.destroy();
            reject(new Error('File too large'));
            return;
          }
          chunks.push(chunk);
        });

        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        response.on('error', reject);
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Get file extension from URL or content
   */
  getExtension(url, data) {
    // Check magic bytes for image type
    if (data && data.length >= 4) {
      const header = data.slice(0, 4);

      // JPEG: FF D8 FF
      if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        return '.jpg';
      }

      // PNG: 89 50 4E 47
      if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        return '.png';
      }

      // GIF: 47 49 46
      if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
        return '.gif';
      }

      // WebP: 52 49 46 46 ... 57 45 42 50
      if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
        return '.webp';
      }
    }

    // Fallback to URL extension
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return ext === '.jpeg' ? '.jpg' : ext;
    }

    // Default to jpg
    return '.jpg';
  }

  /**
   * Download and update database record for a single image
   *
   * @param {number} imageId - imageurls.id
   * @param {string} imageUrl - External URL
   * @param {number} poiId - POI ID
   * @returns {Promise<boolean>} Success status
   */
  async downloadAndSave(imageId, imageUrl, poiId) {
    try {
      const result = await this.downloadImage(imageUrl, poiId);

      // Update database with local path
      await mysqlSequelize.query(`
        UPDATE imageurls
        SET local_path = ?,
            file_size = ?,
            file_hash = ?,
            downloaded_at = NOW()
        WHERE id = ?
      `, {
        replacements: [result.local_path, result.file_size, result.file_hash, imageId]
      });

      return true;

    } catch (error) {
      logger.warn('Failed to download image', {
        image_id: imageId,
        poi_id: poiId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Download all images for a POI
   *
   * @param {number} poiId - POI ID
   * @returns {Promise<Object>} Download statistics
   */
  async downloadImagesForPOI(poiId) {
    const stats = { total: 0, success: 0, failed: 0, skipped: 0 };

    try {
      // Get all images without local_path
      const [images] = await mysqlSequelize.query(`
        SELECT id, image_url
        FROM imageurls
        WHERE poi_id = ?
          AND local_path IS NULL
          AND image_url IS NOT NULL
      `, {
        replacements: [poiId]
      });

      stats.total = images.length;

      for (const img of images) {
        const success = await this.downloadAndSave(img.id, img.image_url, poiId);
        if (success) {
          stats.success++;
        } else {
          stats.failed++;
        }

        // Small delay between downloads
        await this.sleep(100);
      }

      return stats;

    } catch (error) {
      logger.error('Failed to download images for POI', {
        poi_id: poiId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Batch download images for multiple POIs
   *
   * @param {number[]} poiIds - Array of POI IDs
   * @param {Object} options - Options
   * @returns {Promise<Object>} Batch statistics
   */
  async downloadImagesForPOIs(poiIds, options = {}) {
    const { delayBetweenPois = 500, maxConcurrent = 1 } = options;
    const stats = { pois: 0, total: 0, success: 0, failed: 0 };

    for (const poiId of poiIds) {
      try {
        const poiStats = await this.downloadImagesForPOI(poiId);
        stats.pois++;
        stats.total += poiStats.total;
        stats.success += poiStats.success;
        stats.failed += poiStats.failed;

        logger.info('POI images downloaded', {
          poi_id: poiId,
          success: poiStats.success,
          failed: poiStats.failed
        });

      } catch (error) {
        logger.error('POI download batch failed', {
          poi_id: poiId,
          error: error.message
        });
      }

      await this.sleep(delayBetweenPois);
    }

    return stats;
  }

  /**
   * Download all pending images (no local_path)
   *
   * @param {Object} options - Options
   * @returns {Promise<Object>} Statistics
   */
  async downloadAllPending(options = {}) {
    const { limit = 1000, batchSize = 50 } = options;

    logger.info('Starting batch download of pending images', { limit, batchSize });

    const stats = { total: 0, success: 0, failed: 0, batches: 0 };

    try {
      // Get images that need downloading
      const [images] = await mysqlSequelize.query(`
        SELECT id, poi_id, image_url
        FROM imageurls
        WHERE local_path IS NULL
          AND image_url IS NOT NULL
        ORDER BY poi_id
        LIMIT ?
      `, {
        replacements: [limit]
      });

      stats.total = images.length;
      logger.info(`Found ${images.length} images to download`);

      // Process in batches
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        stats.batches++;

        for (const img of batch) {
          const success = await this.downloadAndSave(img.id, img.image_url, img.poi_id);
          if (success) {
            stats.success++;
          } else {
            stats.failed++;
          }

          // Small delay
          await this.sleep(50);
        }

        logger.info(`Batch ${stats.batches} complete`, {
          processed: Math.min(i + batchSize, images.length),
          total: images.length,
          success: stats.success,
          failed: stats.failed
        });

        // Longer delay between batches
        await this.sleep(1000);
      }

      logger.info('Batch download complete', stats);
      return stats;

    } catch (error) {
      logger.error('Batch download failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if storage directory exists and is writable
   */
  async checkStorage() {
    try {
      await fs.access(this.storagePath, fs.constants.W_OK);
      return { exists: true, writable: true, path: this.storagePath };
    } catch (error) {
      return { exists: false, writable: false, path: this.storagePath, error: error.message };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const [result] = await mysqlSequelize.query(`
        SELECT
          COUNT(*) as total_images,
          SUM(CASE WHEN local_path IS NOT NULL THEN 1 ELSE 0 END) as downloaded,
          SUM(CASE WHEN local_path IS NULL THEN 1 ELSE 0 END) as pending,
          SUM(COALESCE(file_size, 0)) as total_size_bytes
        FROM imageurls
      `);

      const stats = result[0];
      stats.total_size_mb = (stats.total_size_bytes / (1024 * 1024)).toFixed(2);
      stats.storage_path = this.storagePath;

      return stats;

    } catch (error) {
      logger.error('Failed to get storage stats', { error: error.message });
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
const imageDownloader = new ImageDownloaderService();
export default imageDownloader;
