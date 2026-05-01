/**
 * C6 Flow: kassier -> beeldenmaker/resumeProcessing
 * Resume image processing
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
  const tracer = trace.getTracer('hb-beeldenmaker');

  return await tracer.startActiveSpan('beeldenmaker.resumeProcessing', async (span) => {
    span.setAttributes({
      'flow.id': 'C6',
      'flow.source_agent': validated.sourceAgent || 'kassier',
      'flow.target_agent': 'beeldenmaker'
    });

    try {
      logger.info(`[beeldenmaker/resumeProcessing] C6 invoked by ${validated.sourceAgent || 'kassier'}`);

      const result = {
        action_id: 'c6-' + Date.now(),
        flow_id: 'C6',
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

registerSkill('beeldenmaker', 'resumeProcessing', resumeProcessing);
export { resumeProcessing };
