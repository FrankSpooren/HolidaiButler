const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Events API Routes for Customer Portal Ticketing
 * Provides event data with ticket types for the NEW enterprise ticketing module
 *
 * These endpoints support the frontend TicketsPage component which expects:
 * - GET /events - List events with filters
 * - GET /events/:eventId - Single event details
 * - GET /events/:eventId/ticket-types - Ticket types for an event
 * - GET /events/:eventId/availability - Availability for an event
 */

// ========== SAMPLE EVENTS DATA ==========
// In production, this would come from the database
// For now, providing rich sample data for demo purposes

const sampleEvents = [
  {
    id: 1,
    name: 'Benidorm Palace Dinner Show',
    description: 'Experience the spectacular Benidorm Palace with a gourmet dinner and world-class entertainment. Enjoy stunning performances, acrobatics, and live music in this iconic Costa Blanca venue.',
    shortDescription: 'Spectacular dinner show with world-class entertainment',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    images: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    ],
    location: 'Benidorm Palace, Avenida Doctor Severo Ochoa, Benidorm',
    address: {
      street: 'Avenida Doctor Severo Ochoa 13',
      city: 'Benidorm',
      postalCode: '03503',
      country: 'Spain',
    },
    coordinates: { lat: 38.5411, lng: -0.1225 },
    category: 'entertainment',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
    startTime: '20:30',
    duration: 180, // minutes
    status: 'active',
    featured: true,
    availableTickets: 150,
    totalCapacity: 200,
    organizer: {
      name: 'Benidorm Palace Entertainment',
      email: 'info@benidormpalace.com',
    },
    tags: ['dinner show', 'entertainment', 'live music', 'benidorm'],
    ticketTypes: [
      {
        id: 101,
        eventId: 1,
        name: 'Standard Ticket',
        description: 'Entry to show with welcome drink',
        price: 45.00,
        currency: 'EUR',
        maxPerOrder: 10,
        availableQuantity: 100,
        includes: ['Show entry', 'Welcome drink'],
      },
      {
        id: 102,
        eventId: 1,
        name: 'Dinner & Show Package',
        description: 'Full dinner experience with premium seating',
        price: 89.00,
        currency: 'EUR',
        maxPerOrder: 8,
        availableQuantity: 50,
        includes: ['Premium seating', '3-course dinner', 'Drinks package', 'Show entry'],
      },
      {
        id: 103,
        eventId: 1,
        name: 'VIP Experience',
        description: 'Ultimate VIP package with backstage tour',
        price: 149.00,
        currency: 'EUR',
        maxPerOrder: 4,
        availableQuantity: 20,
        includes: ['Front row seating', 'Gourmet dinner', 'Premium drinks', 'Backstage tour', 'Meet & greet'],
      },
    ],
  },
  {
    id: 2,
    name: 'Terra Mitica Theme Park',
    description: 'Discover the ancient civilizations at Terra Mitica! Experience thrilling rides, spectacular shows, and immersive themed areas including Egypt, Greece, Rome, and Iberia.',
    shortDescription: 'Mediterranean themed park with thrilling attractions',
    imageUrl: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=800',
    images: [
      'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=800',
      'https://images.unsplash.com/photo-1560713781-d00f6c18f388?w=800',
    ],
    location: 'Terra Mitica, Benidorm',
    address: {
      street: 'Partida del Moralet',
      city: 'Benidorm',
      postalCode: '03502',
      country: 'Spain',
    },
    coordinates: { lat: 38.5567, lng: -0.1456 },
    category: 'theme_park',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: '10:00',
    duration: 600, // All day
    status: 'active',
    featured: true,
    availableTickets: 500,
    totalCapacity: 1000,
    organizer: {
      name: 'Terra Mitica Parks',
      email: 'tickets@terramitica.com',
    },
    tags: ['theme park', 'family', 'rides', 'attractions'],
    ticketTypes: [
      {
        id: 201,
        eventId: 2,
        name: 'Day Pass',
        description: 'Full day access to all attractions',
        price: 39.00,
        currency: 'EUR',
        maxPerOrder: 10,
        availableQuantity: 400,
        includes: ['All attractions', 'All shows'],
      },
      {
        id: 202,
        eventId: 2,
        name: 'Family Pack (4 persons)',
        description: 'Great value for families',
        price: 129.00,
        currency: 'EUR',
        maxPerOrder: 3,
        availableQuantity: 100,
        includes: ['4 day passes', 'Fast pass for 2 rides', 'Meal voucher'],
      },
      {
        id: 203,
        eventId: 2,
        name: 'Season Pass',
        description: 'Unlimited visits for the whole season',
        price: 99.00,
        currency: 'EUR',
        maxPerOrder: 6,
        availableQuantity: 200,
        includes: ['Unlimited visits', '10% discount on food', 'Free parking'],
      },
    ],
  },
  {
    id: 3,
    name: 'Guadalest Valley Wine Tour',
    description: 'Explore the stunning Guadalest Valley with a guided wine tour. Visit local bodegas, taste premium wines, and enjoy breathtaking mountain views.',
    shortDescription: 'Wine tasting tour through scenic Guadalest Valley',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800',
    images: [
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800',
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800',
    ],
    location: 'Guadalest, Alicante',
    address: {
      street: 'Calle Iglesia',
      city: 'Guadalest',
      postalCode: '03517',
      country: 'Spain',
    },
    coordinates: { lat: 38.6833, lng: -0.2000 },
    category: 'tour',
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: '10:00',
    duration: 300, // 5 hours
    status: 'active',
    featured: false,
    availableTickets: 24,
    totalCapacity: 30,
    organizer: {
      name: 'Costa Blanca Wine Tours',
      email: 'tours@cbwinetours.com',
    },
    tags: ['wine', 'tour', 'nature', 'guadalest'],
    ticketTypes: [
      {
        id: 301,
        eventId: 3,
        name: 'Standard Tour',
        description: 'Guided tour with 3 wine tastings',
        price: 65.00,
        currency: 'EUR',
        maxPerOrder: 8,
        availableQuantity: 20,
        includes: ['Transport', '3 bodega visits', '9 wine tastings', 'Local snacks'],
      },
      {
        id: 302,
        eventId: 3,
        name: 'Premium Tour',
        description: 'Extended tour with lunch and extra tastings',
        price: 95.00,
        currency: 'EUR',
        maxPerOrder: 6,
        availableQuantity: 10,
        includes: ['Transport', '4 bodega visits', '12 wine tastings', 'Gourmet lunch', 'Olive oil tasting'],
      },
    ],
  },
  {
    id: 4,
    name: 'Altea Sunset Boat Trip',
    description: 'Sail along the beautiful Costa Blanca coastline and watch the sunset from the Mediterranean Sea. Includes drinks and tapas on board.',
    shortDescription: 'Scenic sunset cruise along Costa Blanca',
    imageUrl: 'https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=800',
    images: [
      'https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=800',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    ],
    location: 'Puerto de Altea, Altea',
    address: {
      street: 'Puerto Deportivo Luis Campomanes',
      city: 'Altea',
      postalCode: '03590',
      country: 'Spain',
    },
    coordinates: { lat: 38.5989, lng: -0.0519 },
    category: 'excursion',
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: '18:30',
    duration: 150, // 2.5 hours
    status: 'active',
    featured: true,
    availableTickets: 18,
    totalCapacity: 20,
    organizer: {
      name: 'Costa Blanca Sailing',
      email: 'info@cbsailing.com',
    },
    tags: ['boat', 'sunset', 'sailing', 'altea'],
    ticketTypes: [
      {
        id: 401,
        eventId: 4,
        name: 'Standard Ticket',
        description: 'Sunset cruise with welcome drink',
        price: 45.00,
        currency: 'EUR',
        maxPerOrder: 6,
        availableQuantity: 15,
        includes: ['2.5 hour cruise', 'Welcome cava', 'Tapas selection'],
      },
      {
        id: 402,
        eventId: 4,
        name: 'Premium Experience',
        description: 'Premium package with seafood dinner',
        price: 85.00,
        currency: 'EUR',
        maxPerOrder: 4,
        availableQuantity: 6,
        includes: ['2.5 hour cruise', 'Premium drinks', 'Fresh seafood dinner', 'Private deck area'],
      },
    ],
  },
  {
    id: 5,
    name: 'Alicante Old Town Walking Tour',
    description: 'Discover the history and culture of Alicante with a professional guide. Visit the Santa Barbara Castle, explore the charming old town streets, and learn about centuries of Mediterranean heritage.',
    shortDescription: 'Guided historic walking tour of Alicante',
    imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800',
    images: [
      'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800',
    ],
    location: 'Alicante City Center',
    address: {
      street: 'Plaza del Ayuntamiento',
      city: 'Alicante',
      postalCode: '03002',
      country: 'Spain',
    },
    coordinates: { lat: 38.3452, lng: -0.4810 },
    category: 'tour',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: '10:00',
    duration: 180, // 3 hours
    status: 'active',
    featured: false,
    availableTickets: 40,
    totalCapacity: 50,
    organizer: {
      name: 'Alicante Free Tours',
      email: 'tours@alicantetours.com',
    },
    tags: ['walking tour', 'history', 'culture', 'alicante'],
    ticketTypes: [
      {
        id: 501,
        eventId: 5,
        name: 'Walking Tour',
        description: 'Guided walking tour through historic Alicante',
        price: 25.00,
        currency: 'EUR',
        maxPerOrder: 10,
        availableQuantity: 40,
        includes: ['Professional guide', '3 hour tour', 'Castle entrance'],
      },
    ],
  },
];

