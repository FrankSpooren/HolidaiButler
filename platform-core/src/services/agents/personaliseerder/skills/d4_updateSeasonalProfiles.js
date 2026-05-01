/**
 * D4 Flow: trendspotter -> personaliseerder/updateSeasonalProfiles
 * Update seasonal personalization profiles
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  season: z.string(), weatherData: z.any().optional(), destinationId: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function updateSeasonalProfiles(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-personaliseerder');

  return await tracer.startActiveSpan('personaliseerder.updateSeasonalProfiles', async (span) => {
    span.setAttributes({
      'flow.id': 'D4',
      'flow.source_agent': validated.sourceAgent || 'trendspotter',
      'flow.target_agent': 'personaliseerder'
    });

    try {
      logger.info(`[personaliseerder/updateSeasonalProfiles] D4 invoked by ${validated.sourceAgent || 'trendspotter'}`);

      const result = {
        action_id: 'd4-' + Date.now(),
        flow_id: 'D4',
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

registerSkill('personaliseerder', 'updateSeasonalProfiles', updateSeasonalProfiles);
export { updateSeasonalProfiles };
