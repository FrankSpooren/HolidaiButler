/**
 * Agenda Routes (Fase II-C)
 * API endpoints for Events & Activities Calendar
 *
 * Data source: agenda + agenda_dates tables (Hetzner MySQL)
 * Multi-destination aware via X-Destination-ID header
 *
 * Endpoints:
 * - GET /agenda/events - Get events with filtering and pagination
 * - GET /agenda/events/featured - Get featured/upcoming events
 * - GET /agenda/events/:id - Get single event by ID
 * - GET /agenda/events/:id/ical - Download iCal file for single event
 * - GET /agenda/feed.ics - iCal subscription feed
 * - GET /agenda/stats - Get event statistics
 */

import express from 'express';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();
const { QueryTypes } = (await import('sequelize')).default;

// ============================================================================
// DESTINATION ROUTING
// ============================================================================

/**
 * Resolve destination_id from X-Destination-ID header.
 * Accepts both string ("texel") and numeric (2) IDs.
 */
function getDestinationId(req) {
  const headerValue = req.headers['x-destination-id'];
  if (!headerValue) return 1; // default: Calpe

  const numericId = parseInt(headerValue);
  if (!isNaN(numericId) && numericId > 0) return numericId;

  const codeToId = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };
  return codeToId[headerValue.toLowerCase()] || 1;
}

// ============================================================================
// CATEGORY AUTO-DETECTION
// ============================================================================

/**
 * Keyword-based category detection from event title + description.
 * Same categories as frontend AgendaPage for consistency.
 */
const CATEGORY_KEYWORDS = {
  music: ['concert', 'music', 'muziek', 'band', 'dj', 'live music', 'jazz', 'rock', 'pop', 'opera', 'choir', 'koor', 'concierto', 'música'],
  festivals: ['festival', 'fiesta', 'carnival', 'carnaval', 'kermis', 'fair', 'feria'],
  markets: ['market', 'markt', 'mercado', 'brocante', 'rommelmarkt', 'flea', 'craft market', 'food market', 'farmers'],
  active: ['sport', 'run', 'race', 'marathon', 'cycling', 'fietsen', 'yoga', 'surf', 'duik', 'dive', 'swim', 'zwem', 'voetbal', 'tennis', 'triathlon', 'wandel', 'hike'],
  nature: ['nature', 'natuur', 'bird', 'vogel', 'garden', 'tuin', 'flora', 'fauna', 'eco', 'beach clean', 'naturaleza'],
  food: ['food', 'eten', 'tasting', 'proeverij', 'wine', 'wijn', 'tapas', 'gastro', 'culinair', 'cooking', 'kook', 'comida', 'gastronomía'],
  culture: ['museum', 'theater', 'theatre', 'exhibition', 'tentoonstelling', 'art', 'kunst', 'gallery', 'galería', 'exposición', 'heritage', 'erfgoed', 'history', 'geschiedenis', 'lecture', 'lezing'],
  creative: ['workshop', 'craft', 'painting', 'schilder', 'ceramic', 'keramiek', 'photo', 'foto', 'creative', 'creatief', 'atelier', 'taller'],
};

