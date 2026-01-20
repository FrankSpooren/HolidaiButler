/**
 * Email Service - Enterprise Email Management
 * Professional email templates for CRM communications
 * Multi-language support: English (en) and Dutch (nl)
 */

import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { getTranslations, getPriorityTranslation, getTimeTranslation, replacePlaceholders } from './EmailTemplates.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.defaultFrom = process.env.EMAIL_FROM || 'Sales Pipeline <noreply@holidaibutler.com>';
    this.defaultLanguage = process.env.DEFAULT_LANGUAGE || 'en';
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
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.template - Template name
   * @param {Object} options.data - Template data
   * @param {string} options.language - Language code (en/nl)
   * @param {Array} options.attachments - Email attachments
   */
  async send({ to, subject, template, data, language, attachments = [] }) {
    if (!this.initialized) {
      await this.initialize();
    }

    const lang = language || data?.language || this.defaultLanguage;

    try {
      const html = this.renderTemplate(template, data, lang);

      const result = await this.transporter.sendMail({
        from: this.defaultFrom,
        to,
        subject,
        html,
        attachments
      });

      logger.info('Email sent successfully', { to, subject, language: lang, messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Render email template with language support
   */
  renderTemplate(template, data = {}, lang = 'en') {
    const t = getTranslations(lang);

    const templates = {
      welcome: this.welcomeTemplate(data, t, lang),
      passwordReset: this.passwordResetTemplate(data, t, lang),
      taskReminder: this.taskReminderTemplate(data, t, lang),
      dealStageChange: this.dealStageChangeTemplate(data, t, lang),
      leadAssigned: this.leadAssignedTemplate(data, t, lang),
      meetingReminder: this.meetingReminderTemplate(data, t, lang),
      weeklySummary: this.weeklySummaryTemplate(data, t, lang),
      dealWon: this.dealWonTemplate(data, t, lang),
      followUpReminder: this.followUpReminderTemplate(data, t, lang)
    };

    return templates[template] || this.defaultTemplate(data, t, lang);
  }

  /**
   * Base email wrapper with language support
   */
  baseTemplate(content, lang = 'en') {
    const t = getTranslations(lang);
    return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.companyName}</title>
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
    .success { color: #22c55e; }
    .warning { color: #f59e0b; }
    .danger { color: #ef4444; }
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
      .content, .footer { padding: 20px; }
    }
  </style>
</head>
<body>
  <div style="padding: 20px 0;">
    <div class="container">
      <div class="header">
        <div class="logo">SP</div>
        <h1>${t.companyName}</h1>
      </div>
      ${content}
      <div class="footer">
        <p>${t.footer.copyright}</p>
        <p>
          <a href="${process.env.FRONTEND_URL}/settings/notifications">${t.footer.managePreferences}</a>
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
  welcomeTemplate({ firstName, email, loginUrl }, t, lang) {
    const greeting = replacePlaceholders(t.welcome.greeting, { firstName });
    const featureList = t.welcome.featureList.map(f => `<li>${f}</li>`).join('');

    return this.baseTemplate(`
      <div class="content">
        <h2>${t.welcome.title} 🎉</h2>
        <p>${greeting}</p>
        <p>${t.welcome.message}</p>

        <div class="card">
          <div class="card-title">${t.welcome.accountLabel}</div>
          <p style="margin: 0; color: #64748b;">${email}</p>
        </div>

        <p>${t.welcome.features}</p>
        <ul style="color: #475569;">
          ${featureList}
        </ul>

        <center>
          <a href="${loginUrl || process.env.FRONTEND_URL}" class="button">${t.welcome.buttonText}</a>
        </center>

        <div class="divider"></div>
        <p style="font-size: 14px; color: #64748b;">${t.welcome.helpText}</p>
      </div>
    `, lang);
  }

  /**
   * Password reset template
   */
  passwordResetTemplate({ firstName, resetUrl, expiresIn = '1 hour' }, t, lang) {
    const greeting = replacePlaceholders(t.passwordReset.greeting, { firstName });
    const expiresText = replacePlaceholders(t.passwordReset.expiresIn, { expiresIn: getTimeTranslation(1, lang) });

    return this.baseTemplate(`
      <div class="content">
        <h2>${t.passwordReset.title}</h2>
        <p>${greeting}</p>
        <p>${t.passwordReset.message}</p>

        <center>
          <a href="${resetUrl}" class="button">${t.passwordReset.buttonText}</a>
        </center>

        <div class="card">
          <p style="margin: 0; font-size: 14px; color: #64748b;">
            ⏰ ${expiresText}
          </p>
        </div>

        <p style="font-size: 14px; color: #64748b;">${t.passwordReset.ignoreMessage}</p>

        <div class="divider"></div>
        <p style="font-size: 12px; color: #94a3b8;">${t.passwordReset.securityNote}</p>
      </div>
    `, lang);
  }

  /**
   * Task reminder template
   */
  taskReminderTemplate({ firstName, task, dueDate, priority, relatedTo, taskUrl }, t, lang) {
    const priorityColors = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', urgent: '#dc2626' };
    const greeting = replacePlaceholders(t.taskReminder.greeting, { firstName });
    const priorityText = getPriorityTranslation(priority, lang);

    return this.baseTemplate(`
      <div class="content">
        <h2>${t.taskReminder.title} ⏰</h2>
        <p>${greeting}</p>
        <p>${t.taskReminder.message}</p>

        <div class="card">
          <div class="card-title">${task.title}</div>
          <div class="metric-row">
            <span class="metric-label">${t.taskReminder.dueDate}</span>
            <span class="metric-value">${dueDate}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">${t.taskReminder.priority}</span>
            <span class="metric-value" style="color: ${priorityColors[priority] || '#64748b'}">${priorityText}</span>
          </div>
          ${relatedTo ? `
          <div class="metric-row">
            <span class="metric-label">${t.taskReminder.relatedTo}</span>
            <span class="metric-value">${relatedTo}</span>
          </div>
          ` : ''}
        </div>

        <center>
          <a href="${taskUrl || process.env.FRONTEND_URL + '/tasks'}" class="button">${t.taskReminder.buttonText}</a>
        </center>
      </div>
    `, lang);
  }

  /**
   * Deal stage change template
   */
  dealStageChangeTemplate({ firstName, deal, fromStage, toStage, value, probability, dealUrl }, t, lang) {
    const greeting = replacePlaceholders(t.dealStageChange.greeting, { firstName });

    return this.baseTemplate(`
      <div class="content">
        <h2>${t.dealStageChange.title} 📊</h2>
        <p>${greeting}</p>
        <p>${t.dealStageChange.message}</p>

        <div class="card">
          <div class="card-title">${deal.title}</div>
          <div class="card-value">${value}</div>
          <div class="metric-row">
            <span class="metric-label">${t.dealStageChange.stageChange}</span>
            <span class="metric-value">${fromStage} → <span class="success">${toStage}</span></span>
          </div>
          <div class="metric-row">
            <span class="metric-label">${t.dealStageChange.probability}</span>
            <span class="metric-value">${probability}%</span>
          </div>
        </div>

        <center>
          <a href="${dealUrl || process.env.FRONTEND_URL + '/deals/' + deal.id}" class="button">${t.dealStageChange.buttonText}</a>
        </center>
      </div>
    `, lang);
  }

  /**
   * Lead assigned template
   */
  leadAssignedTemplate({ firstName, lead, source, score, assignedBy, leadUrl }, t, lang) {
    const greeting = replacePlaceholders(t.leadAssigned.greeting, { firstName });

    return this.baseTemplate(`
      <div class="content">
        <h2>${t.leadAssigned.title} 🎯</h2>
        <p>${greeting}</p>
        <p>${t.leadAssigned.message}</p>

        <div class="card">
          <div class="card-title">${lead.firstName} ${lead.lastName}</div>
          <p style="margin: 5px 0 15px; color: #64748b;">${lead.company || t.leadAssigned.noCompany}</p>
          <div class="metric-row">
            <span class="metric-label">${t.leadAssigned.leadScore}</span>
            <span class="metric-value ${score >= 70 ? 'success' : score >= 40 ? 'warning' : ''}">${score}/100</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">${t.leadAssigned.source}</span>
            <span class="metric-value">${source}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">${t.leadAssigned.assignedBy}</span>
            <span class="metric-value">${assignedBy}</span>
          </div>
        </div>

        <center>
          <a href="${leadUrl || process.env.FRONTEND_URL + '/leads/' + lead.id}" class="button">${t.leadAssigned.buttonText}</a>
        </center>

        <p style="font-size: 14px; color: #64748b;">💡 ${t.leadAssigned.tip}</p>
      </div>
    `, lang);
  }

  /**
   * Meeting reminder template
   */
  meetingReminderTemplate({ firstName, meeting, attendees, startTime, location, meetingUrl }, t, lang) {
    const greeting = replacePlaceholders(t.meetingReminder.greeting, { firstName });

    return this.baseTemplate(`
      <div class="content">
        <h2>${t.meetingReminder.title} 📅</h2>
        <p>${greeting}</p>
        <p>${t.meetingReminder.message}</p>

        <div class="card">
          <div class="card-title">${meeting.title}</div>
          <div class="metric-row">
            <span class="metric-label">${t.meetingReminder.time}</span>
            <span class="metric-value">${startTime}</span>
          </div>
          ${location ? `
          <div class="metric-row">
            <span class="metric-label">${t.meetingReminder.location}</span>
            <span class="metric-value">${location}</span>
          </div>
          ` : ''}
          <div class="metric-row">
            <span class="metric-label">${t.meetingReminder.attendees}</span>
            <span class="metric-value">${attendees.join(', ')}</span>
          </div>
        </div>

        ${meetingUrl ? `
        <center>
          <a href="${meetingUrl}" class="button">${t.meetingReminder.buttonText}</a>
        </center>
        ` : ''}
      </div>
    `, lang);
  }

  /**
   * Weekly summary template
   */
  weeklySummaryTemplate({ firstName, period, metrics }, t, lang) {
    const greeting = replacePlaceholders(t.weeklySummary.greeting, { firstName });
    const message = replacePlaceholders(t.weeklySummary.message, { period });

    return this.baseTemplate(`
      <div class="content">
        <h2>${t.weeklySummary.title} 📈</h2>
        <p>${greeting}</p>
        <p>${message}</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0;">
          <div class="card" style="text-align: center;">
            <div class="card-title">${t.weeklySummary.revenue}</div>
            <div class="card-value">${metrics.revenue}</div>
            <div style="font-size: 14px; color: ${metrics.revenueChange >= 0 ? '#22c55e' : '#ef4444'}">
              ${metrics.revenueChange >= 0 ? '↑' : '↓'} ${Math.abs(metrics.revenueChange)}% ${t.weeklySummary.vsLastWeek}
            </div>
          </div>
          <div class="card" style="text-align: center;">
            <div class="card-title">${t.weeklySummary.dealsWon}</div>
            <div class="card-value">${metrics.dealsWon}</div>
            <div style="font-size: 14px; color: #64748b">${metrics.totalClosed} ${t.weeklySummary.closed}</div>
          </div>
        </div>

        <div class="card">
          <div class="metric-row">
            <span class="metric-label">${t.weeklySummary.newLeads}</span>
            <span class="metric-value">${metrics.newLeads}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">${t.weeklySummary.meetingsHeld}</span>
            <span class="metric-value">${metrics.meetings}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">${t.weeklySummary.callsMade}</span>
            <span class="metric-value">${metrics.calls}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">${t.weeklySummary.emailsSent}</span>
            <span class="metric-value">${metrics.emails}</span>
          </div>
        </div>

        <center>
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">${t.weeklySummary.buttonText}</a>
        </center>
      </div>
    `, lang);
  }

  /**
   * Deal won celebration template
   */
  dealWonTemplate({ firstName, deal, value, customer, closedBy, teamMembers }, t, lang) {
    const congratulations = replacePlaceholders(t.dealWon.congratulations, { firstName });
    const closedByText = replacePlaceholders(t.dealWon.closedBy, { name: closedBy });

    return this.baseTemplate(`
      <div class="content" style="text-align: center;">
        <h2>🎉 ${t.dealWon.title} 🎉</h2>
        <p>${congratulations}</p>

        <div class="card" style="border-left-color: #22c55e;">
          <div class="card-title">${deal.title}</div>
          <div class="card-value success">${value}</div>
          <p style="margin: 10px 0 0; color: #64748b;">${customer}</p>
        </div>

        <p>${closedByText}</p>

        ${teamMembers && teamMembers.length > 0 ? `
        <p style="font-size: 14px; color: #64748b;">${replacePlaceholders(t.dealWon.teamContributors, { members: teamMembers.join(', ') })}</p>
        ` : ''}

        <div class="divider"></div>
        <p>${t.dealWon.motivation} 💪</p>
      </div>
    `, lang);
  }

  /**
   * Follow-up reminder template
   */
  followUpReminderTemplate({ firstName, contact, lastActivity, daysSince, suggestedAction, contactUrl }, t, lang) {
    const greeting = replacePlaceholders(t.followUpReminder.greeting, { firstName });

    return this.baseTemplate(`
      <div class="content">
        <h2>${t.followUpReminder.title} 📞</h2>
        <p>${greeting}</p>
        <p>${t.followUpReminder.message}</p>

        <div class="card">
          <div class="card-title">${contact.firstName} ${contact.lastName}</div>
          <p style="margin: 5px 0 15px; color: #64748b;">${contact.company} - ${contact.title}</p>
          <div class="metric-row">
            <span class="metric-label">${t.followUpReminder.lastActivity}</span>
            <span class="metric-value">${lastActivity}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">${t.followUpReminder.daysSinceContact}</span>
            <span class="metric-value ${daysSince > 30 ? 'danger' : daysSince > 14 ? 'warning' : ''}">${daysSince} ${t.followUpReminder.days}</span>
          </div>
        </div>

        <p><strong>${t.followUpReminder.suggestedAction}</strong> ${suggestedAction}</p>

        <center>
          <a href="${contactUrl || process.env.FRONTEND_URL + '/contacts/' + contact.id}" class="button">${t.followUpReminder.buttonText}</a>
        </center>
      </div>
    `, lang);
  }

  /**
   * Default template
   */
  defaultTemplate({ title, message, buttonText, buttonUrl }, t, lang) {
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
    `, lang);
  }

  /**
   * Send welcome email
   */
  async sendWelcome(user, language) {
    const lang = language || user.language || this.defaultLanguage;
    const t = getTranslations(lang);

    return this.send({
      to: user.email,
      subject: `${t.welcome.subject} 🎉`,
      template: 'welcome',
      language: lang,
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
  async sendPasswordReset(user, resetToken, language) {
    const lang = language || user.language || this.defaultLanguage;
    const t = getTranslations(lang);
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    return this.send({
      to: user.email,
      subject: t.passwordReset.subject,
      template: 'passwordReset',
      language: lang,
      data: {
        firstName: user.firstName,
        resetUrl
      }
    });
  }

  /**
   * Send task reminder
   */
  async sendTaskReminder(user, task, language) {
    const lang = language || user.language || this.defaultLanguage;
    const t = getTranslations(lang);

    return this.send({
      to: user.email,
      subject: replacePlaceholders(t.taskReminder.subject, { taskTitle: task.title }),
      template: 'taskReminder',
      language: lang,
      data: {
        firstName: user.firstName,
        task,
        dueDate: new Date(task.dueDate).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US'),
        priority: task.priority
      }
    });
  }

  /**
   * Send deal won notification
   */
  async sendDealWon(recipients, deal, closedBy, language) {
    const promises = recipients.map(user => {
      const lang = language || user.language || this.defaultLanguage;
      const t = getTranslations(lang);
      const currencyLocale = lang === 'nl' ? 'nl-NL' : 'en-US';
      const currency = lang === 'nl' ? 'EUR' : 'USD';

      return this.send({
        to: user.email,
        subject: `🎉 ${replacePlaceholders(t.dealWon.subject, { dealTitle: deal.title })}`,
        template: 'dealWon',
        language: lang,
        data: {
          firstName: user.firstName,
          deal,
          value: new Intl.NumberFormat(currencyLocale, { style: 'currency', currency }).format(deal.value),
          customer: deal.account?.name,
          closedBy: `${closedBy.firstName} ${closedBy.lastName}`
        }
      });
    });

    return Promise.all(promises);
  }

  /**
   * Send lead assigned notification
   */
  async sendLeadAssigned(user, lead, assignedBy, language) {
    const lang = language || user.language || this.defaultLanguage;
    const t = getTranslations(lang);

    return this.send({
      to: user.email,
      subject: replacePlaceholders(t.leadAssigned.subject, { leadName: `${lead.firstName} ${lead.lastName}` }),
      template: 'leadAssigned',
      language: lang,
      data: {
        firstName: user.firstName,
        lead,
        source: lead.source,
        score: lead.score || 0,
        assignedBy: `${assignedBy.firstName} ${assignedBy.lastName}`
      }
    });
  }

  /**
   * Send meeting reminder
   */
  async sendMeetingReminder(user, meeting, language) {
    const lang = language || user.language || this.defaultLanguage;
    const t = getTranslations(lang);

    return this.send({
      to: user.email,
      subject: replacePlaceholders(t.meetingReminder.subject, { meetingTitle: meeting.title }),
      template: 'meetingReminder',
      language: lang,
      data: {
        firstName: user.firstName,
        meeting,
        attendees: meeting.attendees || [],
        startTime: new Date(meeting.startTime).toLocaleString(lang === 'nl' ? 'nl-NL' : 'en-US'),
        location: meeting.location,
        meetingUrl: meeting.meetingUrl
      }
    });
  }

  /**
   * Send weekly summary
   */
  async sendWeeklySummary(user, metrics, period, language) {
    const lang = language || user.language || this.defaultLanguage;
    const t = getTranslations(lang);
    const currencyLocale = lang === 'nl' ? 'nl-NL' : 'en-US';
    const currency = lang === 'nl' ? 'EUR' : 'USD';

    return this.send({
      to: user.email,
      subject: t.weeklySummary.subject,
      template: 'weeklySummary',
      language: lang,
      data: {
        firstName: user.firstName,
        period,
        metrics: {
          ...metrics,
          revenue: new Intl.NumberFormat(currencyLocale, { style: 'currency', currency }).format(metrics.revenue)
        }
      }
    });
  }
}

export default new EmailService();
