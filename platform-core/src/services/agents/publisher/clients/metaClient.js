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
  async _publishToFacebook(contentItem, accessToken) {
    const pageId = process.env.META_PAGE_ID;
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
   */
  async _publishToInstagram(contentItem, accessToken) {
    const igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
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
    const accessToken = this._getAccessToken(contentItem);
    const postId = contentItem.platform_post_id;

    try {
      const metrics = this.subPlatform === 'instagram'
        ? 'impressions,reach,engagement'
        : 'post_impressions,post_engaged_users,post_clicks';

      const response = await fetch(
        `${META_API_BASE}/${postId}/insights?metric=${metrics}&access_token=${accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        logger.warn(`[MetaClient] Analytics error for ${postId}: ${data.error.message}`);
        return null;
      }

      const values = {};
      for (const metric of (data.data || [])) {
        values[metric.name] = metric.values?.[0]?.value || 0;
      }

      return {
        views: values.post_impressions || values.impressions || 0,
        reach: values.post_engaged_users || values.reach || 0,
        engagement: values.engagement || 0,
        clicks: values.post_clicks || 0,
        conversions: 0,
        raw: values,
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
   * Get access token — use Page Access Token from env (System User approach)
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
}

export default MetaClient;