// ========== HELPER FUNCTIONS ==========

const filterEvents = (events, filters) => {
  let filtered = [...events];

  if (filters.status) {
    filtered = filtered.filter(e => e.status === filters.status);
  }

  if (filters.category) {
    filtered = filtered.filter(e => e.category === filters.category);
  }

  if (filters.featured === 'true') {
    filtered = filtered.filter(e => e.featured === true);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(e =>
      e.name.toLowerCase().includes(searchLower) ||
      e.description.toLowerCase().includes(searchLower) ||
      e.location.toLowerCase().includes(searchLower) ||
      e.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    filtered = filtered.filter(e => new Date(e.startDate) >= startDate);
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    filtered = filtered.filter(e => new Date(e.startDate) <= endDate);
  }

  return filtered;
};

// ========== API ENDPOINTS ==========

/**
 * GET /api/v1/tickets/events
 * List all events with optional filters
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, category, featured, search, startDate, endDate, page = 1, limit = 20 } = req.query;

    let events = filterEvents(sampleEvents, { status, category, featured, search, startDate, endDate });

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedEvents = events.slice(startIndex, endIndex);

    // Remove full ticketTypes from list response (include basic info only)
    const eventsWithBasicInfo = paginatedEvents.map(event => ({
      ...event,
      ticketTypes: undefined,
      ticketTypesCount: event.ticketTypes.length,
      priceRange: {
        min: Math.min(...event.ticketTypes.map(t => t.price)),
        max: Math.max(...event.ticketTypes.map(t => t.price)),
        currency: event.ticketTypes[0]?.currency || 'EUR',
      },
    }));

    res.json({
      success: true,
      data: eventsWithBasicInfo,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: events.length,
        totalPages: Math.ceil(events.length / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/tickets/events/:eventId
 * Get single event details
 */
router.get('/:eventId', optionalAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = sampleEvents.find(e => e.id === parseInt(eventId));

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    logger.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/tickets/events/:eventId/ticket-types
 * Get ticket types for an event
 */
router.get('/:eventId/ticket-types', optionalAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = sampleEvents.find(e => e.id === parseInt(eventId));

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    res.json({
      success: true,
      data: event.ticketTypes,
    });
  } catch (error) {
    logger.error('Error fetching ticket types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket types',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/tickets/events/:eventId/availability
 * Get availability for an event on a specific date
 */
router.get('/:eventId/availability', optionalAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { date } = req.query;
    const event = sampleEvents.find(e => e.id === parseInt(eventId));

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Generate availability data for the event
    const availability = {
      eventId: event.id,
      date: date || new Date().toISOString().split('T')[0],
      available: event.availableTickets > 0,
      totalCapacity: event.totalCapacity,
      availableTickets: event.availableTickets,
      ticketTypeAvailability: event.ticketTypes.map(tt => ({
        ticketTypeId: tt.id,
        name: tt.name,
        available: tt.availableQuantity > 0,
        quantity: tt.availableQuantity,
        price: tt.price,
        currency: tt.currency,
      })),
      timeslots: [
        { time: event.startTime, available: true, capacity: event.availableTickets },
      ],
    };

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    logger.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch availability',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/tickets/events/categories
 * Get list of event categories
 */
router.get('/meta/categories', optionalAuth, async (req, res) => {
  try {
    const categories = [
      { id: 'entertainment', name: 'Entertainment', icon: 'theater' },
      { id: 'theme_park', name: 'Theme Parks', icon: 'ferris-wheel' },
      { id: 'tour', name: 'Tours & Experiences', icon: 'map' },
      { id: 'excursion', name: 'Excursions', icon: 'compass' },
      { id: 'sport', name: 'Sports & Activities', icon: 'activity' },
      { id: 'culture', name: 'Culture & Museums', icon: 'landmark' },
    ];

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
});

/**
 * GET /api/v1/tickets/events/featured
 * Get featured events
 */
router.get('/meta/featured', optionalAuth, async (req, res) => {
  try {
    const featured = sampleEvents.filter(e => e.featured && e.status === 'active');

    res.json({
      success: true,
      data: featured.map(event => ({
        ...event,
        ticketTypes: undefined,
        priceRange: {
          min: Math.min(...event.ticketTypes.map(t => t.price)),
          max: Math.max(...event.ticketTypes.map(t => t.price)),
          currency: event.ticketTypes[0]?.currency || 'EUR',
        },
      })),
    });
  } catch (error) {
    logger.error('Error fetching featured events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured events',
    });
  }
});

module.exports = router;
