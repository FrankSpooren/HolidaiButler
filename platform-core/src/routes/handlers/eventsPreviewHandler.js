/**
 * Agenda Events Preview Handler
 *
 * GET /api/v1/admin-portal/agenda/events-preview?destinationId=X&limit=10&showPast=0
 *
 * Readonly proxy naar platform-core /api/v1/agenda/events (Scenario C compliant
 * - geen nieuwe features op agenda_events of agenda-module zelf). Voegt
 * brand-fit-score toe per event via Jaccard keyword overlap tussen event.title/
 * description en destinations.brand_profile.seo_keywords.
 *
 * Gebruikt voor EventCalendarEditor live-preview in Page Builder admin.
 *
 * @version BLOK F3 (22-05-2026)
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

function calcBrandFit(text, brandKeywords) {
  if (!text || !Array.isArray(brandKeywords) || brandKeywords.length === 0) return null;
  const lower = String(text).toLowerCase();
  const matches = brandKeywords.filter(kw => kw && lower.includes(String(kw).toLowerCase()));
  if (matches.length === 0) return 0;
  return Math.min(1, matches.length / brandKeywords.length);
}

function pickLocaleValue(value, locale) {
  if (!value) return '';
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return parsed?.[locale] || parsed?.en || parsed?.nl || ''; }
    catch { return String(value); }
  }
  if (typeof value === 'object') return value[locale] || value.en || value.nl || Object.values(value).find(v => v && String(v).trim()) || '';
  return String(value);
}

export async function handleEventsPreview(req, res) {
  const destId = Number(req.query.destinationId || 0);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const showPast = req.query.showPast === '1' || req.query.showPast === 'true';
  const locale = String(req.query.locale || 'en').toLowerCase().slice(0, 2);

  if (!destId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required' } });
  }

  try {
    const [[dest]] = await mysqlSequelize.query(
      `SELECT id, brand_profile FROM destinations WHERE id = :id`,
      { replacements: { id: destId } }
    );
    let brandKeywords = [];
    if (dest) {
      try {
        const bp = typeof dest.brand_profile === 'string' ? JSON.parse(dest.brand_profile) : (dest.brand_profile || {});
        brandKeywords = Array.isArray(bp.seo_keywords) ? bp.seo_keywords : [];
      } catch { /* empty */ }
    }

    // Direct agenda_events query (readonly, no writes)
    const whereParts = ['destination_id = :destId'];
    const replacements = { destId, limit };
    if (!showPast) {
      whereParts.push('end_date >= NOW()');
    }

    const [events] = await mysqlSequelize.query(
      `SELECT id, title, description, short_description, start_date, end_date, all_day, time_of_day,
              location_name, latitude, longitude, image_url, category, tags,
              is_featured, organizer_name
         FROM agenda_events
         WHERE ${whereParts.join(' AND ')}
         ORDER BY start_date ASC
         LIMIT :limit`,
      { replacements }
    ).catch(err => {
      logger.warn('[events-preview] query failed:', err.message);
      return [[]];
    });

    const items = (events || []).map(ev => {
      const titleLocalized = pickLocaleValue(ev.title, locale);
      const descLocalized = pickLocaleValue(ev.short_description || ev.description, locale);
      const fitText = `${titleLocalized} ${descLocalized}`;
      const brandFit = calcBrandFit(fitText, brandKeywords);
      return {
        id: ev.id,
        title: titleLocalized,
        description: descLocalized,
        start_date: ev.start_date,
        end_date: ev.end_date,
        all_day: !!ev.all_day,
        time_of_day: ev.time_of_day,
        location_name: ev.location_name,
        category: ev.category,
        image_url: ev.image_url,
        is_featured: !!ev.is_featured,
        brand_fit_score: brandFit,
      };
    });

    items.sort((a, b) => {
      const aFit = a.brand_fit_score ?? -1;
      const bFit = b.brand_fit_score ?? -1;
      if (bFit !== aFit) return bFit - aFit;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    return res.json({
      success: true,
      data: {
        items: items.slice(0, limit),
        total: items.length,
        destination_id: destId,
        brand_keywords_count: brandKeywords.length,
        locale,
        readonly_note: 'Scenario C compliant — agenda_events readonly via destination_id filter',
      }
    });
  } catch (error) {
    logger.error('[events-preview] error:', error);
    return res.status(500).json({ success: false, error: { code: 'EVENTS_PREVIEW_ERROR', message: error.message } });
  }
}
