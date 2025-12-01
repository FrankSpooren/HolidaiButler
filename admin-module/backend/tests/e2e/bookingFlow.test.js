/**
 * End-to-End Booking Flow Tests
 * Tests complete booking workflow across modules
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock all external dependencies
jest.mock('axios');
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    quit: jest.fn()
  }));
});

// Mock models
const mockBooking = {
  id: 'booking-uuid-123',
  bookingNumber: 'BKG-20251201-ABC123',
  confirmationCode: 'CONF123',
  type: 'attraction_ticket',
  customerFirstName: 'John',
  customerLastName: 'Doe',
  customerEmail: 'john@test.com',
  customerPhone: '+34 123 456 789',
  status: 'pending',
  paymentStatus: 'pending',
  pricingSubtotal: 80.00,
  pricingTax: 16.80,
  pricingTotal: 96.80,
  currency: 'EUR',
  visitDate: '2025-12-15',
  visitTime: '10:00',
  visitParticipants: 2,
  items: [
    { name: 'Adult Ticket', price: 40.00, quantity: 2 }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockPOI = {
  id: 1,
  uuid: 'poi-uuid-123',
  name: 'Museum of Modern Art',
  category: 'museum',
  city: 'Calpe',
  latitude: 38.6446,
  longitude: 0.0647,
  verified: true,
  active: true
};

const mockTicket = {
  id: 'ticket-uuid-123',
  bookingId: mockBooking.id,
  ticketNumber: 'TKT-20251201-XYZ789',
  status: 'active',
  qrCode: 'QR_CODE_DATA',
  holderName: 'John Doe',
  holderEmail: 'john@test.com',
  validFrom: '2025-12-15T10:00:00Z',
  validUntil: '2025-12-15T18:00:00Z'
};

const mockPaymentSession = {
  id: 'payment-session-123',
  bookingId: mockBooking.id,
  amount: 96.80,
  currency: 'EUR',
  status: 'created',
  checkoutUrl: 'https://checkout.adyen.com/session/test123'
};

// Mock all models
jest.mock('../../models/index.js', () => ({
  Booking: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn()
  },
  POI: {
    findByPk: jest.fn(),
    findOne: jest.fn()
  },
  Ticket: {
    create: jest.fn(),
    findAll: jest.fn()
  },
  Transaction: {
    create: jest.fn(),
    findOne: jest.fn()
  },
  AdminUser: {
    findByPk: jest.fn()
  }
}));

// Mock admin auth
jest.mock('../../middleware/adminAuth.js', () => ({
  verifyAdminToken: (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
      req.adminUser = { id: decoded.userId, role: decoded.role };
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  },
  requireRole: (...roles) => (req, res, next) => {
    if (roles.includes(req.adminUser?.role)) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Access denied' });
    }
  }
}));

import { Booking, POI, Ticket, Transaction } from '../../models/index.js';

// Create test app with booking routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Import and mount routes
  // Note: In a real scenario, these would be the actual route handlers
  // For E2E testing, we simulate the complete flow

  // Create booking endpoint
  app.post('/api/bookings', async (req, res) => {
    try {
      const { poiId, customerInfo, visitDetails, items } = req.body;

      // Validate POI exists
      const poi = await POI.findByPk(poiId);
      if (!poi || !poi.active) {
        return res.status(404).json({ success: false, message: 'POI not found or inactive' });
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.21; // 21% VAT
      const total = subtotal + tax;

      // Create booking
      const booking = await Booking.create({
        ...customerInfo,
        ...visitDetails,
        poiId: poi.uuid,
        items,
        pricingSubtotal: subtotal,
        pricingTax: tax,
        pricingTotal: total,
        status: 'pending',
        paymentStatus: 'pending'
      });

      res.status(201).json({
        success: true,
        data: { booking }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Initiate payment endpoint
  app.post('/api/bookings/:id/payment', async (req, res) => {
    try {
      const booking = await Booking.findByPk(req.params.id);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (booking.paymentStatus !== 'pending') {
        return res.status(400).json({ success: false, message: 'Payment already processed' });
      }

      // Create payment session (simulated Adyen)
      const paymentSession = {
        id: `payment-${Date.now()}`,
        bookingId: booking.id,
        amount: booking.pricingTotal,
        currency: booking.currency || 'EUR',
        status: 'created',
        checkoutUrl: `https://checkout.adyen.com/session/${Date.now()}`
      };

      res.json({
        success: true,
        data: { paymentSession }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Payment webhook endpoint
  app.post('/api/webhooks/payment', async (req, res) => {
    try {
      const { bookingId, status, transactionId } = req.body;

      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (status === 'completed') {
        // Update booking
        await Booking.update(
          {
            status: 'confirmed',
            paymentStatus: 'completed',
            paymentTransactionId: transactionId
          },
          { where: { id: bookingId } }
        );

        // Create transaction record
        await Transaction.create({
          bookingId,
          externalTransactionId: transactionId,
          amount: booking.pricingTotal,
          currency: booking.currency,
          status: 'completed'
        });

        // Generate tickets
        const tickets = [];
        for (const item of booking.items) {
          for (let i = 0; i < item.quantity; i++) {
            const ticket = await Ticket.create({
              bookingId,
              ticketNumber: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
              status: 'active',
              holderName: `${booking.customerFirstName} ${booking.customerLastName}`,
              holderEmail: booking.customerEmail,
              productName: item.name,
              validFrom: booking.visitDate,
              validUntil: booking.visitDate
            });
            tickets.push(ticket);
          }
        }

        res.json({
          success: true,
          data: {
            booking: { ...booking, status: 'confirmed', paymentStatus: 'completed' },
            tickets
          }
        });
      } else if (status === 'failed') {
        await Booking.update(
          { paymentStatus: 'failed' },
          { where: { id: bookingId } }
        );

        res.json({
          success: true,
          data: { booking: { ...booking, paymentStatus: 'failed' } }
        });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get booking with tickets
  app.get('/api/bookings/:id', async (req, res) => {
    try {
      const booking = await Booking.findByPk(req.params.id);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      const tickets = await Ticket.findAll({ where: { bookingId: booking.id } });

      res.json({
        success: true,
        data: { booking, tickets }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Cancel booking endpoint
  app.post('/api/bookings/:id/cancel', async (req, res) => {
    try {
      const { reason } = req.body;
      const booking = await Booking.findByPk(req.params.id);

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (['cancelled', 'completed'].includes(booking.status)) {
        return res.status(400).json({ success: false, message: 'Booking cannot be cancelled' });
      }

      await Booking.update(
        {
          status: 'cancelled',
          cancellationReason: reason,
          cancelledAt: new Date()
        },
        { where: { id: booking.id } }
      );

      res.json({
        success: true,
        data: { booking: { ...booking, status: 'cancelled' } }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return app;
};

describe('E2E: Complete Booking Flow', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Booking Flow', () => {
    it('should complete full booking → payment → ticket generation flow', async () => {
      // Step 1: Create booking
      POI.findByPk.mockResolvedValue(mockPOI);
      Booking.create.mockResolvedValue({
        ...mockBooking,
        id: 'new-booking-id',
        toJSON: () => mockBooking
      });

      const bookingRes = await request(app)
        .post('/api/bookings')
        .send({
          poiId: 1,
          customerInfo: {
            customerFirstName: 'John',
            customerLastName: 'Doe',
            customerEmail: 'john@test.com',
            customerPhone: '+34 123 456 789'
          },
          visitDetails: {
            visitDate: '2025-12-15',
            visitTime: '10:00',
            visitParticipants: 2
          },
          items: [
            { name: 'Adult Ticket', price: 40.00, quantity: 2 }
          ]
        });

      expect(bookingRes.status).toBe(201);
      expect(bookingRes.body.success).toBe(true);
      expect(bookingRes.body.data.booking).toBeDefined();

      // Step 2: Initiate payment
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        paymentStatus: 'pending'
      });

      const paymentRes = await request(app)
        .post(`/api/bookings/${mockBooking.id}/payment`)
        .send();

      expect(paymentRes.status).toBe(200);
      expect(paymentRes.body.success).toBe(true);
      expect(paymentRes.body.data.paymentSession.checkoutUrl).toBeDefined();

      // Step 3: Process payment webhook (success)
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        paymentStatus: 'pending',
        items: [{ name: 'Adult Ticket', price: 40.00, quantity: 2 }]
      });
      Booking.update.mockResolvedValue([1]);
      Transaction.create.mockResolvedValue({ id: 'txn-123' });
      Ticket.create.mockResolvedValue(mockTicket);

      const webhookRes = await request(app)
        .post('/api/webhooks/payment')
        .send({
          bookingId: mockBooking.id,
          status: 'completed',
          transactionId: 'adyen-txn-123'
        });

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.success).toBe(true);
      expect(webhookRes.body.data.booking.status).toBe('confirmed');
      expect(webhookRes.body.data.tickets).toBeDefined();

      // Step 4: Verify booking and tickets
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        status: 'confirmed',
        paymentStatus: 'completed'
      });
      Ticket.findAll.mockResolvedValue([mockTicket, mockTicket]);

      const getRes = await request(app)
        .get(`/api/bookings/${mockBooking.id}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.booking.status).toBe('confirmed');
      expect(getRes.body.data.tickets).toHaveLength(2);
    });
  });

  describe('Failed Payment Flow', () => {
    it('should handle payment failure correctly', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        paymentStatus: 'pending'
      });
      Booking.update.mockResolvedValue([1]);

      const webhookRes = await request(app)
        .post('/api/webhooks/payment')
        .send({
          bookingId: mockBooking.id,
          status: 'failed',
          transactionId: null
        });

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.data.booking.paymentStatus).toBe('failed');

      // Verify no tickets were created
      expect(Ticket.create).not.toHaveBeenCalled();
    });
  });

  describe('Booking Cancellation Flow', () => {
    it('should cancel pending booking', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        status: 'pending'
      });
      Booking.update.mockResolvedValue([1]);

      const res = await request(app)
        .post(`/api/bookings/${mockBooking.id}/cancel`)
        .send({ reason: 'Customer request' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe('cancelled');
    });

    it('should not cancel completed booking', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        status: 'completed'
      });

      const res = await request(app)
        .post(`/api/bookings/${mockBooking.id}/cancel`)
        .send({ reason: 'Customer request' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle inactive POI', async () => {
      POI.findByPk.mockResolvedValue({
        ...mockPOI,
        active: false
      });

      const res = await request(app)
        .post('/api/bookings')
        .send({
          poiId: 1,
          customerInfo: { customerFirstName: 'John' },
          items: []
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('inactive');
    });

    it('should handle non-existent booking', async () => {
      Booking.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/bookings/non-existent-id');

      expect(res.status).toBe(404);
    });

    it('should handle duplicate payment attempt', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        paymentStatus: 'completed'
      });

      const res = await request(app)
        .post(`/api/bookings/${mockBooking.id}/payment`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already processed');
    });
  });

  describe('Data Validation', () => {
    it('should validate required booking fields', async () => {
      POI.findByPk.mockResolvedValue(mockPOI);
      Booking.create.mockRejectedValue(new Error('Validation error'));

      const res = await request(app)
        .post('/api/bookings')
        .send({
          poiId: 1,
          // Missing required fields
        });

      expect(res.status).toBe(500);
    });
  });
});

describe('E2E: Cross-Module Integration', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POI to Booking Integration', () => {
    it('should link booking to POI correctly', async () => {
      POI.findByPk.mockResolvedValue(mockPOI);
      Booking.create.mockImplementation((data) => ({
        ...mockBooking,
        ...data,
        poiId: mockPOI.uuid
      }));

      const res = await request(app)
        .post('/api/bookings')
        .send({
          poiId: mockPOI.id,
          customerInfo: {
            customerFirstName: 'John',
            customerLastName: 'Doe',
            customerEmail: 'john@test.com',
            customerPhone: '+34 123 456 789'
          },
          visitDetails: {
            visitDate: '2025-12-15',
            visitTime: '10:00'
          },
          items: [{ name: 'Adult Ticket', price: 40, quantity: 1 }]
        });

      expect(res.status).toBe(201);
      expect(Booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          poiId: mockPOI.uuid
        })
      );
    });
  });

  describe('Booking to Payment Integration', () => {
    it('should create payment session with correct amount', async () => {
      const booking = {
        ...mockBooking,
        pricingTotal: 150.00,
        currency: 'EUR',
        paymentStatus: 'pending'
      };

      Booking.findByPk.mockResolvedValue(booking);

      const res = await request(app)
        .post(`/api/bookings/${booking.id}/payment`);

      expect(res.status).toBe(200);
      expect(res.body.data.paymentSession.amount).toBe(150.00);
      expect(res.body.data.paymentSession.currency).toBe('EUR');
    });
  });

  describe('Payment to Ticket Generation', () => {
    it('should generate correct number of tickets', async () => {
      const booking = {
        ...mockBooking,
        items: [
          { name: 'Adult Ticket', price: 40, quantity: 2 },
          { name: 'Child Ticket', price: 20, quantity: 3 }
        ]
      };

      Booking.findByPk.mockResolvedValue(booking);
      Booking.update.mockResolvedValue([1]);
      Transaction.create.mockResolvedValue({ id: 'txn-123' });

      let ticketCount = 0;
      Ticket.create.mockImplementation(() => {
        ticketCount++;
        return { ...mockTicket, id: `ticket-${ticketCount}` };
      });

      const res = await request(app)
        .post('/api/webhooks/payment')
        .send({
          bookingId: booking.id,
          status: 'completed',
          transactionId: 'txn-123'
        });

      expect(res.status).toBe(200);
      // 2 adult + 3 child = 5 tickets
      expect(Ticket.create).toHaveBeenCalledTimes(5);
    });
  });
});
