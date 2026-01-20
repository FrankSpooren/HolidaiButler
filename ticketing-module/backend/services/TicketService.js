const { Ticket, Booking } = require('../models');
const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');
const MailerLite = require('@mailerlite/mailerlite-nodejs').default;
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Ticket Service
 * Handles ticket generation, QR codes, validation, and delivery
 * Uses MailerLite for email delivery
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
   * @param {Object} booking - Booking object (populated with POI)
   * @returns {Promise<Array>} Array of generated tickets
   */
  async generateTicketsForBooking(booking) {
    try {
      const tickets = [];
      const totalGuests = booking.totalGuests || booking.details.guests.adults;

      for (let i = 0; i < totalGuests; i++) {
        const ticket = await this._createTicket(booking, i + 1);
        tickets.push(ticket);
      }

      logger.info(`Generated ${tickets.length} tickets for booking ${booking.bookingReference}`);

      return tickets;
    } catch (error) {
      logger.error('Error generating tickets:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for a ticket
   * @param {String} ticketId - Ticket identifier
   * @returns {Promise<Object>} QR code data and image URL
   */
  async generateQRCode(ticketId) {
    try {
      const ticket = await Ticket.findByPk(ticketId);

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
   * @param {String} poiId - POI where validation occurs
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

      // Find ticket
      const ticket = await Ticket.findOne({
        where: { ticketNumber: ticketData.ticketNumber },
      });

      if (!ticket) {
        return {
          valid: false,
          reason: 'Ticket not found',
        };
      }

      // Verify POI match
      if (ticket.poiId !== poiId) {
        return {
          valid: false,
          reason: 'Ticket not valid for this location',
        };
      }

      // Check if already validated
      if (ticket.isValidated) {
        return {
          valid: false,
          reason: 'Ticket already validated',
        };
      }

      // Check status
      if (ticket.status !== 'active') {
        return {
          valid: false,
          reason: `Cannot validate ticket with status: ${ticket.status}`,
        };
      }

      // Check validity period
      const now = new Date();
      if (now < ticket.validFrom || now > ticket.validUntil) {
        return {
          valid: false,
          reason: 'Ticket is not valid at this time',
        };
      }

      // Validate ticket - update fields
      ticket.isValidated = true;
      ticket.validatedAt = now;
      ticket.validatedBy = validatorDeviceId;
      ticket.validationLocation = poiId;
      ticket.status = 'used';
      await ticket.save();

      logger.info(`Ticket validated: ${ticket.ticketNumber}`);

      return {
        valid: true,
        ticket: {
          ticketNumber: ticket.ticketNumber,
          holder: ticket.holderName,
          poiName: ticket.productName,
          validFrom: ticket.validFrom,
          validUntil: ticket.validUntil,
        },
      };
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
        subject: `Your HolidaiButler Tickets - ${tickets[0].productName}`,
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
   * @param {String} userId - User identifier
   * @param {String} status - Optional status filter
   * @returns {Promise<Array>} Array of tickets
   */
  async getTicketsByUser(userId, status = null) {
    try {
      const where = { userId };

      if (status) {
        where.status = status;
      }

      const tickets = await Ticket.findAll({
        where,
        order: [['validFrom', 'DESC']],
      });

      return tickets;
    } catch (error) {
      logger.error('Error getting tickets:', error);
      throw error;
    }
  }

  /**
   * Cancel tickets (part of booking cancellation)
   * @param {Array} ticketIds - Array of ticket IDs
   * @param {String} reason - Cancellation reason
   * @returns {Promise<void>}
   */
  async cancelTickets(ticketIds, reason) {
    try {
      for (const ticketId of ticketIds) {
        const ticket = await Ticket.findByPk(ticketId);
        if (ticket) {
          // Check if ticket can be cancelled
          if (ticket.isValidated) {
            throw new Error('Cannot cancel a validated ticket');
          }

          ticket.status = 'cancelled';
          await ticket.save();
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
   * @param {String} ticketId - Ticket identifier
   * @param {String} walletType - 'apple' or 'google'
   * @returns {Promise<Object>} Wallet pass URL
   */
  async addToWallet(ticketId, walletType) {
    try {
      const ticket = await Ticket.findByPk(ticketId);

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // TODO: Implement Apple Wallet / Google Pay pass generation
      // This requires PassKit for Apple and Google Wallet API for Google

      const passUrl = `${process.env.API_URL}/api/v1/tickets/${ticketId}/wallet/${walletType}`;

      if (walletType === 'apple') {
        ticket.appleWalletUrl = passUrl;
      } else {
        ticket.googlePayUrl = passUrl;
      }

      await ticket.save();

      logger.info(`Wallet pass generated for ticket ${ticket.ticketNumber}`);

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
    // Create ticket using Sequelize first (without QR code)
    const ticket = await Ticket.create({
      bookingId: booking.id,
      userId: booking.userId,
      poiId: booking.poiId,
      type: booking.productType === 'tour' ? 'guided-tour' : 'single',
      validFrom: booking.bookingDate,
      validUntil: new Date(new Date(booking.bookingDate).getTime() + 24 * 60 * 60 * 1000), // +1 day
      timeslot: booking.bookingTime,
      timezone: 'Europe/Amsterdam',
      qrCodeData: '', // Placeholder, will be updated
      qrCodeImageUrl: '',
      qrCodeFormat: 'QR',
      holderName: booking.guestName,
      holderEmail: booking.guestEmail,
      holderPhone: booking.guestPhone,
      productName: booking.productName || 'Experience',
      productDescription: '',
      quantity: 1,
      language: booking.experienceLanguage || 'en',
      status: 'active',
      source: booking.source || 'mobile',
    });

    // Now generate QR code with actual ticket data
    const payload = this._createQRPayload(ticket);

    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
    });

    // Update ticket with QR code
    ticket.qrCodeData = payload;
    ticket.qrCodeImageUrl = qrCodeDataUrl;
    await ticket.save();

    return ticket;
  }

  /**
   * Create encrypted QR payload
   * @private
   */
  _createQRPayload(ticket) {
    const data = {
      ticketNumber: ticket.ticketNumber,
      poiId: ticket.poiId,
      validFrom: ticket.validFrom ? ticket.validFrom.toISOString() : new Date().toISOString(),
      validUntil: ticket.validUntil ? ticket.validUntil.toISOString() : new Date().toISOString(),
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
      doc.text(`Ticket Number: ${ticket.ticketNumber}`);
      doc.text(`Product: ${ticket.productName}`);
      doc.text(`Holder: ${ticket.holderName}`);
      doc.text(`Date: ${ticket.validFrom.toLocaleDateString()}`);
      if (ticket.timeslot) {
        doc.text(`Time: ${ticket.timeslot}`);
      }
      doc.moveDown();

      // QR Code - embed actual QR image
      if (ticket.qrCodeImageUrl && ticket.qrCodeImageUrl.startsWith('data:image')) {
        try {
          // Extract base64 data from data URL
          const base64Data = ticket.qrCodeImageUrl.split(',')[1];
          const qrBuffer = Buffer.from(base64Data, 'base64');
          doc.image(qrBuffer, {
            fit: [200, 200],
            align: 'center',
          });
        } catch (err) {
          // Fallback to text if QR embedding fails
          doc.text('[QR CODE]', { align: 'center' });
        }
      } else {
        doc.text('[QR CODE]', { align: 'center' });
      }
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

        <p>Thank you for booking with HolidaiButler! Your tickets for <strong>${firstTicket.productName}</strong> are attached to this email.</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Number of Tickets:</strong> ${tickets.length}</p>
          <p><strong>Date:</strong> ${firstTicket.validFrom.toLocaleDateString()}</p>
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
