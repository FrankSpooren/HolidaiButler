import axios from 'axios';
import { logger } from '../../utils/logger.js';

/**
 * MailerLite Service
 * Integreert met MailerLite voor email verzending en AI message generation
 */
class MailerLiteService {
  constructor() {
    this.apiKey = process.env.MAILERLITE_API_KEY;
    this.groupId = process.env.MAILERLITE_GROUP_ID;
    this.baseUrl = 'https://connect.mailerlite.com/api';

    if (!this.apiKey) {
      logger.warn('⚠️ MailerLite API key not configured');
    }
  }

  /**
   * Get API headers
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  /**
   * Add subscriber to MailerLite
   */
  async addSubscriber(email, firstName, lastName, customFields = {}) {
    try {
      logger.info(`📧 Adding subscriber: ${email}`);

      const response = await axios.post(
        `${this.baseUrl}/subscribers`,
        {
          email,
          fields: {
            name: `${firstName} ${lastName}`,
            last_name: lastName,
            ...customFields
          },
          groups: this.groupId ? [this.groupId] : []
        },
        { headers: this.getHeaders() }
      );

      logger.info(`✅ Subscriber added: ${email}`);
      return response.data.data;

    } catch (error) {
      if (error.response?.status === 422) {
        logger.warn(`⚠️ Subscriber already exists: ${email}`);
        return { email, exists: true };
      }

      logger.error('❌ Failed to add subscriber:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get subscriber by email
   */
  async getSubscriber(email) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/subscribers/${email}`,
        { headers: this.getHeaders() }
      );

      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error('❌ Failed to get subscriber:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generate personalized message using AI
   * Note: MailerLite heeft Smart Sending AI features
   */
  async generatePersonalizedMessage(candidateData, vacancyData, template = null) {
    try {
      logger.info(`🤖 Generating personalized message for: ${candidateData.firstName}`);

      // Build personalization context
      const context = {
        firstName: candidateData.firstName,
        lastName: candidateData.lastName,
        currentTitle: candidateData.currentTitle || 'professional',
        currentCompany: candidateData.currentCompany || '',
        location: candidateData.location || '',

        vacancyTitle: vacancyData.title,
        organization: vacancyData.organization,
        vacancyLocation: vacancyData.location,

        // Key skills/experience matches
        matchedSkills: this.extractMatchedSkills(candidateData, vacancyData),
        experienceYears: this.estimateExperience(candidateData.experience || [])
      };

      // Use template or generate from scratch
      let message;

      if (template) {
        message = this.applyTemplate(template, context);
      } else {
        message = this.generateDefaultMessage(context);
      }

      logger.info(`✅ Message generated for ${candidateData.firstName}`);

      return {
        subject: `Kans als ${vacancyData.title} bij ${vacancyData.organization}`,
        body: message,
        bodyHtml: this.convertToHtml(message),
        personalizationData: context
      };

    } catch (error) {
      logger.error('❌ Failed to generate message:', error);
      throw error;
    }
  }

  /**
   * Generate default message template
   */
  generateDefaultMessage(context) {
    return `Beste ${context.firstName},

Ik kwam je profiel tegen en ben onder de indruk van je ervaring als ${context.currentTitle}${context.currentCompany ? ` bij ${context.currentCompany}` : ''}.

Bij ${context.organization} in ${context.vacancyLocation} zijn we op zoek naar een gedreven ${context.vacancyTitle}. Gezien jouw achtergrond${context.matchedSkills.length > 0 ? ` in ${context.matchedSkills.join(', ')}` : ''} en ${context.experienceYears}+ jaar ervaring, denk ik dat deze rol perfect bij je zou passen.

Wat maakt deze kans bijzonder:
- Strategische rol in een groeiende organisatie
- Directe impact op de ontwikkeling van ${context.organization}
- Uitdagend en gevarieerd takenpakket
- Professioneel team en moderne werkomgeving

Zou je open staan voor een vrijblijvend gesprek om de mogelijkheden te verkennen?

Met vriendelijke groet,

---
*Deze vacature is via ons recruitment platform geïdentificeerd als match met jouw profiel.*`;
  }

  /**
   * Apply personalization template
   */
  applyTemplate(template, context) {
    let message = template;

    // Replace placeholders
    Object.keys(context).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(placeholder, context[key] || '');
    });

    return message;
  }

  /**
   * Convert plain text to HTML
   */
  convertToHtml(text) {
    return text
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  /**
   * Send email campaign via MailerLite
   */
  async sendCampaign(subscriberIds, subject, content, campaignName) {
    try {
      logger.info(`📨 Creating campaign: ${campaignName}`);

      const response = await axios.post(
        `${this.baseUrl}/campaigns`,
        {
          name: campaignName,
          type: 'regular',
          emails: [
            {
              subject,
              from_name: process.env.SENDER_NAME || 'Recruitment Team',
              from: process.env.SENDER_EMAIL || 'recruitment@warredal.be',
              content
            }
          ],
          groups: this.groupId ? [this.groupId] : [],
          // Note: Voor targeting specifieke subscribers gebruik filters
        },
        { headers: this.getHeaders() }
      );

      const campaignId = response.data.data.id;

      // Schedule or send immediately
      await axios.post(
        `${this.baseUrl}/campaigns/${campaignId}/send`,
        {},
        { headers: this.getHeaders() }
      );

      logger.info(`✅ Campaign sent: ${campaignId}`);

      return {
        campaignId,
        status: 'sent',
        sentAt: new Date()
      };

    } catch (error) {
      logger.error('❌ Failed to send campaign:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send individual email (via automation)
   */
  async sendEmail(email, subject, content) {
    try {
      logger.info(`📧 Sending email to: ${email}`);

      // MailerLite doesn't have direct "send email" endpoint
      // We need to use automations or campaigns
      // For now, we'll create a campaign with single recipient

      const campaignName = `Individual - ${email} - ${Date.now()}`;

      return await this.sendCampaign([email], subject, content, campaignName);

    } catch (error) {
      logger.error('❌ Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Get campaign stats
   */
  async getCampaignStats(campaignId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/campaigns/${campaignId}`,
        { headers: this.getHeaders() }
      );

      return {
        sent: response.data.data.emails_sent || 0,
        opened: response.data.data.opened || 0,
        clicked: response.data.data.clicked || 0,
        bounced: response.data.data.bounced || 0,
        unsubscribed: response.data.data.unsubscribed || 0
      };

    } catch (error) {
      logger.error('❌ Failed to get campaign stats:', error);
      throw error;
    }
  }

