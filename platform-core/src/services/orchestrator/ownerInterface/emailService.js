import axios from "axios";

/**
 * Email Service for HolidaiButler System Notifications
 *
 * Uses MailerLite Automation trigger approach:
 * 1. Remove subscriber from trigger group
 * 2. Update subscriber custom fields with alert data
 * 3. Add subscriber back to trigger group
 * 4. MailerLite automation triggers and sends email
 *
 * @module ownerInterface/emailService
 */

const MAILERLITE_API = "https://connect.mailerlite.com/api";
const OWNER_EMAIL = process.env.OWNER_EMAIL || "info@holidaibutler.com";
const SYSTEM_ALERTS_GROUP_ID = "176972381290498029";

class EmailService {
  getApiKey() {
    return process.env.MAILERLITE_API_KEY;
  }

  getHeaders() {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.getApiKey()}`
    };
  }

  /**
   * Send email via MailerLite automation trigger
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {Object} options.fields - Custom fields to update
   */
  async sendEmail({ to = OWNER_EMAIL, subject, fields = {} }) {
    const timestamp = new Date().toISOString();
    const logPrefix = `[EmailService] ${timestamp}`;

    console.log(logPrefix);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);

    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.error(`  Status: FAILED - No MAILERLITE_API_KEY configured`);
      return { success: false, status: "failed", error: "No API key" };
    }

    try {
      // Step 1: Remove subscriber from group (to allow re-trigger)
      console.log(`  Step 1: Removing from trigger group...`);
      await axios.delete(
        `${MAILERLITE_API}/subscribers/${to}/groups/${SYSTEM_ALERTS_GROUP_ID}`,
        { headers: this.getHeaders() }
      ).catch(() => {
        // Ignore error if subscriber not in group
        console.log(`  Step 1: Subscriber not in group (OK)`);
      });

      // Step 2: Update subscriber custom fields
      console.log(`  Step 2: Updating subscriber fields...`);
      const subscriberData = {
        email: to,
        fields: {
          last_system_alert: subject,
          last_alert_time: timestamp,
          ...fields
        }
      };

      await axios.put(
        `${MAILERLITE_API}/subscribers/${to}`,
        subscriberData,
        { headers: this.getHeaders() }
      );

      // Step 3: Add subscriber back to group (triggers automation)
      console.log(`  Step 3: Adding to trigger group...`);
      await axios.post(
        `${MAILERLITE_API}/subscribers/${to}/groups/${SYSTEM_ALERTS_GROUP_ID}`,
        {},
        { headers: this.getHeaders() }
      );

      console.log(`  Status: SUCCESS - Automation triggered`);
      return {
        success: true,
        status: "triggered",
        message: "MailerLite automation triggered"
      };

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`  Status: FAILED - ${errorMsg}`);
      return {
        success: false,
        status: "failed",
        error: errorMsg
      };
    }
  }

  /**
   * Send transactional email with priority prefix
   */
  async sendTransactional({ to = OWNER_EMAIL, subject, fields = {}, priority = "normal" }) {
    const priorityPrefix = priority === "high" ? "[URGENT] " :
                          priority === "critical" ? "[CRITICAL] " : "";
    return this.sendEmail({
      to,
      subject: priorityPrefix + subject,
      fields
    });
  }

  /**
   * Send alert via automation
   */
  async sendAlert({ to = OWNER_EMAIL, urgency, title, message, metadata = {} }) {
    const urgencyLabels = {
      1: "Info",
      2: "Laag",
      3: "Medium",
      4: "Hoog",
      5: "Kritiek"
    };

    const subject = urgency >= 4
      ? `[${urgencyLabels[urgency]?.toUpperCase()}] ${title}`
      : title;

    return this.sendEmail({
      to,
      subject,
      fields: {
        status_summary: `${urgencyLabels[urgency] || "Info"}: ${message}`
      }
    });
  }

  /**
   * Check if service is configured
   */
  isConfigured() {
    return !!this.getApiKey();
  }
}

const emailService = new EmailService();
export default emailService;
