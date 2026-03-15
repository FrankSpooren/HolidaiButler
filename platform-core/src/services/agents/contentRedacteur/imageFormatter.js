/**
 * Image Formatter — Platform-specific image resizing using Sharp
 * Generates optimally sized images for each social media platform.
 *
 * @version 1.0.0
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import logger from '../../../utils/logger.js';

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/var/www/api.holidaibutler.com/storage';
const OUTPUT_DIR = path.join(STORAGE_ROOT, 'content-images');

const PLATFORM_IMAGE_SPECS = {
  facebook:  { post: { w: 1200, h: 630 }, story: { w: 1080, h: 1920 } },
  instagram: { square: { w: 1080, h: 1080 }, portrait: { w: 1080, h: 1350 }, landscape: { w: 1080, h: 566 }, story: { w: 1080, h: 1920 } },
  linkedin:  { post: { w: 1200, h: 627 } },
  x:         { post: { w: 1200, h: 675 } },
  pinterest: { pin: { w: 1000, h: 1500 } },
  youtube:   { thumbnail: { w: 1280, h: 720 } },
  tiktok:    { cover: { w: 1080, h: 1920 } },
  website:   { hero: { w: 1200, h: 630 }, card: { w: 600, h: 400 } },
};

/**
 * Format an image for a specific platform and format
 * @param {string} inputPath - Absolute path to source image
 * @param {string} platform - Target platform
 * @param {string} format - Image format variant (e.g., 'post', 'square', 'story')
 * @returns {Object} { outputPath, width, height, size }
 */
export async function formatImage(inputPath, platform, format = 'post') {
  const specs = PLATFORM_IMAGE_SPECS[platform];
  if (!specs) throw new Error(`Unknown platform: ${platform}`);

  const spec = specs[format] || Object.values(specs)[0];
  if (!spec) throw new Error(`Unknown format '${format}' for platform '${platform}'`);

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const ext = path.extname(inputPath) || '.jpg';
  const basename = path.basename(inputPath, ext);
  const outputFilename = `${basename}_${platform}_${format}${ext}`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  try {
    const result = await sharp(inputPath)
      .resize(spec.w, spec.h, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(outputPath);

    return {
      outputPath,
      relativePath: `content-images/${outputFilename}`,
      width: spec.w,
      height: spec.h,
      size: result.size,
      platform,
      format,
    };
  } catch (error) {
    logger.error(`[ImageFormatter] Failed to format image for ${platform}/${format}:`, error.message);
    throw error;
  }
}

/**
 * Get available format specs for a platform
 * @param {string} platform
 * @returns {Object} Format specs
 */
export function getImageSpecs(platform) {
  return PLATFORM_IMAGE_SPECS[platform] || {};
}

/**
 * Get all platform image specifications
 */
export function getAllSpecs() {
  return PLATFORM_IMAGE_SPECS;
}

export default { formatImage, getImageSpecs, getAllSpecs, PLATFORM_IMAGE_SPECS };
