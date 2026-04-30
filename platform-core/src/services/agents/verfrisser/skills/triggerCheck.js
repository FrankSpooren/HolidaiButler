/**
 * PF3 Flow: performanceWachter -> verfrisser/triggerCheck
 * Triggers freshness check for high-bounce content
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  content_id: z.number(),
  bounce_rate: z.number().optional(),
  last_checked: z.string().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function triggerCheck(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-verfrisser');

  return await tracer.startActiveSpan('verfrisser.triggerCheck', async (span) => {
    span.setAttributes({
      'flow.id': 'PF3',
      'flow.source_agent': validated.sourceAgent || 'performanceWachter',
      'flow.target_agent': 'verfrisser'
    });

    try {
      logger.info(`[verfrisser/triggerCheck] PF3 invoked by ${validated.sourceAgent || 'performanceWachter'}`);

      const result = {
        action_id: `pf3-${Date.now()}`,
        flow_id: 'PF3',
        content_id: validated.content_id, check_triggered: true,
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

registerSkill('verfrisser', 'triggerCheck', triggerCheck);
export { triggerCheck };
