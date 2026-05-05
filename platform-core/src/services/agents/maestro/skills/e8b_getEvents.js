/**
 * E8b Flow: ALL -> dashboard/getEvents
 * Get recent dashboard events for Admin Portal polling
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  since: z.string().optional(), limit: z.number().default(50),
  sourceAgent: z.string().optional()
});

async function getEvents(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-dashboard');

  return await tracer.startActiveSpan('dashboard.getEvents', async (span) => {
    span.setAttributes({
      'flow.id': 'E8b',
      'flow.source_agent': validated.sourceAgent || 'ALL',
      'flow.target_agent': 'dashboard'
    });

    try {
      logger.info(`[dashboard/getEvents] E8b invoked by ${validated.sourceAgent || 'ALL'}`);

      const result = {
        action_id: 'e8b-' + Date.now(),
        flow_id: 'E8b',
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

registerSkill('dashboard', 'getEvents', getEvents);
export { getEvents };
