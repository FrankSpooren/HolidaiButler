/**
 * E7 Flow: Helpdeskmeester -> Bode SLA Alert
 * Dedicated skill for SLA breach/warning alerts from support monitoring
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  severity: z.enum(['P1', 'P2', 'P3']),
  sla_type: z.enum(['response_time', 'resolution_time', 'availability', 'escalation']),
  description: z.string().max(2000),
  ticket_id: z.string().optional(),
  sla_target: z.string().optional(),
  sla_actual: z.string().optional(),
  breach_count: z.number().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function sendSLAAlert(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bode');

  return await tracer.startActiveSpan('bode.sendSLAAlert', async (span) => {
    span.setAttributes({
      'flow.id': 'E7',
      'flow.source_agent': validated.sourceAgent || 'helpdeskmeester',
      'flow.target_agent': 'bode',
      'alert.severity': validated.severity,
      'alert.type': 'sla',
      'alert.sla_type': validated.sla_type,
      'destination_id': validated.destination_id || 0
    });

    try {
      const channels = [];

      if (validated.severity === 'P1') {
        channels.push('threema', 'email');
        logger.warn(`[bode/sendSLAAlert] CRITICAL SLA breach ${validated.sla_type}: ${validated.description}`);
      } else {
        channels.push('email');
        logger.info(`[bode/sendSLAAlert] ${validated.severity} SLA ${validated.sla_type}: ${validated.description}`);
      }

      try {
        const { default: OwnerInterfaceAgent } = await import('../../ownerInterfaceAgent/index.js');
        const agent = new OwnerInterfaceAgent();
        const slaStr = validated.sla_target && validated.sla_actual
          ? ` (target: ${validated.sla_target}, actual: ${validated.sla_actual})`
          : '';
        await agent.sendNotification({
          subject: `[${validated.severity}] SLA ${validated.sla_type}${slaStr}`,
          message: validated.description,
          urgency: validated.severity === 'P1' ? 5 : validated.severity === 'P2' ? 3 : 2,
          category: 'sla',
          metadata: {
            sla_type: validated.sla_type,
            ticket_id: validated.ticket_id,
            sla_target: validated.sla_target,
            sla_actual: validated.sla_actual,
            breach_count: validated.breach_count
          }
        });
      } catch (notifyErr) {
        logger.warn(`[bode/sendSLAAlert] Notification fallback — logged only: ${notifyErr.message}`);
      }

      const result = {
        alert_id: `sla-${Date.now()}`,
        flow_id: 'E7',
        channels_notified: channels,
        severity: validated.severity,
        sla_type: validated.sla_type,
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

registerSkill('bode', 'sendSLAAlert', sendSLAAlert);

export { sendSLAAlert };
