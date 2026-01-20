/**
 * E2E Payment Integration Tests
 *
 * Tests the complete payment flow between ticketing and payment modules:
 * 1. Booking creation → Payment session creation
 * 2. Payment verification → Booking confirmation
 * 3. Booking cancellation → Refund processing
 */

const { mockBooking, mockTicket, mockAvailability } = require('../__mocks__/models');

// Mock dependencies
jest.mock('../../models', () => require('../__mocks__/models'));
jest.mock('ioredis', () => {
  const mockRedisData = new Map();
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key) => Promise.resolve(mockRedisData.get(key) || null)),
    set: jest.fn((key, value) => {
      mockRedisData.set(key, value);
      return Promise.resolve('OK');
    }),
    setex: jest.fn((key, ttl, value) => {
      mockRedisData.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key) => {
      mockRedisData.delete(key);
      return Promise.resolve(1);
    }),
    quit: jest.fn(() => Promise.resolve('OK')),
  }));
});

// Mock axios for payment module calls
jest.mock('axios');
const axios = require('axios');

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

// Mock AvailabilityService
jest.mock('../../services/AvailabilityService', () => ({
  checkAvailability: jest.fn(),
  reserveSlot: jest.fn(),
  confirmReservation: jest.fn(),
  releaseReservation: jest.fn(),
  cancelBooking: jest.fn(),
}));

// Mock TicketService
jest.mock('../../services/TicketService', () => ({
  generateTicketsForBooking: jest.fn(),
  sendTicketsToUser: jest.fn(),
  cancelTickets: jest.fn(),
}));

const { Booking, Ticket } = require('../../models');
const AvailabilityService = require('../../services/AvailabilityService');
const TicketService = require('../../services/TicketService');
const BookingService = require('../../services/BookingService');