function detectCategory(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  let bestMatch = 'culture'; // default
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestMatch;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Execute raw SQL query
 */
async function query(sql, params = []) {
  return mysqlSequelize.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

/**
 * Map database row to API response format.
 * Multi-language support: nl, en, es, de.
 */
function mapEventToResponse(event, language = 'nl') {
  // Language fallback chain: requested → nl → first available
  let title = event.title;
  let description = event.short_description;
  let longDesc = event.long_description;

  if (language === 'en' && event.title_en) {
    title = event.title_en;
    description = event.short_description_en || description;
    longDesc = event.long_description_en || longDesc;
  } else if (language === 'nl' && event.title_nl) {
    title = event.title_nl;
    description = event.short_description_nl || description;
    longDesc = event.long_description_nl || longDesc;
  } else if (language === 'de' && event.title_de) {
    title = event.title_de;
    description = event.short_description_de || description;
    longDesc = event.long_description_de || longDesc;
  } else if (language === 'es' && event.title_es) {
    title = event.title_es;
    description = event.short_description_es || description;
    longDesc = event.long_description_es || longDesc;
  }

  const category = detectCategory(event.title, event.short_description);

  return {
    _id: String(event.id),
    id: event.id,
    title: {
      nl: event.title_nl || event.title || title,
      en: event.title_en || title,
      de: event.title_de || event.title_en || title,
      es: event.title_es || title
    },
    description: {
      nl: event.short_description_nl || event.short_description || description,
      en: event.short_description_en || description,
      de: event.short_description_de || event.short_description_en || description,
      es: event.short_description_es || description
    },
    longDescription: {
      nl: event.long_description_nl || event.long_description || longDesc,
      en: event.long_description_en || longDesc,
      de: event.long_description_de || event.long_description_en || longDesc,
      es: event.long_description_es || longDesc
    },
    startDate: event.event_date ? `${event.event_date}T${event.event_time || '00:00:00'}` : event.date,
    endDate: event.event_date ? `${event.event_date}T${event.event_time || '23:59:59'}` : event.date,
    allDay: !event.event_time,
    location: {
      name: event.location_name,
      address: event.location_address,
      coordinates: event.location_lat && event.location_lon ? {
        lat: parseFloat(event.location_lat),
        lng: parseFloat(event.location_lon)
      } : null
    },
    primaryCategory: category,
    images: event.image ? [{
      url: event.image,
      isPrimary: true
    }] : [],
    pricing: {
      isFree: true // Default - can be extended with price data
    },
    url: event.url,
    destinationId: event.destination_id,
    featured: Boolean(event.is_in_calpe_area),
    status: 'active'
  };
}

/**
 * Build destination filter SQL condition.
 * Replaces hardcoded calpe_distance with destination_id.
 */
function buildDestinationFilter(destinationId) {
  return { condition: 'a.destination_id = ?', param: destinationId };
}

// ============================================================================
// ICAL HELPERS
// ============================================================================

/**
 * Escape text for iCal format (RFC 5545)
 */
function icalEscape(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Format date for iCal (YYYYMMDD or YYYYMMDDTHHmmssZ)
 */
function icalDate(dateStr, timeStr) {
  if (!dateStr) return '';
  const d = dateStr.replace(/-/g, '');
  if (!timeStr) return d; // All-day event: VALUE=DATE
  const t = timeStr.replace(/:/g, '').substring(0, 6);
  return `${d}T${t}00`;
}

/**
 * Generate VEVENT block for a single event occurrence.
 */
function generateVEvent(event, date, time) {
  const uid = `event-${event.id}-${date}@holidaibutler.com`;
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const isAllDay = !time;
  const title = event.title_en || event.title || 'Event';
  const desc = event.short_description_en || event.short_description || '';
  const location = [event.location_name, event.location_address].filter(Boolean).join(', ');

  let dtStart, dtEnd;
  if (isAllDay) {
    dtStart = `DTSTART;VALUE=DATE:${icalDate(date)}`;
    // All-day: end = next day (exclusive per RFC 5545)
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    const endStr = endDate.toISOString().split('T')[0];
    dtEnd = `DTEND;VALUE=DATE:${icalDate(endStr)}`;
  } else {
    dtStart = `DTSTART:${icalDate(date, time)}`;
    // Assume 2h duration if no end time
    const startMs = new Date(`${date}T${time}`).getTime();
    const endMs = startMs + 2 * 60 * 60 * 1000;
    const endDt = new Date(endMs).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    dtEnd = `DTEND:${endDt}`;
  }

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    dtStart,
    dtEnd,
    `SUMMARY:${icalEscape(title)}`,
  ];
  if (desc) lines.push(`DESCRIPTION:${icalEscape(desc)}`);
  if (location) lines.push(`LOCATION:${icalEscape(location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  if (event.location_lat && event.location_lon) {
    lines.push(`GEO:${event.location_lat};${event.location_lon}`);
  }
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/v1/agenda/events
 * Get events with filtering and pagination
 *
 * Query params:
 *   page, limit, search, startDate, endDate, dateRange,
 *   category (auto-detected), lang, sort, sortOrder
 */
router.get('/events', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 24,
      search,
      startDate,
      endDate,
      dateRange,
      category,
      distance,
      lang,
      sort = 'date',
      sortOrder = 'asc'
    } = req.query;

    // Language: query param → Accept-Language header → default 'en'
    const language = lang || (req.headers['accept-language'] || '').substring(0, 2) || 'en';

    const destinationId = getDestinationId(req);
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 500);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    const conditions = ['1=1'];
    const params = [];

    // Destination filter
    const destFilter = buildDestinationFilter(destinationId);
    conditions.push(destFilter.condition);
    params.push(destFilter.param);

    // Distance filter (km from destination center, default 15km for Calpe)
    const maxDistance = distance ? parseInt(distance) : 15;
    if (maxDistance > 0 && maxDistance < 999) {
      conditions.push('(a.calpe_distance IS NULL OR a.calpe_distance <= ?)');
      params.push(maxDistance);
    }

    // Date filtering
    let dateCondition = 'd.event_date >= CURDATE()'; // Default: upcoming

    if (dateRange === 'today') {
      dateCondition = 'd.event_date = CURDATE()';
    } else if (dateRange === 'thisWeek') {
      dateCondition = 'd.event_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)';
    } else if (dateRange === 'thisMonth') {
      dateCondition = 'd.event_date BETWEEN CURDATE() AND LAST_DAY(CURDATE())';
    } else if (startDate && endDate) {
      dateCondition = 'd.event_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateCondition = 'd.event_date >= ?';
      params.push(startDate);
    }

    conditions.push(dateCondition);

    // Search filter (multi-language)
    if (search) {
      conditions.push('(a.title LIKE ? OR a.title_en LIKE ? OR a.short_description LIKE ? OR a.location_name LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE ${whereClause}
    `;

    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get events
    const eventsQuery = `
      SELECT
        a.*,
        d.event_date as event_date,
        d.event_time as event_time
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE ${whereClause}
      ORDER BY d.event_date ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}, a.id
      LIMIT ? OFFSET ?
    `;

    const events = await query(eventsQuery, [...params, limitNum, offset]);

    let mappedEvents = events.map(e => mapEventToResponse(e, language));

    // Client-side category filter (based on auto-detected category)
    if (category) {
      const categories = category.split(',').map(c => c.trim().toLowerCase());
      mappedEvents = mappedEvents.filter(e => categories.includes(e.primaryCategory));
    }

    logger.info('Agenda events fetched', {
      count: mappedEvents.length,
      total,
      page: pageNum,
      destinationId,
      filters: { search, dateRange, category }
    });

    res.json({
      success: true,
      data: mappedEvents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    logger.error('Get agenda events error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not fetch events'
    });
  }
});

/**
 * GET /api/v1/agenda/events/featured
 * Get featured events (upcoming with images, next 14 days)
 */
router.get('/events/featured', async (req, res) => {
  try {
    const { limit = 6, lang } = req.query;
    const language = lang || (req.headers['accept-language'] || '').substring(0, 2) || 'en';
    const destinationId = getDestinationId(req);
    const limitNum = Math.min(parseInt(limit), 20);

    const eventsQuery = `
      SELECT
        a.*,
        MIN(d.event_date) as event_date,
        MIN(d.event_time) as event_time
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE d.event_date >= CURDATE()
        AND d.event_date <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)
        AND a.destination_id = ?
        AND a.image IS NOT NULL
        AND a.image != ''
      GROUP BY a.id
      ORDER BY event_date ASC
      LIMIT ?
    `;

    const events = await query(eventsQuery, [destinationId, limitNum]);
    const mappedEvents = events.map(e => ({
      ...mapEventToResponse(e, language),
      featured: true
    }));

    logger.info('Featured agenda events fetched', { count: mappedEvents.length, destinationId });

    res.json({
      success: true,
      data: mappedEvents,
      pagination: {
        page: 1,
        limit: limitNum,
        total: mappedEvents.length,
        pages: 1
      }
    });

  } catch (error) {
    logger.error('Get featured events error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not fetch featured events'
    });
  }
});

/**
 * GET /api/v1/agenda/events/:id
 * Get single event by ID with all upcoming dates
 */
router.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;
    const language = lang || (req.headers['accept-language'] || '').substring(0, 2) || 'en';

    const eventQuery = `SELECT a.* FROM agenda a WHERE a.id = ?`;
    const events = await query(eventQuery, [id]);

    if (events.length === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Get all upcoming dates
    const datesQuery = `
      SELECT event_date, event_time
      FROM agenda_dates
      WHERE provider_event_hash = ?
      AND event_date >= CURDATE()
      ORDER BY event_date ASC
    `;

    const dates = await query(datesQuery, [events[0].provider_event_hash]);
    const mappedEvent = mapEventToResponse(events[0], language);

    mappedEvent.allDates = dates.map(d => ({
      date: d.event_date,
      time: d.event_time
    }));

    if (dates.length > 0) {
      mappedEvent.startDate = `${dates[0].event_date}T${dates[0].event_time || '00:00:00'}`;
    }

    logger.info('Single agenda event fetched', { id, title: events[0].title });
    res.json({ success: true, data: mappedEvent });

  } catch (error) {
    logger.error('Get single event error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch event' });
  }
});

