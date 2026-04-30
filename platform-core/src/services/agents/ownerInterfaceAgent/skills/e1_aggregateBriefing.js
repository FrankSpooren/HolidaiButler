/**
 * E1 Flow: ALL -> bode/aggregateBriefing
 * Aggregate agent reports for daily briefing
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  reports: z.array(z.object({ agentId: z.string(), status: z.string(), highlight: z.string().optional() })).default([]), date: z.string().optional(),
  sourceAgent: z.string().optional()
});

async function aggregateBriefing(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bode');

  return await tracer.startActiveSpan('bode.aggregateBriefing', async (span) => {
    span.setAttributes({
      'flow.id': 'E1',
      'flow.source_agent': validated.sourceAgent || 'ALL',
      'flow.target_agent': 'bode'
    });

    try {
      logger.info(`[bode/aggregateBriefing] E1 invoked by ${validated.sourceAgent || 'ALL'}`);

      const result = {
        action_id: 'e1-' + Date.now(),
        flow_id: 'E1',
        success: true,
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

registerSkill('bode', 'aggregateBriefing', aggregateBriefing);
export { aggregateBriefing };
