/**
 * Pinterest API v5 Client — Pin Publishing
 * OAuth 2.0 authentication.
 *
 * @version 1.0.0
 */

import SocialAccount from '../../../../models/SocialAccount.js';
import logger from '../../../../utils/logger.js';

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';

class PinterestClient {
  /**
   * Create a pin on Pinterest
   * @param {Object} contentItem - Content item with body, social_metadata
   * @returns {Object} { postId, url }
   */
  async publish(contentItem) {
    const accessToken = await this._getAccessToken(contentItem);
    const metadata = contentItem.social_metadata ? JSON.parse(contentItem.social_metadata) : {};

    const pinData = {
      title: contentItem.title || '',
      description: this._getPostBody(contentItem),
      board_id: metadata.board_id || process.env.PINTEREST_DEFAULT_BOARD_ID,
    };

    // Add link if available
    if (metadata.link) {
      pinData.link = metadata.link;
    }

    // Add image if available
    if (metadata.image_url) {
      pinData.media_source = {
        source_type: 'image_url',
        url: metadata.image_url,
      };
    }

    const response = await fetch(`${PINTEREST_API_BASE}/pins`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pinData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Pinterest API error ${response.status}: ${error.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const pinId = data.id;

    logger.info(`[PinterestClient] Published pin ${pinId}`);

    return {
      postId: pinId,
      url: `https://www.pinterest.com/pin/${pinId}/`,
      platform: 'pinterest',
    };
  }

  /**
   * Get pin analytics
   */
  async getMetrics(postId, accessToken) {
    try {
      const response = await fetch(
        `${PINTEREST_API_BASE}/pins/${postId}/analytics?start_date=${this._thirtyDaysAgo()}&end_date=${this._today()}&metric_types=IMPRESSION,PIN_CLICK,SAVE,OUTBOUND_CLICK`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (!response.ok) return null;
      const data = await response.json();
      const all = data.all || {};
      return {
        views: all.IMPRESSION || 0,
        engagement: (all.SAVE || 0) + (all.PIN_CLICK || 0),
        reach: all.IMPRESSION || 0,
        clicks: all.OUTBOUND_CLICK || 0,
      };
    } catch (e) {
      logger.debug('[PinterestClient] Metrics fetch failed:', e.message);
      return null;
    }
  }

  _getPostBody(contentItem) {
    const body = contentItem.body_en || contentItem.body_nl || '';
    return body.substring(0, 500); // Pinterest max 500 chars
  }

  async _getAccessToken(contentItem) {
    const destId = contentItem.destination_id || 1;
    const account = await SocialAccount.findOne({
      where: { destination_id: destId, platform: 'pinterest', status: 'active' },
    });
    if (!account) {
      throw new Error(`No active Pinterest account found for destination ${destId}`);
    }
    return account.getDecryptedToken();
  }

  _thirtyDaysAgo() {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }

  _today() {
    return new Date().toISOString().split('T')[0];
  }
}

export default PinterestClient;
