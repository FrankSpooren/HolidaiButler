/**
 * Unit Tests for AvailabilityService
 */

const { mockAvailability } = require('../__mocks__/models');

// Mock dependencies - use factory function to avoid circular dependency
jest.mock('../../models', () => require('../__mocks__/models'));

// Create a simple mock for ioredis at module level
const mockRedisData = new Map();
const mockRedisInstance = {
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
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

const { Availability } = require('../../models');

// Now require AvailabilityService (after mocks are set up)
const AvailabilityService = require('../../services/AvailabilityService');

describe('AvailabilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisData.clear();
  });

  describe('checkAvailability', () => {
    const poiId = mockAvailability.poiId;
    const date = '2025-12-01';
    const timeslot = '10:00-11:00';

    it('should return availability data', async () => {
      Availability.findOne.mockResolvedValue({
        ...mockAvailability,
        isSoldOut: false,
        availableCapacity: 75,
      });

      const result = await AvailabilityService.checkAvailability(poiId, date, timeslot);

      expect(result.available).toBe(true);
      expect(result.capacity).toHaveProperty('total');
      expect(result.capacity).toHaveProperty('available');
      expect(result.pricing).toHaveProperty('basePrice');
      expect(result.pricing).toHaveProperty('finalPrice');
    });

    it('should return not available when no record found', async () => {
      Availability.findOne.mockResolvedValue(null);

      const result = await AvailabilityService.checkAvailability(poiId, date, timeslot);

      expect(result.available).toBe(false);
      expect(result.reason).toBe('No availability configured for this date/timeslot');
    });

    it('should return not available when sold out', async () => {
      Availability.findOne.mockResolvedValue({
        ...mockAvailability,
        isSoldOut: true,
        availableCapacity: 0,
      });

      const result = await AvailabilityService.checkAvailability(poiId, date, timeslot);

      expect(result.available).toBe(false);
    });

    it('should use cache when available', async () => {
      // Pre-populate cache
      const cacheKey = `availability:${poiId}:2025-12-01:${timeslot}`;
      const cachedData = {
        available: true,
        capacity: { total: 100, available: 50 },
        pricing: { basePrice: 25.00, finalPrice: 25.00 },
      };

      // Mock Redis to return cached data
      mockRedisData.set(cacheKey, JSON.stringify(cachedData));

      const result = await AvailabilityService.checkAvailability(poiId, date, timeslot);

      expect(result).toEqual(cachedData);
      // Database should not be called
      expect(Availability.findOne).not.toHaveBeenCalled();
    });
  });

  describe('reserveSlot', () => {
    const bookingId = '123e4567-e89b-12d3-a456-426614174000';
    const poiId = mockAvailability.poiId;
    const date = '2025-12-01';
    const quantity = 2;
    const timeslot = '10:00-11:00';

    it('should reserve slots successfully', async () => {
      const mockAvail = {
        ...mockAvailability,
        availableCapacity: 50,
        reservedCapacity: 5,
        save: jest.fn().mockResolvedValue(true),
      };

      Availability.findOne.mockResolvedValue(mockAvail);

      const result = await AvailabilityService.reserveSlot(bookingId, poiId, date, quantity, timeslot);

      expect(result).toHaveProperty('reservationId');
      expect(result).toHaveProperty('expiresAt');
      expect(result.quantity).toBe(quantity);
      expect(mockAvail.reservedCapacity).toBe(7); // 5 + 2
      expect(mockAvail.save).toHaveBeenCalled();
    });

    it('should throw error when availability not found', async () => {
      Availability.findOne.mockResolvedValue(null);

      await expect(AvailabilityService.reserveSlot(bookingId, poiId, date, quantity, timeslot))
        .rejects
        .toThrow('Availability not found');
    });

    it('should throw error when not enough capacity', async () => {
      Availability.findOne.mockResolvedValue({
        ...mockAvailability,
        availableCapacity: 1, // Only 1 available
      });

      await expect(AvailabilityService.reserveSlot(bookingId, poiId, date, 5, timeslot))
        .rejects
        .toThrow('Not enough capacity available');
    });

    it('should store reservation in Redis', async () => {
      const mockAvail = {
        ...mockAvailability,
        availableCapacity: 50,
        save: jest.fn().mockResolvedValue(true),
      };

      Availability.findOne.mockResolvedValue(mockAvail);

      await AvailabilityService.reserveSlot(bookingId, poiId, date, quantity, timeslot);

      const reservationKey = `reservation:${bookingId}`;
      const stored = mockRedisData.get(reservationKey);

      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored);
      expect(parsed.quantity).toBe(quantity);
    });
  });

  describe('confirmReservation', () => {
    const bookingId = '123e4567-e89b-12d3-a456-426614174000';

    it('should confirm reservation successfully', async () => {
      // Store reservation in Redis first
      const reservationKey = `reservation:${bookingId}`;
      const reservation = {
        poiId: mockAvailability.poiId,
        date: new Date('2025-12-01'),
        timeslot: '10:00-11:00',
        quantity: 2,
        expiresAt: new Date(Date.now() + 900000),
      };
      mockRedisData.set(reservationKey, JSON.stringify(reservation));

      const mockAvail = {
        ...mockAvailability,
        reservedCapacity: 5,
        bookedCapacity: 10,
        save: jest.fn().mockResolvedValue(true),
      };

      Availability.findOne.mockResolvedValue(mockAvail);

      await AvailabilityService.confirmReservation(bookingId);

      expect(mockAvail.reservedCapacity).toBe(3); // 5 - 2
      expect(mockAvail.bookedCapacity).toBe(12); // 10 + 2
      expect(mockAvail.save).toHaveBeenCalled();

      // Reservation should be removed from Redis
      const stored = mockRedisData.get(reservationKey);
      expect(stored).toBeUndefined();
    });

    it('should throw error when reservation not found', async () => {
      await expect(AvailabilityService.confirmReservation('not-found'))
        .rejects
        .toThrow('Reservation not found or expired');
    });

    it('should throw error when availability not found', async () => {
      const reservationKey = `reservation:${bookingId}`;
      mockRedisData.set(reservationKey, JSON.stringify({
        poiId: 'not-found',
        date: new Date(),
        quantity: 2,
      }));

      Availability.findOne.mockResolvedValue(null);

      await expect(AvailabilityService.confirmReservation(bookingId))
        .rejects
        .toThrow('Availability not found');
    });
  });

  describe('releaseReservation', () => {
    const bookingId = '123e4567-e89b-12d3-a456-426614174000';

    it('should release reservation successfully', async () => {
      const reservationKey = `reservation:${bookingId}`;
      mockRedisData.set(reservationKey, JSON.stringify({
        poiId: mockAvailability.poiId,
        date: new Date('2025-12-01'),
        timeslot: '10:00-11:00',
        quantity: 2,
      }));

      const mockAvail = {
        ...mockAvailability,
        reservedCapacity: 5,
        save: jest.fn().mockResolvedValue(true),
      };

      Availability.findOne.mockResolvedValue(mockAvail);

      await AvailabilityService.releaseReservation(bookingId);

      expect(mockAvail.reservedCapacity).toBe(3); // 5 - 2
      expect(mockAvail.save).toHaveBeenCalled();
    });

    it('should handle non-existent reservation gracefully', async () => {
      // Should not throw, just log warning
      await expect(AvailabilityService.releaseReservation('not-found'))
        .resolves
        .toBeUndefined();
    });
  });

  describe('cancelBooking', () => {
    it('should return booked capacity', async () => {
      const mockAvail = {
        ...mockAvailability,
        bookedCapacity: 20,
        save: jest.fn().mockResolvedValue(true),
      };

      Availability.findOne.mockResolvedValue(mockAvail);

      await AvailabilityService.cancelBooking(
        mockAvailability.poiId,
        '2025-12-01',
        5,
        '10:00-11:00'
      );

      expect(mockAvail.bookedCapacity).toBe(15); // 20 - 5
      expect(mockAvail.save).toHaveBeenCalled();
    });

    it('should not go below zero', async () => {
      const mockAvail = {
        ...mockAvailability,
        bookedCapacity: 2,
        save: jest.fn().mockResolvedValue(true),
      };

      Availability.findOne.mockResolvedValue(mockAvail);

      await AvailabilityService.cancelBooking(
        mockAvailability.poiId,
        '2025-12-01',
        10, // More than booked
        '10:00-11:00'
      );

      expect(mockAvail.bookedCapacity).toBe(0); // Should be 0, not negative
    });
  });

  describe('getAvailabilityRange', () => {
    it('should return availability for date range', async () => {
      Availability.findAll.mockResolvedValue([
        { ...mockAvailability, date: new Date('2025-12-01') },
        { ...mockAvailability, date: new Date('2025-12-02') },
        { ...mockAvailability, date: new Date('2025-12-03') },
      ]);

      const result = await AvailabilityService.getAvailabilityRange(
        mockAvailability.poiId,
        new Date('2025-12-01'),
        new Date('2025-12-03')
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('capacity');
      expect(result[0]).toHaveProperty('pricing');
    });

    it('should return empty array when no availability', async () => {
      Availability.findAll.mockResolvedValue([]);

      const result = await AvailabilityService.getAvailabilityRange(
        mockAvailability.poiId,
        new Date('2025-12-01'),
        new Date('2025-12-03')
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('_getCacheKey', () => {
    it('should generate correct cache key with timeslot', () => {
      const key = AvailabilityService._getCacheKey('poi123', '2025-12-01', '10:00-11:00');

      expect(key).toBe('availability:poi123:2025-12-01:10:00-11:00');
    });

    it('should generate correct cache key without timeslot', () => {
      const key = AvailabilityService._getCacheKey('poi123', '2025-12-01', null);

      expect(key).toBe('availability:poi123:2025-12-01');
    });
  });

  describe('_invalidateCache', () => {
    it('should delete cache entry', async () => {
      const cacheKey = 'availability:poi123:2025-12-01';
      mockRedisData.set(cacheKey, 'cached-data');

      await AvailabilityService._invalidateCache('poi123', new Date('2025-12-01'), null);

      const result = mockRedisData.get(cacheKey);
      expect(result).toBeUndefined();
    });
  });
});
