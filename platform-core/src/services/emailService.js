/**
 * Email Service - Nodemailer SMTP Integration
 * Handles transactional emails (welcome, verification, password reset, etc.)
 * Uses SMTP relay via Hetzner mail server (port 587) for reliable delivery.
 */

import { createTransport } from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'info@holidaibutler.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'HolidaiButler';
    this.baseUrl = process.env.ADMIN_PORTAL_URL || 'https://admin.holidaibutler.com';

    // SMTP relay via Hetzner mail server (port 587 STARTTLS)
    // Port 25 is blocked by Hetzner — port 587 works for authenticated SMTP
    this.transporter = createTransport({
      host: process.env.SMTP_HOST || 'www672.your-server.de',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // STARTTLS (not implicit TLS)
      auth: {
        user: process.env.SMTP_USER || 'info@holidaibutler.com',
        pass: process.env.SMTP_PASS || ''
      },
      tls: {
        rejectUnauthorized: true
      }
    });

    const configured = !!(process.env.SMTP_PASS || '');
    logger.info(`Email service initialized (SMTP relay ${configured ? 'configured' : 'NOT CONFIGURED — set SMTP_PASS'})`);
  }

  /**
   * Send email via nodemailer SMTP
   * @param {Object} options - Email options
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail({ to, toName, subject, html, text }) {
    try {
      if (!this.transporter.options.auth.pass) {
        logger.warn('Email not sent — SMTP_PASS not configured', { to, subject });
        console.warn(`[EmailService] SKIPPED (no SMTP_PASS): ${to} — ${subject}`);
        return { success: false, error: 'SMTP_PASS not configured' };
      }

      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: toName ? `"${toName}" <${to}>` : to,
        subject,
        html,
        text
      });

      logger.info('Email sent successfully', { to, subject, messageId: info.messageId });
      console.log(`[EmailService] Email sent to ${to}: ${subject} (${info.messageId || 'OK'})`);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      logger.error('Email send error:', error);
      console.error(`[EmailService] Email FAILED for ${to}:`, error.message);
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
    const year = new Date().getFullYear();

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a87 100%);padding:40px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:28px;font-weight:600;">HolidaiButler</h1>
<p style="color:#a0c4e8;margin:10px 0 0 0;font-size:14px;">Admin Portal</p>
</td></tr>
<tr><td style="padding:40px;">
<h2 style="color:#1e3a5f;margin:0 0 20px 0;font-size:24px;">Welkom${user.name ? `, ${user.name}` : ''}!</h2>
<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Bevestig je e-mailadres door op de onderstaande knop te klikken.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
<tr><td align="center"><a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37 0%,#c9a227 100%);color:#1e3a5f;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:600;font-size:16px;">Bevestig e-mailadres</a></td></tr>
</table>
<p style="color:#718096;font-size:14px;line-height:1.6;margin:20px 0 0 0;">Of kopieer deze link:<br><a href="${verifyUrl}" style="color:#2d5a87;word-break:break-all;">${verifyUrl}</a></p>
<p style="color:#718096;font-size:14px;margin:20px 0 0 0;">Deze link is 24 uur geldig.</p>
</td></tr>
<tr><td style="background-color:#f7fafc;padding:30px 40px;text-align:center;">
<p style="color:#718096;font-size:14px;margin:0;">&copy; ${year} HolidaiButler. Alle rechten voorbehouden.</p>
</td></tr>
</table>
</td></tr></table></body></html>`;

    return this.sendEmail({
      to: user.email,
      toName: user.name,
      subject: 'Bevestig je e-mailadres - HolidaiButler',
      html,
      text: `Welkom${user.name ? `, ${user.name}` : ''}!\n\nBevestig je e-mailadres via: ${verifyUrl}\n\nDeze link is 24 uur geldig.`
    });
  }

  /**
   * Send password reset email
   * @param {Object} user - User object with email, name
   * @param {string} token - Reset token
   */
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${this.baseUrl}/reset-password?token=${token}`;
    const year = new Date().getFullYear();

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a87 100%);padding:40px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:28px;font-weight:600;">HolidaiButler</h1>
</td></tr>
<tr><td style="padding:40px;">
<h2 style="color:#1e3a5f;margin:0 0 20px 0;font-size:24px;">Wachtwoord resetten</h2>
<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Klik op de onderstaande knop om een nieuw wachtwoord in te stellen.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
<tr><td align="center"><a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37 0%,#c9a227 100%);color:#1e3a5f;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:600;font-size:16px;">Wachtwoord resetten</a></td></tr>
</table>
<p style="color:#718096;font-size:14px;line-height:1.6;margin:20px 0 0 0;">Of kopieer deze link:<br><a href="${resetUrl}" style="color:#2d5a87;word-break:break-all;">${resetUrl}</a></p>
<p style="color:#718096;font-size:14px;margin:20px 0 0 0;">Deze link is 1 uur geldig.</p>
</td></tr>
<tr><td style="background-color:#f7fafc;padding:30px 40px;text-align:center;">
<p style="color:#718096;font-size:14px;margin:0;">&copy; ${year} HolidaiButler. Alle rechten voorbehouden.</p>
</td></tr>
</table>
</td></tr></table></body></html>`;

    return this.sendEmail({
      to: user.email,
      toName: user.name,
      subject: 'Wachtwoord resetten - HolidaiButler',
      html,
      text: `Wachtwoord resetten\n\nReset je wachtwoord via: ${resetUrl}\n\nDeze link is 1 uur geldig.`
    });
  }

  /**
   * Check if email service is configured
   */
  isConfigured() {
    return !!(this.transporter.options.auth && this.transporter.options.auth.pass);
  }
}

// Singleton instance
const emailService = new EmailService();

export default emailService;
