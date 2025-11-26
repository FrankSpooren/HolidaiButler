/**
 * Email Service - Enterprise Email Management
 * Professional email templates for CRM communications
 */

import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.defaultFrom = process.env.EMAIL_FROM || 'Sales Pipeline <noreply@holidaibutler.com>';
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100
      });

      await this.transporter.verify();
      this.initialized = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Send email with template
   */
  async send({ to, subject, template, data, attachments = [] }) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const html = this.renderTemplate(template, data);

      const result = await this.transporter.sendMail({
        from: this.defaultFrom,
        to,
        subject,
        html,
        attachments
      });

      logger.info('Email sent successfully', { to, subject, messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Render email template
   */
  renderTemplate(template, data = {}) {
    const templates = {
      // Welcome email for new users
      welcome: this.welcomeTemplate(data),

      // Password reset email
      passwordReset: this.passwordResetTemplate(data),

      // Task reminder
      taskReminder: this.taskReminderTemplate(data),

      // Deal stage change notification
      dealStageChange: this.dealStageChangeTemplate(data),

      // Lead assignment notification
      leadAssigned: this.leadAssignedTemplate(data),

      // Meeting reminder
      meetingReminder: this.meetingReminderTemplate(data),

      // Weekly summary report
      weeklySummary: this.weeklySummaryTemplate(data),

      // Deal won celebration
      dealWon: this.dealWonTemplate(data),

      // Follow-up reminder
      followUpReminder: this.followUpReminderTemplate(data)
    };

    return templates[template] || this.defaultTemplate(data);
  }

  /**
   * Base email wrapper
   */
  baseTemplate(content) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sales Pipeline</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .header .logo {
      width: 48px;
      height: 48px;
      background: rgba(255,255,255,0.2);
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 10px;
    }
    .content {
      padding: 40px;
    }
    .content h2 {
      color: #1e293b;
      font-size: 20px;
      margin-top: 0;
    }
    .content p {
      color: #475569;
      margin: 16px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid #667eea;
    }
    .card-title {
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .metric-row:last-child {
      border-bottom: none;
    }
    .metric-label {
      color: #64748b;
    }
    .metric-value {
      font-weight: 600;
      color: #1e293b;
    }
    .success {
      color: #22c55e;
    }
    .warning {
      color: #f59e0b;
    }
    .danger {
      color: #ef4444;
    }
    .footer {
      background: #f8fafc;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      color: #64748b;
      font-size: 14px;
      margin: 8px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 30px 0;
    }
    @media only screen and (max-width: 600px) {
      .content, .footer {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div style="padding: 20px 0;">
    <div class="container">
      <div class="header">
        <div class="logo">SP</div>
        <h1>Sales Pipeline</h1>
      </div>
      ${content}
      <div class="footer">
        <p>© ${new Date().getFullYear()} HolidaiButler. All rights reserved.</p>
        <p>
          <a href="${process.env.FRONTEND_URL}/settings/notifications">Manage email preferences</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Welcome email template
   */
  welcomeTemplate({ firstName, email, loginUrl }) {
    return this.baseTemplate(`
      <div class="content">
        <h2>Welcome to Sales Pipeline! 🎉</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been created successfully. You're now ready to start managing your sales pipeline like a pro.</p>

        <div class="card">
          <div class="card-title">Your Account</div>
          <p style="margin: 0; color: #64748b;">${email}</p>
        </div>

        <p>Here's what you can do:</p>
        <ul style="color: #475569;">
          <li>Track deals through your sales pipeline</li>
          <li>Manage contacts and accounts</li>
          <li>Score and convert leads</li>
          <li>Get real-time insights and reports</li>
        </ul>

        <center>
          <a href="${loginUrl || process.env.FRONTEND_URL}" class="button">Get Started</a>
        </center>

        <div class="divider"></div>
        <p style="font-size: 14px; color: #64748b;">Need help? Contact our support team at support@holidaibutler.com</p>
      </div>
    `);
  }

  /**
   * Password reset template
   */
  passwordResetTemplate({ firstName, resetUrl, expiresIn = '1 hour' }) {
    return this.baseTemplate(`
      <div class="content">
        <h2>Reset Your Password</h2>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>

        <center>
          <a href="${resetUrl}" class="button">Reset Password</a>
        </center>

        <div class="card">
          <p style="margin: 0; font-size: 14px; color: #64748b;">
            ⏰ This link expires in <strong>${expiresIn}</strong>
          </p>
        </div>

        <p style="font-size: 14px; color: #64748b;">If you didn't request this reset, you can safely ignore this email. Your password will remain unchanged.</p>

        <div class="divider"></div>
        <p style="font-size: 12px; color: #94a3b8;">For security, this request was received from your account.</p>
      </div>
    `);
  }

  /**
   * Task reminder template
   */
  taskReminderTemplate({ firstName, task, dueDate, priority, relatedTo, taskUrl }) {
    const priorityColors = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', urgent: '#dc2626' };
    return this.baseTemplate(`
      <div class="content">
        <h2>Task Reminder ⏰</h2>
        <p>Hi ${firstName},</p>
        <p>You have a task that requires your attention:</p>

        <div class="card">
          <div class="card-title">${task.title}</div>
          <div class="metric-row">
            <span class="metric-label">Due Date</span>
            <span class="metric-value">${dueDate}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Priority</span>
            <span class="metric-value" style="color: ${priorityColors[priority] || '#64748b'}">${priority.toUpperCase()}</span>
          </div>
          ${relatedTo ? `
          <div class="metric-row">
            <span class="metric-label">Related To</span>
            <span class="metric-value">${relatedTo}</span>
          </div>
          ` : ''}
        </div>

        <center>
          <a href="${taskUrl || process.env.FRONTEND_URL + '/tasks'}" class="button">View Task</a>
        </center>
      </div>
    `);
  }

  /**
   * Deal stage change template
   */
  dealStageChangeTemplate({ firstName, deal, fromStage, toStage, value, probability, dealUrl }) {
    return this.baseTemplate(`
      <div class="content">
        <h2>Deal Stage Updated 📊</h2>
        <p>Hi ${firstName},</p>
        <p>A deal in your pipeline has moved to a new stage:</p>

        <div class="card">
          <div class="card-title">${deal.title}</div>
          <div class="card-value">${value}</div>
          <div class="metric-row">
            <span class="metric-label">Stage Change</span>
            <span class="metric-value">${fromStage} → <span class="success">${toStage}</span></span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Probability</span>
            <span class="metric-value">${probability}%</span>
          </div>
        </div>

        <center>
          <a href="${dealUrl || process.env.FRONTEND_URL + '/deals/' + deal.id}" class="button">View Deal</a>
        </center>
      </div>
    `);
  }

  /**
   * Lead assigned template
   */
  leadAssignedTemplate({ firstName, lead, source, score, assignedBy, leadUrl }) {
    return this.baseTemplate(`
      <div class="content">
        <h2>New Lead Assigned 🎯</h2>
        <p>Hi ${firstName},</p>
        <p>A new lead has been assigned to you:</p>

        <div class="card">
          <div class="card-title">${lead.firstName} ${lead.lastName}</div>
          <p style="margin: 5px 0 15px; color: #64748b;">${lead.company || 'No company'}</p>
          <div class="metric-row">
            <span class="metric-label">Lead Score</span>
            <span class="metric-value ${score >= 70 ? 'success' : score >= 40 ? 'warning' : ''}">${score}/100</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Source</span>
            <span class="metric-value">${source}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Assigned By</span>
            <span class="metric-value">${assignedBy}</span>
          </div>
        </div>

        <center>
          <a href="${leadUrl || process.env.FRONTEND_URL + '/leads/' + lead.id}" class="button">View Lead</a>
        </center>

        <p style="font-size: 14px; color: #64748b;">💡 Tip: Follow up within 5 minutes for the best conversion rates!</p>
      </div>
    `);
  }

  /**
   * Meeting reminder template
   */
  meetingReminderTemplate({ firstName, meeting, attendees, startTime, location, meetingUrl }) {
    return this.baseTemplate(`
      <div class="content">
        <h2>Meeting Reminder 📅</h2>
        <p>Hi ${firstName},</p>
        <p>You have an upcoming meeting:</p>

        <div class="card">
          <div class="card-title">${meeting.title}</div>
          <div class="metric-row">
            <span class="metric-label">Time</span>
            <span class="metric-value">${startTime}</span>
          </div>
          ${location ? `
          <div class="metric-row">
            <span class="metric-label">Location</span>
            <span class="metric-value">${location}</span>
          </div>
          ` : ''}
          <div class="metric-row">
            <span class="metric-label">Attendees</span>
            <span class="metric-value">${attendees.join(', ')}</span>
          </div>
        </div>

        ${meetingUrl ? `
        <center>
          <a href="${meetingUrl}" class="button">Join Meeting</a>
        </center>
        ` : ''}
      </div>
    `);
  }

  /**
   * Weekly summary template
   */
  weeklySummaryTemplate({ firstName, period, metrics }) {
    return this.baseTemplate(`
      <div class="content">
        <h2>Your Weekly Summary 📈</h2>
        <p>Hi ${firstName},</p>
        <p>Here's your performance summary for ${period}:</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0;">
          <div class="card" style="text-align: center;">
            <div class="card-title">Revenue</div>
            <div class="card-value">${metrics.revenue}</div>
            <div style="font-size: 14px; color: ${metrics.revenueChange >= 0 ? '#22c55e' : '#ef4444'}">
              ${metrics.revenueChange >= 0 ? '↑' : '↓'} ${Math.abs(metrics.revenueChange)}% vs last week
            </div>
          </div>
          <div class="card" style="text-align: center;">
            <div class="card-title">Deals Won</div>
            <div class="card-value">${metrics.dealsWon}</div>
            <div style="font-size: 14px; color: #64748b">${metrics.totalClosed} closed</div>
          </div>
        </div>

        <div class="card">
          <div class="metric-row">
            <span class="metric-label">New Leads</span>
            <span class="metric-value">${metrics.newLeads}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Meetings Held</span>
            <span class="metric-value">${metrics.meetings}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Calls Made</span>
            <span class="metric-value">${metrics.calls}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Emails Sent</span>
            <span class="metric-value">${metrics.emails}</span>
          </div>
        </div>

        <center>
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View Full Dashboard</a>
        </center>
      </div>
    `);
  }

  /**
   * Deal won celebration template
   */
  dealWonTemplate({ firstName, deal, value, customer, closedBy, teamMembers }) {
    return this.baseTemplate(`
      <div class="content" style="text-align: center;">
        <h2>🎉 Deal Won! 🎉</h2>
        <p>Congratulations ${firstName}!</p>

        <div class="card" style="border-left-color: #22c55e;">
          <div class="card-title">${deal.title}</div>
          <div class="card-value success">${value}</div>
          <p style="margin: 10px 0 0; color: #64748b;">${customer}</p>
        </div>

        <p>Closed by <strong>${closedBy}</strong></p>

        ${teamMembers && teamMembers.length > 0 ? `
        <p style="font-size: 14px; color: #64748b;">Team contributors: ${teamMembers.join(', ')}</p>
        ` : ''}

        <div class="divider"></div>
        <p>Keep up the great work! 💪</p>
      </div>
    `);
  }

  /**
   * Follow-up reminder template
   */
  followUpReminderTemplate({ firstName, contact, lastActivity, daysSince, suggestedAction, contactUrl }) {
    return this.baseTemplate(`
      <div class="content">
        <h2>Follow-up Reminder 📞</h2>
        <p>Hi ${firstName},</p>
        <p>It's time to reconnect with a contact:</p>

        <div class="card">
          <div class="card-title">${contact.firstName} ${contact.lastName}</div>
          <p style="margin: 5px 0 15px; color: #64748b;">${contact.company} - ${contact.title}</p>
          <div class="metric-row">
            <span class="metric-label">Last Activity</span>
            <span class="metric-value">${lastActivity}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Days Since Contact</span>
            <span class="metric-value ${daysSince > 30 ? 'danger' : daysSince > 14 ? 'warning' : ''}">${daysSince} days</span>
          </div>
        </div>

        <p><strong>Suggested Action:</strong> ${suggestedAction}</p>

        <center>
          <a href="${contactUrl || process.env.FRONTEND_URL + '/contacts/' + contact.id}" class="button">View Contact</a>
        </center>
      </div>
    `);
  }

  /**
   * Default template
   */
  defaultTemplate({ title, message, buttonText, buttonUrl }) {
    return this.baseTemplate(`
      <div class="content">
        ${title ? `<h2>${title}</h2>` : ''}
        <p>${message}</p>
        ${buttonUrl ? `
        <center>
          <a href="${buttonUrl}" class="button">${buttonText || 'View Details'}</a>
        </center>
        ` : ''}
      </div>
    `);
  }

  /**
   * Send welcome email
   */
  async sendWelcome(user) {
    return this.send({
      to: user.email,
      subject: 'Welcome to Sales Pipeline! 🎉',
      template: 'welcome',
      data: {
        firstName: user.firstName,
        email: user.email,
        loginUrl: process.env.FRONTEND_URL + '/login'
      }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    return this.send({
      to: user.email,
      subject: 'Reset Your Password',
      template: 'passwordReset',
      data: {
        firstName: user.firstName,
        resetUrl
      }
    });
  }

  /**
   * Send task reminder
   */
  async sendTaskReminder(user, task) {
    return this.send({
      to: user.email,
      subject: `Task Reminder: ${task.title}`,
      template: 'taskReminder',
      data: {
        firstName: user.firstName,
        task,
        dueDate: new Date(task.dueDate).toLocaleDateString(),
        priority: task.priority
      }
    });
  }

  /**
   * Send deal won notification
   */
  async sendDealWon(recipients, deal, closedBy) {
    const promises = recipients.map(user =>
      this.send({
        to: user.email,
        subject: `🎉 Deal Won: ${deal.title}`,
        template: 'dealWon',
        data: {
          firstName: user.firstName,
          deal,
          value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(deal.value),
          customer: deal.account?.name,
          closedBy: `${closedBy.firstName} ${closedBy.lastName}`
        }
      })
    );

    return Promise.all(promises);
  }
}

export default new EmailService();
