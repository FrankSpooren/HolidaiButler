/**
 * Unit Tests for TicketService
 */

const { mockTicket, mockBooking } = require('../__mocks__/models');

// Mock dependencies
jest.mock('../../models', () => require('../__mocks__/models'));
jest.mock('qrcode');
jest.mock('pdfkit');
jest.mock('fs');
jest.mock('@mailerlite/mailerlite-nodejs', () => ({
  default: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

const QRCode = require('qrcode');
const fs = require('fs');
const { Ticket, Booking } = require('../../models');

// Now require TicketService (after mocks are set up)
const TicketService = require('../../services/TicketService');

describe('TicketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup QRCode mock
    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockQRCode');

    // Setup fs mock
    fs.readFileSync.mockReturnValue(Buffer.from('mock-pdf-content'));
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockReturnValue(undefined);
  });

  describe('generateTicketsForBooking', () => {
    it('should generate tickets for a booking', async () => {
      const booking = {
        ...mockBooking,
        totalGuests: 2,
        details: { guests: { adults: 2 } },
      };

      Ticket.create.mockImplementation((data) => Promise.resolve({
        ...mockTicket,
        ...data,
        save: jest.fn().mockResolvedValue(true),
      }));

      const tickets = await TicketService.generateTicketsForBooking(booking);

      expect(tickets).toHaveLength(2);
      expect(Ticket.create).toHaveBeenCalledTimes(2);
      expect(QRCode.toDataURL).toHaveBeenCalled();
    });

    it('should create ticket with correct data', async () => {
      const booking = {
        ...mockBooking,
        totalGuests: 1,
        details: { guests: { adults: 1 } },
      };

      Ticket.create.mockImplementation((data) => Promise.resolve({
        ...mockTicket,
        ...data,
        save: jest.fn().mockResolvedValue(true),
      }));

      await TicketService.generateTicketsForBooking(booking);

      expect(Ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: booking.id,
          userId: booking.userId,
          poiId: booking.poiId,
          holderName: booking.guestName,
          holderEmail: booking.guestEmail,
          status: 'active',
        })
      );
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code for ticket', async () => {
      Ticket.findByPk.mockResolvedValue({
        ...mockTicket,
        ticketNumber: 'HB-2025-000001',
        poiId: mockTicket.poiId,
        validFrom: new Date(),
        validUntil: new Date(),
      });

      const result = await TicketService.generateQRCode(mockTicket.id);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('imageUrl');
      expect(result.format).toBe('QR');
      expect(QRCode.toDataURL).toHaveBeenCalled();
    });

    it('should throw error when ticket not found', async () => {
      Ticket.findByPk.mockResolvedValue(null);

      await expect(TicketService.generateQRCode('not-found'))
        .rejects
        .toThrow('Ticket not found');
    });
  });

  describe('validateTicket', () => {
    it('should validate a valid ticket', async () => {
      const validTicket = {
        ...mockTicket,
        isValidated: false,
        status: 'active',
        validFrom: new Date(Date.now() - 86400000), // Yesterday
        validUntil: new Date(Date.now() + 86400000), // Tomorrow
        save: jest.fn().mockResolvedValue(true),
      };

      Ticket.findOne.mockResolvedValue(validTicket);

      // Create a valid QR payload
      const payload = JSON.stringify({
        ticketNumber: mockTicket.ticketNumber,
        poiId: mockTicket.poiId,
        validFrom: validTicket.validFrom.toISOString(),
        validUntil: validTicket.validUntil.toISOString(),
        timestamp: Date.now(),
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.QR_SECRET_KEY || 'test-qr-secret-key')
        .update(payload)
        .digest('hex');

      const qrCode = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');

      const result = await TicketService.validateTicket(
        qrCode,
        mockTicket.poiId,
        'device-123'
      );

      expect(result.valid).toBe(true);
      expect(result.ticket).toHaveProperty('ticketNumber');
      expect(validTicket.save).toHaveBeenCalled();
    });

    it('should reject already validated ticket', async () => {
      const validatedTicket = {
        ...mockTicket,
        isValidated: true,
        status: 'used',
      };

      Ticket.findOne.mockResolvedValue(validatedTicket);

      // Create valid QR
      const payload = JSON.stringify({
        ticketNumber: mockTicket.ticketNumber,
        poiId: mockTicket.poiId,
        validFrom: new Date().toISOString(),
        validUntil: new Date().toISOString(),
        timestamp: Date.now(),
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.QR_SECRET_KEY || 'test-qr-secret-key')
        .update(payload)
        .digest('hex');

      const qrCode = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');

      const result = await TicketService.validateTicket(qrCode, mockTicket.poiId, 'device-123');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Ticket already validated');
    });

    it('should reject ticket for wrong location', async () => {
      const ticket = {
        ...mockTicket,
        isValidated: false,
        status: 'active',
        poiId: 'different-poi-id',
      };

      Ticket.findOne.mockResolvedValue(ticket);

      const payload = JSON.stringify({
        ticketNumber: mockTicket.ticketNumber,
        poiId: mockTicket.poiId,
        validFrom: new Date().toISOString(),
        validUntil: new Date().toISOString(),
        timestamp: Date.now(),
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.QR_SECRET_KEY || 'test-qr-secret-key')
        .update(payload)
        .digest('hex');

      const qrCode = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');

      const result = await TicketService.validateTicket(qrCode, mockTicket.poiId, 'device-123');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Ticket not valid for this location');
    });

    it('should reject invalid QR code', async () => {
      const result = await TicketService.validateTicket('invalid-qr', mockTicket.poiId, 'device-123');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid QR code');
    });

    it('should reject expired ticket', async () => {
      const expiredTicket = {
        ...mockTicket,
        isValidated: false,
        status: 'active',
        validFrom: new Date(Date.now() - 172800000), // 2 days ago
        validUntil: new Date(Date.now() - 86400000), // Yesterday
      };

      Ticket.findOne.mockResolvedValue(expiredTicket);

      const payload = JSON.stringify({
        ticketNumber: mockTicket.ticketNumber,
        poiId: mockTicket.poiId,
        validFrom: expiredTicket.validFrom.toISOString(),
        validUntil: expiredTicket.validUntil.toISOString(),
        timestamp: Date.now(),
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.QR_SECRET_KEY || 'test-qr-secret-key')
        .update(payload)
        .digest('hex');

      const qrCode = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');

      const result = await TicketService.validateTicket(qrCode, mockTicket.poiId, 'device-123');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Ticket is not valid at this time');
    });
  });

  describe('cancelTickets', () => {
    it('should cancel tickets', async () => {
      const activeTicket = {
        ...mockTicket,
        isValidated: false,
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      };

      Ticket.findByPk.mockResolvedValue(activeTicket);

      await TicketService.cancelTickets([mockTicket.id], 'Booking cancelled');

      expect(activeTicket.status).toBe('cancelled');
      expect(activeTicket.save).toHaveBeenCalled();
    });

    it('should throw error when cancelling validated ticket', async () => {
      const validatedTicket = {
        ...mockTicket,
        isValidated: true,
      };

      Ticket.findByPk.mockResolvedValue(validatedTicket);

      await expect(TicketService.cancelTickets([mockTicket.id], 'reason'))
        .rejects
        .toThrow('Cannot cancel a validated ticket');
    });
  });

  describe('getTicketsByUser', () => {
    it('should return tickets for user', async () => {
      Ticket.findAll.mockResolvedValue([mockTicket]);

      const tickets = await TicketService.getTicketsByUser(mockTicket.userId);

      expect(tickets).toHaveLength(1);
      expect(Ticket.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockTicket.userId },
        })
      );
    });

    it('should filter by status', async () => {
      Ticket.findAll.mockResolvedValue([mockTicket]);

      await TicketService.getTicketsByUser(mockTicket.userId, 'active');

      expect(Ticket.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        })
      );
    });
  });

  describe('addToWallet', () => {
    it('should add ticket to Apple Wallet', async () => {
      const ticket = {
        ...mockTicket,
        save: jest.fn().mockResolvedValue(true),
      };

      Ticket.findByPk.mockResolvedValue(ticket);

      const result = await TicketService.addToWallet(mockTicket.id, 'apple');

      expect(result).toHaveProperty('passUrl');
      expect(result.walletType).toBe('apple');
      expect(ticket.save).toHaveBeenCalled();
    });

    it('should throw error when ticket not found', async () => {
      Ticket.findByPk.mockResolvedValue(null);

      await expect(TicketService.addToWallet('not-found', 'apple'))
        .rejects
        .toThrow('Ticket not found');
    });
  });

  describe('_createQRPayload', () => {
    it('should create valid QR payload', () => {
      const ticket = {
        ticketNumber: 'HB-2025-000001',
        poiId: '123',
        validFrom: new Date(),
        validUntil: new Date(),
      };

      const payload = TicketService._createQRPayload(ticket);

      expect(typeof payload).toBe('string');
      // Verify it's base64 encoded
      expect(() => Buffer.from(payload, 'base64').toString('utf-8')).not.toThrow();
    });
  });

  describe('_decryptQRPayload', () => {
    it('should decrypt valid QR payload', () => {
      const originalData = {
        ticketNumber: 'HB-2025-000001',
        poiId: '123',
        validFrom: new Date().toISOString(),
        validUntil: new Date().toISOString(),
        timestamp: Date.now(),
      };

      const payload = JSON.stringify(originalData);
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.QR_SECRET_KEY || 'test-qr-secret-key')
        .update(payload)
        .digest('hex');

      const qrCode = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');

      const result = TicketService._decryptQRPayload(qrCode);

      expect(result).toHaveProperty('ticketNumber', originalData.ticketNumber);
      expect(result).toHaveProperty('poiId', originalData.poiId);
    });

    it('should return null for invalid signature', () => {
      const qrCode = Buffer.from(JSON.stringify({
        payload: '{"ticketNumber":"test"}',
        signature: 'invalid-signature',
      })).toString('base64');

      const result = TicketService._decryptQRPayload(qrCode);

      expect(result).toBeNull();
    });

    it('should return null for malformed data', () => {
      const result = TicketService._decryptQRPayload('not-valid-base64!!!');

      expect(result).toBeNull();
    });
  });
});
