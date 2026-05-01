/**
 * C5b Flow: kassier -> vertaler/pauseProcessing
 * Pause translation processing due to budget
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  reason: z.string(), budgetInfo: z.object({ spent: z.number(), limit: z.number() }).optional(),
  sourceAgent: z.string().optional()
});

async function pauseProcessing(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-vertaler');

  return await tracer.startActiveSpan('vertaler.pauseProcessing', async (span) => {
    span.setAttributes({
      'flow.id': 'C5b',
      'flow.source_agent': validated.sourceAgent || 'kassier',
      'flow.target_agent': 'vertaler'
    });

    try {
      logger.info(`[vertaler/pauseProcessing] C5b invoked by ${validated.sourceAgent || 'kassier'}`);

      const result = {
        action_id: 'c5b-' + Date.now(),
        flow_id: 'C5b',
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

registerSkill('vertaler', 'pauseProcessing', pauseProcessing);
export { pauseProcessing };
