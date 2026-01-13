import axios from "axios";

const MAILERLITE_API = "https://connect.mailerlite.com/api";
const OWNER_EMAIL = process.env.OWNER_EMAIL || "info@holidaibutler.com";

class EmailService {
  constructor() {
    this.apiKey = process.env.MAILERLITE_API_KEY;
  }

  getHeaders() {
    return {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + this.apiKey
    };
  }

  async sendEmail({ to = OWNER_EMAIL, subject, html, text }) {
    if (!this.apiKey) {
      console.log("[EmailService] No API key configured - logging email:");
      console.log("  To:", to);
      console.log("  Subject:", subject);
      return { success: false, reason: "no_api_key" };
    }

    try {
      // MailerLite transactional email via API
      const response = await axios.post(
        MAILERLITE_API + "/campaigns",
        {
          name: "System: " + subject,
          type: "regular",
          emails: [{
            subject,
            from: "noreply@holidaibutler.com",
            from_name: "HolidaiButler System",
            content: html || text
          }]
        },
        { headers: this.getHeaders() }
      );

      console.log("[EmailService] Email sent: " + subject);
      return { success: true, id: response.data?.data?.id };
    } catch (error) {
      console.error("[EmailService] Error:", error.message);
      return { success: false, error: error.message };
    }
  }

  async sendTransactional({ to = OWNER_EMAIL, subject, html, priority = "normal" }) {
    // Priority markers toevoegen aan subject
    const priorityPrefix = priority === "high" ? "⚠️ " :
                          priority === "critical" ? "🔴 URGENT: " : "";

    return this.sendEmail({
      to,
      subject: priorityPrefix + subject,
      html
    });
  }
}

const emailService = new EmailService();
export default emailService;
