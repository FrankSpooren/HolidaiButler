/**
 * Email Service - MailerSend Integration
 * Handles transactional emails (verification, password reset, etc.)
 */

import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.apiKey = process.env.MAILERSEND_API_KEY;
    this.apiUrl = 'https://api.mailersend.com/v1';
    this.fromEmail = process.env.EMAIL_FROM || 'info@holidaibutler.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'HolidaiButler';
    this.baseUrl = process.env.FRONTEND_URL || 'https://test.holidaibutler.com';

    if (!this.apiKey) {
      logger.warn('MailerSend API key not configured - emails will not be sent');
    } else {
      logger.info('Email service initialized with MailerSend');
    }
  }

  /**
   * Send email via MailerSend API
   * @param {Object} options - Email options
   * @returns {Promise<Object>} - API response
   */
  async sendEmail({ to, toName, subject, html, text }) {
    if (!this.apiKey) {
      logger.warn('Email not sent - MailerSend API key not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          from: {
            email: this.fromEmail,
            name: this.fromName
          },
          to: [{
            email: to,
            name: toName || to
          }],
          subject,
          html,
          text
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('MailerSend API error:', {
          status: response.status,
          error: errorData
        });
        return { success: false, error: errorData };
      }

      logger.info('Email sent successfully', { to, subject });
      return { success: true };

    } catch (error) {
      logger.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email verification email
   * @param {Object} user - User object with email, name
   * @param {string} token - Verification token
   */
  async sendVerificationEmail(user, token) {
    const verifyUrl = `${this.baseUrl}/verify-email?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bevestig je e-mailadres</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">HolidaiButler</h1>
              <p style="color: #a0c4e8; margin: 10px 0 0 0; font-size: 14px;">Je persoonlijke reisgids voor Calpe</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 24px;">Welkom${user.name ? `, ${user.name}` : ''}!</h2>

              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bedankt voor je registratie bij HolidaiButler. Om je account te activeren, bevestig je e-mailadres door op de onderstaande knop te klikken.
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #c9a227 100%); color: #1e3a5f; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Bevestig e-mailadres
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Of kopieer deze link naar je browser:<br>
                <a href="${verifyUrl}" style="color: #2d5a87; word-break: break-all;">${verifyUrl}</a>
              </p>

              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Deze link is 24 uur geldig.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

              <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                Heb je geen account aangemaakt? Dan kun je deze e-mail negeren.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 30px 40px; text-align: center;">
              <p style="color: #718096; font-size: 14px; margin: 0;">
                © ${new Date().getFullYear()} HolidaiButler. Alle rechten voorbehouden.
              </p>
              <p style="color: #a0aec0; font-size: 12px; margin: 10px 0 0 0;">
                Calpe, Costa Blanca, Spanje
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `
Welkom${user.name ? `, ${user.name}` : ''}!

Bedankt voor je registratie bij HolidaiButler.

Bevestig je e-mailadres via deze link:
${verifyUrl}

Deze link is 24 uur geldig.

Heb je geen account aangemaakt? Dan kun je deze e-mail negeren.

---
HolidaiButler - Je persoonlijke reisgids voor Calpe
`;

    return this.sendEmail({
      to: user.email,
      toName: user.name,
      subject: 'Bevestig je e-mailadres - HolidaiButler',
      html,
      text
    });
  }

  /**
   * Send password reset email
   * @param {Object} user - User object with email, name
   * @param {string} token - Reset token
   */
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${this.baseUrl}/reset-password?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wachtwoord resetten</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">HolidaiButler</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 24px;">Wachtwoord resetten</h2>

              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We hebben een verzoek ontvangen om je wachtwoord te resetten. Klik op de onderstaande knop om een nieuw wachtwoord in te stellen.
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #c9a227 100%); color: #1e3a5f; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Wachtwoord resetten
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Of kopieer deze link naar je browser:<br>
                <a href="${resetUrl}" style="color: #2d5a87; word-break: break-all;">${resetUrl}</a>
              </p>

              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Deze link is 1 uur geldig.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

              <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                Heb je geen wachtwoord reset aangevraagd? Dan kun je deze e-mail negeren. Je wachtwoord blijft ongewijzigd.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 30px 40px; text-align: center;">
              <p style="color: #718096; font-size: 14px; margin: 0;">
                © ${new Date().getFullYear()} HolidaiButler. Alle rechten voorbehouden.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `
Wachtwoord resetten

We hebben een verzoek ontvangen om je wachtwoord te resetten.

Reset je wachtwoord via deze link:
${resetUrl}

Deze link is 1 uur geldig.

Heb je geen wachtwoord reset aangevraagd? Dan kun je deze e-mail negeren.

---
HolidaiButler
`;

    return this.sendEmail({
      to: user.email,
      toName: user.name,
      subject: 'Wachtwoord resetten - HolidaiButler',
      html,
      text
    });
  }

  /**
   * Check if email service is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }
}

// Singleton instance
const emailService = new EmailService();

export default emailService;
