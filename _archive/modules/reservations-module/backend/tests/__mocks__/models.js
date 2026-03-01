/**
 * Mock Models for Testing
 */

const mockUUID = 'test-uuid-1234';

const createMockModel = (name, defaults = {}) => {
  const model = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    build: jest.fn((data) => ({
      ...data,
      save: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      toJSON: jest.fn().mockReturnValue(data),
    })),
  };

  return model;
};

const mockRestaurant = createMockModel('Restaurant', {
  id: mockUUID,
  name: 'Test Restaurant',
  is_active: true,
});

const mockTable = createMockModel('Table', {
  id: mockUUID,
  restaurant_id: mockUUID,
  table_number: 'T1',
  min_capacity: 2,
  max_capacity: 4,
});

const mockReservation = createMockModel('Reservation', {
  id: mockUUID,
  reservation_reference: 'RES-001',
  restaurant_id: mockUUID,
  guest_id: mockUUID,
  status: 'confirmed',
});

const mockGuest = createMockModel('Guest', {
  id: mockUUID,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
});

const mockGuestNote = createMockModel('GuestNote');
const mockWaitlist = createMockModel('Waitlist');
const mockFloorPlan = createMockModel('FloorPlan');
const mockRestaurantAvailability = createMockModel('RestaurantAvailability');

const mockSequelize = {
  authenticate: jest.fn().mockResolvedValue(true),
  sync: jest.fn().mockResolvedValue(true),
  close: jest.fn().mockResolvedValue(true),
  query: jest.fn().mockResolvedValue([[]]),
  getQueryInterface: jest.fn().mockReturnValue({}),
  connectionManager: {
    pool: {
      size: 10,
      available: 8,
      pending: 0,
    },
  },
};

module.exports = {
  sequelize: mockSequelize,
  Sequelize: {
    fn: jest.fn(),
    col: jest.fn(),
    literal: jest.fn(),
    Op: {
      and: Symbol('and'),
      or: Symbol('or'),
      eq: Symbol('eq'),
      ne: Symbol('ne'),
      gt: Symbol('gt'),
      gte: Symbol('gte'),
      lt: Symbol('lt'),
      lte: Symbol('lte'),
      in: Symbol('in'),
      like: Symbol('like'),
      between: Symbol('between'),
      contains: Symbol('contains'),
    },
  },
  Restaurant: mockRestaurant,
  Table: mockTable,
  Reservation: mockReservation,
  Guest: mockGuest,
  GuestNote: mockGuestNote,
  Waitlist: mockWaitlist,
  FloorPlan: mockFloorPlan,
  RestaurantAvailability: mockRestaurantAvailability,
  syncDatabase: jest.fn().mockResolvedValue(true),
  testConnection: jest.fn().mockResolvedValue(true),
};
