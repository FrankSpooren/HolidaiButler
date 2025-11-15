const Ticket = require('../models/Ticket');
const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Ticket Service
 * Handles ticket generation, QR codes, validation, and delivery
 */
class TicketService {
  constructor() {
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

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
      const ticket = await Ticket.findById(ticketId);

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
        ticketNumber: ticketData.ticketNumber,
      }).populate('poiId');

      if (!ticket) {
        return {
          valid: false,
          reason: 'Ticket not found',
        };
      }

      // Verify POI match
      if (ticket.poiId._id.toString() !== poiId) {
        return {
          valid: false,
          reason: 'Ticket not valid for this location',
        };
      }

      // Validate ticket
      try {
        await ticket.validateTicket(validatorDeviceId, poiId);

        logger.info(`Ticket validated: ${ticket.ticketNumber}`);

        return {
          valid: true,
          ticket: {
            ticketNumber: ticket.ticketNumber,
            holder: ticket.holder.name,
            poiName: ticket.details.productName,
            validFrom: ticket.validity.validFrom,
            validUntil: ticket.validity.validUntil,
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
   * Send tickets to user via email
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

      // Send email
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || '"HolidaiButler" <tickets@holidaibutler.com>',
        to: email,
        subject: `Your HolidaiButler Tickets - ${tickets[0].details.productName}`,
        html: this._generateTicketEmailHTML(tickets),
        attachments: [
          {
            filename: `tickets-${tickets[0].bookingId}.pdf`,
            path: pdfPath,
          },
        ],
      });

      // Clean up temporary PDF
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }

      logger.info(`Tickets sent to ${email}`);
    } catch (error) {
      logger.error('Error sending tickets:', error);
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
      const query = { userId };

      if (status) {
        query.status = status;
      }

      const tickets = await Ticket.find(query)
        .populate('poiId', 'name location images')
        .sort({ 'validity.validFrom': -1 });

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
        const ticket = await Ticket.findById(ticketId);
        if (ticket) {
          await ticket.cancelTicket(reason);
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
      const ticket = await Ticket.findById(ticketId).populate('poiId');

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // TODO: Implement Apple Wallet / Google Pay pass generation
      // This requires PassKit for Apple and Google Wallet API for Google

      const passUrl = `${process.env.API_URL}/api/v1/tickets/${ticketId}/wallet/${walletType}`;

      if (walletType === 'apple') {
        ticket.wallet.appleWalletUrl = passUrl;
      } else {
        ticket.wallet.googlePayUrl = passUrl;
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
    const qrCodeData = await this.generateQRCode(booking._id.toString() + '-' + sequenceNumber);

    const ticket = new Ticket({
      bookingId: booking._id,
      userId: booking.userId,
      poiId: booking.poiId,
      type: booking.experience.productType === 'tour' ? 'guided-tour' : 'single',
      validity: {
        validFrom: booking.details.date,
        validUntil: new Date(booking.details.date.getTime() + 24 * 60 * 60 * 1000), // +1 day
        timeslot: booking.details.time,
        timezone: 'Europe/Amsterdam',
      },
      qrCode: {
        data: qrCodeData.data,
        imageUrl: qrCodeData.imageUrl,
        format: 'QR',
      },
      holder: {
        name: booking.guestInfo.name,
        email: booking.guestInfo.email,
        phone: booking.guestInfo.phone,
      },
      details: {
        productName: booking.poiId.name || 'Experience',
        description: booking.poiId.description || '',
        quantity: 1,
        language: booking.experience.language || 'en',
      },
      status: 'active',
      metadata: {
        source: booking.metadata.source,
      },
    });

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
      poiId: ticket.poiId.toString(),
      validFrom: ticket.validity.validFrom.toISOString(),
      validUntil: ticket.validity.validUntil.toISOString(),
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
      doc.text(`Product: ${ticket.details.productName}`);
      doc.text(`Holder: ${ticket.holder.name}`);
      doc.text(`Date: ${ticket.validity.validFrom.toLocaleDateString()}`);
      if (ticket.validity.timeslot) {
        doc.text(`Time: ${ticket.validity.timeslot}`);
      }
      doc.moveDown();

      // QR Code (placeholder - in production, embed actual QR image)
      doc.text('[QR CODE PLACEHOLDER]', { align: 'center' });
      doc.text(`(Scan code: ${ticket.qrCode.data.substring(0, 20)}...)`, { align: 'center', fontSize: 8 });
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

        <p>Dear ${firstTicket.holder.name},</p>

        <p>Thank you for booking with HolidaiButler! Your tickets for <strong>${firstTicket.details.productName}</strong> are attached to this email.</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Number of Tickets:</strong> ${tickets.length}</p>
          <p><strong>Date:</strong> ${firstTicket.validity.validFrom.toLocaleDateString()}</p>
          ${firstTicket.validity.timeslot ? `<p><strong>Time:</strong> ${firstTicket.validity.timeslot}</p>` : ''}
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
