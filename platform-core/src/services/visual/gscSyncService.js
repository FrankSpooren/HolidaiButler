import { readFileSync } from "fs";
/**
 * Google Search Console Sync Service
 * Syncs top search queries from GSC API per destination.
 * Runs weekly (Monday 05:00) via BullMQ.
 *
 * Requires GSC_SERVICE_ACCOUNT_JSON env var (path to service account JSON)
 * or GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY env vars.
 * If not configured, returns empty results gracefully.
 */
import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';

// GSC API config — graceful if not configured
const GSC_CLIENT_EMAIL = process.env.GSC_CLIENT_EMAIL || '';
const GSC_PRIVATE_KEY = process.env.GSC_PRIVATE_KEY || '';
const GSC_SERVICE_ACCOUNT_JSON = process.env.GSC_SERVICE_ACCOUNT_JSON || '';

// Destination → GSC site URL mapping
const SITE_MAP = {
  1: 'sc-domain:calpetrip.com',
  2: 'sc-domain:texelmaps.nl',
  10: 'sc-domain:bute.holidaibutler.com'
};

const gscSyncService = {

  /**
   * Check if GSC is configured
   */
  isConfigured() {
    return !!(GSC_SERVICE_ACCOUNT_JSON || (GSC_CLIENT_EMAIL && GSC_PRIVATE_KEY));
  },

  /**
   * Sync top search queries for a destination from GSC.
   * Stores results in trending_data table with source='gsc'.
   * @param {number} destinationId
   * @param {number} days - Number of days to look back (default 28)
   */
  async syncQueries(destinationId, days = 28) {
    if (!this.isConfigured()) {
      logger.info('[GSC] Not configured — skipping sync for dest ' + destinationId);
      return { destination_id: destinationId, synced: 0, status: 'not_configured' };
    }

    const siteUrl = SITE_MAP[destinationId];
    if (!siteUrl) {
      logger.warn('[GSC] No site URL mapped for dest ' + destinationId);
      return { destination_id: destinationId, synced: 0, status: 'no_site_url' };
    }

    try {
      const accessToken = await this._getAccessToken();
      if (!accessToken) {
        return { destination_id: destinationId, synced: 0, status: 'auth_failed' };
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const response = await fetch(
        'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(siteUrl) + '/searchAnalytics/query',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
          },
          body: JSON.stringify({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            dimensions: ['query'],
            rowLimit: 100,
            dataState: 'final'
          })
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        logger.error('[GSC] API error ' + response.status + ': ' + errText);
        return { destination_id: destinationId, synced: 0, status: 'api_error' };
      }

      const data = await response.json();
      const rows = data.rows || [];

      // Get current week info
      const now = new Date();
      const weekNumber = this._getISOWeek(now);
      const year = now.getFullYear();

      // Save to trending_data table
      let synced = 0;
      for (const row of rows) {
        const keyword = row.keys && row.keys[0];
        if (!keyword) continue;

        try {
          await mysqlSequelize.query(
            `INSERT INTO trending_data (destination_id, keyword, search_volume, trend_direction, relevance_score, source, language, week_number, year)
             VALUES (:destId, :keyword, :impressions, 'stable', :ctr, 'gsc', 'en', :week, :year)
             ON DUPLICATE KEY UPDATE search_volume = :impressions, relevance_score = :ctr`,
            {
              replacements: {
                destId: destinationId,
                keyword: keyword.substring(0, 255),
                impressions: Math.round(row.impressions || 0),
                ctr: Math.round((row.ctr || 0) * 1000) / 10, // CTR as percentage
                week: weekNumber,
                year: year
              },
              type: QueryTypes.INSERT
            }
          );
          synced++;
        } catch (err) {
          logger.warn('[GSC] Save error for "' + keyword + '":', err.message);
        }
      }

      logger.info('[GSC] Dest ' + destinationId + ': synced ' + synced + ' queries from ' + rows.length + ' results');
      return { destination_id: destinationId, synced, total_results: rows.length, status: 'ok' };
    } catch (err) {
      logger.error('[GSC] Sync error for dest ' + destinationId + ':', err.message);
      return { destination_id: destinationId, synced: 0, status: 'error', error: err.message };
    }
  },

  /**
   * List search queries for a destination (from trending_data where source='gsc')
   */
  async listSearchQueries(destinationId, { limit = 50, min_impressions, sort = 'search_volume', order = 'DESC' } = {}) {
    const replacements = { destId: destinationId };
    let where = "WHERE td.destination_id = :destId AND td.source = 'gsc'";

    if (min_impressions) {
      where += ' AND td.search_volume >= :minImp';
      replacements.minImp = parseInt(min_impressions);
    }

    // Get latest week available
    where += ' AND (td.year, td.week_number) = (SELECT year, week_number FROM trending_data WHERE destination_id = :destId AND source = "gsc" ORDER BY year DESC, week_number DESC LIMIT 1)';

    const allowedSorts = ['search_volume', 'relevance_score', 'keyword'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'search_volume';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    replacements.limit = Math.min(parseInt(limit) || 50, 200);

    const items = await mysqlSequelize.query(
      'SELECT td.keyword, td.search_volume AS impressions, td.relevance_score AS ctr, td.week_number, td.year FROM trending_data td ' +
      where + ' ORDER BY td.' + sortCol + ' ' + sortOrder + ' LIMIT :limit',
      { replacements, type: QueryTypes.SELECT }
    );

    return {
      items,
      configured: this.isConfigured(),
      status: this.isConfigured() ? 'active' : 'not_configured'
    };
  },

  /**
   * Get OAuth2 access token from service account credentials
   */
  async _getAccessToken() {
    try {
      // Try loading google-auth-library (optional dependency)
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({
        credentials: GSC_SERVICE_ACCOUNT_JSON ? JSON.parse(readFileSync(GSC_SERVICE_ACCOUNT_JSON, 'utf8')) : {
          client_email: GSC_CLIENT_EMAIL,
          private_key: GSC_PRIVATE_KEY.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
      });
      const client = await auth.getClient();
      const token = await client.getAccessToken();
      return token.token || token;
    } catch (err) {
      logger.error('[GSC] Auth error:', err.message);
      return null;
    }
  },

  /**
   * Get ISO week number
   */
  _getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
};

export default gscSyncService;
