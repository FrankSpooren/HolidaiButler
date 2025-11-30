const { getModels, Sequelize } = require('../models-sequelize');
const { Op } = Sequelize;

// LAZY LOADING: Get models when needed
const getTicketModel = () => getModels().Ticket;
const getBookingModel = () => getModels().Booking;
const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');
const MailerLite = require('@mailerlite/mailerlite-nodejs').default;
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Ticket Service (Sequelize Version)
 * Handles ticket generation, QR codes, validation, and delivery
 * Uses MailerLite for email delivery
 *
 * CONVERTED: Mongoose → Sequelize (2025-11-17)
 */
class TicketService {
  constructor() {
    // Initialize MailerLite client
    this.mailerLite = new MailerLite({
      api_key: process.env.MAILERLITE_API_KEY,
    });

    this.fromEmail = process.env.MAILERLITE_FROM_EMAIL || 'tickets@holidaibutler.com';
    this.fromName = process.env.MAILERLITE_FROM_NAME || 'HolidaiButler';
    this.QR_SECRET = process.env.QR_SECRET_KEY || 'your-secret-key-change-in-production';
    this.S3_BUCKET_URL = process.env.S3_BUCKET_URL || '/tmp/tickets';
  }

  /**
   * Generate tickets for a confirmed booking
   * @param {Object} booking - Booking object (with POI relation included)
   * @returns {Promise<Array>} Array of generated tickets
   */
  async generateTicketsForBooking(booking) {
    try {
      const tickets = [];

      // Ensure POI is loaded
      if (!getBookingModel().poi) {
        booking = await getBookingModel().findByPk(getBookingModel().id, {
          include: [{ model: POI, as: 'poi' }]
        });
      }

      const totalGuests = getBookingModel().adults || 1;

      for (let i = 0; i < totalGuests; i++) {
        const ticket = await this._createTicket(booking, i + 1);
        tickets.push(ticket);
      }

      logger.info(`Generated ${tickets.length} tickets for booking ${getBookingModel().bookingReference}`);

      return tickets;
    } catch (error) {
      logger.error('Error generating tickets:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for a ticket
   * @param {Number} ticketId - Ticket identifier (INT)
   * @returns {Promise<Object>} QR code data and image URL
   */
  async generateQRCode(ticketId) {
    try {
      const ticket = await getTicketModel().findByPk(ticketId);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Create encrypted payload
      const payload = this._createQRPayload(ticket);

      // Generate QR code image
      const qrCodeDataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 400,
        margin: 2,
      });

      // In production, upload to S3 and return URL
      // For now, return data URL
      const imageUrl = qrCodeDataUrl;

      return {
        data: payload,
        imageUrl,
        format: 'QR',
      };
    } catch (error) {
      logger.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Validate ticket with QR code
   * @param {String} qrCode - QR code data
   * @param {Number} poiId - POI ID where validation occurs (INT)
   * @param {String} validatorDeviceId - Device/staff ID
   * @returns {Promise<Object>} Validation result
   */
  async validateTicket(qrCode, poiId, validatorDeviceId) {
    try {
      // Decrypt and verify QR payload
      const ticketData = this._decryptQRPayload(qrCode);

      if (!ticketData) {
        return {
          valid: false,
          reason: 'Invalid QR code',
        };
      }

      // Find ticket with POI relation
      const ticket = await getTicketModel().findOne({
        where: { ticketNumber: ticketData.ticketNumber },
        include: [{ model: POI, as: 'poi' }]
      });

      if (!ticket) {
        return {
          valid: false,
          reason: 'Ticket not found',
        };
      }

      // Verify POI match (INT comparison)
      if (getTicketModel().poiId !== parseInt(poiId)) {
        return {
          valid: false,
          reason: 'Ticket not valid for this location',
        };
      }

      // Validate ticket
      try {
        await getTicketModel().validateTicket(validatorDeviceId, poiId);

        logger.info(`Ticket validated: ${getTicketModel().ticketNumber}`);

        return {
          valid: true,
          ticket: {
            ticketNumber: getTicketModel().ticketNumber,
            holder: getTicketModel().holderName,
            poiName: getTicketModel().details?.productName || getTicketModel().poi?.name,
            validFrom: getTicketModel().validFrom,
            validUntil: getTicketModel().validUntil,
          },
        };
      } catch (validationError) {
        return {
          valid: false,
          reason: validationError.message,
        };
      }
    } catch (error) {
      logger.error('Error validating ticket:', error);
      return {
        valid: false,
        reason: 'Validation error',
      };
    }
  }

  /**
   * Send tickets to user via email using MailerLite
   * @param {Array} tickets - Array of ticket objects
   * @param {String} email - Recipient email
   * @returns {Promise<void>}
   */
  async sendTicketsToUser(tickets, email) {
    try {
      if (tickets.length === 0) {
        throw new Error('No tickets to send');
      }

      // Generate PDF for all tickets
      const pdfPath = await this._generateTicketsPDF(tickets);

      // Read PDF file as base64
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfBase64 = pdfBuffer.toString('base64');

      // Send email via MailerLite
      await this.mailerLite.send({
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        to: [
          {
            email: email,
            name: tickets[0].holderName || 'Guest',
          },
        ],
        subject: `Your HolidaiButler Tickets - ${tickets[0].details?.productName || 'Experience'}`,
        html: this._generateTicketEmailHTML(tickets),
        attachments: [
          {
            content: pdfBase64,
            filename: `tickets-${tickets[0].bookingId}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      });

      // Clean up temporary PDF
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }

      logger.info(`Tickets sent to ${email} via MailerLite`);
    } catch (error) {
      logger.error('Error sending tickets via MailerLite:', error);
      throw error;
    }
  }

  /**
   * Get tickets by user
   * @param {Number} userId - User identifier (INT)
   * @param {String} status - Optional status filter
   * @returns {Promise<Array>} Array of tickets
   */
  async getTicketsByUser(userId, status = null) {
    try {
      const where = { userId: parseInt(userId) };

      if (status) {
        where.status = status;
      }

      const tickets = await getTicketModel().findAll({
        where,
        include: [
          {
            model: POI,
            as: 'poi',
            attributes: ['id', 'name', 'location', 'images']
          }
        ],
        order: [['validFrom', 'DESC']]
      });

      return tickets;
    } catch (error) {
      logger.error('Error getting tickets:', error);
      throw error;
    }
  }

  /**
   * Cancel tickets (part of booking cancellation)
   * @param {Array} ticketIds - Array of ticket IDs (INT)
   * @param {String} reason - Cancellation reason
   * @returns {Promise<void>}
   */
  async cancelTickets(ticketIds, reason) {
    try {
      for (const ticketId of ticketIds) {
        const ticket = await getTicketModel().findByPk(ticketId);
        if (ticket) {
          await getTicketModel().cancelTicket(reason);
        }
      }

      logger.info(`Cancelled ${ticketIds.length} tickets`);
    } catch (error) {
      logger.error('Error cancelling tickets:', error);
      throw error;
    }
  }

  /**
   * Add ticket to mobile wallet (Apple Wallet / Google Pay)
   * @param {Number} ticketId - Ticket identifier (INT)
   * @param {String} walletType - 'apple' or 'google'
   * @returns {Promise<Object>} Wallet pass URL
   */
  async addToWallet(ticketId, walletType) {
    try {
      const ticket = await getTicketModel().findByPk(ticketId, {
        include: [{ model: POI, as: 'poi' }]
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // TODO: Implement Apple Wallet / Google Pay pass generation
      // This requires PassKit for Apple and Google Wallet API for Google

      const passUrl = `${process.env.API_URL}/api/v1/tickets/${ticketId}/wallet/${walletType}`;

      if (walletType === 'apple') {
        getTicketModel().appleWalletUrl = passUrl;
      } else {
        getTicketModel().googlePayUrl = passUrl;
      }

      await getTicketModel().save();

      logger.info(`Wallet pass generated for ticket ${getTicketModel().ticketNumber}`);

      return {
        passUrl,
        walletType,
      };
    } catch (error) {
      logger.error('Error adding to wallet:', error);
      throw error;
    }
  }

  // ========== Private Helper Methods ==========

  /**
   * Create a single ticket
   * @private
   */
  async _createTicket(booking, sequenceNumber) {
    // Generate QR code first (before ticket exists)
    const tempId = `${getBookingModel().id}-${sequenceNumber}`;
    const qrCodeData = await this.generateQRCode(tempId);

    const ticketData = {
      bookingId: getBookingModel().id,
      userId: getBookingModel().userId,
      poiId: getBookingModel().poiId,
      type: getBookingModel().experienceType === 'tour' ? 'guided-tour' : 'single',
      validFrom: getBookingModel().bookingDate,
      validUntil: new Date(new Date(getBookingModel().bookingDate).getTime() + 24 * 60 * 60 * 1000), // +1 day
      timeslot: getBookingModel().bookingTime,
      timezone: 'Europe/Amsterdam',
      qrCodeData: qrCodeData.data,
      qrCodeImageUrl: qrCodeData.imageUrl,
      qrCodeFormat: 'QR',
      holderName: getBookingModel().guestName,
      holderEmail: getBookingModel().guestEmail,
      holderPhone: getBookingModel().guestPhone,
      details: {
        productName: getBookingModel().poi?.name || 'Experience',
        description: getBookingModel().poi?.description || '',
        quantity: 1,
        language: getBookingModel().language || 'en',
      },
      status: 'active',
      metadata: {
        source: getBookingModel().metadata?.source || 'platform',
      },
    };

    const ticket = await getTicketModel().create(ticketData);

    // Update QR code with actual ticket number
    const updatedQRCode = await this.generateQRCode(getTicketModel().id);
    getTicketModel().qrCodeData = updatedQRCode.data;
    getTicketModel().qrCodeImageUrl = updatedQRCode.imageUrl;
    await getTicketModel().save();

    return ticket;
  }

  /**
   * Create encrypted QR payload
   * @private
   */
  _createQRPayload(ticket) {
    const data = {
      ticketNumber: getTicketModel().ticketNumber,
      poiId: getTicketModel().poiId, // Already integer, no toString()
      validFrom: getTicketModel().validFrom.toISOString(),
      validUntil: getTicketModel().validUntil.toISOString(),
      timestamp: Date.now(),
    };

    const payload = JSON.stringify(data);

    // Create HMAC signature
    const signature = crypto
      .createHmac('sha256', this.QR_SECRET)
      .update(payload)
      .digest('hex');

    // Combine payload and signature
    return Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
  }

  /**
   * Decrypt and verify QR payload
   * @private
   */
  _decryptQRPayload(qrCode) {
    try {
      const decoded = JSON.parse(Buffer.from(qrCode, 'base64').toString('utf-8'));
      const { payload, signature } = decoded;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.QR_SECRET)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        return null;
      }

      return JSON.parse(payload);
    } catch (error) {
      logger.error('Error decrypting QR payload:', error);
      return null;
    }
  }

  /**
   * Generate PDF for tickets
   * @private
   */
  async _generateTicketsPDF(tickets) {
    const pdfPath = path.join('/tmp', `tickets-${Date.now()}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.pipe(fs.createWriteStream(pdfPath));

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];

      if (i > 0) {
        doc.addPage();
      }

      // Title
      doc.fontSize(20).text('HolidaiButler Ticket', { align: 'center' });
      doc.moveDown();

      // Ticket details
      doc.fontSize(12);
      doc.text(`Ticket Number: ${getTicketModel().ticketNumber}`);
      doc.text(`Product: ${getTicketModel().details?.productName || 'Experience'}`);
      doc.text(`Holder: ${getTicketModel().holderName}`);
      doc.text(`Date: ${new Date(getTicketModel().validFrom).toLocaleDateString()}`);
      if (getTicketModel().timeslot) {
        doc.text(`Time: ${getTicketModel().timeslot}`);
      }
      doc.moveDown();

      // QR Code (placeholder - in production, embed actual QR image)
      doc.text('[QR CODE PLACEHOLDER]', { align: 'center' });
      doc.text(`(Scan code: ${getTicketModel().qrCodeData.substring(0, 20)}...)`, { align: 'center', fontSize: 8 });
      doc.moveDown();

      // Footer
      doc.fontSize(10).text('Please present this ticket at the entrance.', { align: 'center' });
    }

    doc.end();

    // Wait for PDF to be written
    await new Promise(resolve => {
      doc.on('finish', resolve);
    });

    return pdfPath;
  }

  /**
   * Generate email HTML for tickets
   * @private
   */
  _generateTicketEmailHTML(tickets) {
    const firstTicket = tickets[0];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Your HolidaiButler Tickets</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2196F3;">Your Tickets Are Ready!</h1>

        <p>Dear ${firstTicket.holderName},</p>

        <p>Thank you for booking with HolidaiButler! Your tickets for <strong>${firstTicket.details?.productName || 'Experience'}</strong> are attached to this email.</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Number of Tickets:</strong> ${tickets.length}</p>
          <p><strong>Date:</strong> ${new Date(firstTicket.validFrom).toLocaleDateString()}</p>
          ${firstTicket.timeslot ? `<p><strong>Time:</strong> ${firstTicket.timeslot}</p>` : ''}
          <p><strong>Ticket Number:</strong> ${firstTicket.ticketNumber}</p>
        </div>

        <p><strong>Important:</strong> Please bring your tickets (printed or on your mobile device) to the venue.</p>

        <p>Have a great experience!</p>

        <p style="color: #666; font-size: 12px; margin-top: 40px;">
          HolidaiButler - Your AI Travel Companion<br>
          <a href="https://holidaibutler.com">holidaibutler.com</a>
        </p>
      </body>
      </html>
    `;
  }
}

module.exports = new TicketService();
