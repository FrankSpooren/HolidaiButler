const { PKPass } = require('passkit-generator');
const { Pass } = require('@walletpass/pass-js');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const QRCode = require('qrcode');

/**
 * Wallet Service
 * Handles Apple Wallet (PKPass) and Google Pay pass generation
 * Phase 2: Week 11-12 - Digital Wallet Integration
 */
class WalletService {
  constructor() {
    // Apple Wallet configuration
    this.applePassTypeId = process.env.APPLE_PASS_TYPE_ID || 'pass.com.holidaibutler.ticket';
    this.appleTeamId = process.env.APPLE_TEAM_ID || '';
    this.appleCertPath = process.env.APPLE_CERT_PATH || path.join(__dirname, '../certs/apple');

    // Google Pay configuration
    this.googleIssuerId = process.env.GOOGLE_ISSUER_ID || '';
    this.googleServiceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../certs/google/service-account.json');

    // Storage
    this.passStoragePath = process.env.PASS_STORAGE_PATH || '/tmp/wallet-passes';

    // Ensure storage directory exists
    if (!fs.existsSync(this.passStoragePath)) {
      fs.mkdirSync(this.passStoragePath, { recursive: true });
    }
  }

  /**
   * Generate Apple Wallet PKPass for ticket
   * @param {Object} ticket - Ticket object from database
   * @returns {Promise<Object>} Pass URL and file path
   */
  async generateApplePass(ticket) {
    try {
      logger.info(`Generating Apple Wallet pass for ticket ${ticket.ticketNumber}`);

      // Check if certificates exist
      const certPath = path.join(this.appleCertPath, 'signerCert.pem');
      const keyPath = path.join(this.appleCertPath, 'signerKey.pem');
      const wwdrPath = path.join(this.appleCertPath, 'wwdr.pem');

      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        logger.warn('Apple Wallet certificates not found. Skipping pass generation.');
        return {
          success: false,
          error: 'Apple Wallet certificates not configured',
        };
      }

      // Generate QR code for pass
      const qrCodeBuffer = await QRCode.toBuffer(ticket.qrCodeData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 400,
      });

      // Create pass
      const pass = new PKPass({
        'pass.json': {
          formatVersion: 1,
          passTypeIdentifier: this.applePassTypeId,
          serialNumber: ticket.ticketNumber,
          teamIdentifier: this.appleTeamId,
          organizationName: 'HolidaiButler',
          description: ticket.productName,
          logoText: 'HolidaiButler',
          foregroundColor: 'rgb(255, 255, 255)',
          backgroundColor: 'rgb(33, 150, 243)',
          labelColor: 'rgb(255, 255, 255)',

          // Event ticket type
          eventTicket: {
            primaryFields: [
              {
                key: 'event',
                label: 'EVENT',
                value: ticket.productName,
              },
            ],
            secondaryFields: [
              {
                key: 'holder',
                label: 'HOLDER',
                value: ticket.holderName,
              },
              {
                key: 'date',
                label: 'DATE',
                value: ticket.validFrom.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
                dateStyle: 'PKDateStyleShort',
              },
            ],
            auxiliaryFields: [
              {
                key: 'time',
                label: 'TIME',
                value: ticket.timeslot || 'All day',
              },
              {
                key: 'ticketNumber',
                label: 'TICKET',
                value: ticket.ticketNumber,
              },
            ],
            backFields: [
              {
                key: 'terms',
                label: 'TERMS AND CONDITIONS',
                value: 'Please present this ticket at the entrance. Valid for one person.',
              },
              {
                key: 'contact',
                label: 'CONTACT',
                value: 'support@holidaibutler.com',
              },
            ],
          },

          // Barcode (QR code)
          barcode: {
            message: ticket.qrCodeData,
            format: 'PKBarcodeFormatQR',
            messageEncoding: 'iso-8859-1',
          },

          // Validity
          relevantDate: ticket.validFrom.toISOString(),
          expirationDate: ticket.validUntil.toISOString(),

          // Visual appearance
          suppressStripShine: false,
        },
      }, {
        signerCert: fs.readFileSync(certPath),
        signerKey: fs.readFileSync(keyPath),
        wwdr: fs.existsSync(wwdrPath) ? fs.readFileSync(wwdrPath) : undefined,
        signerKeyPassphrase: process.env.APPLE_KEY_PASSPHRASE || '',
      });

