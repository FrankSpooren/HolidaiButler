/**
 * Image Resize Proxy (Fase II-B.4)
 *
 * Serves resized POI images with on-disk caching for responsive image support.
 * Uses sharp for high-performance image processing.
 *
 * URL pattern: /api/v1/img/<path>?w=<width>&q=<quality>&f=<format>
 *
 * Parameters:
 *   w: Target width (200, 400, 600, 800, 1200). Default: original
 *   q: JPEG quality 1-100. Default: 80
 *   f: Output format (jpg, webp, avif). Default: jpg
 *
 * Caching: Resized images are cached on disk in /storage/poi-images-cache/
 * Cache headers: 30 days browser + CDN cache
 *
 * @module routes/imageResize
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = express.Router();

// Allowed widths (prevent abuse with arbitrary sizes)
const ALLOWED_WIDTHS = [200, 400, 600, 800, 1200];
const DEFAULT_QUALITY = 80;
const ALLOWED_FORMATS = ['jpg', 'webp', 'avif'];

// Base directories
const IMAGES_DIR = process.env.NODE_ENV === 'production'
  ? '/var/www/api.holidaibutler.com/storage/poi-images'
  : path.resolve(__dirname, '../../storage/poi-images');

const CACHE_DIR = process.env.NODE_ENV === 'production'
  ? '/var/www/api.holidaibutler.com/storage/poi-images-cache'
  : path.resolve(__dirname, '../../storage/poi-images-cache');

// Ensure cache directory exists
try {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
} catch (e) {
  console.error('[ImageResize] Failed to create cache dir:', e.message);
}

/**
 * GET /api/v1/img/*
 * Serve a resized POI image
 *
 * Example: /api/v1/img/171/aa9d1850306450ae.jpg?w=400&q=80&f=webp
 */
router.get('/*', async (req, res) => {
  try {
    // Extract image path from URL (everything after /api/v1/img/)
    const imagePath = req.params[0];

    if (!imagePath) {
      return res.status(400).json({ error: 'Image path required' });
    }

    // Security: prevent directory traversal
    const normalizedPath = path.normalize(imagePath).replace(/^(\.\.[/\\])+/, '');
    if (normalizedPath.includes('..')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    // Only allow image extensions
    const ext = path.extname(normalizedPath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Parse resize parameters
    const width = parseInt(req.query.w) || 0;
    const quality = Math.min(100, Math.max(1, parseInt(req.query.q) || DEFAULT_QUALITY));
    const format = ALLOWED_FORMATS.includes(req.query.f) ? req.query.f : 'jpg';

    // Snap width to nearest allowed size (prevent cache pollution)
    let targetWidth = 0;
    if (width > 0) {
      targetWidth = ALLOWED_WIDTHS.reduce((prev, curr) =>
        Math.abs(curr - width) < Math.abs(prev - width) ? curr : prev
      );
    }

    // Source file path
    const sourcePath = path.join(IMAGES_DIR, normalizedPath);

    // Check source exists
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // If no resize needed, serve original with cache headers
    if (!targetWidth) {
      res.set({
        'Cache-Control': 'public, max-age=2592000, immutable', // 30 days
        'Content-Type': `image/${ext === '.png' ? 'png' : 'jpeg'}`,
      });
      return res.sendFile(sourcePath);
    }

    // Cache key: width_quality_format/path
    const cacheKey = `${targetWidth}_${quality}_${format}/${normalizedPath.replace(ext, `.${format === 'jpg' ? 'jpg' : format}`)}`;
    const cachePath = path.join(CACHE_DIR, cacheKey);

    // Serve from cache if available
    if (fs.existsSync(cachePath)) {
      const mimeType = format === 'webp' ? 'image/webp' : format === 'avif' ? 'image/avif' : 'image/jpeg';
      res.set({
        'Cache-Control': 'public, max-age=2592000, immutable', // 30 days
        'Content-Type': mimeType,
        'X-Image-Cache': 'HIT',
      });
      return res.sendFile(cachePath);
    }

    // Resize with sharp
    const cacheDir = path.dirname(cachePath);
    fs.mkdirSync(cacheDir, { recursive: true });

    let pipeline = sharp(sourcePath)
      .resize(targetWidth, null, { // null height = maintain aspect ratio
        withoutEnlargement: true, // Don't upscale small images
        fit: 'inside',
      });

    // Apply format
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'avif') {
      pipeline = pipeline.avif({ quality });
    } else {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true }); // mozjpeg for better compression
    }

    // Write to cache and respond
    const buffer = await pipeline.toBuffer();
    fs.writeFileSync(cachePath, buffer);

    const mimeType = format === 'webp' ? 'image/webp' : format === 'avif' ? 'image/avif' : 'image/jpeg';
    res.set({
      'Cache-Control': 'public, max-age=2592000, immutable', // 30 days
      'Content-Type': mimeType,
      'Content-Length': buffer.length,
      'X-Image-Cache': 'MISS',
      'X-Image-Width': targetWidth,
    });
    return res.send(buffer);
  } catch (error) {
    console.error('[ImageResize] Error:', error.message);
    return res.status(500).json({ error: 'Image processing failed' });
  }
});

export default router;
