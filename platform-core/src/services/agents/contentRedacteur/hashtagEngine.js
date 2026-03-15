/**
 * Hashtag Engine — Multi-source hashtag generation
 * Sources: destination defaults, category-based, trending, AI-generated.
 *
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

const DESTINATION_HASHTAGS = {
  1: ['#calpe', '#visitcalpe', '#costablanca', '#spain', '#mediterranean'],
  2: ['#texel', '#visittexel', '#wadden', '#netherlands', '#island'],
  3: ['#alicante', '#visitalicante', '#costablanca', '#spain'],
  4: ['#warrewijzer', '#warredal', '#maaseik', '#limburg', '#belgium'],
};

const CATEGORY_HASHTAGS = {
  'Food & Drinks': ['#foodie', '#restaurant', '#dining', '#foodlover', '#gastronomy'],
  'Nature & Parks': ['#nature', '#hiking', '#outdoors', '#naturelover', '#park'],
  'Beaches': ['#beach', '#seaside', '#sun', '#swim', '#beachlife'],
  'Culture & History': ['#culture', '#history', '#heritage', '#museum', '#art'],
  'Activities': ['#adventure', '#activities', '#funday', '#explore', '#travel'],
  'Shopping': ['#shopping', '#souvenirs', '#boutique', '#market'],
  'Nightlife': ['#nightlife', '#party', '#bar', '#cocktails'],
};

const PLATFORM_LIMITS = {
  instagram: { max: 15, position: 'end_separated' },
  facebook: { max: 5, position: 'end' },
  linkedin: { max: 5, position: 'end' },
  x: { max: 2, position: 'inline' },
  tiktok: { max: 5, position: 'end' },
  youtube: { max: 15, position: 'end' },
  pinterest: { max: 5, position: 'end' },
  snapchat: { max: 0, position: 'none' },
  website: { max: 0, position: 'none' },
};

/**
 * Generate hashtags from multiple sources
 * @param {Object} options - { destinationId, category, keywords, platform }
 * @returns {{ hashtags: string[], position: string }}
 */
export async function generateHashtags(options = {}) {
  const { destinationId = 1, category, keywords = [], platform = 'instagram' } = options;
  const limits = PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.instagram;

  if (limits.max === 0) return { hashtags: [], position: 'none' };

  const all = [];

  // 1. Destination defaults (always)
  all.push(...(DESTINATION_HASHTAGS[destinationId] || []));

  // 2. Category-based
  if (category) {
    const catTags = CATEGORY_HASHTAGS[category] || [];
    all.push(...catTags);
  }

  // 3. Trending hashtags
  try {
    const [trending] = await mysqlSequelize.query(
      `SELECT keyword FROM trending_data
       WHERE destination_id = :destId AND trend_direction IN ('rising', 'breakout')
       ORDER BY relevance_score DESC LIMIT 3`,
      { replacements: { destId: destinationId } }
    );
    all.push(...trending.map(t => '#' + t.keyword.replace(/[^a-zA-Z0-9àáâãäåèéêëìíîïòóôõöùúûüñçÀ-ÿ]/g, '')));
  } catch (e) {
    logger.debug('[HashtagEngine] Trending fetch failed:', e.message);
  }

  // 4. Content keyword hashtags
  all.push(...keywords
    .filter(k => k.length > 2)
    .map(k => '#' + k.replace(/[^a-zA-Z0-9àáâãäåèéêëìíîïòóôõöùúûüñçÀ-ÿ]/g, ''))
  );

  // Deduplicate, lowercase, limit
  const unique = [...new Set(all.map(h => h.toLowerCase()))].filter(h => h.length > 1);

  return {
    hashtags: unique.slice(0, limits.max),
    position: limits.position,
  };
}

export default { generateHashtags };
