/**
 * Visual Trend Discovery Service
 * Discovers trending visuals from external platforms (YouTube, Pexels, Reddit, Google Images)
 * per destination using Apify actors + direct APIs.
 */
import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';
import visualDiscoveryConfig from '../../config/visualDiscoveryConfig.js';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';

const visualTrendDiscovery = {

  /**
   * Discover trending visuals for a destination from all enabled platforms
   * @param {number} destinationId
   * @param {string[]} platforms - ['youtube','pexels','reddit','google_images'] or empty for all
   * @returns {object} { discovered: number, platforms: { youtube: n, pexels: n, ... } }
   */
  async discoverForDestination(destinationId, platforms = []) {
    const destConfig = visualDiscoveryConfig.destinations[destinationId];
    if (!destConfig || !destConfig.enabled) {
      logger.warn(`[VisualDiscovery] Destination ${destinationId} not configured or disabled`);
      return { discovered: 0, platforms: {} };
    }

    const results = { discovered: 0, platforms: {} };
    const enabledPlatforms = platforms.length > 0
      ? platforms
      : ['youtube', 'pexels', 'reddit', 'google_images', 'instagram', 'facebook', 'pinterest'];

    for (const platform of enabledPlatforms) {
      try {
        let items = [];
        switch (platform) {
          case 'youtube':
            items = await this._discoverYouTube(destinationId, destConfig);
            break;
          case 'pexels':
            items = await this._discoverPexels(destinationId, destConfig);
            break;
          case 'reddit':
            items = await this._discoverReddit(destinationId, destConfig);
            break;
          case 'google_images':
            items = await this._discoverGoogleImages(destinationId, destConfig);
            break;
          case 'instagram':
            items = await this._discoverInstagram(destinationId, destConfig);
            break;
          case 'facebook':
            items = await this._discoverFacebook(destinationId, destConfig);
            break;
          case 'pinterest':
            items = await this._discoverPinterest(destinationId, destConfig);
            break;
          default:
            logger.warn(`[VisualDiscovery] Unknown platform: ${platform}`);
            continue;
        }

        // Deduplicate against existing entries
        const saved = await this._saveDiscovered(destinationId, platform, items);
        results.platforms[platform] = saved;
        results.discovered += saved;
        logger.info(`[VisualDiscovery] ${platform}: ${saved} new visuals for dest ${destinationId}`);
      } catch (err) {
        logger.error(`[VisualDiscovery] ${platform} error for dest ${destinationId}:`, err.message);
        results.platforms[platform] = 0;
      }
    }

    return results;
  },

  /**
   * Discover from YouTube Data API v3
   */
  async _discoverYouTube(destinationId, destConfig) {
    if (!YOUTUBE_API_KEY) {
      logger.warn('[VisualDiscovery] YOUTUBE_API_KEY not set, skipping');
      return [];
    }

    const cfg = visualDiscoveryConfig.platforms.youtube;
    const items = [];

    for (const keyword of destConfig.keywords.slice(0, 3)) {
      try {
        const publishedAfter = new Date();
        publishedAfter.setDate(publishedAfter.getDate() - cfg.publishedAfterDays);

        const params = new URLSearchParams({
          part: 'snippet',
          q: keyword,
          type: 'video',
          maxResults: String(cfg.maxResults),
          order: cfg.order,
          videoDuration: cfg.videoDuration,
          relevanceLanguage: destConfig.languages[0] || cfg.relevanceLanguage,
          publishedAfter: publishedAfter.toISOString(),
          key: YOUTUBE_API_KEY
        });

        const resp = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
        if (!resp.ok) {
          logger.warn(`[VisualDiscovery] YouTube API ${resp.status}: ${await resp.text()}`);
          continue;
        }

        const data = await resp.json();
        for (const item of (data.items || [])) {
          const snippet = item.snippet || {};
          items.push({
            visual_type: 'video',
            source_platform: 'youtube',
            source_url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
            thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || null,
            title: snippet.title || '',
            description: (snippet.description || '').substring(0, 2000),
            hashtags: destConfig.hashtags,
            language: destConfig.languages[0] || 'en'
          });
        }
      } catch (err) {
        logger.error(`[VisualDiscovery] YouTube search "${keyword}" error:`, err.message);
      }
    }

    return items;
  },

  /**
   * Discover from Pexels API
   */
  async _discoverPexels(destinationId, destConfig) {
    if (!PEXELS_API_KEY) {
      logger.warn('[VisualDiscovery] PEXELS_API_KEY not set, skipping');
      return [];
    }

    const cfg = visualDiscoveryConfig.platforms.pexels;
    const items = [];

    for (const keyword of (destConfig.pexelsKeywords || []).slice(0, 3)) {
      try {
        const params = new URLSearchParams({
          query: keyword,
          per_page: String(cfg.perPage),
          orientation: cfg.orientation
        });

        const resp = await fetch(`https://api.pexels.com/v1/search?${params}`, {
          headers: { Authorization: PEXELS_API_KEY }
        });
        if (!resp.ok) continue;

        const data = await resp.json();
        for (const photo of (data.photos || [])) {
          if (photo.width < cfg.minWidth || photo.height < cfg.minHeight) continue;
          items.push({
            visual_type: 'image',
            source_platform: 'pexels',
            source_url: photo.url,
            thumbnail_url: photo.src?.large || photo.src?.medium || null,
            title: photo.alt || keyword,
            description: `Photo by ${photo.photographer || 'Unknown'} on Pexels`,
            hashtags: destConfig.hashtags,
            language: 'en'
          });
        }
      } catch (err) {
        logger.error(`[VisualDiscovery] Pexels "${keyword}" error:`, err.message);
      }
    }

    return items;
  },

  /**
   * Discover from Reddit via Apify
   */
  async _discoverReddit(destinationId, destConfig) {
    if (!APIFY_API_TOKEN) {
      logger.warn('[VisualDiscovery] APIFY_API_TOKEN not set, skipping Reddit');
      return [];
    }

    const cfg = visualDiscoveryConfig.platforms.reddit;
    const items = [];

    for (const subreddit of (destConfig.redditSubreddits || []).slice(0, 2)) {
      try {
        // Use Apify Reddit scraper actor
        const resp = await fetch('https://api.apify.com/v2/acts/trudax~reddit-scraper/run-sync-get-dataset-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${APIFY_API_TOKEN}`
          },
          body: JSON.stringify({
            startUrls: [{ url: `https://www.reddit.com/r/${subreddit}/search/?q=${encodeURIComponent(destConfig.keywords[0])}&sort=${cfg.sort}&t=${cfg.timeFilter}` }],
            maxItems: cfg.limit,
            proxy: { useApifyProxy: true }
          })
        });

        if (!resp.ok) {
          logger.warn(`[VisualDiscovery] Reddit Apify ${resp.status} for r/${subreddit}`);
          continue;
        }

        const posts = await resp.json();
        for (const post of (Array.isArray(posts) ? posts : [])) {
          // Only keep posts with images/videos
          const imageUrl = post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail
            : (post.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(post.url)) ? post.url
            : null;

          if (!imageUrl && !post.is_video) continue;

          items.push({
            visual_type: post.is_video ? 'video' : 'image',
            source_platform: 'reddit',
            source_url: post.url || `https://reddit.com${post.permalink || ''}`,
            thumbnail_url: imageUrl,
            title: (post.title || '').substring(0, 500),
            description: (post.selftext || '').substring(0, 2000),
            hashtags: destConfig.hashtags,
            engagement_score: (post.score || 0) + (post.numComments || 0) * 2,
            language: 'en'
          });
        }
      } catch (err) {
        logger.error(`[VisualDiscovery] Reddit r/${subreddit} error:`, err.message);
      }
    }

    return items;
  },

  /**
   * Discover from Google Images via Apify
   */
  async _discoverGoogleImages(destinationId, destConfig) {
    if (!APIFY_API_TOKEN) {
      logger.warn('[VisualDiscovery] APIFY_API_TOKEN not set, skipping Google Images');
      return [];
    }

    const cfg = visualDiscoveryConfig.platforms.googleImages;
    const items = [];

    for (const keyword of destConfig.keywords.slice(0, 2)) {
      try {
        const resp = await fetch('https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${APIFY_API_TOKEN}`
          },
          body: JSON.stringify({
            queries: keyword,
            maxPagesPerQuery: 1,
            resultsPerPage: cfg.maxResults,
            searchType: 'image',
            safeSearch: cfg.safeSearch,
            languageCode: destConfig.languages[0] || 'en'
          })
        });

        if (!resp.ok) {
          logger.warn(`[VisualDiscovery] Google Images Apify ${resp.status} for "${keyword}"`);
          continue;
        }

        const results = await resp.json();
        for (const result of (Array.isArray(results) ? results : [])) {
          const images = result.organicResults || result.images || [];
          for (const img of (Array.isArray(images) ? images : [])) {
            const imageUrl = img.imageUrl || img.url || img.link;
            if (!imageUrl) continue;

            items.push({
              visual_type: 'image',
              source_platform: 'google_images',
              source_url: img.sourceUrl || img.link || imageUrl,
              thumbnail_url: img.thumbnailUrl || imageUrl,
              title: (img.title || keyword).substring(0, 500),
              description: (img.description || img.snippet || '').substring(0, 2000),
              hashtags: destConfig.hashtags,
              language: destConfig.languages[0] || 'en'
            });
          }
        }
      } catch (err) {
        logger.error(`[VisualDiscovery] Google Images "${keyword}" error:`, err.message);
      }
    }

    return items;
  },

  /**
   * Discover from Instagram Business Account (connected via social_accounts)
   * Uses Meta Graph API to fetch recent media from the business page
   */
  async _discoverInstagram(destinationId, destConfig) {
    const items = [];
    try {
      // Get Instagram account for this destination from social_accounts
      const [account] = await mysqlSequelize.query(
        "SELECT metadata FROM social_accounts WHERE destination_id = :destId AND platform = 'instagram' AND status = 'active' LIMIT 1",
        { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
      );
      if (!account) { logger.info('[VisualDiscovery] No active Instagram account for dest ' + destinationId); return []; }

      const metadata = typeof account.metadata === 'string' ? JSON.parse(account.metadata) : account.metadata || {};
      const igAccountId = metadata.igAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      const token = process.env.META_SYSTEM_USER_TOKEN;
      if (!igAccountId || !token) { logger.warn('[VisualDiscovery] Instagram credentials missing'); return []; }

      const resp = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25&access_token=${token}`
      );
      if (!resp.ok) { logger.warn('[VisualDiscovery] Instagram API ' + resp.status); return []; }

      const data = await resp.json();
      for (const post of (data.data || [])) {
        const imageUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
        if (!imageUrl) continue;
        items.push({
          visual_type: post.media_type === 'VIDEO' ? 'video' : post.media_type === 'CAROUSEL_ALBUM' ? 'image' : 'image',
          source_platform: 'instagram',
          source_url: post.permalink || ('https://www.instagram.com/p/' + post.id),
          thumbnail_url: imageUrl,
          title: (post.caption || '').substring(0, 500),
          description: (post.caption || '').substring(0, 2000),
          hashtags: destConfig.hashtags,
          engagement_score: (post.like_count || 0) + (post.comments_count || 0) * 3,
          language: destConfig.languages[0] || 'en'
        });
      }
    } catch (err) {
      logger.error('[VisualDiscovery] Instagram error:', err.message);
    }
    return items;
  },

  /**
   * Discover from Facebook Page (connected via social_accounts)
   * Uses Meta Graph API to fetch recent posts with images/videos
   */
  async _discoverFacebook(destinationId, destConfig) {
    const items = [];
    try {
      const [account] = await mysqlSequelize.query(
        "SELECT metadata FROM social_accounts WHERE destination_id = :destId AND platform = 'facebook' AND status = 'active' LIMIT 1",
        { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
      );
      if (!account) { logger.info('[VisualDiscovery] No active Facebook account for dest ' + destinationId); return []; }

      const metadata = typeof account.metadata === 'string' ? JSON.parse(account.metadata) : account.metadata || {};
      const pageId = metadata.pageId || process.env.META_PAGE_ID;
      const token = process.env.META_SYSTEM_USER_TOKEN;
      if (!pageId || !token) { logger.warn('[VisualDiscovery] Facebook credentials missing'); return []; }

      // Get page access token
      const tokenResp = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${token}`);
      const tokenData = tokenResp.ok ? await tokenResp.json() : {};
      const pageToken = tokenData.access_token || token;

      const resp = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/posts?fields=id,message,full_picture,permalink_url,created_time,shares,reactions.summary(true),comments.summary(true)&limit=25&access_token=${pageToken}`
      );
      if (!resp.ok) { logger.warn('[VisualDiscovery] Facebook API ' + resp.status); return []; }

      const data = await resp.json();
      for (const post of (data.data || [])) {
        if (!post.full_picture) continue; // Only posts with images
        const reactions = post.reactions && post.reactions.summary ? post.reactions.summary.total_count || 0 : 0;
        const comments = post.comments && post.comments.summary ? post.comments.summary.total_count || 0 : 0;
        const shares = post.shares ? post.shares.count || 0 : 0;
        items.push({
          visual_type: 'image',
          source_platform: 'facebook',
          source_url: post.permalink_url || ('https://www.facebook.com/' + post.id),
          thumbnail_url: post.full_picture,
          title: (post.message || '').substring(0, 500),
          description: (post.message || '').substring(0, 2000),
          hashtags: destConfig.hashtags,
          engagement_score: reactions + comments * 3 + shares * 5,
          language: destConfig.languages[0] || 'en'
        });
      }
    } catch (err) {
      logger.error('[VisualDiscovery] Facebook error:', err.message);
    }
    return items;
  },

  /**
   * Discover from Pinterest (search pins by destination keywords)
   * Uses Pinterest API v5
   */
  async _discoverPinterest(destinationId, destConfig) {
    const PINTEREST_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
    if (!PINTEREST_TOKEN) { logger.info('[VisualDiscovery] PINTEREST_ACCESS_TOKEN not set, skipping'); return []; }

    const items = [];
    for (const keyword of destConfig.keywords.slice(0, 2)) {
      try {
        const resp = await fetch(
          'https://api.pinterest.com/v5/search/pins?query=' + encodeURIComponent(keyword) + '&page_size=20',
          { headers: { 'Authorization': 'Bearer ' + PINTEREST_TOKEN } }
        );
        if (!resp.ok) { logger.warn('[VisualDiscovery] Pinterest API ' + resp.status); continue; }

        const data = await resp.json();
        for (const pin of (data.items || [])) {
          const imageUrl = pin.media && pin.media.images && pin.media.images['600x'] ? pin.media.images['600x'].url : null;
          if (!imageUrl) continue;
          items.push({
            visual_type: 'image',
            source_platform: 'pinterest',
            source_url: 'https://www.pinterest.com/pin/' + pin.id,
            thumbnail_url: imageUrl,
            title: (pin.title || keyword).substring(0, 500),
            description: (pin.description || '').substring(0, 2000),
            hashtags: destConfig.hashtags,
            engagement_score: (pin.save_count || 0) + (pin.comment_count || 0) * 2,
            language: destConfig.languages[0] || 'en'
          });
        }
      } catch (err) {
        logger.error('[VisualDiscovery] Pinterest "' + keyword + '" error:', err.message);
      }
    }
    return items;
  },

  /**
   * Save discovered items to DB, skipping duplicates (by source_url)
   */
  async _saveDiscovered(destinationId, platform, items) {
    if (!items || items.length === 0) return 0;

    let saved = 0;
    for (const item of items) {
      try {
        // Check for duplicate by source_url
        const [existing] = await mysqlSequelize.query(
          'SELECT id FROM trending_visuals WHERE destination_id = :destId AND source_url = :url LIMIT 1',
          { replacements: { destId: destinationId, url: item.source_url }, type: QueryTypes.SELECT }
        );

        if (existing) continue;

        await mysqlSequelize.query(
          `INSERT INTO trending_visuals
            (destination_id, visual_type, source_platform, source_url, thumbnail_url, title, description, hashtags, engagement_score, language, status)
           VALUES
            (:destId, :type, :platform, :url, :thumb, :title, :desc, :hashtags, :engagement, :lang, 'discovered')`,
          {
            replacements: {
              destId: destinationId,
              type: item.visual_type,
              platform: platform,
              url: item.source_url,
              thumb: item.thumbnail_url,
              title: (item.title || '').substring(0, 500),
              desc: (item.description || '').substring(0, 5000),
              hashtags: JSON.stringify(item.hashtags || []),
              engagement: item.engagement_score || 0,
              lang: item.language || 'en'
            },
            type: QueryTypes.INSERT
          }
        );
        saved++;
      } catch (err) {
        logger.error(`[VisualDiscovery] Save error:`, err.message);
      }
    }

    return saved;
  },

  /**
   * List trending visuals with filters + pagination
   */
  async listTrending(destinationId, { page = 1, limit = 20, visual_type, source_platform, status, min_score, relevance, sort = 'discovered_at', order = 'DESC' } = {}) {
    const replacements = { destId: destinationId };
    let where = 'WHERE tv.destination_id = :destId';

    if (visual_type) { where += ' AND tv.visual_type = :vtype'; replacements.vtype = visual_type; }
    if (source_platform) { where += ' AND tv.source_platform = :platform'; replacements.platform = source_platform; }
    if (status) { where += ' AND tv.status = :status'; replacements.status = status; }
    if (min_score) { where += ' AND tv.trend_score >= :minScore'; replacements.minScore = parseFloat(min_score); }
    if (relevance) { where += ' AND tv.relevance_category = :relevance'; replacements.relevance = relevance; }

    const allowedSorts = ['discovered_at', 'trend_score', 'engagement_score', 'analyzed_at'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'discovered_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const lim = Math.min(parseInt(limit) || 20, 100);
    const offset = (parseInt(page) - 1) * lim;
    replacements.limit = lim;
    replacements.offset = offset;

    const [countResult] = await mysqlSequelize.query(
      `SELECT COUNT(*) AS total FROM trending_visuals tv ${where}`,
      { replacements, type: QueryTypes.SELECT }
    );

    const items = await mysqlSequelize.query(
      `SELECT tv.*, m.filename AS media_filename, m.alt_text AS media_alt
       FROM trending_visuals tv
       LEFT JOIN media m ON tv.media_id = m.id
       ${where} ORDER BY tv.${sortCol} ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );

    return {
      items,
      total: countResult?.total || 0,
      page: parseInt(page),
      limit: lim,
      pages: Math.ceil((countResult?.total || 0) / lim)
    };
  },

  /**
   * Get single trending visual by ID
   */
  async getTrendingById(id, destinationId) {
    const [item] = await mysqlSequelize.query(
      `SELECT tv.*, m.filename AS media_filename, m.alt_text AS media_alt
       FROM trending_visuals tv
       LEFT JOIN media m ON tv.media_id = m.id
       WHERE tv.id = :id AND tv.destination_id = :destId`,
      { replacements: { id, destId: destinationId }, type: QueryTypes.SELECT }
    );
    return item || null;
  },

  /**
   * Dismiss a trending visual
   */
  async dismissTrending(id, destinationId) {
    const [result] = await mysqlSequelize.query(
      `UPDATE trending_visuals SET status = 'dismissed' WHERE id = :id AND destination_id = :destId`,
      { replacements: { id, destId: destinationId }, type: QueryTypes.UPDATE }
    );
    return result > 0;
  },

  /**
   * Get discovery stats per destination
   */
  async getDiscoveryStats(destinationId) {
    const stats = await mysqlSequelize.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'discovered') AS discovered,
         SUM(status = 'analyzed') AS analyzed,
         SUM(status = 'saved') AS saved,
         SUM(status = 'used') AS used,
         SUM(status = 'dismissed') AS dismissed,
         SUM(visual_type = 'image') AS images,
         SUM(visual_type = 'video') AS videos,
         SUM(visual_type = 'reel') AS reels
       FROM trending_visuals WHERE destination_id = :destId`,
      { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
    );
    return stats[0] || {};
  }
};

export default visualTrendDiscovery;
