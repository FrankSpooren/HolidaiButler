/**
 * Content Top 25 Aggregation Service
 * Curates the best content opportunities from all 6 sources into a single overview.
 * Cached in memory with daily refresh via BullMQ.
 */
import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';

// In-memory cache per destination
const cache = {};

const contentTop25Service = {

  /**
   * Get Top 25 for a destination (cached or fresh)
   */
  async getTop25(destinationId, { refresh = false } = {}) {
    if (!refresh && cache[destinationId] && cache[destinationId].expires > Date.now()) {
      return cache[destinationId].data;
    }
    const data = await this.generate(destinationId);
    cache[destinationId] = { data, expires: Date.now() + 6 * 60 * 60 * 1000 }; // 6h cache
    return data;
  },

  /**
   * Generate fresh Top 25 from all sources
   */
  async generate(destinationId) {
    const sections = {};
    const errors = [];

    // 1. Zoektermen: 5 items
    try {
      const keywords = await mysqlSequelize.query(
        `SELECT keyword, search_volume, trend_direction, relevance_score, source, language
         FROM trending_data WHERE destination_id = :destId AND keyword IS NOT NULL AND keyword != ''
         ORDER BY COALESCE(relevance_score, 0) * LOG(COALESCE(search_volume, 1) + 1) DESC LIMIT 20`,
        { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
      );
      // Enforce source mix: >=2 website_analytics, >=1 google_trends
      const bySource = { website_analytics: [], google_trends: [], manual: [], other: [] };
      keywords.forEach(k => { (bySource[k.source] || bySource.other).push(k); });
      const selected = [];
      selected.push(...bySource.website_analytics.slice(0, 2));
      selected.push(...bySource.google_trends.slice(0, 1));
      const remaining = keywords.filter(k => !selected.includes(k));
      selected.push(...remaining.slice(0, 5 - selected.length));
      const warnings = [];
      if (bySource.website_analytics.length < 2) warnings.push({ type: 'insufficient_data', source: 'website_analytics', required: 2, available: bySource.website_analytics.length });
      if (bySource.google_trends.length < 1) warnings.push({ type: 'insufficient_data', source: 'google_trends', required: 1, available: bySource.google_trends.length });
      sections.zoektermen = { items: selected.slice(0, 5), warnings, last_updated: new Date().toISOString() };
    } catch (e) { errors.push({ source: 'zoektermen', error: e.message }); sections.zoektermen = { items: [], warnings: [{ type: 'error', message: e.message }] }; }

    // 2. Visuele Trends: 3-5 items, max 2 per platform
    try {
      // Get destination keywords for theme matching
      let destKeywords = [];
      try {
        const [dest] = await mysqlSequelize.query("SELECT brand_profile FROM destinations WHERE id = :destId", { replacements: { destId: destinationId }, type: QueryTypes.SELECT });
        if (dest?.brand_profile) {
          const bp = typeof dest.brand_profile === 'string' ? JSON.parse(dest.brand_profile) : dest.brand_profile;
          destKeywords = (bp.keywords || bp.seo_keywords || []).map(k => k.toLowerCase());
        }
      } catch (e) { /* non-blocking */ }

      const visuals = await mysqlSequelize.query(
        `SELECT id, title, source_platform, thumbnail_url, trend_score, ai_mood, ai_description, ai_themes, status
         FROM trending_visuals WHERE destination_id = :destId AND status IN ('discovered', 'analyzed')
         ORDER BY trend_score DESC, discovered_at DESC LIMIT 30`,
        { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
      );

      // Score each visual: trend_score + theme match bonus
      const scored = visuals.map(v => {
        let themeScore = 0;
        if (v.ai_themes && destKeywords.length > 0) {
          try {
            const themes = (typeof v.ai_themes === 'string' ? JSON.parse(v.ai_themes) : v.ai_themes) || [];
            const matched = themes.filter(t => destKeywords.some(k => t.toLowerCase().includes(k) || k.includes(t.toLowerCase())));
            themeScore = matched.length * 2;
          } catch (e) { /* ignore parse errors */ }
        }
        return { ...v, _score: (Number(v.trend_score) || 0) + themeScore };
      });

      // Sort by combined score, then diversify platforms (max 2 per platform)
      scored.sort((a, b) => b._score - a._score);
      const selected = [];
      const perPlatform = {};
      for (const v of scored) {
        const count = perPlatform[v.source_platform] || 0;
        if (count < 2 && selected.length < 5) {
          selected.push(v);
          perPlatform[v.source_platform] = count + 1;
        }
      }
      // Ensure minimum 3 items
      if (selected.length < 3) {
        const rest = scored.filter(v => !selected.find(s => s.id === v.id));
        selected.push(...rest.slice(0, 3 - selected.length));
        rest.slice(0, 3 - selected.length).forEach(v => { perPlatform[v.source_platform] = (perPlatform[v.source_platform] || 0) + 1; });
      }
      // Ensure minimum 2 unique platforms
      const uniquePlatforms = new Set(selected.map(s => s.source_platform));
      if (uniquePlatforms.size < 2 && scored.length > selected.length) {
        const otherPlatform = scored.find(v => !uniquePlatforms.has(v.source_platform) && !selected.find(s => s.id === v.id));
        if (otherPlatform && selected.length < 5) {
          selected.push(otherPlatform);
          perPlatform[otherPlatform.source_platform] = (perPlatform[otherPlatform.source_platform] || 0) + 1;
        }
      }

      sections.visuele_trends = { items: selected, platform_distribution: perPlatform, last_updated: new Date().toISOString() };
    } catch (e) { errors.push({ source: 'visuele_trends', error: e.message }); sections.visuele_trends = { items: [] }; }

    // 3. POI Inspiratie: 5-7 items, category mix, prioritize no-content
    try {
      const pois = await mysqlSequelize.query(
        `SELECT p.id, p.name, p.category, p.google_rating, p.google_review_count, p.tier,
          (SELECT COUNT(*) FROM content_items ci WHERE ci.poi_id = p.id AND ci.destination_id = :destId AND ci.approval_status NOT IN ('deleted','rejected')) AS content_count,
          (SELECT COUNT(*) FROM imageurls iu WHERE iu.poi_id = p.id) AS image_count
         FROM POI p WHERE p.destination_id = :destId AND p.status = 'active' AND p.google_rating >= 3.5
         ORDER BY (CASE WHEN (SELECT COUNT(*) FROM content_items ci2 WHERE ci2.poi_id = p.id AND ci2.destination_id = :destId AND ci2.approval_status NOT IN ('deleted','rejected')) = 0 THEN 0 ELSE 1 END),
           p.google_rating * LOG(p.google_review_count + 1) DESC
         LIMIT 30`,
        { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
      );
      // Category diversification
      const selected = [];
      const usedCats = {};
      for (const p of pois) {
        const cat = p.category || 'Other';
        if ((usedCats[cat] || 0) < 2 && selected.length < 7) {
          selected.push({ ...p, has_content: (p.content_count || 0) > 0 });
          usedCats[cat] = (usedCats[cat] || 0) + 1;
        }
      }
      if (selected.length < 5) {
        const rest = pois.filter(p => !selected.find(s => s.id === p.id));
        selected.push(...rest.slice(0, 5 - selected.length).map(p => ({ ...p, has_content: (p.content_count || 0) > 0 })));
      }
      sections.poi_inspiratie = { items: selected, category_distribution: usedCats, last_updated: new Date().toISOString() };
    } catch (e) { errors.push({ source: 'poi_inspiratie', error: e.message }); sections.poi_inspiratie = { items: [] }; }

    // 4. Agenda Inspiratie: 3-5 items, upcoming 30 days, prioritize no-content
    try {
      const events = await mysqlSequelize.query(
        `SELECT a.id, a.title, a.title_en, a.date, a.time, a.location_name, a.image,
          SUBSTRING(a.short_description_en, 1, 200) AS description
         FROM agenda a WHERE a.destination_id = :destId AND a.date >= CURDATE() AND a.date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
         ORDER BY a.date ASC LIMIT 5`,
        { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
      );
      sections.agenda_inspiratie = { items: events, days_ahead: 30, last_updated: new Date().toISOString() };
    } catch (e) { errors.push({ source: 'agenda_inspiratie', error: e.message }); sections.agenda_inspiratie = { items: [] }; }

    // 5. HoliBot Insights: 2-3 items
    try {
      const insights = await mysqlSequelize.query(
        `SELECT keyword, insight_type, mention_count, sample_messages
         FROM holibot_insights WHERE destination_id = :destId
         ORDER BY mention_count DESC LIMIT 3`,
        { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
      );
      sections.holibot_insights = { items: insights, last_updated: new Date().toISOString() };
    } catch (e) { errors.push({ source: 'holibot_insights', error: e.message }); sections.holibot_insights = { items: [] }; }

    // 6. Zoekintentie GSC: 5 items
    try {
      const gsc = await mysqlSequelize.query(
        `SELECT keyword, search_volume AS impressions, relevance_score AS ctr
         FROM trending_data WHERE destination_id = :destId AND source = 'gsc'
         ORDER BY search_volume DESC LIMIT 5`,
        { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
      );
      const isConfigured = !!(process.env.GSC_SERVICE_ACCOUNT_JSON || process.env.GSC_CLIENT_EMAIL);
      sections.zoekintentie_gsc = { items: gsc, gsc_connected: isConfigured, last_updated: new Date().toISOString() };
    } catch (e) { errors.push({ source: 'zoekintentie_gsc', error: e.message }); sections.zoekintentie_gsc = { items: [] }; }

    // Always deliver exactly 25 items — fill shortfall from richest sources
    const TARGET = 25;
    let totalCount = Object.values(sections).reduce((sum, s) => sum + (s.items?.length || 0), 0);

    if (totalCount < TARGET) {
      const deficit = TARGET - totalCount;
      // Priority order for supplementary items: Keywords > GSC > HoliBot > Visuals > POI > Events
      const supplementSources = [
        { key: 'zoektermen', query: `SELECT keyword, search_volume, source, relevance_score, 'zoektermen' as _source FROM trending_data WHERE destination_id = :destId AND keyword IS NOT NULL ORDER BY COALESCE(relevance_score, 0) DESC LIMIT :lim`, type: 'keyword' },
        { key: 'zoekintentie_gsc', query: `SELECT keyword, search_volume AS impressions, relevance_score AS ctr, 'zoekintentie_gsc' as _source FROM trending_data WHERE destination_id = :destId AND source = 'gsc' ORDER BY search_volume DESC LIMIT :lim`, type: 'gsc' },
        { key: 'holibot_insights', query: `SELECT keyword, insight_type, mention_count, sample_messages, 'holibot_insights' as _source FROM holibot_insights WHERE destination_id = :destId ORDER BY mention_count DESC LIMIT :lim`, type: 'holibot' },
        { key: 'visuele_trends', query: `SELECT id, title, source_platform, thumbnail_url, trend_score, 'visuele_trends' as _source FROM trending_visuals WHERE destination_id = :destId AND status IN ('discovered','analyzed') ORDER BY trend_score DESC, discovered_at DESC LIMIT :lim`, type: 'visual' },
        { key: 'poi_inspiratie', query: `SELECT p.id, p.name, p.category, p.google_rating, p.google_review_count, p.tier, 'poi_inspiratie' as _source FROM POI p WHERE p.destination_id = :destId AND p.status = 'active' AND p.google_rating >= 3.0 ORDER BY p.google_rating * LOG(p.google_review_count + 1) DESC LIMIT :lim`, type: 'poi' },
        { key: 'agenda_inspiratie', query: `SELECT a.id, a.title, a.title_en, a.date, a.location_name, a.image, 'agenda_inspiratie' as _source FROM agenda a WHERE a.destination_id = :destId AND a.date >= CURDATE() ORDER BY a.date ASC LIMIT :lim`, type: 'event' }
      ];

      let remaining = deficit;
      for (const src of supplementSources) {
        if (remaining <= 0) break;
        try {
          const existingIds = new Set((sections[src.key]?.items || []).map(i => i.id || i.keyword));
          const extra = await mysqlSequelize.query(src.query, { replacements: { destId: destinationId, lim: remaining + 10 }, type: QueryTypes.SELECT });
          const filtered = extra.filter(i => !existingIds.has(i.id || i.keyword));
          const toAdd = filtered.slice(0, remaining);
          if (toAdd.length > 0) {
            sections[src.key].items = [...(sections[src.key].items || []), ...toAdd];
            remaining -= toAdd.length;
          }
        } catch (e) { /* non-blocking */ }
      }
      totalCount = Object.values(sections).reduce((sum, s) => sum + (s.items?.length || 0), 0);
    }

    return {
      destination_id: destinationId,
      generated_at: new Date().toISOString(),
      sections,
      total_count: totalCount,
      errors: errors.length > 0 ? errors : undefined
    };
  },

  /**
   * Clear cache for a destination
   */
  clearCache(destinationId) {
    if (destinationId) delete cache[destinationId];
    else Object.keys(cache).forEach(k => delete cache[k]);
  }
};

export default contentTop25Service;
