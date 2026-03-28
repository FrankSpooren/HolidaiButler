/**
 * Website Traffic Collector — SimpleAnalytics Integration
 * Wekelijks (zondag 03:45): haalt top pagina's + events op via SimpleAnalytics API
 * en slaat ze op als trending_data met source='website_traffic' of source='user_event'.
 *
 * @version 2.0.0 — Rewrite: Apache logs → SimpleAnalytics API
 */

import { mysqlSequelize } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

const SA_API_KEY = process.env.SA_API_KEY || 'sa_api_key_tdOPtEz1nQqzPJIXbmS9PYB12KwcwGi4KQI2';
const SA_USER_ID = process.env.SA_USER_ID || 'sa_user_id_45cbd1c2-58bb-44e3-ac9c-94797095b640';

const DEST_DOMAINS = {
  1: 'calpetrip.com',
  2: 'texelmaps.nl',
};

/**
 * Collect website traffic + event data from SimpleAnalytics for a destination
 */
async function collect(destinationId) {
  const domain = DEST_DOMAINS[destinationId];
  if (!domain) {
    logger.info(`[WebsiteTraffic] No domain mapped for destination ${destinationId}, skipping`);
    return [];
  }

  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);
  const startDate = weekAgo.toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];
  const weekNumber = getWeekNumber(now);
  const year = now.getFullYear();
  const trends = [];

  try {
    // 1. Fetch top pages
    const pagesUrl = `https://simpleanalytics.com/${domain}.json?version=6&fields=pages&start=${startDate}&end=${endDate}`;
    const pagesRes = await fetch(pagesUrl, {
      headers: { 'Api-Key': SA_API_KEY, 'User-Id': SA_USER_ID },
      signal: AbortSignal.timeout(15000),
    });
    const pagesData = await pagesRes.json();
    const pages = (pagesData.pages || []).slice(0, 15);

    if (pages.length > 0) {
      const maxVisits = pages[0]?.pageviews || pages[0]?.visitors || 1;
      for (const page of pages) {
        const path = page.value || '/';
        const visits = page.pageviews || page.visitors || 0;
        if (visits < 2) continue;

        const keyword = pathToKeyword(path);
        if (!keyword) continue;

        const relevance = Math.max(3, Math.round((visits / maxVisits) * 10 * 10) / 10);
        trends.push({
          keyword: `website: ${keyword}`,
          language: 'en',
          source: 'website_analytics',
          source_url: `https://${domain}${path}`,
          search_volume: visits,
          trend_direction: visits > maxVisits * 0.7 ? 'rising' : visits > maxVisits * 0.3 ? 'stable' : 'declining',
          relevance_score: relevance,
        });
      }
    }

    // 2. Fetch events
    const eventsUrl = `https://simpleanalytics.com/${domain}.json?version=6&fields=events&start=${startDate}&end=${endDate}`;
    const eventsRes = await fetch(eventsUrl, {
      headers: { 'Api-Key': SA_API_KEY, 'User-Id': SA_USER_ID },
      signal: AbortSignal.timeout(15000),
    });
    const eventsData = await eventsRes.json();
    const events = (eventsData.events || []).slice(0, 20);

    if (events.length > 0) {
      const maxCount = events[0]?.total || events[0]?.visitors || 1;
      for (const event of events) {
        const eventName = event.value || '';
        const count = event.total || event.visitors || 0;
        if (count < 2 || !eventName) continue;
        if (['scroll_to_top_mobile', 'scroll_to_top_desktop'].includes(eventName)) continue;

        const keyword = eventToKeyword(eventName);
        if (!keyword) continue;

        const relevance = Math.max(2, Math.round((count / maxCount) * 10 * 10) / 10);
        trends.push({
          keyword: `event: ${keyword}`,
          language: 'en',
          source: 'user_event',
          search_volume: count,
          trend_direction: 'stable',
          relevance_score: relevance,
        });
      }
    }

    // 3. Save to trending_data
    for (const t of trends) {
      try {
        const [[existing]] = await mysqlSequelize.query(
          'SELECT id FROM trending_data WHERE destination_id = :destId AND keyword = :kw AND week_number = :week AND year = :year AND source = :source',
          { replacements: { destId: destinationId, kw: t.keyword, week: weekNumber, year, source: t.source } }
        );
        if (existing) {
          await mysqlSequelize.query(
            'UPDATE trending_data SET relevance_score = :rel, search_volume = :vol, updated_at = NOW() WHERE id = :id',
            { replacements: { rel: t.relevance_score, vol: t.search_volume, id: existing.id } }
          );
        } else {
          await mysqlSequelize.query(
            `INSERT INTO trending_data (destination_id, keyword, relevance_score, search_volume, trend_direction, source, source_url, week_number, year, language, created_at)
             VALUES (:destId, :kw, :rel, :vol, :dir, :source, :url, :week, :year, :lang, NOW())`,
            { replacements: { destId: destinationId, kw: t.keyword, rel: t.relevance_score, vol: t.search_volume, dir: t.trend_direction, source: t.source, url: t.source_url || null, week: weekNumber, year, lang: t.language } }
          );
        }
      } catch (saveErr) {
        logger.warn(`[WebsiteTraffic] Save failed for "${t.keyword}":`, saveErr.message);
      }
    }

    logger.info(`[WebsiteTraffic] ${domain}: ${trends.length} trends saved (${pages.length} pages, ${events.length} events)`);
  } catch (error) {
    logger.error(`[WebsiteTraffic] Error for destination ${destinationId} (${domain}):`, error.message);
  }

  return trends;
}

function pathToKeyword(path) {
  if (path === '/') return 'Homepage';
  if (path === '/pois') return 'POI Overzicht';
  if (path === '/agenda') return 'Evenementen';
  if (path === '/login') return 'Login';
  if (path === '/about') return 'Over ons';
  if (path === '/contact') return 'Contact';
  if (path === '/explore') return 'Ontdekken';
  if (path === '/restaurants') return 'Restaurants';
  if (path.startsWith('/poi/')) return `POI Detail (${path.replace('/poi/', '')})`;
  if (path.startsWith('/event/')) return `Event Detail (${path.replace('/event/', '')})`;
  const clean = path.replace(/^\//, '').replace(/\//g, ' > ').replace(/-/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function eventToKeyword(name) {
  const map = {
    'chatbot_opened_mobile': 'Chatbot geopend (mobiel)',
    'chatbot_opened_desktop': 'Chatbot geopend (desktop)',
    'chatbot_message_mobile': 'Chatbot bericht (mobiel)',
    'chatbot_message_desktop': 'Chatbot bericht (desktop)',
    'poi_detail_opened_mobile': 'POI detail bekeken (mobiel)',
    'poi_detail_opened_desktop': 'POI detail bekeken (desktop)',
    'event_detail_opened_mobile': 'Event detail bekeken (mobiel)',
    'event_detail_opened_desktop': 'Event detail bekeken (desktop)',
    'search_used_mobile': 'Zoekfunctie (mobiel)',
    'search_used_desktop': 'Zoekfunctie (desktop)',
    'language_changed_mobile': 'Taal gewisseld (mobiel)',
    'language_changed_desktop': 'Taal gewisseld (desktop)',
    'wcag_modal_opened_mobile': 'Toegankelijkheid (mobiel)',
    'wcag_modal_opened_desktop': 'Toegankelijkheid (desktop)',
  };
  if (name in map) return map[name];
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const websiteTrafficCollector = { collect };
export default websiteTrafficCollector;