  /**
   * Extract matched skills from candidate data
   */
  extractMatchedSkills(candidateData, vacancyData) {
    const candidateSkills = (candidateData.skills || []).map(s => s.toLowerCase());
    const vacancyKeywords = this.extractKeywordsFromVacancy(vacancyData);

    return candidateSkills.filter(skill =>
      vacancyKeywords.some(keyword => skill.includes(keyword))
    ).slice(0, 3); // Top 3 matches
  }

  /**
   * Extract keywords from vacancy
   */
  extractKeywordsFromVacancy(vacancyData) {
    const text = `${vacancyData.title} ${vacancyData.description} ${vacancyData.requirements}`.toLowerCase();
    const commonKeywords = ['marketing', 'sales', 'communicatie', 'commercieel', 'toerisme', 'b2b'];

    return commonKeywords.filter(keyword => text.includes(keyword));
  }

  /**
   * Estimate years of experience
   */
  estimateExperience(experienceArray) {
    if (!experienceArray || experienceArray.length === 0) return 0;

    // Rough estimate based on number of positions
    return Math.min(experienceArray.length * 2, 15); // Cap at 15 years
  }

  /**
   * Check if MailerLite is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get service status
   */
  async getStatus() {
    if (!this.apiKey) {
      return { configured: false, connected: false };
    }

    try {
      // Test API connection
      await axios.get(`${this.baseUrl}/subscribers?limit=1`, {
        headers: this.getHeaders()
      });

      return { configured: true, connected: true };
    } catch (error) {
      return { configured: true, connected: false, error: error.message };
    }
  }
}

export default MailerLiteService;