/**
 * GET /api/v1/agenda/events/:id/ical
 * Download iCal file for a single event (all its upcoming dates)
 */
router.get('/events/:id/ical', async (req, res) => {
  try {
    const { id } = req.params;

    const eventQuery = `SELECT a.* FROM agenda a WHERE a.id = ?`;
    const events = await query(eventQuery, [id]);

    if (events.length === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const event = events[0];

    const datesQuery = `
      SELECT event_date, event_time
      FROM agenda_dates
      WHERE provider_event_hash = ?
      AND event_date >= CURDATE()
      ORDER BY event_date ASC
    `;
    const dates = await query(datesQuery, [event.provider_event_hash]);

    if (dates.length === 0) {
      return res.status(404).json({ success: false, error: 'No upcoming dates for this event' });
    }

    // Build iCal
    const vevents = dates.map(d =>
      generateVEvent(event, String(d.event_date).substring(0, 10), d.event_time ? String(d.event_time) : null)
    );

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HolidaiButler//Agenda//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${icalEscape(event.title_en || event.title)}`,
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n');

    const filename = `event-${id}.ics`;
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(ical);

  } catch (error) {
    logger.error('Get event iCal error:', error);
    res.status(500).json({ success: false, error: 'Could not generate iCal' });
  }
});

/**
 * GET /api/v1/agenda/feed.ics
 * iCal subscription feed for all upcoming events in a destination.
 * Clients (Google Calendar, Apple Calendar) can subscribe to this URL.
 *
 * Query params:
 *   weeks: number of weeks to include (default 8, max 26)
 */
router.get('/feed.ics', async (req, res) => {
  try {
    const destinationId = getDestinationId(req);
    const weeks = Math.min(parseInt(req.query.weeks) || 8, 26);

    const eventsQuery = `
      SELECT a.*, d.event_date, d.event_time
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE a.destination_id = ?
        AND d.event_date >= CURDATE()
        AND d.event_date <= DATE_ADD(CURDATE(), INTERVAL ? WEEK)
      ORDER BY d.event_date ASC
      LIMIT 500
    `;

    const events = await query(eventsQuery, [destinationId, weeks]);

    const destNames = { 1: 'Calpe', 2: 'Texel', 3: 'Alicante', 4: 'WarreWijzer' };
    const calName = `${destNames[destinationId] || 'HolidaiButler'} Events`;

    const vevents = events.map(e =>
      generateVEvent(e, String(e.event_date).substring(0, 10), e.event_time ? String(e.event_time) : null)
    );

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HolidaiButler//Agenda//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${icalEscape(calName)}`,
      'X-WR-TIMEZONE:Europe/Amsterdam',
      `REFRESH-INTERVAL;VALUE=DURATION:P1D`,
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n');

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // 1h cache for subscription feeds
    });
    res.send(ical);

    logger.info('Agenda iCal feed served', { destinationId, events: events.length, weeks });

  } catch (error) {
    logger.error('Get agenda feed error:', error);
    res.status(500).json({ success: false, error: 'Could not generate feed' });
  }
});

