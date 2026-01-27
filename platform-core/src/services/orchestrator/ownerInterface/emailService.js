import axios from "axios";

/**
 * Email Service for HolidaiButler System Notifications
 *
 * Method: MailerLite Automation trigger via dual-group rotation
 * - Two groups alternate daily to avoid MailerLite's >24h re-entry cooldown
 * - Odd days (day-of-year): Group 1 "System Alerts Owner"
 * - Even days (day-of-year): Group 2 "System Alerts Owner 2"
 * - Each group is triggered at most every 48h, well within the cooldown limit
 *
 * Requires two MailerLite automations:
 * - "Daily system update" triggered by Group 1 join
 * - "Daily system update 2" triggered by Group 2 join
 *
 * @module ownerInterface/emailService
 */

const MAILERLITE_API = "https://connect.mailerlite.com/api";
const OWNER_EMAIL = process.env.OWNER_EMAIL || "info@holidaibutler.com";

// Dual-group rotation to avoid MailerLite re-entry cooldown (>24h)
const ALERT_GROUPS = [
  { id: "176972381290498029", name: "System Alerts Owner" },
  { id: "177755949282362712", name: "System Alerts Owner 2" }
];

class EmailService {
  getApiKey() {
    return process.env.MAILERLITE_API_KEY;
  }

  getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.getApiKey()}`
    };
  }

  /**
   * Get today's alert group based on day-of-year parity.
   * Odd days → group 0, even days → group 1.
   * Each group is used every other day = 48h between triggers.
   */
  getTodayGroup() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    const groupIndex = dayOfYear % 2;
    return ALERT_GROUPS[groupIndex];
  }

  /**
   * Send email via MailerLite automation trigger with dual-group rotation.
   * Removes subscriber from today's group, updates fields, re-adds to trigger automation.
   */
  async sendViaAutomation({ to = OWNER_EMAIL, subject, fields = {} }) {
    const timestamp = new Date().toISOString();
    const group = this.getTodayGroup();
    console.log(`[EmailService] Automation trigger - ${timestamp}`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Group: ${group.name} (${group.id})`);

    try {
      // Step 1: Remove subscriber from today's group
      console.log(`  Step 1: Removing from ${group.name}...`);
      await axios.delete(
        `${MAILERLITE_API}/subscribers/${to}/groups/${group.id}`,
        { headers: this.getHeaders() }
      ).catch(() => {
        console.log(`  Step 1: Subscriber not in group (OK)`);
      });

      // Step 2: Update subscriber custom fields
      console.log(`  Step 2: Updating subscriber fields...`);
      await axios.put(
        `${MAILERLITE_API}/subscribers/${to}`,
        {
          email: to,
          fields: {
            last_system_alert: subject,
            last_alert_time: timestamp,
            ...fields
          }
        },
        { headers: this.getHeaders() }
      );

      // Step 3: Add subscriber to today's group (triggers automation)
      console.log(`  Step 3: Adding to ${group.name}...`);
      await axios.post(
        `${MAILERLITE_API}/subscribers/${to}/groups/${group.id}`,
        {},
        { headers: this.getHeaders() }
      );

      console.log(`  Status: SUCCESS - Automation triggered via ${group.name}`);
      return {
        success: true,
        status: "triggered",
        message: `MailerLite automation triggered via ${group.name}`
      };

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`  Automation trigger FAILED: ${errorMsg}`);
      return {
        success: false,
        status: "failed",
        error: errorMsg
      };
    }
  }

  /**
   * Send email via dual-group rotation
   */
  async sendEmail({ to = OWNER_EMAIL, subject, fields = {} }) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.error(`[EmailService] No MAILERLITE_API_KEY configured`);
      return { success: false, status: "failed", error: "No API key" };
    }

    return this.sendViaAutomation({ to, subject, fields });
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
   * Send alert via email
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
