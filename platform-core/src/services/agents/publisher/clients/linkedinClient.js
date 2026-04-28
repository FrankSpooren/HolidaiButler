/**
 * LinkedIn Marketing API Client — Company Page Publishing
 * Uses OAuth2 tokens stored in social_accounts table.
 *
 * Publishing: POST /rest/posts (Community Management API)
 * Analytics: GET /rest/organizationalEntityShareStatistics
 */

import SocialAccount from '../../../../models/SocialAccount.js';
import logger from '../../../../utils/logger.js';

const LINKEDIN_API_BASE = 'https://api.linkedin.com';

class LinkedInClient {
  /**
   * Publish content to LinkedIn Company Page
   * @param {Object} contentItem - Content item with body, social_metadata, etc.
   * @returns {Object} { postId, url }
   */
  async publish(contentItem) {
    const accessToken = this._getAccessToken(contentItem);
    const organizationId = this._getOrganizationId(contentItem);
    const text = this._getPostBody(contentItem);
    const metadata = contentItem.social_metadata ? JSON.parse(contentItem.social_metadata) : {};

    const postBody = {
      author: `urn:li:organization:${organizationId}`,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
    };

    // Add article/link if provided
    if (metadata.link) {
      postBody.content = {
        article: {
          source: metadata.link,
          title: contentItem.title,
          description: text.substring(0, 200),
        },
      };
      if (metadata.image_url) {
        postBody.content.article.thumbnail = metadata.image_url;
      }
    }

    const response = await fetch(`${LINKEDIN_API_BASE}/rest/posts`, {
      signal: AbortSignal.timeout(30000),
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
      },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`LinkedIn publish failed (${response.status}): ${errorData.message || response.statusText}`);
    }

    // LinkedIn returns the post URN in the x-restli-id header
    const postUrn = response.headers.get('x-restli-id') || response.headers.get('x-linkedin-id');
    const postId = postUrn || `linkedin-${Date.now()}`;

    return {
      postId,
      url: `https://www.linkedin.com/feed/update/${postId}`,
      platform: 'linkedin',
    };
  }

  /**
   * Get post analytics from LinkedIn
   */
  async getAnalytics(contentItem) {
    const accessToken = this._getAccessToken(contentItem);
    const organizationId = this._getOrganizationId(contentItem);

    try {
      const response = await fetch(
        `${LINKEDIN_API_BASE}/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${organizationId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202401',
          },
        }
      );

      if (!response.ok) return null;
      const data = await response.json();

      const stats = data.elements?.[0]?.totalShareStatistics || {};
      return {
        views: stats.impressionCount || 0,
        clicks: stats.clickCount || 0,
        engagement: stats.engagement || 0,
        reach: stats.uniqueImpressionsCount || 0,
        conversions: 0,
        raw: stats,
      };
    } catch (err) {
      logger.warn(`[LinkedInClient] Analytics fetch failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Generate LinkedIn OAuth2 authorization URL
   */
  static getAuthorizationUrl(redirectUri, state) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const scopes = 'profile w_member_social';
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code, redirectUri) {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      signal: AbortSignal.timeout(30000),
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(`LinkedIn token exchange failed: ${data.error_description || data.error}`);
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in, // typically 60 days
      refresh_token: data.refresh_token,
      refresh_token_expires_in: data.refresh_token_expires_in,
    };
  }

  /**
   * Refresh an expired access token
   */
  static async refreshAccessToken(refreshToken) {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      signal: AbortSignal.timeout(30000),
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(`LinkedIn token refresh failed: ${data.error_description || data.error}`);
    }
    return data;
  }

  _getPostBody(contentItem) {
    return contentItem.body_en || contentItem.body_nl || contentItem.body_de || contentItem.body_es || contentItem.title;
  }

  _getAccessToken(contentItem) {
    if (contentItem.access_token_encrypted) {
      try {
        return SocialAccount.decryptToken(contentItem.access_token_encrypted);
      } catch (e) {
        logger.warn('[LinkedInClient] Failed to decrypt token');
      }
    }
    throw new Error('LinkedIn requires an OAuth access token stored in social_accounts');
  }

  _getOrganizationId(contentItem) {
    const metadata = contentItem.account_metadata;
    const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    return parsed?.organization_id || process.env.LINKEDIN_ORGANIZATION_ID;
  }
}

export default LinkedInClient;
