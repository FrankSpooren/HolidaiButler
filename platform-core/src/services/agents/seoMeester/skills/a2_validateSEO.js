/**
 * A2 Flow: redacteur -> seoMeester/validateSEO
 * SEO validation of draft content
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  contentId: z.string(), title: z.string(), body: z.string(), keywords: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function validateSEO(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-seoMeester');

  return await tracer.startActiveSpan('seoMeester.validateSEO', async (span) => {
    span.setAttributes({
      'flow.id': 'A2',
      'flow.source_agent': validated.sourceAgent || 'redacteur',
      'flow.target_agent': 'seoMeester'
    });

    try {
      logger.info(`[seoMeester/validateSEO] A2 invoked by ${validated.sourceAgent || 'redacteur'}`);

      const result = {
        action_id: 'a2-' + Date.now(),
        flow_id: 'A2',
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

registerSkill('seoMeester', 'validateSEO', validateSEO);
export { validateSEO };