/**
 * GET /api/v1/agenda/stats
 * Get event statistics for the current destination
 */
router.get('/stats', async (req, res) => {
  try {
    const destinationId = getDestinationId(req);
    const destFilter = 'AND a.destination_id = ?';

    const totalQuery = `
      SELECT COUNT(DISTINCT a.id) as total
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE d.event_date >= CURDATE() ${destFilter}
    `;

    const weekQuery = `
      SELECT COUNT(DISTINCT a.id) as count
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE d.event_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) ${destFilter}
    `;

    const monthQuery = `
      SELECT COUNT(DISTINCT a.id) as count
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE d.event_date BETWEEN CURDATE() AND LAST_DAY(CURDATE()) ${destFilter}
    `;

    const todayQuery = `
      SELECT COUNT(DISTINCT a.id) as count
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE d.event_date = CURDATE() ${destFilter}
    `;

    const [totalResult, weekResult, monthResult, todayResult] = await Promise.all([
      query(totalQuery, [destinationId]),
      query(weekQuery, [destinationId]),
      query(monthQuery, [destinationId]),
      query(todayQuery, [destinationId])
    ]);

    const stats = {
      total: totalResult[0]?.total || 0,
      today: todayResult[0]?.count || 0,
      thisWeek: weekResult[0]?.count || 0,
      thisMonth: monthResult[0]?.count || 0,
      destinationId
    };

    logger.info('Agenda stats fetched', stats);
    res.json({ success: true, data: stats });

  } catch (error) {
    logger.error('Get agenda stats error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch statistics' });
  }
});

export default router;
