/**
 * C5 Flow: kassier -> beeldenmaker/pauseProcessing
 * Pause image processing due to budget
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
  const tracer = trace.getTracer('hb-beeldenmaker');

  return await tracer.startActiveSpan('beeldenmaker.pauseProcessing', async (span) => {
    span.setAttributes({
      'flow.id': 'C5',
      'flow.source_agent': validated.sourceAgent || 'kassier',
      'flow.target_agent': 'beeldenmaker'
    });

    try {
      logger.info(`[beeldenmaker/pauseProcessing] C5 invoked by ${validated.sourceAgent || 'kassier'}`);

      const result = {
        action_id: 'c5-' + Date.now(),
        flow_id: 'C5',
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

registerSkill('beeldenmaker', 'pauseProcessing', pauseProcessing);
export { pauseProcessing };
