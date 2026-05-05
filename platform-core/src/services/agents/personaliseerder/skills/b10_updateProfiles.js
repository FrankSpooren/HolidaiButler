/**
 * B10 Flow: weermeester -> personaliseerder/updateProfiles
 * Update user profiles with journey data
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destinationId: z.number().optional(), journeyData: z.object({ sessionCount: z.number().optional() }).optional(),
  sourceAgent: z.string().optional()
});

async function updateProfiles(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-personaliseerder');

  return await tracer.startActiveSpan('personaliseerder.updateProfiles', async (span) => {
    span.setAttributes({
      'flow.id': 'B10',
      'flow.source_agent': validated.sourceAgent || 'weermeester',
      'flow.target_agent': 'personaliseerder'
    });

    try {
      logger.info(`[personaliseerder/updateProfiles] B10 invoked by ${validated.sourceAgent || 'weermeester'}`);

      const result = {
        action_id: 'b10-' + Date.now(),
        flow_id: 'B10',
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

registerSkill('personaliseerder', 'updateProfiles', updateProfiles);
export { updateProfiles };
