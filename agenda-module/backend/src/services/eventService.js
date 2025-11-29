const { Op, fn, col, literal } = require('sequelize');
const Event = require('../models/Event');
const multiSourceVerification = require('./multiSourceVerification');
const translationService = require('./translationService');

/**
 * Event Service
 * Handles all business logic for events (MySQL/Sequelize)
 */

class EventService {
  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @param {String} userId - User ID creating the event
   * @returns {Promise<Object>} Created event
   */
  async createEvent(eventData, userId = null) {
    try {
      // Detect source language if not specified
      if (eventData.title && typeof eventData.title === 'string') {
        const detectedLang = await translationService.detectLanguage(eventData.title);
        const translatedEvent = await translationService.translateEvent(eventData, detectedLang);
        eventData = translatedEvent;
      }

      // Add creator
      if (userId) {
        eventData.createdBy = userId;
      }

      // Create hash for first source
      if (eventData.sources && eventData.sources.length > 0) {
        eventData.sources[0].dataHash = multiSourceVerification.createDataHash(eventData);
        eventData.sources[0].lastChecked = new Date();
      }

      const event = await Event.create(eventData);
      return event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Update an event
   * @param {String} eventId - Event ID
   * @param {Object} updateData - Data to update
   * @param {String} userId - User ID making the update
   * @returns {Promise<Object>} Updated event
   */
  async updateEvent(eventId, updateData, userId = null) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Update modifier
      if (userId) {
        updateData.updatedBy = userId;
      }

      await event.update(updateData);
      return event;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Get events with filtering
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options (limit, skip, sort)
   * @returns {Promise<Object>} Events and metadata
   */
  async getEvents(filters = {}, options = {}) {
    try {
      const {
        dateRange,
        startDate,
        endDate,
        primaryCategory,
        categories,
        activityType,
        city = 'Calpe',
        area,
        targetAudience,
        timeOfDay,
        isFree,
        featured,
        status = 'published',
        visibility = 'public',
        search,
        page = 1,
        limit = 50,
        sort = 'startDate',
        sortOrder = 'asc',
      } = filters;

      // Build where clause
      const where = {
        status,
        visibility,
      };

      // City filter (JSON field)
      if (city) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push(
          literal(`JSON_EXTRACT(location, '$.city') = '${city}'`)
        );
      }

      // Date filtering
      const now = new Date();
      if (dateRange === 'upcoming') {
        where.startDate = { [Op.gte]: now };
      } else if (dateRange === 'today') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        where.startDate = { [Op.gte]: now, [Op.lt]: tomorrow };
      } else if (dateRange === 'this-week') {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        where.startDate = { [Op.gte]: now, [Op.lte]: endOfWeek };
      } else if (dateRange === 'this-month') {
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        where.startDate = { [Op.gte]: now, [Op.lte]: endOfMonth };
      } else if (startDate || endDate) {
        where[Op.or] = [];
        if (startDate && endDate) {
          where[Op.or] = [
            { startDate: { [Op.gte]: new Date(startDate), [Op.lte]: new Date(endDate) } },
            { endDate: { [Op.gte]: new Date(startDate), [Op.lte]: new Date(endDate) } },
            { startDate: { [Op.lte]: new Date(startDate) }, endDate: { [Op.gte]: new Date(endDate) } },
          ];
        } else if (startDate) {
          where.startDate = { [Op.gte]: new Date(startDate) };
        } else if (endDate) {
          where.endDate = { [Op.lte]: new Date(endDate) };
        }
      }

      // Category filtering
      if (primaryCategory) {
        where[Op.or] = [
          { primaryCategory },
          literal(`JSON_CONTAINS(secondary_categories, '"${primaryCategory}"')`),
        ];
      }

      if (categories && categories.length > 0) {
        where[Op.or] = [
          { primaryCategory: { [Op.in]: categories } },
          ...categories.map(cat => literal(`JSON_CONTAINS(secondary_categories, '"${cat}"')`)),
        ];
      }

      if (activityType) {
        where.activityType = activityType;
      }

      // Area filtering (JSON field)
      if (area) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push(
          literal(`JSON_EXTRACT(location, '$.area') = '${area}'`)
        );
      }

      // Target audience filtering (JSON array)
      if (targetAudience) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push(
          literal(`JSON_CONTAINS(target_audience, '"${targetAudience}"')`)
        );
      }

      // Time filtering
      if (timeOfDay) {
        where.timeOfDay = timeOfDay;
      }

      // Pricing filter
      if (isFree !== undefined) {
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push(
          literal(`JSON_EXTRACT(pricing, '$.isFree') = ${isFree}`)
        );
      }

      // Featured filter
      if (featured !== undefined) {
        where.featured = featured;
      }

      // Text search
      if (search) {
        where[Op.or] = [
          literal(`JSON_EXTRACT(title, '$.nl') LIKE '%${search}%'`),
          literal(`JSON_EXTRACT(title, '$.en') LIKE '%${search}%'`),
          literal(`JSON_EXTRACT(title, '$.es') LIKE '%${search}%'`),
          literal(`JSON_EXTRACT(description, '$.nl') LIKE '%${search}%'`),
          literal(`JSON_EXTRACT(description, '$.en') LIKE '%${search}%'`),
          literal(`JSON_EXTRACT(location, '$.name') LIKE '%${search}%'`),
        ];
      }

      // Execute query
      const offset = (page - 1) * limit;
      const sortField = sort === 'startDate' ? 'start_date' : sort;
      const order = [[sortField, sortOrder.toUpperCase()]];

      const { rows: events, count: total } = await Event.findAndCountAll({
        where,
        order,
        limit: parseInt(limit),
        offset,
      });

