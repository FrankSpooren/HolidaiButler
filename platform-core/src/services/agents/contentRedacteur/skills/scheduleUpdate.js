/**
 * PF2 Flow: performanceWachter -> redacteur/scheduleUpdate
 * Schedules content update for low-performing items
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  content_id: z.number(),
  reason: z.enum(['low_engagement', 'high_bounce', 'outdated', 'negative_feedback']),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function scheduleUpdate(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.scheduleUpdate', async (span) => {
    span.setAttributes({
      'flow.id': 'PF2',
      'flow.source_agent': validated.sourceAgent || 'performanceWachter',
      'flow.target_agent': 'redacteur'
    });

    try {
      logger.info(`[redacteur/scheduleUpdate] PF2 invoked by ${validated.sourceAgent || 'performanceWachter'}`);

      const result = {
        action_id: `pf2-${Date.now()}`,
        flow_id: 'PF2',
        content_id: validated.content_id, reason: validated.reason, update_scheduled: true,
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

registerSkill('redacteur', 'scheduleUpdate', scheduleUpdate);
export { scheduleUpdate };
