const eventService = require('../services/eventService');

/**
 * Event Controller
 * Handles HTTP requests for events
 */

class EventController {
  /**
   * Get all events with filtering
   * GET /api/agenda/events
   */
  async getEvents(req, res) {
    try {
      const filters = {
        // Date filters
        dateRange: req.query.dateRange,
        startDate: req.query.startDate,
        endDate: req.query.endDate,

        // Category filters
        primaryCategory: req.query.category,
        categories: req.query.categories ? req.query.categories.split(',') : undefined,
        activityType: req.query.activityType,

        // Location filters
        city: req.query.city || 'Calpe',
        area: req.query.area,
        nearLocation: req.query.lat && req.query.lng ? {
          lat: parseFloat(req.query.lat),
          lng: parseFloat(req.query.lng),
        } : undefined,
        maxDistance: req.query.maxDistance ? parseInt(req.query.maxDistance) : 5000,

        // Audience filter
        targetAudience: req.query.audience,

        // Time filter
        timeOfDay: req.query.timeOfDay,

        // Other filters
        isFree: req.query.isFree === 'true' ? true : req.query.isFree === 'false' ? false : undefined,
        featured: req.query.featured === 'true' ? true : undefined,
        search: req.query.search,

        // Pagination
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        sort: req.query.sort || 'startDate',
        sortOrder: req.query.sortOrder || 'asc',
      };

      const result = await eventService.getEvents(filters);

      res.json({
        success: true,
        data: result.events,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error in getEvents:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get single event by ID
   * GET /api/agenda/events/:id
   */
  async getEventById(req, res) {
    try {
      const { id } = req.params;
      const language = req.query.lang || 'nl';

      const event = await eventService.getEventById(id, language);

      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      console.error('Error in getEventById:', error);
      res.status(error.message === 'Event not found' ? 404 : 500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get event by slug
   * GET /api/agenda/events/slug/:slug
   */
  async getEventBySlug(req, res) {
    try {
      const { slug } = req.params;

      const event = await eventService.getEventBySlug(slug);

      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      console.error('Error in getEventBySlug:', error);
      res.status(error.message === 'Event not found' ? 404 : 500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get featured events
   * GET /api/agenda/events/featured
   */
  async getFeaturedEvents(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const events = await eventService.getFeaturedEvents(limit);

      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      console.error('Error in getFeaturedEvents:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get event statistics
   * GET /api/agenda/stats
   */
  async getStatistics(req, res) {
    try {
      const stats = await eventService.getEventStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error in getStatistics:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Create new event (admin only)
   * POST /api/agenda/events
   */
  async createEvent(req, res) {
    try {
      const eventData = req.body;
      const userId = req.user?.id; // From auth middleware

      const event = await eventService.createEvent(eventData, userId);

      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      console.error('Error in createEvent:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update event (admin only)
   * PUT /api/agenda/events/:id
   */
  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id;

      const event = await eventService.updateEvent(id, updateData, userId);

      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      console.error('Error in updateEvent:', error);
      res.status(error.message === 'Event not found' ? 404 : 500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete event (admin only)
   * DELETE /api/agenda/events/:id
   */
  async deleteEvent(req, res) {
    try {
      const { id } = req.params;

      await eventService.deleteEvent(id);

      res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      console.error('Error in deleteEvent:', error);
      res.status(error.message === 'Event not found' ? 404 : 500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new EventController();
