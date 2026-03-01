/**
 * API Integration Tests for Ticketing Module
 */

const request = require('supertest');
const { mockBooking, mockTicket, mockAvailability } = require('../__mocks__/models');

// Mock dependencies before requiring app
jest.mock('../../models', () => require('../__mocks__/models'));
jest.mock('ioredis', () => require('../__mocks__/ioredis'));
jest.mock('axios');

// Mock services
jest.mock('../../services/BookingService', () => ({
  createBooking: jest.fn(),
  confirmBooking: jest.fn(),
  cancelBooking: jest.fn(),
  getBookingById: jest.fn(),
  getBookingsByUser: jest.fn(),
}));

jest.mock('../../services/AvailabilityService', () => ({
  checkAvailability: jest.fn(),
  getAvailabilityRange: jest.fn(),
}));

jest.mock('../../services/TicketService', () => ({
  validateTicket: jest.fn(),
  getTicketsByUser: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

// Mock auth middleware to bypass authentication
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      role: 'user',
    };
    next();
  },
  optionalAuth: (req, res, next) => {
    req.user = null;
    next();
  },
}));

// Mock validators middleware
jest.mock('../../middleware/validators', () => ({
  validate: () => (req, res, next) => next(),
  createBookingSchema: {},
  checkAvailabilitySchema: {},
  validateTicketSchema: {},
}));

// Mock WalletService
jest.mock('../../services/WalletService', () => ({
  generateApplePass: jest.fn(),
  generateGooglePass: jest.fn(),
  generateBothPasses: jest.fn(),
}));

const app = require('../../server');
const BookingService = require('../../services/BookingService');
const AvailabilityService = require('../../services/AvailabilityService');
const TicketService = require('../../services/TicketService');

