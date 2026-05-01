/**
 * PF1 Flow: performanceWachter -> optimaliseerder/suggestABTest
 * Suggests A/B test when CTR drops below threshold
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  content_id: z.number(),
  current_ctr: z.number(),
  threshold_ctr: z.number(),
  suggestion: z.string().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function suggestABTest(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-optimaliseerder');

  return await tracer.startActiveSpan('optimaliseerder.suggestABTest', async (span) => {
    span.setAttributes({
      'flow.id': 'PF1',
      'flow.source_agent': validated.sourceAgent || 'performanceWachter',
      'flow.target_agent': 'optimaliseerder'
    });

    try {
      logger.info(`[optimaliseerder/suggestABTest] PF1 invoked by ${validated.sourceAgent || 'performanceWachter'}`);

      const result = {
        action_id: `pf1-${Date.now()}`,
        flow_id: 'PF1',
        content_id: validated.content_id, test_suggested: true,
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

registerSkill('optimaliseerder', 'suggestABTest', suggestABTest);
export { suggestABTest };
