/**
 * C3 Flow: kassier -> uitgever/pausePublishing
 * Pause all publishing due to budget
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  reason: z.string(), budgetInfo: z.object({ spent: z.number(), limit: z.number() }).optional(),
  sourceAgent: z.string().optional()
});

async function pausePublishing(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-uitgever');

  return await tracer.startActiveSpan('uitgever.pausePublishing', async (span) => {
    span.setAttributes({
      'flow.id': 'C3',
      'flow.source_agent': validated.sourceAgent || 'kassier',
      'flow.target_agent': 'uitgever'
    });

    try {
      logger.info(`[uitgever/pausePublishing] C3 invoked by ${validated.sourceAgent || 'kassier'}`);

      const result = {
        action_id: 'c3-' + Date.now(),
        flow_id: 'C3',
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

registerSkill('uitgever', 'pausePublishing', pausePublishing);
export { pausePublishing };
