/**
 * X (Twitter) API v2 Client — Post Publishing
 * Free tier: 1,500 posts/month.
 * OAuth 2.0 PKCE flow.
 *
 * @version 1.0.0
 */

import SocialAccount from '../../../../models/SocialAccount.js';
import logger from '../../../../utils/logger.js';

const X_API_BASE = 'https://api.twitter.com/2';

class XClient {
  /**
   * Publish a tweet
   * @param {Object} contentItem - Content item with body, destination_id
   * @returns {Object} { postId, url }
   */
  async publish(contentItem) {
    const accessToken = await this._getAccessToken(contentItem);
    const text = this._getPostBody(contentItem);

    const response = await fetch(`${X_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`X API error ${response.status}: ${error.detail || error.title || 'Unknown error'}`);
    }

    const data = await response.json();
    const tweetId = data.data?.id;

    logger.info(`[XClient] Published tweet ${tweetId}`);

    return {
      postId: tweetId,
      url: `https://x.com/i/web/status/${tweetId}`,
      platform: 'x',
    };
  }

  /**
   * Get engagement metrics for a tweet
   */
  async getMetrics(postId, accessToken) {
    try {
      const response = await fetch(
        `${X_API_BASE}/tweets/${postId}?tweet.fields=public_metrics`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (!response.ok) return null;
      const data = await response.json();
      const m = data.data?.public_metrics || {};
      return {
        views: m.impression_count || 0,
        engagement: (m.like_count || 0) + (m.retweet_count || 0) + (m.reply_count || 0),
        reach: m.impression_count || 0,
        clicks: m.url_link_clicks || 0,
      };
    } catch (e) {
      logger.debug('[XClient] Metrics fetch failed:', e.message);
      return null;
    }
  }

  _getPostBody(contentItem) {
    // X has 280 char limit — use body_en or fallback
    const body = contentItem.body_en || contentItem.body_nl || '';
    return body.substring(0, 280);
  }

  async _getAccessToken(contentItem) {
    const destId = contentItem.destination_id || 1;
    const account = await SocialAccount.findOne({
      where: { destination_id: destId, platform: 'x', status: 'active' },
    });
    if (!account) {
      throw new Error(`No active X account found for destination ${destId}`);
    }
    return account.getDecryptedToken();
  }
}

export default XClient;
