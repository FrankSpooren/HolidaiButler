const Event = require('../models/Event');
const multiSourceVerification = require('./multiSourceVerification');
const translationService = require('./translationService');

/**
 * Event Service
 * Handles all business logic for events
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

        // Translate to all supported languages
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

      const event = new Event(eventData);
      await event.save();

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
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          event[key] = updateData[key];
        }
      });

      // Update modifier
      if (userId) {
        event.updatedBy = userId;
      }

      await event.save();
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
        // Date filters
        startDate,
        endDate,
        dateRange,

        // Category filters
        primaryCategory,
        categories,
        activityType,

        // Location filters
        city = 'Calpe',
        area,
        nearLocation,
        maxDistance = 5000,

        // Audience filters
        targetAudience,

        // Time filters
        timeOfDay,

        // Other filters
        isFree,
        featured,
        status = 'published',
        visibility = 'public',
        search,

        // Pagination
        page = 1,
        limit = 50,
        sort = 'startDate',
        sortOrder = 'asc',
      } = filters;

      // Build query
      const query = {
        status,
        visibility,
        'location.city': city,
      };

      // Date filtering
      const now = new Date();
      if (dateRange === 'upcoming') {
        query.startDate = { $gte: now };
      } else if (dateRange === 'today') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        query.startDate = { $gte: now, $lt: tomorrow };
      } else if (dateRange === 'this-week') {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        query.startDate = { $gte: now, $lte: endOfWeek };
      } else if (dateRange === 'this-month') {
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        query.startDate = { $gte: now, $lte: endOfMonth };
      } else if (startDate || endDate) {
        query.$or = [
          { startDate: {} },
          { endDate: {} },
          { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
        ];
        if (startDate) {
          query.$or[0].startDate.$gte = new Date(startDate);
          query.$or[1].endDate.$gte = new Date(startDate);
        }
        if (endDate) {
          query.$or[0].startDate.$lte = new Date(endDate);
          query.$or[1].endDate.$lte = new Date(endDate);
        }
      }

      // Category filtering
      if (primaryCategory) {
        query.$or = [
          { primaryCategory },
          { secondaryCategories: primaryCategory },
        ];
      }

      if (categories && categories.length > 0) {
        query.$or = [
          { primaryCategory: { $in: categories } },
          { secondaryCategories: { $in: categories } },
        ];
      }

      if (activityType) {
        query.activityType = activityType;
      }

      // Location filtering
      if (area) {
        query['location.area'] = area;
      }

      // Audience filtering
      if (targetAudience) {
        query.targetAudience = targetAudience;
      }

      // Time filtering
      if (timeOfDay) {
        query.timeOfDay = timeOfDay;
      }

      // Pricing filter
      if (isFree !== undefined) {
        query['pricing.isFree'] = isFree;
      }

      // Featured filter
      if (featured !== undefined) {
        query.featured = featured;
      }

      // Text search
      if (search) {
        query.$or = [
          { 'title.nl': { $regex: search, $options: 'i' } },
          { 'title.en': { $regex: search, $options: 'i' } },
          { 'title.es': { $regex: search, $options: 'i' } },
          { 'description.nl': { $regex: search, $options: 'i' } },
          { 'description.en': { $regex: search, $options: 'i' } },
          { 'location.name': { $regex: search, $options: 'i' } },
        ];
      }

      // Execute query
      const skip = (page - 1) * limit;
      const sortObj = {};
      sortObj[sort] = sortOrder === 'desc' ? -1 : 1;

      let eventsQuery;

      // Geospatial query for near location
      if (nearLocation && nearLocation.lat && nearLocation.lng) {
        eventsQuery = Event.findNearLocation(
          { lat: nearLocation.lat, lng: nearLocation.lng },
          maxDistance,
          query
        );
      } else {
        eventsQuery = Event.find(query);
      }

      const [events, total] = await Promise.all([
        eventsQuery
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .lean(),
        Event.countDocuments(query),
      ]);

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
      const event = await Event.findById(eventId);
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
      const event = await Event.findOne({ 'seo.slug': slug, status: 'published' });
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
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      event.deletedAt = new Date();
      event.status = 'archived';
      await event.save();

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
      const event = await Event.findById(eventId);
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
      event.verification = {
        ...event.verification,
        ...verification,
        lastVerified: new Date(),
      };

      await event.save();

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

      const events = await Event.find({
        $or: [
          { 'sources.lastChecked': { $lt: cutoffDate } },
          { 'sources.lastChecked': null },
        ],
        status: { $in: ['published', 'draft'] },
        endDate: { $gte: new Date() }, // Only future events
      });

      return events;
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

      const events = await Event.find({
        endDate: { $lt: cutoffDate },
        status: { $in: ['published', 'draft'] },
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
        event.status = 'archived';
        await event.save();
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

      const events = await Event.find({
        featured: true,
        status: 'published',
        visibility: 'public',
        startDate: { $gte: now },
      })
        .sort({ priority: -1, startDate: 1 })
        .limit(limit)
        .lean();

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

      const [
        total,
        upcoming,
        today,
        thisWeek,
        byCategory,
        featured,
        verified,
      ] = await Promise.all([
        Event.countDocuments({ status: 'published' }),
        Event.countDocuments({ status: 'published', startDate: { $gte: now } }),
        Event.countDocuments({
          status: 'published',
          startDate: {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lt: new Date(now.setHours(23, 59, 59, 999)),
          },
        }),
        Event.countDocuments({
          status: 'published',
          startDate: {
            $gte: now,
            $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
        Event.aggregate([
          { $match: { status: 'published' } },
          { $group: { _id: '$primaryCategory', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Event.countDocuments({ featured: true, status: 'published' }),
        Event.countDocuments({ 'verification.status': 'verified', status: 'published' }),
      ]);

      return {
        total,
        upcoming,
        today,
        thisWeek,
        byCategory,
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
