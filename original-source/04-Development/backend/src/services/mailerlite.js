/**
 * MailerLite Email Service
 * =========================
 * GDPR-compliant email service using MailerLite API
 *
 * Features:
 * - Transactional emails (verification, password reset)
 * - Rate limiting built-in
 * - Error handling and logging
 * - GDPR audit logging
 *
 * EU AI Act Compliance: MailerLite is GDPR compliant (EU-based data processing)
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { query } = require('../config/database');

class MailerLiteService {
  constructor() {
    this.apiKey = process.env.MAILERLITE_API_KEY;
    this.apiUrl = process.env.MAILERLITE_API_URL || 'https://connect.mailerlite.com/api';
    this.fromEmail = process.env.MAILERLITE_FROM_EMAIL || 'noreply@holidaibutler.com';
    this.fromName = process.env.MAILERLITE_FROM_NAME || 'HolidAIbutler';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!this.apiKey) {
      logger.error('MAILERLITE_API_KEY not configured in environment');
    }
  }

  /**
   * Send a transactional email via MailerLite
   * @private
   */
  async sendTransactionalEmail(to, subject, htmlContent, textContent) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/email`,
        {
          from: {
            email: this.fromEmail,
            name: this.fromName
          },
          to: [{ email: to }],
          subject: subject,
          html: htmlContent,
          text: textContent
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      logger.info(`Email sent successfully to ${to}: ${subject}`);
      return { success: true, messageId: response.data?.id || 'unknown' };

    } catch (error) {
      logger.error('MailerLite email send error:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Log email verification activity (GDPR audit trail)
   * @private
   */
  async logVerificationEmail(userId, email, action, metadata = {}) {
    try {
      await query(
        `INSERT INTO Email_Verification_Logs
         (user_id, email, action, metadata, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, email, action, JSON.stringify(metadata)]
      );
    } catch (error) {
      logger.error('Failed to log verification email:', error);
      // Don't throw - logging failure shouldn't break the flow
    }
  }

  /**
   * Send email verification email
   *
   * @param {string} email - Recipient email address
   * @param {string} token - Verification token
   * @param {number} userId - User ID for logging
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async sendVerificationEmail(email, token, userId) {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;

    const subject = 'Verify Your Email - HolidAIbutler';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0; text-align: center; background-color: #f4f4f4;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">HolidAIbutler</h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Your AI-Powered Travel Companion</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">Verify Your Email Address</h2>

              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Welcome to HolidAIbutler! We're excited to have you on board.
              </p>

              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                To get started, please verify your email address by clicking the button below:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <a href="${verificationUrl}"
                       style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>

              <p style="margin: 0 0 30px; color: #667eea; font-size: 14px; word-break: break-all; padding: 12px; background-color: #f8f9fa; border-radius: 4px; border-left: 3px solid #667eea;">
                ${verificationUrl}
              </p>

              <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                  <strong>⏰ Note:</strong> This verification link will expire in 24 hours.
                </p>
              </div>

              <p style="margin: 30px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                If you didn't create an account with HolidAIbutler, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center;">
                © 2025 HolidAIbutler. All rights reserved.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                🔒 GDPR Compliant | EU AI Act Compliant
              </p>
              <p style="margin: 10px 0 0; color: #999999; font-size: 12px; text-align: center;">
                <a href="${this.frontendUrl}/privacy" style="color: #667eea; text-decoration: none;">Privacy Policy</a> |
                <a href="${this.frontendUrl}/terms" style="color: #667eea; text-decoration: none;">Terms of Service</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
Verify Your Email - HolidAIbutler

Welcome to HolidAIbutler! We're excited to have you on board.

To get started, please verify your email address by visiting this link:
${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account with HolidAIbutler, please ignore this email.

---
© 2025 HolidAIbutler. All rights reserved.
GDPR Compliant | EU AI Act Compliant

Privacy Policy: ${this.frontendUrl}/privacy
Terms of Service: ${this.frontendUrl}/terms
    `;

    // Send email
    const result = await this.sendTransactionalEmail(email, subject, htmlContent, textContent);

    // Log for GDPR audit trail
    await this.logVerificationEmail(userId, email, 'verification_sent', {
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });

    return result;
  }

  /**
   * Send password reset email
   *
   * @param {string} email - Recipient email address
   * @param {string} token - Reset token
   * @param {number} userId - User ID for logging
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async sendPasswordResetEmail(email, token, userId) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const subject = 'Reset Your Password - HolidAIbutler';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0; text-align: center; background-color: #f4f4f4;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">HolidAIbutler</h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Your AI-Powered Travel Companion</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">Reset Your Password</h2>

              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password for your HolidAIbutler account.
              </p>

              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                Click the button below to reset your password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>

              <p style="margin: 0 0 30px; color: #667eea; font-size: 14px; word-break: break-all; padding: 12px; background-color: #f8f9fa; border-radius: 4px; border-left: 3px solid #667eea;">
                ${resetUrl}
              </p>

              <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                  <strong>⏰ Note:</strong> This password reset link will expire in 1 hour for security reasons.
                </p>
              </div>

              <div style="margin: 30px 0; padding: 20px; background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
                <p style="margin: 0; color: #721c24; font-size: 14px; line-height: 1.6;">
                  <strong>🔐 Security:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center;">
                © 2025 HolidAIbutler. All rights reserved.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                🔒 GDPR Compliant | EU AI Act Compliant
              </p>
              <p style="margin: 10px 0 0; color: #999999; font-size: 12px; text-align: center;">
                <a href="${this.frontendUrl}/privacy" style="color: #667eea; text-decoration: none;">Privacy Policy</a> |
                <a href="${this.frontendUrl}/terms" style="color: #667eea; text-decoration: none;">Terms of Service</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
Reset Your Password - HolidAIbutler

We received a request to reset your password for your HolidAIbutler account.

Click this link to reset your password:
${resetUrl}

This password reset link will expire in 1 hour for security reasons.

SECURITY: If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

---
© 2025 HolidAIbutler. All rights reserved.
GDPR Compliant | EU AI Act Compliant

Privacy Policy: ${this.frontendUrl}/privacy
Terms of Service: ${this.frontendUrl}/terms
    `;

    // Send email
    const result = await this.sendTransactionalEmail(email, subject, htmlContent, textContent);

    // Log for GDPR audit trail
    await this.logVerificationEmail(userId, email, 'password_reset_sent', {
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });

    return result;
  }

  /**
   * Check rate limiting for email verification
   * Prevents abuse by limiting to 3 emails per 15 minutes
   *
   * @param {number} userId - User ID to check
   * @returns {Promise<{allowed: boolean, remaining?: number, resetAt?: Date}>}
   */
  async checkVerificationRateLimit(userId) {
    const rateLimit = parseInt(process.env.EMAIL_VERIFICATION_RATE_LIMIT || '3');
    const windowMs = parseInt(process.env.EMAIL_VERIFICATION_RATE_WINDOW || '900000'); // 15 min

    try {
      // Count emails sent in the time window
      const result = await query(
        `SELECT COUNT(*) as count,
                MIN(created_at) as first_sent
         FROM Email_Verification_Logs
         WHERE user_id = ?
           AND action IN ('verification_sent', 'password_reset_sent')
           AND created_at > DATE_SUB(NOW(), INTERVAL ? MILLISECOND)`,
        [userId, windowMs]
      );

      const count = result[0]?.count || 0;

      if (count >= rateLimit) {
        const firstSent = new Date(result[0].first_sent);
        const resetAt = new Date(firstSent.getTime() + windowMs);

        return {
          allowed: false,
          remaining: 0,
          resetAt: resetAt
        };
      }

      return {
        allowed: true,
        remaining: rateLimit - count
      };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      // On error, allow the request (fail open for better UX)
      return { allowed: true, remaining: rateLimit };
    }
  }
}

// Export singleton instance
module.exports = new MailerLiteService();
