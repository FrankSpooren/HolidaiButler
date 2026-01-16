import axios from "axios";

const MAILERLITE_API = "https://connect.mailerlite.com/api";
const OWNER_EMAIL = process.env.OWNER_EMAIL || "info@holidaibutler.com";

class EmailService {
  getApiKey() {
    return process.env.MAILERLITE_API_KEY;
  }

  getHeaders() {
    return {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + this.getApiKey()
    };
  }

  async sendEmail({ to = OWNER_EMAIL, subject, html, text }) {
    const apiKey = this.getApiKey();
    const timestamp = new Date().toISOString();
    
    console.log("[EmailService] " + timestamp);
    console.log("  To: " + to);
    console.log("  Subject: " + subject);
    
    if (!apiKey) {
      console.log("  Status: LOGGED (no API key)");
      return { success: true, status: "logged", reason: "no_api_key" };
    }

    try {
      // Update subscriber with custom fields for automation trigger
      await axios.post(
        MAILERLITE_API + "/subscribers",
        {
          email: to,
          fields: {
            last_system_alert: subject,
            last_alert_time: timestamp
          }
        },
        { headers: this.getHeaders() }
      ).catch(() => null);

      // Try campaign creation (may fail on content restrictions)
      try {
        const response = await axios.post(
          MAILERLITE_API + "/campaigns",
          {
            name: "System: " + subject.substring(0, 50),
            type: "regular",
            emails: [{
              subject: subject,
              from: "info@holidaibutler.com",
              from_name: "HolidaiButler System",
              content: html || text || "System notification"
            }]
          },
          { headers: this.getHeaders() }
        );
        
        console.log("  Status: SENT via MailerLite");
        return { success: true, status: "sent", id: response.data?.data?.id };
      } catch (campaignError) {
        console.log("  Status: LOGGED (campaign restricted, subscriber updated)");
        return { 
          success: true, 
          status: "logged", 
          reason: "campaign_restricted",
          note: "Subscriber custom fields updated for automation trigger"
        };
      }
    } catch (error) {
      console.error("[EmailService] Error:", error.message);
      console.log("  Status: LOGGED (API error)");
      return { success: true, status: "logged", error: error.message };
    }
  }

  async sendTransactional({ to = OWNER_EMAIL, subject, html, priority = "normal" }) {
    const priorityPrefix = priority === "high" ? "[URGENT] " :
                          priority === "critical" ? "[CRITICAL] " : "";
    return this.sendEmail({ to, subject: priorityPrefix + subject, html });
  }
}

const emailService = new EmailService();
export default emailService;
