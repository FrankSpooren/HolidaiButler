/**
 * A2A Skill Registrations — Fase 16 First-Light Flows
 *
 * Flow 1: dokter → bode/sendAlert (health anomaly → owner alert)
 * Flow 2: koerier → bode/sendAlert (data sync failure → owner alert)
 * Flow 3: kassier → uitgever/pausePublishing (budget exceeded → pause)
 */
import { registerSkill } from './a2aSkillRegistry.js';
import logger from '../utils/logger.js';

export function registerFase16Skills() {
  // === SKILL: bode/sendAlert ===
  // Target: De Bode (Owner Interface Agent)
  // Receives alerts from other agents, forwards to owner via configured channels
  registerSkill('bode', 'sendAlert', async (input) => {
    const { severity = 'info', title, message, metrics, sourceAgent } = input;
    logger.info(`[bode/sendAlert] Received ${severity} alert from ${sourceAgent}: ${title}`);

    // Log to audit
    const alertRecord = {
      timestamp: new Date().toISOString(),
      severity,
      title,
      message: message || JSON.stringify(metrics || {}),
      sourceAgent,
      channels: []
    };

    // In production: forward to Threema/email via existing ownerInterfaceAgent
    // For now: log + return confirmation
    if (severity === 'critical' || severity === 'P1') {
      alertRecord.channels.push('threema', 'email');
      logger.warn(`[bode/sendAlert] CRITICAL: ${title} — would notify via Threema + Email`);
    } else {
      alertRecord.channels.push('email');
    }

    return { sent: true, channels: alertRecord.channels, alertId: `alert-${Date.now()}` };
  });

  // === SKILL: uitgever/pausePublishing ===
  // Target: De Uitgever (Publisher Agent)
  // Pauses all scheduled publishing when budget is exceeded
  registerSkill('uitgever', 'pausePublishing', async (input) => {
    const { reason, budgetInfo, sourceAgent } = input;
    logger.warn(`[uitgever/pausePublishing] Pause requested by ${sourceAgent}: ${reason}`);

    // Set a flag that the publisher checks before each publish
    global.__hb_publishing_paused = {
      paused: true,
      reason,
      pausedAt: new Date().toISOString(),
      pausedBy: sourceAgent,
      budgetInfo
    };

    return {
      paused: true,
      pausedAt: global.__hb_publishing_paused.pausedAt,
      message: `Publishing paused: ${reason}`
    };
  });

  // === SKILL: uitgever/resumePublishing ===
  // Resumes publishing after budget is restored
  registerSkill('uitgever', 'resumePublishing', async (input) => {
    const { sourceAgent } = input;
    logger.info(`[uitgever/resumePublishing] Resume requested by ${sourceAgent}`);
    global.__hb_publishing_paused = null;
    return { paused: false, resumedAt: new Date().toISOString() };
  });

  logger.info('[a2a-skills] Fase 16 skills registered: bode/sendAlert, uitgever/pausePublishing, uitgever/resumePublishing');
}