      return {
        events,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  }

  /**
   * Get a single event by ID
   * @param {String} eventId - Event ID
   * @param {String} language - Preferred language
   * @returns {Promise<Object>} Event
   */
  async getEventById(eventId, language = 'nl') {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Increment view count
      await event.incrementView();

      return event;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }

  /**
   * Get event by slug
   * @param {String} slug - Event slug
   * @returns {Promise<Object>} Event
   */
  async getEventBySlug(slug) {
    try {
      const event = await Event.findOne({
        where: {
          status: 'published',
          [Op.and]: [
            literal(`JSON_EXTRACT(seo, '$.slug') = '${slug}'`)
          ],
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      await event.incrementView();
      return event;
    } catch (error) {
      console.error('Error getting event by slug:', error);
      throw error;
    }
  }

  /**
   * Delete event (soft delete)
   * @param {String} eventId - Event ID
   * @returns {Promise<Boolean>} Success
   */
  async deleteEvent(eventId) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      await event.update({
        deletedAt: new Date(),
        status: 'archived',
      });

      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Add or update a source for an event
   * @param {String} eventId - Event ID
   * @param {Object} sourceData - Source data
   * @returns {Promise<Object>} Updated event
   */
  async addEventSource(eventId, sourceData) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Validate source data
      const validation = multiSourceVerification.validateSourceData(
        sourceData,
        sourceData.platform
      );

      if (!validation.isValid) {
        throw new Error(`Invalid source data: ${validation.issues.join(', ')}`);
      }

      // Add data hash
      sourceData.dataHash = multiSourceVerification.createDataHash(sourceData);
      sourceData.lastChecked = new Date();
      sourceData.confidence = validation.qualityScore;

      // Add source to event
      await event.addSource(sourceData);

      // Re-verify event with new source
      const verification = multiSourceVerification.verifyEvent(event);
      const updatedVerification = {
        ...event.verification,
        ...verification,
        lastVerified: new Date(),
      };

      await event.update({ verification: updatedVerification });

      return event;
    } catch (error) {
      console.error('Error adding event source:', error);
      throw error;
    }
  }

  /**
   * Get events that need updating (stale data)
   * @param {Number} hours - Hours since last check
   * @returns {Promise<Array>} Events to update
   */
  async getStaleEvents(hours = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const events = await Event.findAll({
        where: {
          status: { [Op.in]: ['published', 'draft'] },
          endDate: { [Op.gte]: new Date() },
        },
      });

      // Filter events with stale sources (JSON field filtering)
      return events.filter(event => {
        const sources = event.sources || [];
        return sources.some(s => !s.lastChecked || new Date(s.lastChecked) < cutoffDate);
      });
    } catch (error) {
      console.error('Error getting stale events:', error);
      throw error;
    }
  }

  /**
   * Get past events to archive
   * @param {Number} daysAgo - Days since event ended
   * @returns {Promise<Array>} Events to archive
   */
  async getPastEventsToArchive(daysAgo = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      const events = await Event.findAll({
        where: {
          endDate: { [Op.lt]: cutoffDate },
          status: { [Op.in]: ['published', 'draft'] },
        },
      });

      return events;
    } catch (error) {
      console.error('Error getting past events:', error);
      throw error;
    }
  }

  /**
   * Archive old events
   * @param {Number} daysAgo - Days since event ended
   * @returns {Promise<Number>} Number of archived events
   */
  async archiveOldEvents(daysAgo = 30) {
    try {
      const events = await this.getPastEventsToArchive(daysAgo);

      for (const event of events) {
        await event.update({ status: 'archived' });
      }

      return events.length;
    } catch (error) {
      console.error('Error archiving events:', error);
      throw error;
    }
  }

  /**
   * Get featured events
   * @param {Number} limit - Max number of events
   * @returns {Promise<Array>} Featured events
   */
  async getFeaturedEvents(limit = 10) {
    try {
      const now = new Date();

      const events = await Event.findAll({
        where: {
          featured: true,
          status: 'published',
          visibility: 'public',
          startDate: { [Op.gte]: now },
        },
        order: [['priority', 'DESC'], ['start_date', 'ASC']],
        limit,
      });

      return events;
    } catch (error) {
      console.error('Error getting featured events:', error);
      throw error;
    }
  }

  /**
   * Get event statistics
   * @returns {Promise<Object>} Statistics
   */
  async getEventStatistics() {
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [
        total,
        upcoming,
        today,
        thisWeek,
        featured,
        verified,
      ] = await Promise.all([
        Event.count({ where: { status: 'published' } }),
        Event.count({ where: { status: 'published', startDate: { [Op.gte]: now } } }),
        Event.count({
          where: {
            status: 'published',
            startDate: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
          },
        }),
        Event.count({
          where: {
            status: 'published',
            startDate: { [Op.gte]: now, [Op.lte]: weekEnd },
          },
        }),
        Event.count({ where: { featured: true, status: 'published' } }),
        Event.count({
          where: {
            status: 'published',
            [Op.and]: [
              literal(`JSON_EXTRACT(verification, '$.status') = 'verified'`)
            ],
          },
        }),
      ]);

      // Get counts by category
      const byCategory = await Event.findAll({
        where: { status: 'published' },
        attributes: [
          'primaryCategory',
          [fn('COUNT', col('id')), 'count'],
        ],
        group: ['primaryCategory'],
        order: [[literal('count'), 'DESC']],
        raw: true,
      });

      return {
        total,
        upcoming,
        today,
        thisWeek,
        byCategory: byCategory.map(c => ({ _id: c.primaryCategory, count: c.count })),
        featured,
        verified,
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }
}

module.exports = new EventService();
