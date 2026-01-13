import emailService from "./emailService.js";
import axios from "axios";

// Urgency levels en routing
const URGENCY_CONFIG = {
  1: { name: "Informatief", channel: "digest", priority: "low" },
  2: { name: "Laag", channel: "email", priority: "normal" },
  3: { name: "Medium", channel: "email", priority: "normal" },
  4: { name: "Hoog", channel: "email", priority: "high" },
  5: { name: "Kritiek", channel: "email+threema", priority: "critical" }
};

class AlertHandler {

  async sendAlert({ urgency, title, message, metadata = {} }) {
    const config = URGENCY_CONFIG[urgency] || URGENCY_CONFIG[2];

    console.log("[AlertHandler] Sending " + config.name + " alert: " + title);

    // Log to audit trail
    try {
      const { logAlert } = await import("../auditTrail/index.js");
      await logAlert(config.name.toLowerCase(), message, {
        metadata: { urgency, title, ...metadata }
      });
    } catch (error) {
      console.log("[AlertHandler] Audit log failed:", error.message);
    }

    // Urgency 1: alleen loggen voor daily digest
    if (urgency === 1) {
      console.log("[AlertHandler] Urgency 1 - logged for daily digest");
      return { success: true, channel: "digest" };
    }

    // Urgency 2-5: email
    const emailResult = await this.sendEmailAlert({
      urgency,
      title,
      message,
      priority: config.priority
    });

    // Urgency 5: ook Threema (wanneer geconfigureerd)
    if (urgency === 5) {
      await this.sendThreemaAlert({ title, message });
    }

    return emailResult;
  }

  async sendEmailAlert({ urgency, title, message, priority }) {
    const config = URGENCY_CONFIG[urgency];

    const bgColor = urgency >= 4 ? "#f8d7da" :
                   urgency >= 3 ? "#fff3cd" : "#d1ecf1";
    const borderColor = urgency >= 4 ? "#dc3545" :
                       urgency >= 3 ? "#ffc107" : "#17a2b8";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; }
          .alert-box {
            padding: 20px;
            border-radius: 8px;
            background: ${bgColor};
            border: 2px solid ${borderColor};
          }
          .urgency { font-size: 12px; color: #666; margin-bottom: 10px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #333; }
          .message { font-size: 14px; color: #555; line-height: 1.5; }
          .footer { margin-top: 20px; font-size: 11px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="alert-box">
          <div class="urgency">Urgentie ${urgency}: ${config.name}</div>
          <div class="title">${title}</div>
          <div class="message">${message}</div>
        </div>
        <div class="footer">
          HolidaiButler Alert System<br>
          ${new Date().toLocaleString("nl-NL")}
        </div>
      </body>
      </html>
    `;

    return emailService.sendTransactional({
      subject: "[" + config.name.toUpperCase() + "] " + title,
      html,
      priority
    });
  }

  async sendThreemaAlert({ title, message }) {
    // Threema Gateway integratie
    const THREEMA_GATEWAY_ID = process.env.THREEMA_GATEWAY_ID;
    const THREEMA_SECRET = process.env.THREEMA_SECRET;
    const OWNER_THREEMA_ID = process.env.OWNER_THREEMA_ID;

    if (!THREEMA_GATEWAY_ID || !THREEMA_SECRET || !OWNER_THREEMA_ID) {
      console.log("[AlertHandler] Threema not configured - skipping");
      return { success: false, reason: "not_configured" };
    }

    try {
      // Threema Gateway API
      const response = await axios.post(
        "https://msgapi.threema.ch/send_simple",
        new URLSearchParams({
          from: THREEMA_GATEWAY_ID,
          to: OWNER_THREEMA_ID,
          secret: THREEMA_SECRET,
          text: "🚨 " + title + "\n\n" + message
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      console.log("[AlertHandler] Threema sent:", response.data);
      return { success: true, channel: "threema" };
    } catch (error) {
      console.error("[AlertHandler] Threema error:", error.message);
      return { success: false, error: error.message };
    }
  }

  // Critical alert triggers
  async criticalAlert(type, details) {
    const CRITICAL_TYPES = {
      "production_down": "Productie server niet bereikbaar",
      "security_breach": "Beveiligingsincident gedetecteerd",
      "data_leak": "Mogelijke data leak",
      "budget_exceeded": "Budget 100% overschreden",
      "database_failure": "Database connectie verloren"
    };

    return this.sendAlert({
      urgency: 5,
      title: CRITICAL_TYPES[type] || type,
      message: details,
      metadata: { type, critical: true }
    });
  }
}

const alertHandler = new AlertHandler();
export default alertHandler;