describe('Ticketing API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('service', 'ticketing-module');
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('GET /', () => {
    it('should return service info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('service', 'HolidaiButler Ticketing Module');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('Availability Endpoints', () => {
    describe('GET /api/v1/tickets/availability/:poiId', () => {
      it('should return availability for POI', async () => {
        AvailabilityService.checkAvailability.mockResolvedValue({
          available: true,
          capacity: { total: 100, available: 75 },
          pricing: { basePrice: 25.00, finalPrice: 25.00, currency: 'EUR' },
        });

        const response = await request(app)
          .get(`/api/v1/tickets/availability/${mockAvailability.poiId}`)
          .query({ date: '2025-12-01' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('available', true);
        expect(response.body.data).toHaveProperty('capacity');
        expect(response.body.data).toHaveProperty('pricing');
      });

      it('should require date parameter', async () => {
        const response = await request(app)
          .get(`/api/v1/tickets/availability/${mockAvailability.poiId}`)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/v1/tickets/availability/:poiId/range', () => {
      it('should return availability range', async () => {
        AvailabilityService.getAvailabilityRange.mockResolvedValue([
          { date: '2025-12-01', available: true, capacity: { available: 50 } },
          { date: '2025-12-02', available: true, capacity: { available: 45 } },
        ]);

        const response = await request(app)
          .get(`/api/v1/tickets/availability/${mockAvailability.poiId}/range`)
          .query({ startDate: '2025-12-01', endDate: '2025-12-02' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveLength(2);
      });
    });
  });

  describe('Booking Endpoints', () => {
    describe('POST /api/v1/tickets/bookings', () => {
      const validBookingPayload = {
        userId: mockBooking.userId,
        poiId: mockBooking.poiId,
        date: '2025-12-01',
        timeslot: '10:00-11:00',
        quantity: 2,
        guestInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+31612345678',
        },
        productType: 'ticket',
      };

      it('should create a booking', async () => {
        BookingService.createBooking.mockResolvedValue({
          bookingId: mockBooking.id,
          bookingReference: mockBooking.bookingReference,
          status: 'pending',
          totalPrice: 52.00,
          currency: 'EUR',
          paymentUrl: 'https://payment.example.com/checkout',
        });

        const response = await request(app)
          .post('/api/v1/tickets/bookings')
          .send(validBookingPayload)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('bookingId');
        expect(response.body.data).toHaveProperty('bookingReference');
        expect(response.body.data).toHaveProperty('paymentUrl');
        expect(BookingService.createBooking).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: validBookingPayload.userId,
            poiId: validBookingPayload.poiId,
          })
        );
      });

      // Note: Validation is tested in unit tests. With mocked validators,
      // this integration test checks service error handling instead.
      it('should handle missing booking data gracefully', async () => {
        BookingService.createBooking.mockRejectedValue(new Error('Missing required fields'));
        const invalidPayload = { userId: mockBooking.userId };

        const response = await request(app)
          .post('/api/v1/tickets/bookings')
          .send(invalidPayload)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });

      it('should handle booking service errors', async () => {
        BookingService.createBooking.mockRejectedValue(new Error('Not available'));

        const response = await request(app)
          .post('/api/v1/tickets/bookings')
          .send(validBookingPayload)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/tickets/bookings/:bookingId', () => {
      it('should return booking details', async () => {
        BookingService.getBookingById.mockResolvedValue({
          ...mockBooking,
          userId: '123e4567-e89b-12d3-a456-426614174001', // Same as mock user
          tickets: [mockTicket],
        });

        const response = await request(app)
          .get(`/api/v1/tickets/bookings/${mockBooking.id}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('id', mockBooking.id);
      });

      it('should return 404 for non-existent booking', async () => {
        BookingService.getBookingById.mockRejectedValue(new Error('Booking not found'));

        const response = await request(app)
          .get('/api/v1/tickets/bookings/not-found')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/v1/tickets/bookings/user/:userId', () => {
      it('should return user bookings', async () => {
        BookingService.getBookingsByUser.mockResolvedValue([mockBooking]);

        const response = await request(app)
          .get(`/api/v1/tickets/bookings/user/${mockBooking.userId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toBeInstanceOf(Array);
      });
    });

    describe('POST /api/v1/tickets/bookings/:bookingId/confirm', () => {
      it('should confirm booking after payment', async () => {
        BookingService.confirmBooking.mockResolvedValue({
          bookingId: mockBooking.id,
          bookingReference: mockBooking.bookingReference,
          status: 'confirmed',
          tickets: [{ ticketId: mockTicket.id, ticketNumber: mockTicket.ticketNumber }],
        });

        const response = await request(app)
          .post(`/api/v1/tickets/bookings/${mockBooking.id}/confirm`)
          .send({ paymentTransactionId: 'txn_123' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('status', 'confirmed');
        expect(response.body.data).toHaveProperty('tickets');
      });

      it('should require paymentTransactionId', async () => {
        const response = await request(app)
          .post(`/api/v1/tickets/bookings/${mockBooking.id}/confirm`)
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('PUT /api/v1/tickets/bookings/:bookingId/cancel', () => {
      it('should cancel booking', async () => {
        BookingService.cancelBooking.mockResolvedValue({
          bookingId: mockBooking.id,
          bookingReference: mockBooking.bookingReference,
          status: 'cancelled',
          refund: { refundId: 'ref_123', amount: 52.00 },
        });

        const response = await request(app)
          .put(`/api/v1/tickets/bookings/${mockBooking.id}/cancel`)
          .send({ userId: mockBooking.userId, reason: 'Changed plans' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('status', 'cancelled');
      });
    });
  });

  describe('Ticket Endpoints', () => {
    describe('GET /api/v1/tickets/:ticketId', () => {
      it('should return ticket details', async () => {
        const { Ticket } = require('../../models');
        // Make sure ticket userId matches mocked user id
        Ticket.findByPk.mockResolvedValue({
          ...mockTicket,
          userId: '123e4567-e89b-12d3-a456-426614174001', // Same as mock user
        });

        const response = await request(app)
          .get(`/api/v1/tickets/${mockTicket.id}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('id');
      });

      it('should return 404 for non-existent ticket', async () => {
        const { Ticket } = require('../../models');
        Ticket.findByPk.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/v1/tickets/not-found')
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Endpoint not found');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API endpoints', async () => {
      // Make multiple requests - rate limiting should eventually kick in
      // Note: This test is more of a smoke test since we can't easily test
      // rate limiting without making 100+ requests
      const response = await request(app)
        .get(`/api/v1/tickets/availability/${mockAvailability.poiId}`)
        .query({ date: '2025-12-01' });

      // Should have rate limit headers
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });
  });
});
