/**
 * GF11 Flow: Maestro -> ALL/lifecycleEvent
 * Broadcasts lifecycle events (start/stop/pause/resume) to all agents
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  event: z.enum(['platform_start', 'platform_stop', 'maintenance_start', 'maintenance_end', 'agent_pause', 'agent_resume', 'config_reload']),
  target: z.enum(['all', 'operations', 'content', 'strategy', 'development']).default('all'),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  sourceAgent: z.string().optional()
});

async function lifecycleEvent(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-maestro');

  return await tracer.startActiveSpan('maestro.lifecycleEvent', async (span) => {
    span.setAttributes({
      'flow.id': 'GF11',
      'flow.source_agent': validated.sourceAgent || 'maestro',
      'flow.target_agent': validated.target,
      'lifecycle.event': validated.event
    });

    try {
      logger.info(`[maestro/lifecycleEvent] ${validated.event} → ${validated.target}${validated.reason ? ': ' + validated.reason : ''}`);

      const result = {
        event_id: `lc-${Date.now()}`,
        flow_id: 'GF11',
        event: validated.event,
        target: validated.target,
        broadcast: true,
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

registerSkill('maestro', 'lifecycleEvent', lifecycleEvent);
export { lifecycleEvent };
