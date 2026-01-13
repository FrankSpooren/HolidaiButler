import emailService from "./emailService.js";
import { generateDailyBriefing, sendDailyBriefing } from "./dailyBriefing.js";
import alertHandler from "./alertHandler.js";

// Convenience methods
const sendAlert = (params) => alertHandler.sendAlert(params);
const criticalAlert = (type, details) => alertHandler.criticalAlert(type, details);

export {
  emailService,
  alertHandler,
  generateDailyBriefing,
  sendDailyBriefing,
  sendAlert,
  criticalAlert
};

export default {
  emailService,
  alertHandler,
  generateDailyBriefing,
  sendDailyBriefing,
  sendAlert,
  criticalAlert
};
