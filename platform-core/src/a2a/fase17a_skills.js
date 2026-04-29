/**
 * A2A Skill Registrations — Fase 17.A Owner Communicatie (E1-E8)
 *
 * E1: alle agents → bode/aggregateBriefing (daily briefing)
 * E2: dokter → bode/sendAlert (health anomaly - already registered in Fase 16)
 * E3: bewaker → bode/sendAlert (security alert)
 * E4: kassier → bode/sendAlert (financial alert - already registered in Fase 16)
 * E5: kassier → bode/sendAlert (budget alert - reuses sendAlert with budget severity)
 * E6: poortwachter → bode/sendAlert (compliance/GDPR alert)
 * E7: smokeTest → bode/sendAlert (SLA/availability alert)
 * E8: alle agents → dashboard/pushUpdate (real-time admin portal)
 */
import { registerSkill } from './a2aSkillRegistry.js';
import logger from '../utils/logger.js';

export function registerFase17ASkills() {
  // === E1: bode/aggregateBriefing ===
  // Collects reports from all agents for daily briefing
  registerSkill('bode', 'aggregateBriefing', async (input) => {
    const { reports = [], date, requestedBy } = input;
    logger.info(`[bode/aggregateBriefing] Aggregating ${reports.length} agent reports for ${date || 'today'}`);

    const briefing = {
      date: date || new Date().toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      totalReports: reports.length,
      summary: {
        healthy: reports.filter(r => r.status === 'healthy' || r.status === 'ok').length,
        warning: reports.filter(r => r.status === 'warning').length,
        critical: reports.filter(r => r.status === 'critical' || r.status === 'error').length
      },
      highlights: reports
        .filter(r => r.highlight)
        .map(r => ({ agent: r.agentId, highlight: r.highlight })),
      reports
    };

    // In production: this triggers the daily briefing email via ownerInterfaceAgent
    logger.info(`[bode/aggregateBriefing] Briefing ready: ${briefing.summary.healthy} ok, ${briefing.summary.warning} warn, ${briefing.summary.critical} critical`);

    return { briefingId: `briefing-${Date.now()}`, briefing };
  });

  // === E8: dashboard/pushUpdate ===
  // Pushes real-time status updates to Admin Portal (SSE/WebSocket in future)
  registerSkill('dashboard', 'pushUpdate', async (input) => {
    const { agentId, eventType, data, severity = 'info' } = input;
    logger.info(`[dashboard/pushUpdate] ${agentId} → ${eventType} (${severity})`);

    // Store in-memory for polling by Admin Portal
    if (!global.__hb_dashboard_events) global.__hb_dashboard_events = [];

    const event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      agentId,
      eventType,
      severity,
      data
    };

    global.__hb_dashboard_events.push(event);

    // Keep last 100 events
    if (global.__hb_dashboard_events.length > 100) {
      global.__hb_dashboard_events = global.__hb_dashboard_events.slice(-100);
    }

    return { pushed: true, eventId: event.id };
  });

  // === E8 companion: dashboard/getEvents ===
  // Admin Portal polls this for real-time updates
  registerSkill('dashboard', 'getEvents', async (input) => {
    const { since, limit = 50 } = input;
    const events = global.__hb_dashboard_events || [];

    let filtered = events;
    if (since) {
      filtered = events.filter(e => e.timestamp > since);
    }

    return {
      events: filtered.slice(-limit),
      total: filtered.length,
      latestTimestamp: filtered.length > 0 ? filtered[filtered.length - 1].timestamp : null
    };
  });

  logger.info('[a2a-skills] Fase 17.A skills registered: bode/aggregateBriefing, dashboard/pushUpdate, dashboard/getEvents');
}
