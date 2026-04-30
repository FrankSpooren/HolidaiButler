/**
 * E3 Flow: Bewaker -> Bode Security Alert
 * Dedicated skill for security-related alerts with severity-based channel routing
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  severity: z.enum(['P1', 'P2', 'P3']),
  affected_component: z.string(),
  description: z.string().max(2000),
  cve_id: z.string().optional(),
  remediation_steps: z.array(z.string()).optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function sendSecurityAlert(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bode');

  return await tracer.startActiveSpan('bode.sendSecurityAlert', async (span) => {
    span.setAttributes({
      'flow.id': 'E3',
      'flow.source_agent': validated.sourceAgent || 'unknown',
      'flow.target_agent': 'bode',
      'alert.severity': validated.severity,
      'alert.type': 'security',
      'destination_id': validated.destination_id || 0
    });

    try {
      const channels = [];

      // P1: Threema + email (kritiek), P2/P3: alleen email
      if (validated.severity === 'P1') {
        channels.push('threema', 'email');
        logger.warn(`[bode/sendSecurityAlert] CRITICAL P1: ${validated.affected_component} — ${validated.description}`);
      } else {
        channels.push('email');
        logger.info(`[bode/sendSecurityAlert] ${validated.severity}: ${validated.affected_component} — ${validated.description}`);
      }

      // Lazy load ownerInterfaceAgent for actual notification
      try {
        const { default: OwnerInterfaceAgent } = await import('../../ownerInterfaceAgent/index.js');
        const agent = new OwnerInterfaceAgent();
        await agent.sendNotification({
          subject: `[${validated.severity}] Security Alert: ${validated.affected_component}`,
          message: validated.description + (validated.cve_id ? ` (${validated.cve_id})` : ''),
          urgency: validated.severity === 'P1' ? 5 : validated.severity === 'P2' ? 3 : 2,
          category: 'security',
          metadata: {
            cve_id: validated.cve_id,
            affected_component: validated.affected_component,
            remediation_steps: validated.remediation_steps
          }
        });
      } catch (notifyErr) {
        logger.warn(`[bode/sendSecurityAlert] Notification fallback — logged only: ${notifyErr.message}`);
      }

      const result = {
        alert_id: `sec-${Date.now()}`,
        flow_id: 'E3',
        channels_notified: channels,
        severity: validated.severity,
        acknowledged: false,
        timestamp: new Date().toISOString()
      };

      span.setStatus({ code: 1 });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}

registerSkill('bode', 'sendSecurityAlert', sendSecurityAlert);

export { sendSecurityAlert };
