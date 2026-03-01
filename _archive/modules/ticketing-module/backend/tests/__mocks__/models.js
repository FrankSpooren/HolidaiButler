/**
 * Mock Sequelize Models for Testing
 */

const mockBooking = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  bookingReference: 'BK-2025-000001',
  userId: '123e4567-e89b-12d3-a456-426614174001',
  poiId: '123e4567-e89b-12d3-a456-426614174002',
  status: 'pending',
  bookingDate: new Date('2025-12-01'),
  bookingTime: '10:00',
  adultsCount: 2,
  childrenCount: 0,
  infantsCount: 0,
  basePrice: 25.00,
  taxes: 4.50,
  fees: 2.50,
  discount: 0,
  totalPrice: 52.00,
  currency: 'EUR',
  paymentStatus: 'pending',
  productType: 'ticket',
  guestName: 'Test User',
  guestEmail: 'test@example.com',
  guestPhone: '+31612345678',
  allowCancellation: true,
  cancellationDeadline: new Date('2025-11-30'),
  refundPolicy: 'full',
  isLocked: false,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
  destroy: jest.fn().mockResolvedValue(true),
};

const mockTicket = {
  id: '123e4567-e89b-12d3-a456-426614174010',
  ticketNumber: 'HB-2025-000001',
  bookingId: mockBooking.id,
  userId: mockBooking.userId,
  poiId: mockBooking.poiId,
  type: 'single',
  validFrom: new Date('2025-12-01'),
  validUntil: new Date('2025-12-02'),
  timeslot: '10:00',
  timezone: 'Europe/Amsterdam',
  qrCodeData: 'test-qr-data',
  qrCodeImageUrl: 'data:image/png;base64,test',
  qrCodeFormat: 'QR',
  holderName: 'Test User',
  holderEmail: 'test@example.com',
  productName: 'Test Experience',
  quantity: 1,
  language: 'en',
  isValidated: false,
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
};

const mockAvailability = {
  id: '123e4567-e89b-12d3-a456-426614174020',
  poiId: mockBooking.poiId,
  date: new Date('2025-12-01'),
  timeslot: '10:00-11:00',
  totalCapacity: 100,
  bookedCapacity: 20,
  reservedCapacity: 5,
  availableCapacity: 75,
  basePrice: 25.00,
  currency: 'EUR',
  dynamicPriceMultiplier: 1.0,
  finalPrice: 25.00,
  minBooking: 1,
  maxBooking: 10,
  cutoffHours: 2,
  isActive: true,
  isSoldOut: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
};

// Mock Booking Model
const Booking = {
  create: jest.fn().mockImplementation((data) => {
    return Promise.resolve({
      ...mockBooking,
      ...data,
      save: jest.fn().mockResolvedValue(true),
      destroy: jest.fn().mockResolvedValue(true),
    });
  }),
  findByPk: jest.fn().mockImplementation((id) => {
    if (id === 'not-found') return Promise.resolve(null);
    return Promise.resolve({ ...mockBooking, id });
  }),
  findOne: jest.fn().mockResolvedValue(mockBooking),
  findAll: jest.fn().mockResolvedValue([mockBooking]),
  count: jest.fn().mockResolvedValue(0),
  generateBookingReference: jest.fn().mockResolvedValue('BK-2025-000001'),
};

// Mock Ticket Model
const Ticket = {
  create: jest.fn().mockImplementation((data) => {
    return Promise.resolve({
      ...mockTicket,
      ...data,
      save: jest.fn().mockResolvedValue(true),
    });
  }),
  findByPk: jest.fn().mockImplementation((id) => {
    if (id === 'not-found') return Promise.resolve(null);
    return Promise.resolve({ ...mockTicket, id });
  }),
  findOne: jest.fn().mockResolvedValue(mockTicket),
  findAll: jest.fn().mockResolvedValue([mockTicket]),
  count: jest.fn().mockResolvedValue(0),
  generateTicketNumber: jest.fn().mockResolvedValue('HB-2025-000001'),
};

// Mock Availability Model
const Availability = {
  create: jest.fn().mockImplementation((data) => {
    return Promise.resolve({
      ...mockAvailability,
      ...data,
      save: jest.fn().mockResolvedValue(true),
    });
  }),
  findByPk: jest.fn().mockResolvedValue(mockAvailability),
  findOne: jest.fn().mockImplementation(({ where }) => {
    if (where && where.poiId === 'not-found') return Promise.resolve(null);
    return Promise.resolve({
      ...mockAvailability,
      save: jest.fn().mockResolvedValue(true),
    });
  }),
  findAll: jest.fn().mockResolvedValue([mockAvailability]),
};

// Mock Sequelize instance
const sequelize = {
  authenticate: jest.fn().mockResolvedValue(true),
  sync: jest.fn().mockResolvedValue(true),
  close: jest.fn().mockResolvedValue(true),
  transaction: jest.fn().mockImplementation(async (callback) => {
    const t = { commit: jest.fn(), rollback: jest.fn() };
    return callback(t);
  }),
};

module.exports = {
  sequelize,
  Booking,
  Ticket,
  Availability,
  mockBooking,
  mockTicket,
  mockAvailability,
};
