/**
 * De Uitgever Agent (#25) — Publisher Agent
 * Orchestrates content publishing to social media platforms.
 * Both on-demand (publish now) and scheduled (publish at datetime).
 *
 * @version 1.0.0
 */

import BaseAgent from '../base/BaseAgent.js';
import { getClient } from './clients/platformClientFactory.js';
import { sanitizeContent } from '../contentRedacteur/contentSanitizer.js';
import { applyUtmToContent } from './utmBuilder.js';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';
import logger from '../../../utils/logger.js';
import { mysqlSequelize } from '../../../config/database.js';

class PublisherAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Uitgever',
      version: '1.0.0',
      category: 'content',
      destinationAware: true,
    });
  }

  /**
   * Publish a content item to its target platform
   * @param {number} contentItemId
   * @returns {Object} Publish result with post URL
   */
  async publishItem(contentItemId, options = {}) {
    const [items] = await mysqlSequelize.query(
      `SELECT ci.*, sa.id as social_account_id, sa.access_token_encrypted, sa.account_id as platform_account_id,
              sa.metadata as account_metadata, sa.status as account_status, sa.target_language as account_target_language
       FROM content_items ci
       LEFT JOIN social_accounts sa ON sa.destination_id = ci.destination_id AND sa.platform = ci.target_platform AND sa.status = 'active'
       WHERE ci.id = :id`,
      { replacements: { id: contentItemId }, type: mysqlSequelize.QueryTypes.SELECT }
    );

    const item = Array.isArray(items) ? items : [items];
    if (!item.length || !item[0]) {
      throw new Error(`Content item ${contentItemId} not found`);
    }
    const contentItem = item[0] || items;

    // v4.93.0 CRITICAL DEDUPE GUARD — voorkomt elke duplicate publicatie
    // Indien item al gepubliceerd (publish_url OR published_at gezet) → block re-publish
    if (contentItem.publish_url || contentItem.published_at) {
      const err = new Error(`Item ${contentItemId} reeds gepubliceerd (publish_url: ${contentItem.publish_url || 'set'}, published_at: ${contentItem.published_at || 'set'}). Re-publish geblokkeerd door dedupe-guard.`);
      err.code = 'ALREADY_PUBLISHED';
      err.statusCode = 409;
      logger.warn(`[Publisher] DEDUPE-GUARD blocked re-publish of item ${contentItemId}: ${err.message}`);
      throw err;
    }

    // v4.93.0 STATUS GUARD — alleen items in publish-able state mogen
    if (!['approved', 'scheduled', 'publishing', 'failed'].includes(contentItem.approval_status)) {
      const err = new Error(`Item ${contentItemId} state '${contentItem.approval_status}' is not publish-able. Allowed: approved, scheduled, publishing, failed.`);
      err.code = 'INVALID_STATE_FOR_PUBLISH';
      err.statusCode = 409;
      logger.warn(`[Publisher] STATUS-GUARD blocked publish of item ${contentItemId}: ${err.message}`);
      throw err;
    }

    // v4.93.0 FUTURE-SCHEDULE GUARD — block publish wanneer scheduled_at in toekomst
    // Voorkomt vroege publicatie via direct publishItem() calls (bv. tests, manual triggers)
    // Override via options.force=true voor expliciete "publish-now" use cases (UI button)
    if (contentItem.scheduled_at && !options?.force) {
      const scheduledTime = new Date(contentItem.scheduled_at).getTime();
      const now = Date.now();
      if (scheduledTime > now) {
        const err = new Error(`Item ${contentItemId} is scheduled for ${contentItem.scheduled_at} (in toekomst). Publish geweigerd. Wacht tot scheduled tijd, of gebruik publishNow met expliciete force=true override.`);
        err.code = 'PUBLISH_TOO_EARLY';
        err.statusCode = 409;
        logger.warn(`[Publisher] FUTURE-SCHEDULE-GUARD blocked publish of item ${contentItemId}: scheduled_at=${contentItem.scheduled_at}, now=${new Date(now).toISOString()}`);
        throw err;
      }
    }

    if (!contentItem.social_account_id) {
      throw new Error(`No active social account for platform '${contentItem.target_platform}' on destination ${contentItem.destination_id}`);
    }

    // Update status to publishing
    await mysqlSequelize.query(
      `UPDATE content_items SET approval_status = 'publishing', updated_at = NOW() WHERE id = :id`,
      { replacements: { id: contentItemId } }
    );

    try {
      // Sanitize content one final time before publishing (safety net)
      // Use social account's target_language (multi-tenant), fallback to content item language
      const lang = contentItem.account_target_language || contentItem.language || 'en';
      const bodyField = `body_${lang}`;
      if (contentItem[bodyField]) {
        contentItem[bodyField] = sanitizeContent(contentItem[bodyField], contentItem.content_type, contentItem.target_platform);
        // Apply UTM tracking to all URLs in the content
        contentItem[bodyField] = applyUtmToContent(contentItem[bodyField], contentItem, contentItem.target_platform);
      } else if (contentItem.body_en) {
        contentItem.body_en = sanitizeContent(contentItem.body_en, contentItem.content_type, contentItem.target_platform);
        contentItem.body_en = applyUtmToContent(contentItem.body_en, contentItem, contentItem.target_platform);
      }

      // Also add UTM-tagged destination URL to social_metadata if no link present
      if (contentItem.target_platform !== 'website') {
        try {
          const [[dest]] = await mysqlSequelize.query(
            'SELECT domain FROM destinations WHERE id = :id',
            { replacements: { id: contentItem.destination_id } }
          );
          if (dest?.domain) {
            const baseUrl = `https://${dest.domain}`;
            const trackedUrl = applyUtmToContent(baseUrl, contentItem, contentItem.target_platform);
            // Ensure social_metadata has the tracked link
            let meta = {};
            try { meta = typeof contentItem.social_metadata === 'string' ? JSON.parse(contentItem.social_metadata) : (contentItem.social_metadata || {}); } catch (err) { console.debug('[index.js] :', err.message); }
            if (!meta.link) {
              meta.link = trackedUrl;
              contentItem.social_metadata = JSON.stringify(meta);
            }
          }
        } catch (err) { console.debug('[index.js] non-blocking — UTM link is nice-to-have:', err.message); }
      }

      // Auto-crop attached images to platform-conformant dimensions (TO DO 4b+4d)
      // === RESOLVE FIRST media_id TO PUBLIC URL FOR PLATFORM EMBED ===
      // Supports all media_id formats: "poi:N", numeric (media library), HTTP URL, "/path".
      // Without this, FB/Insta posts go out without an image and Facebook falls back
      // to the link's og:image (which is the corporate logo on calpetrip.com).
      if (contentItem.media_ids && contentItem.target_platform !== 'website') {
        try {
          let mediaIds = typeof contentItem.media_ids === 'string' ? JSON.parse(contentItem.media_ids) : (contentItem.media_ids || []);
          if (mediaIds.length > 0) {
            const imageBase = process.env.IMAGE_BASE_URL || 'https://api.holidaibutler.com';
            const apiBase = process.env.API_BASE_URL || 'https://api.holidaibutler.com';

            // Helper: resolve a POI imageurls.id to URL (prefer local_path)
            const resolvePoiImage = async (imgId) => {
              if (isNaN(imgId) || imgId <= 0) return null;
              const [[img]] = await mysqlSequelize.query(
                'SELECT id, local_path, image_url FROM imageurls WHERE id = :id',
                { replacements: { id: imgId } }
              );
              if (!img) return null;
              return img.local_path ? `${imageBase}${img.local_path}` : img.image_url;
            };
            // Helper: resolve a media library id to URL
            const resolveMediaLibrary = async (mediaIdNum) => {
              if (isNaN(mediaIdNum) || mediaIdNum <= 0) return null;
              const [[media]] = await mysqlSequelize.query(
                'SELECT id, filename, destination_id FROM media WHERE id = :id',
                { replacements: { id: mediaIdNum } }
              );
              if (!media) return null;
              return `${apiBase}/media-files/${media.destination_id}/${media.filename}`;
            };
            // Helper: resolve any media_id format to URL
            const resolveOneMediaId = async (mid) => {
              if (typeof mid === 'string' && (mid.startsWith('http://') || mid.startsWith('https://'))) return mid;
              if (typeof mid === 'string' && mid.startsWith('/')) return `${apiBase}${mid}`;
              if (typeof mid === 'string' && mid.startsWith('poi:')) return resolvePoiImage(Number(mid.slice(4)));
              if (typeof mid === 'string' && mid.startsWith('media:')) return resolveMediaLibrary(Number(mid.slice(6)));
              if (typeof mid === 'number' || (typeof mid === 'string' && /^\d+$/.test(mid))) {
                const num = Number(mid);
                return (await resolveMediaLibrary(num)) || (await resolvePoiImage(num));
              }
              return null;
            };

            // Resolve ALL media_ids (not just the first)
            const resolvedUrls = [];
            for (const mid of mediaIds) {
              const url = await resolveOneMediaId(mid);
              if (url) resolvedUrls.push(url);
            }

            if (resolvedUrls.length > 0) {
              let meta = {};
              try { meta = typeof contentItem.social_metadata === 'string' ? JSON.parse(contentItem.social_metadata) : (contentItem.social_metadata || {}); } catch (err) { console.debug('[index.js] :', err.message); }
              meta.image_url = resolvedUrls[0];
              if (resolvedUrls.length > 1) {
                meta.image_urls = resolvedUrls;
              }
              contentItem.social_metadata = JSON.stringify(meta);
              logger.info(`[Publisher] Resolved ${resolvedUrls.length} media_ids for ${contentItem.target_platform}: ${resolvedUrls.map(u => u.substring(0, 60)).join(', ')}`);
            } else {
              logger.warn(`[Publisher] Could not resolve any media_ids for item ${contentItemId} - post will be text-only`);
            }
          }
        } catch (resolveErr) {
          logger.warn(`[Publisher] Media resolution failed (non-blocking):`, resolveErr.message);
        }
      }

      const client = getClient(contentItem.target_platform);
      const result = await client.publish(contentItem);

      // v4.94 Blok 1.1 — Graph API publish-confirmation
      // Verifieert dat de post daadwerkelijk live staat (root-cause Bosma duplicate-publish 14 mei).
      // Bij verificatie-falen: publish_url + platform_post_id WORDEN gezet (dedupe-guard blokkeert
      // re-publish), maar status='failed' + publish_error voor ops-review.
      // Clients zonder confirmPublish (LinkedIn/Pinterest/X) → verificatie skipped (backward-compat).
      if (typeof client.confirmPublish === 'function') {
        let confirmation;
        try {
          confirmation = await client.confirmPublish(contentItem, result.postId);
        } catch (verifyErr) {
          confirmation = { confirmed: false, retries: 0, error: verifyErr.message, platform: contentItem.target_platform };
        }
        if (!confirmation?.confirmed) {
          const verifyError = `Graph API verificatie faalde voor postId=${result.postId} (${confirmation?.platform || contentItem.target_platform}, ${confirmation?.retries || 0} retries): ${confirmation?.error || 'onbekend'}. Handmatige review vereist.`;
          await mysqlSequelize.query(
            `UPDATE content_items SET approval_status = 'failed',
               publish_url = :url, platform_post_id = :postId,
               publish_error = :error, updated_at = NOW() WHERE id = :id`,
            { replacements: {
              url: result.url || null,
              postId: result.postId || null,
              error: verifyError,
              id: contentItemId,
            } }
          );
          logger.error(`[Publisher] VERIFICATION FAILED for item ${contentItemId}: ${verifyError}`);
          await logError('publisher', new Error(verifyError), { action: 'verification-failed', destination_id: contentItem.destination_id, contentItemId, postId: result.postId, platform: contentItem.target_platform, retries: confirmation?.retries || 0 });
          const err = new Error(verifyError);
          err.code = 'PUBLISH_VERIFICATION_FAILED';
          err.alreadyHandled = true;
          throw err;
        }
        logger.info(`[Publisher] Graph verify CONFIRMED item ${contentItemId} postId=${result.postId} platform=${contentItem.target_platform} retries=${confirmation.retries}`);
      } else {
        logger.info(`[Publisher] No confirmPublish() on ${contentItem.target_platform} client — verification skipped (backward-compat)`);
      }

      // Update to published
      await mysqlSequelize.query(
        `UPDATE content_items SET approval_status = 'published', published_at = NOW(), publish_url = :url, platform_post_id = :postId, publish_error = NULL, updated_at = NOW() WHERE id = :id`,
        { replacements: { url: result.url || null, postId: result.postId || null, id: contentItemId } }
      );
      // Sync concept status after publish
      try { const [[pi]] = await mysqlSequelize.query('SELECT concept_id FROM content_items WHERE id = :id', { replacements: { id } }); if (pi?.concept_id) { const [its] = await mysqlSequelize.query("SELECT approval_status FROM content_items WHERE concept_id = :cid AND approval_status != 'deleted'", { replacements: { cid: pi.concept_id } }); const prio = ['draft','generating','pending_review','in_review','reviewed','rejected','approved','failed','scheduled','publishing','published']; let h=0; for(const it of its){const i=prio.indexOf(it.approval_status);if(i>h)h=i;} await mysqlSequelize.query('UPDATE content_concepts SET approval_status = :s, updated_at = NOW() WHERE id = :cid', { replacements: { s: prio[h]||'draft', cid: pi.concept_id } }); } } catch(e) { /* non-blocking */ }

// Track media usage — increment usage_count for media items used in this content      try {        const mediaIds = typeof contentItem.media_ids === "string" ? JSON.parse(contentItem.media_ids) : contentItem.media_ids;        if (Array.isArray(mediaIds) && mediaIds.length > 0) {          for (const mid of mediaIds) {            const numId = typeof mid === "string" && mid.startsWith("media:") ? parseInt(mid.replace("media:", "")) : parseInt(mid);            if (!isNaN(numId) && numId > 0) {              await mysqlSequelize.query("UPDATE media SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = ?", { replacements: [numId] });            }          }        }      } catch (usageErr) { /* non-critical */ }
      await logAgent('publisher', contentItem.destination_id, 'content-published', {
        contentItemId,
        platform: contentItem.target_platform,
        postId: result.postId,
        url: result.url,
      });

      // Create initial performance record so item is immediately visible in Analytics
      try {
        await mysqlSequelize.query(
          `INSERT INTO content_performance (content_item_id, destination_id, platform, measured_at, views, clicks, engagement, reach, conversions, raw_metrics, created_at)
           VALUES (:itemId, :destId, :platform, CURDATE(), 0, 0, 0, 0, 0, '{}', NOW())
           ON DUPLICATE KEY UPDATE created_at = created_at`,
          { replacements: { itemId: contentItemId, destId: contentItem.destination_id, platform: contentItem.target_platform } }
        );
      } catch (perfErr) {
        logger.warn(`[De Uitgever] Initial performance record failed (non-blocking): ${perfErr.message}`);
      }

      return result;
    } catch (error) {
      // v4.94 — verification-failure UPDATE is reeds gedaan met publish_url gezet (dedupe-bescherming).
      // Skip generic UPDATE zodat we publish_url/platform_post_id niet wissen.
      if (!error?.alreadyHandled) {
        await mysqlSequelize.query(
          `UPDATE content_items SET approval_status = 'failed', publish_error = :error, updated_at = NOW() WHERE id = :id`,
          { replacements: { error: error.message, id: contentItemId } }
        );
      }
      // Sync concept status after publish failure
      try { const [[fi]] = await mysqlSequelize.query('SELECT concept_id FROM content_items WHERE id = :id', { replacements: { id } }); if (fi?.concept_id) { const [its] = await mysqlSequelize.query("SELECT approval_status FROM content_items WHERE concept_id = :cid AND approval_status != 'deleted'", { replacements: { cid: fi.concept_id } }); const prio = ['draft','generating','pending_review','in_review','reviewed','rejected','approved','failed','scheduled','publishing','published']; let h=0; for(const it of its){const i=prio.indexOf(it.approval_status);if(i>h)h=i;} await mysqlSequelize.query('UPDATE content_concepts SET approval_status = :s, updated_at = NOW() WHERE id = :cid', { replacements: { s: prio[h]||'draft', cid: fi.concept_id } }); } } catch(e) { /* non-blocking */ }

      await logError('publisher', error, { action: 'publish-failed', destination_id: contentItem.destination_id });
      throw error;
    }
  }

  /**
   * Collect analytics for published content items
   * @param {number} destinationId
   */
  async collectAnalytics(destinationId) {
    const [publishedItems] = await mysqlSequelize.query(
      `SELECT ci.id, ci.target_platform, ci.platform_post_id, ci.destination_id,
              sa.access_token_encrypted, sa.account_id as platform_account_id, sa.metadata as account_metadata
       FROM content_items ci
       JOIN social_accounts sa ON sa.destination_id = ci.destination_id AND sa.platform = ci.target_platform AND sa.status = 'active'
       WHERE ci.destination_id = :destId AND ci.approval_status = 'published' AND ci.platform_post_id IS NOT NULL`,
      { replacements: { destId: destinationId } }
    );

    const results = [];
    for (const item of (publishedItems || [])) {
      try {
        const client = getClient(item.target_platform);
        if (client.getAnalytics) {
          const metrics = await client.getAnalytics(item);
          if (metrics) {
            await mysqlSequelize.query(
              `INSERT INTO content_performance (content_item_id, destination_id, platform, measured_at, views, clicks, engagement, reach, conversions, raw_metrics, created_at)
               VALUES (:itemId, :destId, :platform, CURDATE(), :views, :clicks, :engagement, :reach, :conversions, :rawData, NOW())
               ON DUPLICATE KEY UPDATE views = :views, clicks = :clicks, engagement = :engagement, reach = :reach, conversions = :conversions, raw_metrics = :rawData`,
              {
                replacements: {
                  itemId: item.id, destId: destinationId, platform: item.target_platform,
                  views: metrics.views || 0, clicks: metrics.clicks || 0,
                  engagement: metrics.engagement || 0, reach: metrics.reach || 0,
                  conversions: metrics.conversions || 0, rawData: JSON.stringify(metrics.raw || {}),
                },
              }
            );
            results.push({ itemId: item.id, platform: item.target_platform, metrics });
          }
        }
      } catch (err) {
        logger.warn(`[De Uitgever] Analytics collection failed for item ${item.id}: ${err.message}`);
      }
    }

    await logAgent('publisher', destinationId, 'analytics-collected', { count: results.length });
    return results;
  }

  /**
   * Process scheduled publish — called by BullMQ worker
   * Finds content items with scheduled_at <= now and publishes them
   */
  async processScheduledPublications() {
    // v4.93.0 DEDUPE in query: filter items die al published_at OR publish_url hebben
    // Defense-in-depth: zelfs als query niet zou filteren, publishItem dedupe-guard zou blocken
    const [scheduled] = await mysqlSequelize.query(
      `SELECT id, destination_id FROM content_items
       WHERE approval_status = 'scheduled'
         AND scheduled_at <= NOW()
         AND published_at IS NULL
         AND (publish_url IS NULL OR publish_url = '')`,
      { type: mysqlSequelize.QueryTypes.SELECT }
    );

    const items = Array.isArray(scheduled) ? scheduled : (scheduled ? [scheduled] : []);
    const results = [];
    for (const item of items) {
      try {
        const result = await this.publishItem(item.id);
        results.push({ id: item.id, status: 'published', ...result });
      } catch (err) {
        results.push({ id: item.id, status: 'failed', error: err.message });
      }
    }

    if (results.length > 0) {
      logger.info(`[De Uitgever] Processed ${results.length} scheduled publications`);
    }
    return results;
  }

  /**
   * BaseAgent runForDestination — collects analytics for the destination
   */
  async runForDestination(destinationId) {
    const analytics = await this.collectAnalytics(destinationId);
    return {
      status: 'completed',
      destinationId,
      analyticsCollected: analytics.length,
    };
  }
}

const publisherAgent = new PublisherAgent();
export default publisherAgent;
