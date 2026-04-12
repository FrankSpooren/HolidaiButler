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
    // Use page ID from social_accounts (per-destination), fallback to env
    const pageId = contentItem.platform_account_id || process.env.META_PAGE_ID;
    logger.info(`[MetaClient] Publishing to Facebook page ${pageId} (from ${contentItem.platform_account_id ? 'social_accounts' : 'env'})`);

    // Always use the System User token from env for page token exchange (social_accounts token decryption may fail)
    const exchangeToken = process.env.META_PAGE_ACCESS_TOKEN || systemToken;
    const accessToken = await this._getPageAccessToken(exchangeToken, pageId);
    const message = this._getPostBody(contentItem);
    const metadata = contentItem.social_metadata ? JSON.parse(contentItem.social_metadata) : {};

    let endpoint = `${META_API_BASE}/${pageId}/feed`;
    const body = { message, access_token: accessToken };

    // If there's a link, add it
    if (metadata.link) {
      body.link = metadata.link;
    }

    // If there's an image URL, use photos endpoint
    if (metadata.image_url) {
      endpoint = `${META_API_BASE}/${pageId}/photos`;
      body.url = metadata.image_url;
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
    return {
      postId,
      url: `https://facebook.com/${postId}`,
      platform: 'facebook',
    };
  }

  /**
   * Publish to Instagram (two-step container flow)
   * Uses per-destination IG Business Account ID from social_accounts.metadata.igAccountId,
   * falls back to env INSTAGRAM_BUSINESS_ACCOUNT_ID for backward compatibility.
   */
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
    logger.info(`[MetaClient] Publishing to Instagram account ${igAccountId} (from ${contentItem.account_metadata ? 'social_accounts' : 'env'})`);
    const caption = this._getPostBody(contentItem);
    const metadata = contentItem.social_metadata ? JSON.parse(contentItem.social_metadata) : {};

    if (!metadata.image_url) {
      throw new Error('Instagram posts require an image_url in social_metadata');
    }

    // Step 1: Create media container
    const containerResponse = await fetch(`${META_API_BASE}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: metadata.image_url,
        caption,
        access_token: accessToken,
      }),
    });

    const containerData = await containerResponse.json();
    if (containerData.error) {
      throw new Error(`Instagram container creation failed: ${containerData.error.message}`);
    }

    // Step 2: Publish the container
    const publishResponse = await fetch(`${META_API_BASE}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: accessToken,
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
    // Prefer EN, fallback to NL, then any available body
    return contentItem.body_en || contentItem.body_nl || contentItem.body_de || contentItem.body_es || contentItem.title;
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
