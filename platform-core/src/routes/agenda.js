/**
 * Agenda Routes
 * API endpoints for Events & Activities Calendar
 *
 * Data source: agenda + agenda_dates tables (Hetzner MySQL)
 *
 * Endpoints:
 * - GET /agenda/events - Get events with filtering and pagination
 * - GET /agenda/events/featured - Get featured/upcoming events
 * - GET /agenda/events/:id - Get single event by ID
 * - GET /agenda/stats - Get event statistics
 */

import express from 'express';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();
const { QueryTypes } = (await import('sequelize')).default;

/**
 * Helper: Execute raw SQL query
 */
async function query(sql, params = []) {
  return mysqlSequelize.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

/**
 * Helper: Map database row to API response format
 */
function mapEventToResponse(event, language = 'nl') {
  // Determine title based on language
  let title = event.title;
  let description = event.short_description;

  if (language === 'en' && event.title_en) {
    title = event.title_en;
    description = event.short_description_en;
  } else if (language === 'es' && event.title_es) {
    title = event.title_es;
    description = event.short_description_es;
  }

  return {
    _id: String(event.id),
    id: event.id,
    title: {
      nl: event.title || title,
      en: event.title_en || title,
      es: event.title_es || title
    },
    description: {
      nl: event.short_description || description,
      en: event.short_description_en || description,
      es: event.short_description_es || description
    },
    longDescription: {
      nl: event.long_description,
      en: event.long_description_en,
      es: event.long_description_es
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
    primaryCategory: 'culture', // Default category - can be extended
    images: event.image ? [{
      url: event.image,
      isPrimary: true
    }] : [],
    pricing: {
      isFree: true // Default - can be extended with price data
    },
    url: event.url,
    isInCalpeArea: Boolean(event.is_in_calpe_area),
    calpeDistance: event.calpe_distance,
    featured: event.is_in_calpe_area === 1,
    status: 'active'
  };
}

/**
 * GET /api/v1/agenda/events
 * Get events with filtering and pagination
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
      isFree,
      lang = 'nl',
      sort = 'date',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 500); // Allow up to 500 events for virtualized display
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    const conditions = ['1=1'];
    const params = [];

    // Date filtering
    let dateCondition = 'd.event_date >= CURDATE()'; // Default: upcoming events

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

    // Search filter
    if (search) {
      conditions.push('(a.title LIKE ? OR a.short_description LIKE ? OR a.location_name LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Distance filter: max 25km from Calpe, include 0km, exclude NULL
    conditions.push('(a.calpe_distance IS NOT NULL AND a.calpe_distance <= 25)');

    const whereClause = conditions.join(' AND ');

    // Get total count (count each event-date occurrence, not just unique events)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE ${whereClause}
    `;

    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get events with each date occurrence (multi-day events appear on each day)
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

    const mappedEvents = events.map(e => mapEventToResponse(e, lang));

    logger.info('Agenda events fetched', {
      count: mappedEvents.length,
      total,
      page: pageNum,
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
 * Get featured/highlighted events (upcoming events in Calpe area)
 */
router.get('/events/featured', async (req, res) => {
  try {
    const { limit = 6, lang = 'nl' } = req.query;
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
        AND (a.calpe_distance IS NOT NULL AND a.calpe_distance <= 25)
        AND a.image IS NOT NULL
        AND a.image != ''
      GROUP BY a.id
      ORDER BY event_date ASC
      LIMIT ?
    `;

    const events = await query(eventsQuery, [limitNum]);
    const mappedEvents = events.map(e => ({
      ...mapEventToResponse(e, lang),
      featured: true
    }));

    logger.info('Featured agenda events fetched', { count: mappedEvents.length });

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
 * Get single event by ID
 */
router.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = 'nl' } = req.query;

    // Get event with all its dates
    const eventQuery = `
      SELECT a.*
      FROM agenda a
      WHERE a.id = ?
    `;

    const events = await query(eventQuery, [id]);

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Get all dates for this event
    const datesQuery = `
      SELECT event_date, event_time
      FROM agenda_dates
      WHERE provider_event_hash = ?
      AND event_date >= CURDATE()
      ORDER BY event_date ASC
    `;

    const dates = await query(datesQuery, [events[0].provider_event_hash]);

    const mappedEvent = mapEventToResponse(events[0], lang);

    // Add all upcoming dates
    mappedEvent.allDates = dates.map(d => ({
      date: d.event_date,
      time: d.event_time
    }));

    // Set first upcoming date as startDate
    if (dates.length > 0) {
      mappedEvent.startDate = `${dates[0].event_date}T${dates[0].event_time || '00:00:00'}`;
    }

    logger.info('Single agenda event fetched', { id, title: events[0].title });

    res.json({
      success: true,
      data: mappedEvent
    });

  } catch (error) {
    logger.error('Get single event error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not fetch event'
    });
  }
});

/**
 * GET /api/v1/agenda/stats
 * Get event statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Distance filter for all stats queries
    const distanceFilter = 'AND (a.calpe_distance IS NOT NULL AND a.calpe_distance <= 25)';

    // Total events
    const totalQuery = `
      SELECT COUNT(DISTINCT a.id) as total
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE d.event_date >= CURDATE()
        ${distanceFilter}
    `;

    // Events this week
    const weekQuery = `
      SELECT COUNT(DISTINCT a.id) as count
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE d.event_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ${distanceFilter}
    `;

    // Events this month
    const monthQuery = `
      SELECT COUNT(DISTINCT a.id) as count
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE d.event_date BETWEEN CURDATE() AND LAST_DAY(CURDATE())
        ${distanceFilter}
    `;

    // Events today
    const todayQuery = `
      SELECT COUNT(DISTINCT a.id) as count
      FROM agenda a
      INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash
      WHERE d.event_date = CURDATE()
        ${distanceFilter}
    `;

    const [totalResult, weekResult, monthResult, todayResult] = await Promise.all([
      query(totalQuery),
      query(weekQuery),
      query(monthQuery),
      query(todayQuery)
    ]);

    const stats = {
      total: totalResult[0]?.total || 0,
      today: todayResult[0]?.count || 0,
      thisWeek: weekResult[0]?.count || 0,
      thisMonth: monthResult[0]?.count || 0
    };

    logger.info('Agenda stats fetched', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get agenda stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not fetch statistics'
    });
  }
});

export default router;
