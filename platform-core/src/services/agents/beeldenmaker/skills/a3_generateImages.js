/**
 * A3 Flow: redacteur -> beeldenmaker/generateImages
 * Image generation/selection for content
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  contentId: z.string(), topic: z.string(), destinationId: z.number().optional(), count: z.number().default(3),
  sourceAgent: z.string().optional()
});

async function generateImages(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-beeldenmaker');

  return await tracer.startActiveSpan('beeldenmaker.generateImages', async (span) => {
    span.setAttributes({
      'flow.id': 'A3',
      'flow.source_agent': validated.sourceAgent || 'redacteur',
      'flow.target_agent': 'beeldenmaker'
    });

    try {
      logger.info(`[beeldenmaker/generateImages] A3 invoked by ${validated.sourceAgent || 'redacteur'}`);

      const result = {
        action_id: 'a3-' + Date.now(),
        flow_id: 'A3',
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

registerSkill('beeldenmaker', 'generateImages', generateImages);
export { generateImages };