      // Add logo (if exists)
      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        pass.addBuffer('logo.png', fs.readFileSync(logoPath));
        pass.addBuffer('logo@2x.png', fs.readFileSync(logoPath));
      }

      // Add icon (if exists)
      const iconPath = path.join(__dirname, '../assets/icon.png');
      if (fs.existsSync(iconPath)) {
        pass.addBuffer('icon.png', fs.readFileSync(iconPath));
        pass.addBuffer('icon@2x.png', fs.readFileSync(iconPath));
      }

      // Generate pass file
      const passBuffer = pass.getAsBuffer();
      const passFileName = `apple-pass-${ticket.ticketNumber}.pkpass`;
      const passFilePath = path.join(this.passStoragePath, passFileName);

      fs.writeFileSync(passFilePath, passBuffer);

      logger.info(`Apple Wallet pass generated: ${passFilePath}`);

      return {
        success: true,
        passUrl: `${process.env.API_URL}/api/v1/tickets/${ticket.id}/wallet/apple/download`,
        filePath: passFilePath,
        fileName: passFileName,
      };
    } catch (error) {
      logger.error('Error generating Apple Wallet pass:', error);
      throw error;
    }
  }

  /**
   * Generate Google Pay pass for ticket
   * @param {Object} ticket - Ticket object from database
   * @returns {Promise<Object>} Pass URL and JWT
   */
  async generateGooglePass(ticket) {
    try {
      logger.info(`Generating Google Pay pass for ticket ${ticket.ticketNumber}`);

      // Check if service account exists
      if (!fs.existsSync(this.googleServiceAccountPath)) {
        logger.warn('Google Pay service account not found. Skipping pass generation.');
        return {
          success: false,
          error: 'Google Pay service account not configured',
        };
      }

      // Load service account credentials
      const credentials = JSON.parse(fs.readFileSync(this.googleServiceAccountPath, 'utf-8'));

      // Create pass object definition
      const passObject = {
        id: `${this.googleIssuerId}.${ticket.ticketNumber}`,
        classId: `${this.googleIssuerId}.event-ticket-class`,
        state: 'ACTIVE',

        // Ticket holder
        ticketHolderName: ticket.holderName,

        // Event details
        eventName: {
          defaultValue: {
            language: 'en',
            value: ticket.productName,
          },
        },

        // Date and time
        eventDate: {
          start: ticket.validFrom.toISOString(),
          end: ticket.validUntil.toISOString(),
        },

        // Barcode (QR code)
        barcode: {
          type: 'QR_CODE',
          value: ticket.qrCodeData,
        },

        // Ticket information
        ticketNumber: ticket.ticketNumber,

        // Visual
        heroImage: {
          sourceUri: {
            uri: 'https://holidaibutler.com/images/hero.png',
          },
        },

        logo: {
          sourceUri: {
            uri: 'https://holidaibutler.com/images/logo.png',
          },
        },

        // Messages
        textModulesData: [
          {
            header: 'Important Information',
            body: 'Please present this ticket at the entrance. Valid for one person.',
            id: 'terms',
          },
        ],
      };

      // Create JWT for "Add to Google Pay" button
      const pass = new Pass({
        model: passObject,
        issuer: {
          id: this.googleIssuerId,
          email: credentials.client_email,
          privateKey: credentials.private_key,
        },
      });

      const jwt = await pass.sign();

      // Generate "Add to Google Pay" URL
      const googlePayUrl = `https://pay.google.com/gp/v/save/${jwt}`;

      logger.info(`Google Pay pass generated for ticket ${ticket.ticketNumber}`);

      return {
        success: true,
        passUrl: googlePayUrl,
        jwt: jwt,
      };
    } catch (error) {
      logger.error('Error generating Google Pay pass:', error);
      throw error;
    }
  }

  /**
   * Generate both Apple and Google wallet passes
   * @param {Object} ticket - Ticket object
   * @returns {Promise<Object>} Both pass URLs
   */
  async generateBothPasses(ticket) {
    const results = {
      apple: null,
      google: null,
    };

    try {
      results.apple = await this.generateApplePass(ticket);
    } catch (error) {
      logger.error('Failed to generate Apple pass:', error);
      results.apple = { success: false, error: error.message };
    }

    try {
      results.google = await this.generateGooglePass(ticket);
    } catch (error) {
      logger.error('Failed to generate Google pass:', error);
      results.google = { success: false, error: error.message };
    }

    return results;
  }

  /**
   * Update wallet pass (for pass updates/notifications)
   * @param {String} ticketId - Ticket ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Boolean>}
   */
  async updatePass(ticketId, updates) {
    try {
      // TODO: Implement pass update logic
      // This would trigger push notifications to wallet apps
      logger.info(`Pass update requested for ticket ${ticketId}`);
      return true;
    } catch (error) {
      logger.error('Error updating pass:', error);
      throw error;
    }
  }

  /**
   * Get pass file for download
   * @param {String} ticketNumber - Ticket number
   * @param {String} walletType - 'apple' or 'google'
   * @returns {Promise<String>} File path
   */
  async getPassFile(ticketNumber, walletType) {
    if (walletType === 'apple') {
      const fileName = `apple-pass-${ticketNumber}.pkpass`;
      const filePath = path.join(this.passStoragePath, fileName);

      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    throw new Error('Pass file not found');
  }
}

module.exports = new WalletService();
