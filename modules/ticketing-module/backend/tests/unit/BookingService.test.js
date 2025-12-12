/**
 * Unit Tests for BookingService
 */

const { mockBooking, mockTicket } = require('../__mocks__/models');

// Mock dependencies before requiring the service
jest.mock('../../models', () => require('../__mocks__/models'));
jest.mock('ioredis', () => require('../__mocks__/ioredis'));
jest.mock('axios');

const axios = require('axios');
const { Booking, Ticket } = require('../../models');

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

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

const AvailabilityService = require('../../services/AvailabilityService');
const TicketService = require('../../services/TicketService');

// Now require BookingService (after mocks are set up)
const BookingService = require('../../services/BookingService');

describe('BookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    const validBookingData = {
      userId: '123e4567-e89b-12d3-a456-426614174001',
      poiId: '123e4567-e89b-12d3-a456-426614174002',
      date: '2025-12-01',
      timeslot: '10:00-11:00',
      quantity: 2,
      guestInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+31612345678',
      },
      productType: 'ticket',
      language: 'en',
    };

    it('should create a booking successfully', async () => {
      // Setup mocks
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

      axios.post.mockResolvedValue({
        data: {
          paymentId: 'pay_123',
          redirectUrl: 'https://payment.example.com/checkout',
        },
      });

      // Execute
      const result = await BookingService.createBooking(validBookingData);

      // Assert
      expect(result).toHaveProperty('bookingId');
      expect(result).toHaveProperty('bookingReference');
      expect(result).toHaveProperty('paymentUrl');
      expect(result.status).toBe('pending');
      expect(AvailabilityService.checkAvailability).toHaveBeenCalledWith(
        validBookingData.poiId,
        validBookingData.date,
        validBookingData.timeslot
      );
      expect(AvailabilityService.reserveSlot).toHaveBeenCalled();
      expect(Booking.create).toHaveBeenCalled();
    });

    it('should throw error when not available', async () => {
      AvailabilityService.checkAvailability.mockResolvedValue({
        available: false,
        reason: 'Not available',
      });

      await expect(BookingService.createBooking(validBookingData))
        .rejects
        .toThrow('Not available for booking');
    });

    it('should throw error when not enough capacity', async () => {
      AvailabilityService.checkAvailability.mockResolvedValue({
        available: true,
        capacity: { available: 1 }, // Only 1 available, but requesting 2
        pricing: { finalPrice: 25.00 },
      });

      await expect(BookingService.createBooking(validBookingData))
        .rejects
        .toThrow('Only 1 tickets available');
    });

    it('should apply voucher discount correctly', async () => {
      const bookingWithVoucher = {
        ...validBookingData,
        voucherCode: 'DISCOUNT10',
      };

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

      axios.post.mockResolvedValue({
        data: { paymentId: 'pay_123', redirectUrl: 'https://payment.example.com' },
      });

      const result = await BookingService.createBooking(bookingWithVoucher);

      expect(result).toHaveProperty('bookingId');
      expect(Booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          voucherCode: 'DISCOUNT10',
        })
      );
    });
  });

  describe('confirmBooking', () => {
    it('should confirm booking after successful payment', async () => {
      const bookingId = mockBooking.id;
      const transactionId = 'txn_123';

      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      });

      axios.get.mockResolvedValue({
        data: { status: 'captured', paymentMethod: 'card' },
      });

      AvailabilityService.confirmReservation.mockResolvedValue(true);

      TicketService.generateTicketsForBooking.mockResolvedValue([mockTicket]);
      TicketService.sendTicketsToUser.mockResolvedValue(true);

      const result = await BookingService.confirmBooking(bookingId, transactionId);

      expect(result).toHaveProperty('bookingId');
      expect(result).toHaveProperty('tickets');
      expect(result.status).toBe('confirmed');
      expect(AvailabilityService.confirmReservation).toHaveBeenCalledWith(bookingId);
      expect(TicketService.generateTicketsForBooking).toHaveBeenCalled();
      expect(TicketService.sendTicketsToUser).toHaveBeenCalled();
    });

    it('should throw error when booking not found', async () => {
      Booking.findByPk.mockResolvedValue(null);

      await expect(BookingService.confirmBooking('not-found', 'txn_123'))
        .rejects
        .toThrow('Booking not found');
    });

    it('should throw error when booking is not pending', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        status: 'confirmed', // Already confirmed
      });

      await expect(BookingService.confirmBooking(mockBooking.id, 'txn_123'))
        .rejects
        .toThrow('Cannot confirm booking with status: confirmed');
    });

    it('should throw error when payment not completed', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        status: 'pending',
      });

      axios.get.mockResolvedValue({
        data: { status: 'failed' },
      });

      await expect(BookingService.confirmBooking(mockBooking.id, 'txn_123'))
        .rejects
        .toThrow('Payment not completed');
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking successfully', async () => {
      const mockCancellableBooking = {
        ...mockBooking,
        allowCancellation: true,
        cancellationDeadline: new Date(Date.now() + 86400000), // Tomorrow
        isLocked: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Booking.findByPk.mockResolvedValue(mockCancellableBooking);
      AvailabilityService.releaseReservation.mockResolvedValue(true);
      Ticket.findAll.mockResolvedValue([]);

      const result = await BookingService.cancelBooking(
        mockBooking.id,
        mockBooking.userId,
        'Changed plans'
      );

      expect(result).toHaveProperty('bookingId');
      expect(result.status).toBe('cancelled');
      expect(AvailabilityService.releaseReservation).toHaveBeenCalled();
    });

    it('should throw error when booking not found', async () => {
      Booking.findByPk.mockResolvedValue(null);

      await expect(BookingService.cancelBooking('not-found', 'user123', 'reason'))
        .rejects
        .toThrow('Booking not found');
    });

    it('should throw error when cancellation not allowed', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        allowCancellation: false,
      });

      await expect(BookingService.cancelBooking(mockBooking.id, 'user123', 'reason'))
        .rejects
        .toThrow('Booking cannot be cancelled');
    });

    it('should throw error when cancellation deadline passed', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        allowCancellation: true,
        cancellationDeadline: new Date(Date.now() - 86400000), // Yesterday
      });

      await expect(BookingService.cancelBooking(mockBooking.id, 'user123', 'reason'))
        .rejects
        .toThrow('Cancellation deadline has passed');
    });

    it('should process refund when booking was paid', async () => {
      const mockPaidBooking = {
        ...mockBooking,
        allowCancellation: true,
        cancellationDeadline: new Date(Date.now() + 86400000),
        isLocked: false,
        paymentStatus: 'paid',
        transactionId: 'txn_123',
        save: jest.fn().mockResolvedValue(true),
      };

      Booking.findByPk.mockResolvedValue(mockPaidBooking);
      AvailabilityService.cancelBooking.mockResolvedValue(true);
      Ticket.findAll.mockResolvedValue([mockTicket]);
      TicketService.cancelTickets.mockResolvedValue(true);

      axios.post.mockResolvedValue({
        data: { refundId: 'ref_123' },
      });

      const result = await BookingService.cancelBooking(
        mockBooking.id,
        mockBooking.userId,
        'Changed plans'
      );

      expect(result).toHaveProperty('refund');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/refunds'),
        expect.any(Object)
      );
    });
  });

  describe('getBookingsByUser', () => {
    it('should return bookings for user', async () => {
      Booking.findAll.mockResolvedValue([mockBooking]);

      const result = await BookingService.getBookingsByUser(mockBooking.userId);

      expect(result).toHaveLength(1);
      expect(Booking.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockBooking.userId },
        })
      );
    });

    it('should filter by status', async () => {
      Booking.findAll.mockResolvedValue([mockBooking]);

      await BookingService.getBookingsByUser(mockBooking.userId, { status: 'confirmed' });

      expect(Booking.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'confirmed' }),
        })
      );
    });
  });

  describe('getBookingById', () => {
    it('should return booking with tickets', async () => {
      Booking.findByPk.mockResolvedValue({
        ...mockBooking,
        tickets: [mockTicket],
      });

      const result = await BookingService.getBookingById(mockBooking.id);

      expect(result).toHaveProperty('id', mockBooking.id);
      expect(Booking.findByPk).toHaveBeenCalledWith(
        mockBooking.id,
        expect.objectContaining({ include: expect.any(Array) })
      );
    });

    it('should throw error when booking not found', async () => {
      Booking.findByPk.mockResolvedValue(null);

      await expect(BookingService.getBookingById('not-found'))
        .rejects
        .toThrow('Booking not found');
    });
  });

  describe('_calculatePricing', () => {
    it('should calculate pricing correctly without voucher', async () => {
      const pricing = await BookingService._calculatePricing(25.00, 2, null);

      expect(pricing.basePrice).toBe(25.00);
      expect(pricing.currency).toBe('EUR');
      expect(pricing.fees).toBe(2.50);
      expect(pricing.discount).toBe(0);
      // Total = (25 * 2) + (50 * 0.09) + 2.50 = 50 + 4.5 + 2.50 = 57.00
      expect(pricing.totalPrice).toBe(57);
    });

    it('should apply voucher discount', async () => {
      const pricing = await BookingService._calculatePricing(25.00, 2, 'DISCOUNT10');

      expect(pricing.discount).toBeGreaterThan(0);
      expect(pricing.voucherDiscountPercentage).toBe(10);
    });
  });
});
