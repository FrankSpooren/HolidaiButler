/**
 * ReservationService Unit Tests
 */

// Mock dependencies before requiring service
jest.mock('../../models', () => require('../__mocks__/models'));
jest.mock('../../services/cache', () => ({
  getReservation: jest.fn().mockResolvedValue(null),
  cacheReservation: jest.fn().mockResolvedValue(true),
  invalidateReservation: jest.fn().mockResolvedValue(true),
  invalidateAvailability: jest.fn().mockResolvedValue(true),
  acquireLock: jest.fn().mockResolvedValue(true),
  releaseLock: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/GuestCRMService', () => ({
  createOrUpdateGuest: jest.fn().mockResolvedValue({
    id: 'guest-uuid',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    total_reservations: 0,
    is_vip: false,
    canMakeReservation: jest.fn().mockReturnValue(true),
    update: jest.fn(),
  }),
}));
jest.mock('../../services/AvailabilityService', () => ({
  checkAvailability: jest.fn().mockResolvedValue({ available: true }),
  reserveCapacity: jest.fn().mockResolvedValue({ lockId: 'lock-123' }),
  confirmReservation: jest.fn().mockResolvedValue(true),
  releaseReservation: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/PaymentService', () => ({
  createDepositSession: jest.fn().mockResolvedValue({
    id: 'session-123',
    paymentUrl: 'https://pay.example.com',
  }),
  verifyPayment: jest.fn().mockResolvedValue(true),
  refundDeposit: jest.fn().mockResolvedValue({ success: true }),
  forfeitDeposit: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('../../services/NotificationService', () => ({
  sendReservationConfirmation: jest.fn().mockResolvedValue(true),
  sendReservationConfirmed: jest.fn().mockResolvedValue(true),
  sendCancellationEmail: jest.fn().mockResolvedValue(true),
  sendReservationReminder: jest.fn().mockResolvedValue(true),
  sendModificationConfirmation: jest.fn().mockResolvedValue(true),
  sendPostVisitEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/TableManagementService', () => ({
  autoAssignTables: jest.fn().mockResolvedValue({ assigned: true }),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { Restaurant, Reservation, Guest } = require('../../models');
const GuestCRMService = require('../../services/GuestCRMService');
const AvailabilityService = require('../../services/AvailabilityService');
const NotificationService = require('../../services/NotificationService');

describe('ReservationService', () => {
  let ReservationService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require to reset module state
    jest.isolateModules(() => {
      ReservationService = require('../../services/ReservationService');
    });
  });

  describe('createReservation', () => {
    const validReservationData = {
      restaurantId: 'restaurant-uuid',
      guestEmail: 'test@example.com',
      date: '2025-12-01',
      time: '19:00',
      partySize: 4,
      guestInfo: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+31612345678',
      },
      source: 'web',
    };

    it('should reject if restaurant not found', async () => {
      Restaurant.findByPk.mockResolvedValue(null);

      await expect(
        ReservationService.createReservation(validReservationData)
      ).rejects.toThrow('Restaurant not found');
    });

    it('should reject if restaurant not accepting reservations', async () => {
      Restaurant.findByPk.mockResolvedValue({
        id: 'restaurant-uuid',
        canAcceptReservations: jest.fn().mockReturnValue(false),
      });

      await expect(
        ReservationService.createReservation(validReservationData)
      ).rejects.toThrow('not accepting reservations');
    });

    it('should reject invalid party size', async () => {
      Restaurant.findByPk.mockResolvedValue({
        id: 'restaurant-uuid',
        canAcceptReservations: jest.fn().mockReturnValue(true),
        min_party_size: 2,
        max_party_size: 10,
      });

      await expect(
        ReservationService.createReservation({
          ...validReservationData,
          partySize: 1,
        })
      ).rejects.toThrow('Party size must be between');
    });

    it('should reject if no availability', async () => {
      Restaurant.findByPk.mockResolvedValue({
        id: 'restaurant-uuid',
        canAcceptReservations: jest.fn().mockReturnValue(true),
        min_party_size: 1,
        max_party_size: 20,
      });

      AvailabilityService.checkAvailability.mockResolvedValue({ available: false });

      await expect(
        ReservationService.createReservation(validReservationData)
      ).rejects.toThrow('No availability');
    });

    it('should create reservation successfully', async () => {
      const mockRestaurant = {
        id: 'restaurant-uuid',
        name: 'Test Restaurant',
        canAcceptReservations: jest.fn().mockReturnValue(true),
        min_party_size: 1,
        max_party_size: 20,
        default_seating_duration: 90,
        deposit_required: false,
        pos_integration_enabled: false,
        incrementReservationCount: jest.fn(),
      };

      const mockReservation = {
        id: 'reservation-uuid',
        reservation_reference: 'RES-001',
        confirm: jest.fn(),
        update: jest.fn(),
      };

      Restaurant.findByPk.mockResolvedValue(mockRestaurant);
      AvailabilityService.checkAvailability.mockResolvedValue({ available: true });
      Reservation.generateReference = jest.fn().mockResolvedValue('RES-001');
      Reservation.create.mockResolvedValue(mockReservation);

      const result = await ReservationService.createReservation(validReservationData);

      expect(result).toHaveProperty('reservation');
      expect(result.requiresPayment).toBe(false);
      expect(GuestCRMService.createOrUpdateGuest).toHaveBeenCalled();
      expect(AvailabilityService.reserveCapacity).toHaveBeenCalled();
      expect(NotificationService.sendReservationConfirmation).toHaveBeenCalled();
    });
  });

  describe('cancelReservation', () => {
    it('should throw if reservation not found', async () => {
      Reservation.findByPk.mockResolvedValue(null);

      await expect(
        ReservationService.cancelReservation('invalid-id', 'guest')
      ).rejects.toThrow('Reservation not found');
    });

    it('should throw if reservation cannot be cancelled', async () => {
      Reservation.findByPk.mockResolvedValue({
        id: 'res-uuid',
        status: 'completed',
        restaurant: {},
        guest: {},
      });

      await expect(
        ReservationService.cancelReservation('res-uuid', 'guest')
      ).rejects.toThrow('cannot be cancelled');
    });
  });

  describe('calculateDepositAmount', () => {
    it('should calculate deposit based on fixed amount', () => {
      const restaurant = {
        deposit_amount: 25,
        deposit_percentage: null,
      };

      const amount = ReservationService.calculateDepositAmount(restaurant, 4);
      expect(amount).toBe(100); // 25 * 4
    });

    it('should calculate deposit based on percentage', () => {
      const restaurant = {
        deposit_amount: null,
        deposit_percentage: 20,
        price_range: '€€',
      };

      const amount = ReservationService.calculateDepositAmount(restaurant, 2);
      // 40 per person * 2 people * 20% = 16
      expect(amount).toBe(16);
    });

    it('should return default minimum deposit', () => {
      const restaurant = {
        deposit_amount: null,
        deposit_percentage: null,
      };

      const amount = ReservationService.calculateDepositAmount(restaurant, 2);
      expect(amount).toBe(10);
    });
  });
});
