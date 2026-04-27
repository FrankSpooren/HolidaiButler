/**
 * Meta Graph API Client — Facebook + Instagram Publishing
 * Uses System User Token (no OAuth needed).
 *
 * Facebook: POST /{page-id}/feed (text), /{page-id}/photos (image)
 * Instagram: Two-step container flow (create media → publish)
 */

import SocialAccount from '../../../../models/SocialAccount.js';
import logger from '../../../../utils/logger.js';

const META_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v25.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

class MetaClient {
  constructor(subPlatform = 'facebook') {
    this.subPlatform = subPlatform; // 'facebook' or 'instagram'
  }

  /**
   * Publish content to Facebook or Instagram
   * @param {Object} contentItem - Content item with body, social_metadata, etc.
   * @returns {Object} { postId, url }
   */
  async publish(contentItem) {
    const accessToken = this._getAccessToken(contentItem);

    if (this.subPlatform === 'instagram') {
      return this._publishToInstagram(contentItem, accessToken);
    }
    return this._publishToFacebook(contentItem, accessToken);
  }

  /**
   * Publish to Facebook Page
   */
  async _publishToFacebook(contentItem, systemToken) {
    const pageId = contentItem.platform_account_id || process.env.META_PAGE_ID;
    logger.info(`[MetaClient] Publishing to Facebook page ${pageId} (from ${contentItem.platform_account_id ? 'social_accounts' : 'env'})`);

    const exchangeToken = systemToken || process.env.META_PAGE_ACCESS_TOKEN;
    const accessToken = await this._getPageAccessToken(exchangeToken, pageId);
    const message = this._getPostBody(contentItem);
    const metadata = contentItem.social_metadata ? JSON.parse(contentItem.social_metadata) : {};

    // ── Multi-image support: upload each as unpublished, then create feed post ──
    const imageUrls = metadata.image_urls || [];
    if (metadata.image_url && !imageUrls.includes(metadata.image_url)) {
      imageUrls.unshift(metadata.image_url);
    }

    if (imageUrls.length > 1) {
      // Step 1: Upload each photo as unpublished
      const photoIds = [];
      for (const imgUrl of imageUrls) {
        const photoRes = await fetch(`${META_API_BASE}/${pageId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: imgUrl, published: false, access_token: accessToken }),
        });
        const photoData = await photoRes.json();
        if (photoData.error) {
          logger.warn(`[MetaClient] Facebook photo upload failed for ${imgUrl}: ${photoData.error.message}`);
          continue;
        }
        if (photoData.id) photoIds.push(photoData.id);
      }

      if (photoIds.length > 0) {
        // Step 2: Create feed post with attached_media
        const feedBody = { message, access_token: accessToken };
        if (metadata.link) feedBody.link = metadata.link;
        photoIds.forEach((pid, idx) => { feedBody[`attached_media[${idx}]`] = JSON.stringify({ media_fbid: pid }); });

        const feedRes = await fetch(`${META_API_BASE}/${pageId}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedBody),
        });
        const feedData = await feedRes.json();
        if (feedData.error) {
          throw new Error(`Facebook multi-photo publish failed: ${feedData.error.message}`);
        }
        return { postId: feedData.id, url: `https://facebook.com/${feedData.id}`, platform: 'facebook' };
      }
    }

    // ── Single image or text-only fallback ──
    let endpoint = `${META_API_BASE}/${pageId}/feed`;
    const body = { message, access_token: accessToken };

    if (metadata.link) {
      body.link = metadata.link;
    }

    if (imageUrls.length === 1 || metadata.image_url) {
      endpoint = `${META_API_BASE}/${pageId}/photos`;
      body.url = imageUrls[0] || metadata.image_url;
      body.caption = message;
      delete body.message;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(`Facebook publish failed: ${data.error.message}`);
    }

    const postId = data.id || data.post_id;
    return { postId, url: `https://facebook.com/${postId}`, platform: 'facebook' };
  }

  /**
   * Publish to Instagram (two-step container flow)
   * Uses per-destination IG Business Account ID from social_accounts.metadata.igAccountId,
   * falls back to env INSTAGRAM_BUSINESS_ACCOUNT_ID for backward compatibility.
   */
  /**
   * Upload image to Facebook Page as unpublished photo, return CDN URL.
   * Instagram container API cannot fetch from our server directly,
   * but Facebook CAN. We use Facebook as a CDN intermediary.
   */
  async _uploadToFbCdn(imageUrl, pageId, accessToken) {
    // Step 1: Upload as unpublished photo
    const uploadRes = await fetch(`${META_API_BASE}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, published: false, access_token: accessToken }),
    });
    const uploadData = await uploadRes.json();
    if (uploadData.error || !uploadData.id) {
      logger.warn(`[MetaClient] FB CDN upload failed for ${imageUrl}: ${uploadData.error?.message || 'no id'}`);
      return null;
    }

    // Step 2: Get CDN URL from the uploaded photo
    const photoRes = await fetch(`${META_API_BASE}/${uploadData.id}?fields=images&access_token=${accessToken}`);
    const photoData = await photoRes.json();
    const cdnUrl = photoData.images?.[0]?.source;
    if (!cdnUrl) {
      logger.warn(`[MetaClient] FB CDN URL not found for photo ${uploadData.id}`);
      return null;
    }

    logger.info(`[MetaClient] FB CDN upload OK: ${imageUrl.substring(0, 60)} -> ${cdnUrl.substring(0, 60)}`);
    return cdnUrl;
  }

  /**
   * Create Instagram carousel for multiple images
   */
  async _publishCarousel(igAccountId, imageUrls, caption, publishToken) {
    // Step 1: Create child containers for each image
    const childIds = [];
    for (const imgUrl of imageUrls) {
      const childRes = await fetch(`${META_API_BASE}/${igAccountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imgUrl,
          is_carousel_item: true,
          access_token: publishToken,
        }),
      });
      const childData = await childRes.json();
      if (childData.error) {
        logger.warn(`[MetaClient] Instagram carousel child failed for ${imgUrl}: ${childData.error.message}`);
        continue;
      }
      if (childData.id) childIds.push(childData.id);
    }

    if (childIds.length === 0) {
      throw new Error('Instagram carousel: no child containers created successfully');
    }

    // Step 2: Create carousel container
    const carouselRes = await fetch(`${META_API_BASE}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption,
        access_token: publishToken,
      }),
    });
    const carouselData = await carouselRes.json();
    if (carouselData.error) {
      throw new Error(`Instagram carousel creation failed: ${carouselData.error.message}`);
    }

    // Step 3: Wait for carousel container to be ready (status FINISHED)
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const statusRes = await fetch(`${META_API_BASE}/${carouselData.id}?fields=status_code&access_token=${publishToken}`);
      const statusData = await statusRes.json();
      logger.info(`[MetaClient] Carousel status check ${attempt + 1}: ${statusData.status_code || 'unknown'}`);
      if (statusData.status_code === 'FINISHED') { ready = true; break; }
      if (statusData.status_code === 'ERROR') {
        throw new Error(`Instagram carousel processing failed: ${statusData.status || 'unknown error'}`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if (!ready) {
      throw new Error('Instagram carousel processing timed out after 60 seconds');
    }

    // Step 4: Publish carousel
    const publishResponse = await fetch(`${META_API_BASE}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: carouselData.id,
        access_token: publishToken,
      }),
    });
    const publishData = await publishResponse.json();
    if (publishData.error) {
      throw new Error(`Instagram carousel publish failed: ${publishData.error.message}`);
    }
    return publishData;
  }

  async _publishToInstagram(contentItem, accessToken) {
    // Per-destination IG account ID from social_accounts.metadata
    let igAccountId = null;
    try {
      const accountMeta = contentItem.account_metadata
        ? (typeof contentItem.account_metadata === 'string' ? JSON.parse(contentItem.account_metadata) : contentItem.account_metadata)
        : {};
      igAccountId = accountMeta.igAccountId || null;
    } catch { /* parse error */ }
    if (!igAccountId) {
      igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    }
    if (!igAccountId) {
      throw new Error('Instagram Business Account ID not configured. Set igAccountId in social_accounts metadata or INSTAGRAM_BUSINESS_ACCOUNT_ID env var.');
    }
    // Get the Facebook Page ID connected to this IG account (needed for page token exchange)
    let fbPageId = null;
    try {
      const accountMeta2 = contentItem.account_metadata
        ? (typeof contentItem.account_metadata === 'string' ? JSON.parse(contentItem.account_metadata) : contentItem.account_metadata)
        : {};
      fbPageId = accountMeta2.pageId || contentItem.platform_account_id || null;
    } catch { /* */ }

    // Exchange system user token for page token (same as Facebook flow)
    let publishToken = accessToken;
    if (fbPageId) {
      publishToken = await this._getPageAccessToken(accessToken, fbPageId);
    }

    logger.info(`[MetaClient] Publishing to Instagram account ${igAccountId} (from ${contentItem.account_metadata ? 'social_accounts' : 'env'}, page token: ${fbPageId ? 'yes' : 'no'})`);
    const caption = this._getPostBody(contentItem);
    const metadata = contentItem.social_metadata ? JSON.parse(contentItem.social_metadata) : {};

    // Check for multi-image carousel
    const imageUrls = metadata.image_urls || [];
    if (metadata.image_url && !imageUrls.includes(metadata.image_url)) {
      imageUrls.unshift(metadata.image_url);
    }

    if (imageUrls.length === 0) {
      throw new Error('Instagram posts require an image_url in social_metadata');
    }

    // Upload images to Facebook CDN first (Instagram cannot fetch from our server directly)
    const cdnPageId = fbPageId || contentItem.platform_account_id;
    if (cdnPageId) {
      logger.info(`[MetaClient] Uploading ${imageUrls.length} images to FB CDN for Instagram`);
      for (let i = 0; i < imageUrls.length; i++) {
        const cdnUrl = await this._uploadToFbCdn(imageUrls[i], cdnPageId, publishToken);
        if (cdnUrl) imageUrls[i] = cdnUrl;
      }
    }

    // Multi-image: use carousel flow
    if (imageUrls.length > 1) {
      logger.info(`[MetaClient] Publishing Instagram carousel with ${imageUrls.length} images`);
      const publishData = await this._publishCarousel(igAccountId, imageUrls, caption, publishToken);
      return {
        postId: publishData.id,
        url: `https://instagram.com/p/${publishData.id}`,
        platform: 'instagram',
      };
    }

    // Single image
    const imageUrl = imageUrls[0] || metadata.image_url;
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      throw new Error(`Instagram image_url must be a public HTTP(S) URL, got: ${String(imageUrl).substring(0, 100)}`);
    }

    // Step 1: Create media container
    const containerResponse = await fetch(`${META_API_BASE}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: publishToken,
      }),
    });

    const containerData = await containerResponse.json();
    if (containerData.error) {
      throw new Error(`Instagram container creation failed: ${containerData.error.message}`);
    }

    // Step 2: Wait for container to be ready
    for (let attempt = 0; attempt < 30; attempt++) {
      const statusRes = await fetch(`${META_API_BASE}/${containerData.id}?fields=status_code&access_token=${publishToken}`);
      const statusData = await statusRes.json();
      if (statusData.status_code === 'FINISHED') break;
      if (statusData.status_code === 'ERROR') {
        throw new Error(`Instagram media processing failed`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 3: Publish the container
    const publishResponse = await fetch(`${META_API_BASE}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: publishToken,
      }),
    });

    const publishData = await publishResponse.json();
    if (publishData.error) {
      throw new Error(`Instagram publish failed: ${publishData.error.message}`);
    }

    return {
      postId: publishData.id,
      url: `https://instagram.com/p/${publishData.id}`,
      platform: 'instagram',
    };
  }

  /**
   * Get post analytics from Meta Insights API
   */
  async getAnalytics(contentItem) {
    const systemToken = this._getAccessToken(contentItem);
    const postId = contentItem.platform_post_id;
    const pageId = process.env.META_PAGE_ID;

    try {
      // Exchange System User token for Page token (required for page-level reads)
      const accessToken = await this._getPageAccessToken(systemToken, pageId);

      if (this.subPlatform === 'instagram') {
        const response = await fetch(
          `${META_API_BASE}/${postId}/insights?metric=impressions,reach,engagement&access_token=${accessToken}`
        );
        const data = await response.json();
        if (data.error) {
          logger.warn(`[MetaClient] Instagram analytics error for ${postId}: ${data.error.message}`);
          return null;
        }
        const values = {};
        for (const metric of (data.data || [])) {
          values[metric.name] = metric.values?.[0]?.value || 0;
        }
        return { views: values.impressions || 0, reach: values.reach || 0, engagement: values.engagement || 0, clicks: 0, conversions: 0, raw: values };
      }

      // Facebook: use basic post fields (works for all post types)
      const response = await fetch(
        `${META_API_BASE}/${postId}?fields=shares,likes.summary(true),comments.summary(true)&access_token=${accessToken}`
      );
      const data = await response.json();
      if (data.error) {
        logger.warn(`[MetaClient] Facebook analytics error for ${postId}: ${data.error.message}`);
        return null;
      }

      const likes = data.likes?.summary?.total_count || 0;
      const comments = data.comments?.summary?.total_count || 0;
      const shares = data.shares?.count || 0;

      return {
        views: 0,
        reach: 0,
        engagement: likes + comments + shares,
        clicks: 0,
        conversions: 0,
        raw: { likes, comments, shares },
      };
    } catch (err) {
      logger.warn(`[MetaClient] Analytics fetch failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Get the appropriate post body text for the content item
   */
  _getPostBody(contentItem) {
    // Use account target_language (from social_accounts), fallback to content language
    const lang = contentItem.account_target_language || contentItem.language || 'en';
    const preferred = contentItem['body_' + lang];
    if (preferred) return preferred;
    // Fallback: nl -> en -> de -> es -> title
    return contentItem.body_nl || contentItem.body_en || contentItem.body_de || contentItem.body_es || contentItem.title;
  }

  /**
   * Get access token — System User token → exchange for Page token
   */
  _getAccessToken(contentItem) {
    // Prefer encrypted token from social_accounts, fallback to env
    if (contentItem.access_token_encrypted) {
      try {
        return SocialAccount.decryptToken(contentItem.access_token_encrypted);
      } catch (e) {
        logger.warn('[MetaClient] Failed to decrypt token, using env fallback');
      }
    }
    return process.env.META_PAGE_ACCESS_TOKEN;
  }

  /**
   * Exchange System User token for Page Access Token (required for page-level API calls)
   */
  async _getPageAccessToken(systemUserToken, pageId) {
    if (!this._pageTokenCache) this._pageTokenCache = {};
    if (this._pageTokenCache[pageId] && this._pageTokenCache[pageId].expires > Date.now()) {
      return this._pageTokenCache[pageId].token;
    }
    try {
      const response = await fetch(`${META_API_BASE}/me/accounts?access_token=${systemUserToken}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const page = (data.data || []).find(p => p.id === pageId);
      if (page?.access_token) {
        this._pageTokenCache[pageId] = { token: page.access_token, expires: Date.now() + 3600000 };
        return page.access_token;
      }
    } catch (e) {
      logger.warn(`[MetaClient] Page token exchange failed: ${e.message}`);
    }
    return systemUserToken; // fallback
  }
}

export default MetaClient;
