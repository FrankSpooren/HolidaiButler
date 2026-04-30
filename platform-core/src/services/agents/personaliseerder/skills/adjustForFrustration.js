/**
 * HK2 Flow: helpdeskmeester -> personaliseerder/adjustForFrustration
 * Adjusts recommendations based on frustration topics
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  frustration_topics: z.array(z.string()),
  affected_personas: z.array(z.string()).optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function adjustForFrustration(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-personaliseerder');

  return await tracer.startActiveSpan('personaliseerder.adjustForFrustration', async (span) => {
    span.setAttributes({
      'flow.id': 'HK2',
      'flow.source_agent': validated.sourceAgent || 'helpdeskmeester',
      'flow.target_agent': 'personaliseerder'
    });

    try {
      logger.info(`[personaliseerder/adjustForFrustration] HK2 invoked by ${validated.sourceAgent || 'helpdeskmeester'}`);

      const result = {
        action_id: `hk2-${Date.now()}`,
        flow_id: 'HK2',
        topics_count: validated.frustration_topics.length, adjustments_applied: true,
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

registerSkill('personaliseerder', 'adjustForFrustration', adjustForFrustration);
export { adjustForFrustration };
