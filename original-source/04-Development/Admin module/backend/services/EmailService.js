/**
 * EmailService - MailerSend Integration
 * HolidaiButler Admin Module
 *
 * Handles transactional emails for admin notifications:
 * - POI approval/rejection notifications
 * - Welcome emails for new admin users
 * - Password reset emails
 * - Weekly digests for platform admin
 *
 * IMPORTANT: Separate from consumer-facing campaigns (use MailerLite for marketing)
 * Uses MailerSend Transactional Email API
 */

import dotenv from 'dotenv';
dotenv.config();

class EmailService {
  constructor() {
    this.apiKey = process.env.MAILERSEND_API_KEY;
    this.apiUrl = process.env.MAILERSEND_API_URL || 'https://api.mailersend.com/v1';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@holidaibutler.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'HolidaiButler Admin';
    this.platformUrl = process.env.EMAIL_PLATFORM_URL || 'http://localhost:5174';
    this.logoUrl = process.env.EMAIL_LOGO_URL || 'https://holidaibutler.com/logo.png';
  }

  /**
   * Send email via MailerSend API
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text fallback (optional)
   * @returns {Promise<Object>} - Response from MailerSend API
   */
  async sendEmail({ to, subject, html, text = null }) {
    try {
      // MailerSend Transactional Email API endpoint
      const url = `${this.apiUrl}/email`;

      // MailerSend API payload format
      const payload = {
        from: {
          email: this.fromAddress,
          name: this.fromName
        },
        to: [
          {
            email: to
          }
        ],
        subject: subject,
        html: html,
        text: text || this._stripHtml(html) // Auto-generate plain text if not provided
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`MailerSend API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      // MailerSend returns 202 Accepted with empty body for successful sends
      let data = {};
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          // 202 with no body is success
          data = { status: 'accepted' };
        }
      } else {
        data = { status: 'accepted' };
      }

      console.log(`✅ Email sent successfully to ${to}: "${subject}"`);

      return {
        success: true,
        messageId: data.data?.id || data.id || `sent-${Date.now()}`,
        data: data
      };

    } catch (error) {
      console.error('❌ Email send failed:', error.message);

      // Don't throw - log error and return failure status
      // This prevents email failures from breaking critical flows
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Strip HTML tags for plain text fallback
   */
  _stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get base email template wrapper
   */
  _getEmailTemplate(content, title = 'HolidaiButler Admin') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      text-align: center;
    }
    .email-header img {
      max-width: 150px;
      height: auto;
    }
    .email-body {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .email-footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
      border-top: 1px solid #e0e0e0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #667eea;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      background-color: #5568d3;
    }
    h1 {
      color: #ffffff;
      margin: 20px 0 0 0;
      font-size: 24px;
    }
    h2 {
      color: #333333;
      margin-top: 0;
      font-size: 20px;
    }
    .info-box {
      background-color: #f0f4ff;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success-box {
      background-color: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .danger-box {
      background-color: #f8d7da;
      border-left: 4px solid #dc3545;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>HolidaiButler Admin</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>This is an automated message from HolidaiButler Admin System</p>
      <p>Need help? Contact us at <a href="mailto:${process.env.EMAIL_ADMIN_SUPPORT}">${process.env.EMAIL_ADMIN_SUPPORT}</a></p>
      <p style="margin-top: 15px; color: #999999; font-size: 11px;">
        © ${new Date().getFullYear()} HolidaiButler. All rights reserved.<br>
        This email was sent to you as part of your admin account management.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * PRIORITY 1: Send POI Approval Notification
   * Sent to POI owner when their POI is approved
   */
  async sendPOIApprovalNotification({ poiName, poiId, ownerEmail, ownerName, approvedBy }) {
    const content = `
      <h2>🎉 Your POI has been Approved!</h2>
      <p>Hello${ownerName ? ' ' + ownerName : ''},</p>
      <p>Great news! Your Point of Interest has been reviewed and approved.</p>

      <div class="success-box">
        <strong>POI Name:</strong> ${poiName}<br>
        <strong>Status:</strong> ✅ Approved<br>
        <strong>Approved by:</strong> ${approvedBy}
      </div>

      <p>Your POI is now visible to all HolidaiButler users and will appear in search results.</p>

      <a href="${this.platformUrl}/pois/${poiId}" class="button">View POI Details</a>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Thank you for contributing to the HolidaiButler platform!
      </p>
    `;

    return this.sendEmail({
      to: ownerEmail,
      subject: `✅ POI Approved: ${poiName}`,
      html: this._getEmailTemplate(content, 'POI Approved')
    });
  }

  /**
   * PRIORITY 1: Send POI Rejection Notification
   * Sent to POI owner when their POI is rejected
   */
  async sendPOIRejectionNotification({ poiName, poiId, ownerEmail, ownerName, rejectedBy, reason }) {
    const content = `
      <h2>📋 POI Review Update</h2>
      <p>Hello${ownerName ? ' ' + ownerName : ''},</p>
      <p>Your Point of Interest has been reviewed but requires some updates before approval.</p>

      <div class="warning-box">
        <strong>POI Name:</strong> ${poiName}<br>
        <strong>Status:</strong> ⏸️ Needs Revision<br>
        <strong>Reviewed by:</strong> ${rejectedBy}
      </div>

      ${reason ? `
      <div class="info-box">
        <strong>Feedback:</strong><br>
        ${reason}
      </div>
      ` : ''}

      <p>Please review the feedback and make the necessary updates. You can edit your POI and resubmit it for approval.</p>

      <a href="${this.platformUrl}/pois/${poiId}/edit" class="button">Edit POI</a>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Need help? Contact our support team for assistance.
      </p>
    `;

    return this.sendEmail({
      to: ownerEmail,
      subject: `📋 POI Needs Updates: ${poiName}`,
      html: this._getEmailTemplate(content, 'POI Review Update')
    });
  }

  /**
   * PRIORITY 2: Send Welcome Email to New Admin User
   * Sent when a new admin account is created
   */
  async sendWelcomeEmail({ email, firstName, lastName, role, tempPassword = null }) {
    const fullName = `${firstName} ${lastName}`.trim() || email;

    const content = `
      <h2>👋 Welcome to HolidaiButler Admin!</h2>
      <p>Hello ${firstName || 'there'},</p>
      <p>Your admin account has been successfully created. You now have access to the HolidaiButler Admin Platform.</p>

      <div class="info-box">
        <strong>Account Details:</strong><br>
        Email: ${email}<br>
        Role: ${this._formatRole(role)}<br>
        Status: Active
      </div>

      ${tempPassword ? `
      <div class="warning-box">
        <strong>⚠️ Temporary Password:</strong><br>
        <code style="font-size: 16px; background: #fff; padding: 5px 10px; border-radius: 3px;">${tempPassword}</code><br>
        <small>Please change this password after your first login for security.</small>
      </div>
      ` : ''}

      <a href="${this.platformUrl}/login" class="button">Login to Admin Panel</a>

      <p style="margin-top: 30px;">
        <strong>Getting Started:</strong>
      </p>
      <ul>
        <li>Log in to your admin account</li>
        <li>${tempPassword ? 'Change your temporary password' : 'Set up your profile'}</li>
        <li>Explore the admin dashboard</li>
        <li>Review your permissions and available features</li>
      </ul>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        If you have any questions, don't hesitate to reach out to our support team.
      </p>
    `;

    return this.sendEmail({
      to: email,
      subject: '👋 Welcome to HolidaiButler Admin!',
      html: this._getEmailTemplate(content, 'Welcome to HolidaiButler Admin')
    });
  }

  /**
   * PRIORITY 3: Send Password Reset Email
   * Sent when user requests password reset
   */
  async sendPasswordResetEmail({ email, resetToken, firstName = null }) {
    const resetUrl = `${this.platformUrl}/reset-password?token=${resetToken}`;

    const content = `
      <h2>🔑 Password Reset Request</h2>
      <p>Hello${firstName ? ' ' + firstName : ''},</p>
      <p>We received a request to reset your password for your HolidaiButler Admin account.</p>

      <div class="info-box">
        <strong>Account Email:</strong> ${email}
      </div>

      <p>Click the button below to reset your password. This link will expire in 1 hour for security reasons.</p>

      <a href="${resetUrl}" class="button">Reset Password</a>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Or copy and paste this link into your browser:<br>
        <code style="word-break: break-all; font-size: 12px;">${resetUrl}</code>
      </p>

      <div class="danger-box">
        <strong>⚠️ Security Notice:</strong><br>
        If you didn't request this password reset, please ignore this email and ensure your account is secure.
        Consider changing your password if you suspect unauthorized access.
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        For security reasons, this link will expire in 1 hour.
      </p>
    `;

    return this.sendEmail({
      to: email,
      subject: '🔑 Password Reset Request - HolidaiButler Admin',
      html: this._getEmailTemplate(content, 'Password Reset Request')
    });
  }

  /**
   * PRIORITY 4: Send Weekly Digest to Platform Admin
   * Sent every week with platform statistics
   */
  async sendWeeklyDigest({ adminEmail, adminName, stats }) {
    const {
      newPOIs = 0,
      pendingApprovals = 0,
      newUsers = 0,
      totalPOIs = 0,
      activePOIs = 0,
      topCategories = [],
      recentActivity = []
    } = stats;

    const content = `
      <h2>📊 Weekly Platform Digest</h2>
      <p>Hello ${adminName || 'Admin'},</p>
      <p>Here's your weekly summary of HolidaiButler platform activity.</p>

      <h3>📈 This Week's Highlights</h3>
      <div class="info-box">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>New POIs:</strong></td>
            <td style="text-align: right;">${newPOIs}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Pending Approvals:</strong></td>
            <td style="text-align: right;">${pendingApprovals}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>New Admin Users:</strong></td>
            <td style="text-align: right;">${newUsers}</td>
          </tr>
          <tr style="border-top: 1px solid #ddd;">
            <td style="padding: 8px 0;"><strong>Total Active POIs:</strong></td>
            <td style="text-align: right;"><strong>${activePOIs}</strong></td>
          </tr>
        </table>
      </div>

      ${pendingApprovals > 0 ? `
      <div class="warning-box">
        <strong>⏳ Action Required:</strong><br>
        You have ${pendingApprovals} POI${pendingApprovals > 1 ? 's' : ''} waiting for approval.
      </div>
      ` : ''}

      ${topCategories.length > 0 ? `
      <h3>🏆 Top Categories</h3>
      <ul>
        ${topCategories.map(cat => `<li><strong>${cat.name}:</strong> ${cat.count} POIs</li>`).join('')}
      </ul>
      ` : ''}

      <a href="${this.platformUrl}/dashboard" class="button">View Admin Dashboard</a>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        This is your automated weekly digest. You can adjust email preferences in your admin settings.
      </p>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `📊 Weekly Digest - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      html: this._getEmailTemplate(content, 'Weekly Platform Digest')
    });
  }

  /**
   * Helper: Format role names for display
   */
  _formatRole(role) {
    const roleMap = {
      'platform_admin': 'Platform Administrator',
      'admin': 'Administrator',
      'editor': 'Editor',
      'reviewer': 'Reviewer',
      'poi_owner': 'POI Owner'
    };
    return roleMap[role] || role;
  }

  /**
   * Test email connection
   * Sends a test email to verify MailerLite configuration
   */
  async testConnection(testEmail) {
    const content = `
      <h2>✅ Email System Test</h2>
      <p>This is a test email from the HolidaiButler Admin Email Service.</p>
      <div class="success-box">
        <strong>Status:</strong> MailerLite integration is working correctly!<br>
        <strong>Timestamp:</strong> ${new Date().toISOString()}
      </div>
      <p>If you received this email, your email configuration is set up properly.</p>
    `;

    return this.sendEmail({
      to: testEmail,
      subject: '✅ HolidaiButler Admin - Email Test',
      html: this._getEmailTemplate(content, 'Email Test')
    });
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
