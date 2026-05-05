/**
 * C6b Flow: kassier -> vertaler/resumeProcessing
 * Resume translation processing
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  sourceAgent: z.string().optional()
});

async function resumeProcessing(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-vertaler');

  return await tracer.startActiveSpan('vertaler.resumeProcessing', async (span) => {
    span.setAttributes({
      'flow.id': 'C6b',
      'flow.source_agent': validated.sourceAgent || 'kassier',
      'flow.target_agent': 'vertaler'
    });

    try {
      logger.info(`[vertaler/resumeProcessing] C6b invoked by ${validated.sourceAgent || 'kassier'}`);

      const result = {
        action_id: 'c6b-' + Date.now(),
        flow_id: 'C6b',
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

registerSkill('vertaler', 'resumeProcessing', resumeProcessing);
export { resumeProcessing };
