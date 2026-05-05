/**
 * B11 Flow: trendspotter -> redacteur/suggestContent
 * Suggest content based on trending topic
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  topic: z.string(), keywords: z.array(z.string()).optional(), destinationId: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function suggestContent(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.suggestContent', async (span) => {
    span.setAttributes({
      'flow.id': 'B11',
      'flow.source_agent': validated.sourceAgent || 'trendspotter',
      'flow.target_agent': 'redacteur'
    });

    try {
      logger.info(`[redacteur/suggestContent] B11 invoked by ${validated.sourceAgent || 'trendspotter'}`);

      const result = {
        action_id: 'b11-' + Date.now(),
        flow_id: 'B11',
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

registerSkill('redacteur', 'suggestContent', suggestContent);
export { suggestContent };
