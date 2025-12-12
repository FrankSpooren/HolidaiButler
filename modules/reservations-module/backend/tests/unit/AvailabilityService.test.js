/**
 * AvailabilityService Unit Tests
 */

// Mock dependencies
jest.mock('../../models', () => require('../__mocks__/models'));
jest.mock('../../services/cache', () => ({
  getAvailability: jest.fn().mockResolvedValue(null),
  cacheAvailability: jest.fn().mockResolvedValue(true),
  invalidateAvailability: jest.fn().mockResolvedValue(true),
  acquireLock: jest.fn().mockResolvedValue(true),
  releaseLock: jest.fn().mockResolvedValue(true),
  isLocked: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { Restaurant, RestaurantAvailability, Reservation, Table } = require('../../models');
const cacheService = require('../../services/cache');

describe('AvailabilityService', () => {
  let AvailabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      AvailabilityService = require('../../services/AvailabilityService');
    });
  });

  describe('checkAvailability', () => {
    it('should return not available if restaurant not found', async () => {
      Restaurant.findByPk.mockResolvedValue(null);

      await expect(
        AvailabilityService.checkAvailability({
          restaurantId: 'invalid-id',
          date: '2025-12-01',
          partySize: 4,
        })
      ).rejects.toThrow('Restaurant not found');
    });

    it('should return cached availability if available', async () => {
      cacheService.getAvailability.mockResolvedValue({
        slots: [
          { time: '19:00', available_capacity: 10, is_locked: false },
        ],
      });

      const result = await AvailabilityService.checkAvailability({
        restaurantId: 'restaurant-uuid',
        date: '2025-12-01',
        time: '19:00',
        partySize: 4,
      });

      expect(result.cached).toBe(true);
      expect(result.available).toBe(true);
    });

    it('should return not available if date is in the past', async () => {
      Restaurant.findByPk.mockResolvedValue({
        id: 'restaurant-uuid',
        canAcceptReservations: jest.fn().mockReturnValue(true),
        advance_booking_days: 90,
      });

      const result = await AvailabilityService.checkAvailability({
        restaurantId: 'restaurant-uuid',
        date: '2020-01-01',
        partySize: 4,
      });

      expect(result.available).toBe(false);
      expect(result.reason).toContain('past');
    });
  });

  describe('reserveCapacity', () => {
    it('should acquire lock and update availability', async () => {
      cacheService.acquireLock.mockResolvedValue(true);
      RestaurantAvailability.findOne.mockResolvedValue({
        reserved_capacity: 0,
        update: jest.fn(),
      });

      const result = await AvailabilityService.reserveCapacity({
        restaurantId: 'restaurant-uuid',
        date: '2025-12-01',
        time: '19:00',
        partySize: 4,
        reservationId: 'res-uuid',
      });

      expect(result).toHaveProperty('lockId');
      expect(cacheService.acquireLock).toHaveBeenCalled();
    });

    it('should throw if slot is already locked', async () => {
      cacheService.acquireLock.mockResolvedValue(false);

      await expect(
        AvailabilityService.reserveCapacity({
          restaurantId: 'restaurant-uuid',
          date: '2025-12-01',
          time: '19:00',
          partySize: 4,
        })
      ).rejects.toThrow('already being held');
    });
  });

  describe('blockTimeSlot', () => {
    it('should create blocked slot if not exists', async () => {
      RestaurantAvailability.findOne.mockResolvedValue(null);
      RestaurantAvailability.create.mockResolvedValue({
        id: 'slot-uuid',
        is_open: false,
      });

      const result = await AvailabilityService.blockTimeSlot(
        'restaurant-uuid',
        '2025-12-01',
        '19:00',
        'Private event'
      );

      expect(RestaurantAvailability.create).toHaveBeenCalledWith(
        expect.objectContaining({
          is_open: false,
          block_reason: 'Private event',
        })
      );
    });

    it('should update existing slot to blocked', async () => {
      const mockSlot = {
        update: jest.fn(),
      };
      RestaurantAvailability.findOne.mockResolvedValue(mockSlot);

      await AvailabilityService.blockTimeSlot(
        'restaurant-uuid',
        '2025-12-01',
        '19:00'
      );

      expect(mockSlot.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_open: false })
      );
    });
  });
});
