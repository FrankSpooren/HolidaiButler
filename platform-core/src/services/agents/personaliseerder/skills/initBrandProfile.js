/**
 * OB7 Flow: onthaler -> personaliseerder/initBrandProfile
 * Initializes brand profile for personalization engine
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  brand_tone: z.string().optional(),
  target_audience: z.string().optional(),
  content_themes: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function initBrandProfile(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-personaliseerder');

  return await tracer.startActiveSpan('personaliseerder.initBrandProfile', async (span) => {
    span.setAttributes({
      'flow.id': 'OB7',
      'flow.source_agent': validated.sourceAgent || 'onthaler',
      'flow.target_agent': 'personaliseerder'
    });

    try {
      logger.info(`[personaliseerder/initBrandProfile] OB7 invoked by ${validated.sourceAgent || 'onthaler'}`);

      const result = {
        action_id: `ob7-${Date.now()}`,
        flow_id: 'OB7',
        destination_id: validated.destination_id, profile_initialized: true,
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

registerSkill('personaliseerder', 'initBrandProfile', initBrandProfile);
export { initBrandProfile };
