/**
 * A10 Flow: uitgever -> performanceWachter/trackPublication
 * Track published content performance
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  contentId: z.string(), publishedAt: z.string(), channel: z.string(), destinationId: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function trackPublication(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-performanceWachter');

  return await tracer.startActiveSpan('performanceWachter.trackPublication', async (span) => {
    span.setAttributes({
      'flow.id': 'A10',
      'flow.source_agent': validated.sourceAgent || 'uitgever',
      'flow.target_agent': 'performanceWachter'
    });

    try {
      logger.info(`[performanceWachter/trackPublication] A10 invoked by ${validated.sourceAgent || 'uitgever'}`);

      const result = {
        action_id: 'a10-' + Date.now(),
        flow_id: 'A10',
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

registerSkill('performanceWachter', 'trackPublication', trackPublication);
export { trackPublication };
