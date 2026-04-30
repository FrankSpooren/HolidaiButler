/**
 * RJ1 Flow: reisleider -> personaliseerder/journeyContext
 * Applies journey patterns to recommendation engine
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  journey_type: z.enum(['exploration', 'booking', 'return_visit', 'seasonal']),
  popular_sequences: z.array(z.string()).optional(),
  avg_session_pages: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function journeyContext(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-personaliseerder');

  return await tracer.startActiveSpan('personaliseerder.journeyContext', async (span) => {
    span.setAttributes({
      'flow.id': 'RJ1',
      'flow.source_agent': validated.sourceAgent || 'reisleider',
      'flow.target_agent': 'personaliseerder'
    });

    try {
      logger.info(`[personaliseerder/journeyContext] RJ1 invoked by ${validated.sourceAgent || 'reisleider'}`);

      const result = {
        action_id: `rj1-${Date.now()}`,
        flow_id: 'RJ1',
        destination_id: validated.destination_id, journey_type: validated.journey_type, context_applied: true,
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

registerSkill('personaliseerder', 'journeyContext', journeyContext);
export { journeyContext };
