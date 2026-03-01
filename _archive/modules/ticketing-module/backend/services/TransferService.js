/**
 * TransferService - Handles ticket transfer functionality
 * Allows users to transfer tickets to other people
 */

const { Ticket, Booking, TicketTransfer } = require('../models');
const TicketService = require('./TicketService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class TransferService {
  /**
   * Transfer a ticket to a new holder
   * @param {string} ticketId - The ticket ID to transfer
   * @param {string} currentUserId - The current owner's user ID
   * @param {Object} recipientData - The recipient's information
   * @returns {Object} Transfer result
   */
  static async transferTicket(ticketId, currentUserId, recipientData) {
    const { recipientFirstName, recipientLastName, recipientEmail } = recipientData;

    // Find the ticket
    const ticket = await Ticket.findByPk(ticketId, {
      include: [{ model: Booking, as: 'booking' }],
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Verify ownership
    if (ticket.userId !== currentUserId) {
      throw new Error('You do not own this ticket');
    }

    // Check if ticket can be transferred
    if (ticket.status !== 'active' && ticket.status !== 'valid') {
      throw new Error('Only active tickets can be transferred');
    }

    if (ticket.isUsed) {
      throw new Error('Used tickets cannot be transferred');
    }

    if (ticket.isTransferred) {
      throw new Error('This ticket has already been transferred once');
    }

    // Check if event date has passed
    const eventDate = ticket.validUntil ? new Date(ticket.validUntil) : null;
    if (eventDate && eventDate < new Date()) {
      throw new Error('Cannot transfer ticket for past events');
    }

    // Store original holder info
    const originalHolder = ticket.holderName || `${ticket.holderFirstName} ${ticket.holderLastName}`;
    const originalEmail = ticket.holderEmail;

    // Create transfer record
    const transfer = await TicketTransfer.create({
      id: uuidv4(),
      ticketId: ticket.id,
      fromUserId: currentUserId,
      fromName: originalHolder,
      fromEmail: originalEmail,
      toName: `${recipientFirstName} ${recipientLastName}`,
      toEmail: recipientEmail,
      transferredAt: new Date(),
      status: 'completed',
    });

    // Update ticket with new holder information
    await ticket.update({
      holderName: `${recipientFirstName} ${recipientLastName}`,
      holderFirstName: recipientFirstName,
      holderLastName: recipientLastName,
      holderEmail: recipientEmail,
      isTransferred: true,
      originalHolder: originalHolder,
      transferredAt: new Date(),
      // Generate new QR code for new holder
      qrCode: null, // Will be regenerated
      validationCode: uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase(),
    });

    // Generate new QR code for the transferred ticket
    await TicketService.generateQRCode(ticket.id);

    // Send ticket to new holder
    try {
      await TicketService.sendTicketsToUser([ticket], recipientEmail);
      logger.info(`Transfer notification sent to ${recipientEmail} for ticket ${ticket.ticketNumber}`);
    } catch (emailError) {
      logger.error('Failed to send transfer notification email:', emailError);
      // Don't fail the transfer if email fails
    }

    // Notify original holder
    try {
      await this._sendTransferConfirmation(originalEmail, {
        ticketNumber: ticket.ticketNumber,
        eventName: ticket.productName,
        recipientName: `${recipientFirstName} ${recipientLastName}`,
        recipientEmail: recipientEmail,
      });
    } catch (emailError) {
      logger.error('Failed to send transfer confirmation to original holder:', emailError);
    }

    logger.info(`Ticket ${ticket.ticketNumber} transferred from ${originalEmail} to ${recipientEmail}`);

    return {
      success: true,
      transfer: {
        id: transfer.id,
        ticketNumber: ticket.ticketNumber,
        fromName: originalHolder,
        toName: `${recipientFirstName} ${recipientLastName}`,
        toEmail: recipientEmail,
        transferredAt: transfer.transferredAt,
      },
    };
  }

  /**
   * Get transfer history for a ticket
   * @param {string} ticketId - The ticket ID
   * @returns {Array} Transfer history
   */
  static async getTransferHistory(ticketId) {
    const transfers = await TicketTransfer.findAll({
      where: { ticketId },
      order: [['transferredAt', 'DESC']],
    });

    return transfers;
  }

  /**
   * Validate if a ticket can be transferred
   * @param {string} ticketId - The ticket ID
   * @param {string} userId - The user ID
   * @returns {Object} Validation result
   */
  static async canTransfer(ticketId, userId) {
    const ticket = await Ticket.findByPk(ticketId);

    if (!ticket) {
      return { canTransfer: false, reason: 'Ticket not found' };
    }

    if (ticket.userId !== userId) {
      return { canTransfer: false, reason: 'You do not own this ticket' };
    }

    if (ticket.status !== 'active' && ticket.status !== 'valid') {
      return { canTransfer: false, reason: 'Ticket is not active' };
    }

    if (ticket.isUsed) {
      return { canTransfer: false, reason: 'Ticket has been used' };
    }

    if (ticket.isTransferred) {
      return { canTransfer: false, reason: 'Ticket has already been transferred' };
    }

    const eventDate = ticket.validUntil ? new Date(ticket.validUntil) : null;
    if (eventDate && eventDate < new Date()) {
      return { canTransfer: false, reason: 'Event has already passed' };
    }

    return { canTransfer: true };
  }

  /**
   * Send transfer confirmation email to original holder
   * @param {string} email - Original holder's email
   * @param {Object} data - Transfer data
   */
  static async _sendTransferConfirmation(email, data) {
    const MailerLite = require('@mailerlite/mailerlite-nodejs').default;

    if (!process.env.MAILERLITE_API_KEY) {
      logger.warn('MailerLite API key not configured, skipping transfer confirmation email');
      return;
    }

    const mailer = new MailerLite({ api_key: process.env.MAILERLITE_API_KEY });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f5f5f5; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ticket Overgedragen</h1>
          </div>
          <div class="content">
            <p>Je ticket is succesvol overgedragen.</p>

            <div class="details">
              <p><strong>Ticket nummer:</strong> ${data.ticketNumber}</p>
              <p><strong>Evenement:</strong> ${data.eventName}</p>
              <p><strong>Overgedragen aan:</strong> ${data.recipientName}</p>
              <p><strong>E-mail:</strong> ${data.recipientEmail}</p>
            </div>

            <p>De nieuwe tickethouder heeft een e-mail ontvangen met het ticket.</p>
            <p>Je hebt zelf geen toegang meer tot dit ticket.</p>
          </div>
          <div class="footer">
            <p>HolidaiButler - Jouw vakantiepartner</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await mailer.emails.send({
      from: {
        email: 'tickets@holidaibutler.com',
        name: 'HolidaiButler',
      },
      to: [{ email }],
      subject: `Ticket overgedragen - ${data.ticketNumber}`,
      html: htmlContent,
    });
  }
}

module.exports = TransferService;
