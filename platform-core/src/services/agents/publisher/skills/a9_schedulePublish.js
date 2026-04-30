/**
 * A9 Flow: redacteur -> uitgever/schedulePublish
 * Schedule approved content for publication
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  contentId: z.string(), publishAt: z.string().optional(), channels: z.array(z.string()).default(["website"]), destinationId: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function schedulePublish(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-uitgever');

  return await tracer.startActiveSpan('uitgever.schedulePublish', async (span) => {
    span.setAttributes({
      'flow.id': 'A9',
      'flow.source_agent': validated.sourceAgent || 'redacteur',
      'flow.target_agent': 'uitgever'
    });

    try {
      logger.info(`[uitgever/schedulePublish] A9 invoked by ${validated.sourceAgent || 'redacteur'}`);

      const result = {
        action_id: 'a9-' + Date.now(),
        flow_id: 'A9',
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

registerSkill('uitgever', 'schedulePublish', schedulePublish);
export { schedulePublish };