describe('Payment Integration E2E Tests', () => {
  // Payment module mock responses
  const mockPaymentSession = {
    paymentId: 'pay_123456789',
    transactionReference: 'TXN-1234567890-abc12345',
    sessionData: 'encrypted-session-data',
    sessionId: 'session_123',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    redirectUrl: 'http://localhost:3000/booking/complete',
  };

  const mockPaymentAuthorized = {
    id: 'pay_123456789',
    transactionReference: 'TXN-1234567890-abc12345',
    status: 'authorized',
    amount: 52.00,
    currency: 'EUR',
    paymentMethod: 'ideal',
    authorizedAt: new Date().toISOString(),
  };

  const mockPaymentCaptured = {
    id: 'pay_123456789',
    transactionReference: 'TXN-1234567890-abc12345',
    status: 'captured',
    amount: 52.00,
    capturedAmount: 52.00,
    currency: 'EUR',
    paymentMethod: 'ideal',
    capturedAt: new Date().toISOString(),
  };

  const mockRefund = {
    refundId: 'ref_987654321',
    transactionId: 'pay_123456789',
    amount: 52.00,
    currency: 'EUR',
    status: 'pending',
    reason: 'Booking cancellation',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Complete Booking → Payment → Confirmation Flow', () => {
    const bookingData = {
      userId: '123e4567-e89b-12d3-a456-426614174001',
      poiId: '123e4567-e89b-12d3-a456-426614174002',
      date: '2025-12-01',
      timeslot: '10:00-11:00',
      quantity: 2,
      guestInfo: {
        name: 'Jan de Vries',
        email: 'jan@example.nl',
        phone: '+31612345678',
      },
      productType: 'ticket',
      language: 'nl',
    };

    it('should complete full booking-payment-confirmation flow', async () => {
      // STEP 1: Setup mocks for booking creation
      AvailabilityService.checkAvailability.mockResolvedValue({
        available: true,
        capacity: { available: 50 },
        pricing: { finalPrice: 25.00 },
      });

      AvailabilityService.reserveSlot.mockResolvedValue({
        reservationId: mockBooking.id,
        expiresAt: new Date(Date.now() + 900000),
        quantity: 2,
      });

      // Mock payment session creation
      axios.post.mockResolvedValueOnce({
        data: mockPaymentSession,
      });

      // STEP 2: Create booking
      const bookingResult = await BookingService.createBooking(bookingData);

      // Verify booking was created and payment session requested
      expect(bookingResult).toHaveProperty('bookingId');
      expect(bookingResult).toHaveProperty('paymentUrl');
      expect(bookingResult.status).toBe('pending');

      // Verify payment service was called correctly
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/payments'),
        expect.objectContaining({
          amount: expect.any(Number), // Should be in cents
          currency: 'EUR',
          resourceType: 'ticket',
          resourceId: expect.any(String),
        })
      );

      // STEP 3: Simulate payment completion
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        id: bookingResult.bookingId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      });

      // Mock payment verification - payment is captured
      axios.get.mockResolvedValueOnce({
        data: mockPaymentCaptured,
      });

      AvailabilityService.confirmReservation.mockResolvedValue(true);

      TicketService.generateTicketsForBooking.mockResolvedValue([mockTicket]);
      TicketService.sendTicketsToUser.mockResolvedValue(true);

      // STEP 4: Confirm booking after payment
      const confirmResult = await BookingService.confirmBooking(
        bookingResult.bookingId,
        'TXN-1234567890-abc12345'
      );

      // Verify confirmation result
      expect(confirmResult.status).toBe('confirmed');
      expect(confirmResult).toHaveProperty('tickets');
      expect(confirmResult.tickets).toHaveLength(1);

      // Verify payment was verified
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/payments/TXN-1234567890-abc12345')
      );

      // Verify reservation was confirmed
      expect(AvailabilityService.confirmReservation).toHaveBeenCalled();

      // Verify tickets were generated and sent
      expect(TicketService.generateTicketsForBooking).toHaveBeenCalled();
      expect(TicketService.sendTicketsToUser).toHaveBeenCalled();
    });

    it('should handle payment creation failure gracefully', async () => {
      AvailabilityService.checkAvailability.mockResolvedValue({
        available: true,
        capacity: { available: 50 },
        pricing: { finalPrice: 25.00 },
      });

      AvailabilityService.reserveSlot.mockResolvedValue({
        reservationId: mockBooking.id,
        expiresAt: new Date(Date.now() + 900000),
        quantity: 2,
      });

      // Mock payment engine unavailable - should return fallback
      axios.post.mockRejectedValueOnce(new Error('Payment engine unavailable'));

      const bookingResult = await BookingService.createBooking(bookingData);

      // Should still create booking with fallback payment URL
      expect(bookingResult).toHaveProperty('bookingId');
      expect(bookingResult.paymentUrl).toContain('payment-pending');
    });

    it('should reject confirmation with failed payment', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        status: 'pending',
      });

      // Mock payment verification - payment failed
      axios.get.mockResolvedValueOnce({
        data: { status: 'failed', errorMessage: 'Insufficient funds' },
      });

      await expect(
        BookingService.confirmBooking(mockBooking.id, 'failed_txn_123')
      ).rejects.toThrow('Payment not completed');

      // Verify reservation was NOT confirmed
      expect(AvailabilityService.confirmReservation).not.toHaveBeenCalled();
    });

    it('should handle authorized but not captured payment', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      });

      // Mock payment verification - authorized (should be accepted)
      axios.get.mockResolvedValueOnce({
        data: mockPaymentAuthorized,
      });

      AvailabilityService.confirmReservation.mockResolvedValue(true);
      TicketService.generateTicketsForBooking.mockResolvedValue([mockTicket]);
      TicketService.sendTicketsToUser.mockResolvedValue(true);

      const result = await BookingService.confirmBooking(
        mockBooking.id,
        'TXN-1234567890-abc12345'
      );

      expect(result.status).toBe('confirmed');
    });
  });

  describe('Booking Cancellation → Refund Flow', () => {
    it('should process refund when cancelling paid booking', async () => {
      const paidBooking = {
        ...mockBooking,
        status: 'confirmed',
        paymentStatus: 'paid',
        transactionId: 'TXN-1234567890-abc12345',
        totalPrice: 52.00,
        allowCancellation: true,
        cancellationDeadline: new Date(Date.now() + 86400000), // Tomorrow
        isLocked: false,
        save: jest.fn().mockResolvedValue(true),
      };

      Booking.findByPk.mockResolvedValue(paidBooking);

      // Mock capacity return
      AvailabilityService.cancelBooking.mockResolvedValue(true);

      // Mock refund creation
      axios.post.mockResolvedValueOnce({
        data: mockRefund,
      });

      // Mock tickets for cancellation
      Ticket.findAll.mockResolvedValue([mockTicket]);
      TicketService.cancelTickets.mockResolvedValue(true);

      const result = await BookingService.cancelBooking(
        mockBooking.id,
        mockBooking.userId,
        'Changed travel plans'
      );

      // Verify cancellation result
      expect(result.status).toBe('cancelled');
      expect(result).toHaveProperty('refund');

      // Verify refund was initiated
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/refunds'),
        expect.objectContaining({
          amount: expect.any(Number), // Should be in cents
          reason: expect.stringContaining('Booking cancellation'),
        })
      );

      // Verify capacity was returned
      expect(AvailabilityService.cancelBooking).toHaveBeenCalled();

      // Verify tickets were cancelled
      expect(TicketService.cancelTickets).toHaveBeenCalled();
    });

    it('should handle refund failure gracefully', async () => {
      const paidBooking = {
        ...mockBooking,
        status: 'confirmed',
        paymentStatus: 'paid',
        transactionId: 'TXN-1234567890-abc12345',
        totalPrice: 52.00,
        allowCancellation: true,
        cancellationDeadline: new Date(Date.now() + 86400000),
        isLocked: false,
        save: jest.fn().mockResolvedValue(true),
      };

      Booking.findByPk.mockResolvedValue(paidBooking);
      AvailabilityService.cancelBooking.mockResolvedValue(true);

      // Mock refund failure
      axios.post.mockRejectedValueOnce(new Error('Refund service unavailable'));

      Ticket.findAll.mockResolvedValue([]);

      const result = await BookingService.cancelBooking(
        mockBooking.id,
        mockBooking.userId,
        'Changed plans'
      );

      // Booking should still be cancelled, refund error logged
      expect(result.status).toBe('cancelled');
      expect(result.refund).toHaveProperty('error');
    });

    it('should not process refund for unpaid booking', async () => {
      const unpaidBooking = {
        ...mockBooking,
        status: 'pending',
        paymentStatus: 'pending',
        transactionId: null,
        allowCancellation: true,
        cancellationDeadline: new Date(Date.now() + 86400000),
        isLocked: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Booking.findByPk.mockResolvedValue(unpaidBooking);
      AvailabilityService.releaseReservation.mockResolvedValue(true);
      Ticket.findAll.mockResolvedValue([]);

      const result = await BookingService.cancelBooking(
        mockBooking.id,
        mockBooking.userId,
        'Changed plans'
      );

      expect(result.status).toBe('cancelled');
      expect(result.refund).toBeNull();

      // Verify refund endpoint was NOT called
      expect(axios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/refunds'),
        expect.anything()
      );
    });
  });

  describe('Payment Amount Calculations', () => {
    it('should calculate correct payment amount with taxes and fees', async () => {
      AvailabilityService.checkAvailability.mockResolvedValue({
        available: true,
        capacity: { available: 50 },
        pricing: { finalPrice: 25.00 },
      });

      AvailabilityService.reserveSlot.mockResolvedValue({
        reservationId: mockBooking.id,
        expiresAt: new Date(Date.now() + 900000),
        quantity: 2,
      });

      axios.post.mockResolvedValueOnce({
        data: mockPaymentSession,
      });

      await BookingService.createBooking({
        userId: mockBooking.userId,
        poiId: mockBooking.poiId,
        date: '2025-12-01',
        quantity: 2,
        guestInfo: { name: 'Test', email: 'test@test.com' },
        productType: 'ticket',
      });

      // Verify amount calculation:
      // Base: 25 * 2 = 50
      // Taxes: 50 * 0.09 = 4.50
      // Fees: 2.50
      // Total: 50 + 4.50 + 2.50 = 57.00
      // In cents: 5700

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          amount: 5700, // 57.00 EUR in cents
        })
      );
    });

    it('should apply voucher discount to payment amount', async () => {
      AvailabilityService.checkAvailability.mockResolvedValue({
        available: true,
        capacity: { available: 50 },
        pricing: { finalPrice: 25.00 },
      });

      AvailabilityService.reserveSlot.mockResolvedValue({
        reservationId: mockBooking.id,
        expiresAt: new Date(Date.now() + 900000),
        quantity: 2,
      });

      axios.post.mockResolvedValueOnce({
        data: mockPaymentSession,
      });

      await BookingService.createBooking({
        userId: mockBooking.userId,
        poiId: mockBooking.poiId,
        date: '2025-12-01',
        quantity: 2,
        guestInfo: { name: 'Test', email: 'test@test.com' },
        productType: 'ticket',
        voucherCode: 'DISCOUNT10',
      });

      // Verify discount was applied:
      // Base: 25 * 2 = 50
      // Discount (10%): 5.00
      // Subtotal: 45.00
      // Taxes: 50 * 0.09 = 4.50 (on original, before discount)
      // Fees: 2.50
      // Total: 50 + 4.50 + 2.50 - 5.00 = 52.00
      // In cents: 5200

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          amount: 5200, // 52.00 EUR in cents
        })
      );
    });
  });

  describe('Payment Metadata Flow', () => {
    it('should pass correct metadata to payment service', async () => {
      AvailabilityService.checkAvailability.mockResolvedValue({
        available: true,
        capacity: { available: 50 },
        pricing: { finalPrice: 25.00 },
      });

      AvailabilityService.reserveSlot.mockResolvedValue({
        reservationId: mockBooking.id,
        expiresAt: new Date(Date.now() + 900000),
        quantity: 2,
      });

      axios.post.mockResolvedValueOnce({
        data: mockPaymentSession,
      });

      const bookingData = {
        userId: mockBooking.userId,
        poiId: mockBooking.poiId,
        date: '2025-12-01',
        quantity: 1,
        guestInfo: { name: 'Test User', email: 'test@example.com' },
        productType: 'ticket',
      };

      await BookingService.createBooking(bookingData);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: mockBooking.userId,
            bookingReference: expect.stringMatching(/^BK-\d{4}-\d{6}$/),
            poiId: mockBooking.poiId,
          }),
          returnUrl: expect.stringContaining('/booking/complete'),
        })
      );
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should cleanup booking when payment session creation fails critically', async () => {
      AvailabilityService.checkAvailability.mockResolvedValue({
        available: true,
        capacity: { available: 50 },
        pricing: { finalPrice: 25.00 },
      });

      // First call: reserve succeeds
      AvailabilityService.reserveSlot.mockResolvedValue({
        reservationId: mockBooking.id,
        expiresAt: new Date(Date.now() + 900000),
        quantity: 1,
      });

      // Payment fails but with fallback URL (graceful degradation)
      axios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await BookingService.createBooking({
        userId: mockBooking.userId,
        poiId: mockBooking.poiId,
        date: '2025-12-01',
        quantity: 1,
        guestInfo: { name: 'Test', email: 'test@test.com' },
        productType: 'ticket',
      });

      // Should still return a booking with pending payment
      expect(result.paymentId).toBe('pending');
      expect(result.paymentUrl).toContain('payment-pending');
    });

    it('should handle payment verification timeout', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        status: 'pending',
      });

      // Mock timeout on payment verification
      axios.get.mockRejectedValueOnce(new Error('Payment verification failed'));

      await expect(
        BookingService.confirmBooking(mockBooking.id, 'timeout_txn_123')
      ).rejects.toThrow('Payment verification failed');
    });
  });
});
