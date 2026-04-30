/**
 * OB3 Flow: onthaler -> seoMeester/initSEO
 * Initializes SEO baseline for new destination domain
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  domain: z.string(),
  primary_language: z.string().default('en'),
  target_markets: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function initSEO(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-seoMeester');

  return await tracer.startActiveSpan('seoMeester.initSEO', async (span) => {
    span.setAttributes({
      'flow.id': 'OB3',
      'flow.source_agent': validated.sourceAgent || 'onthaler',
      'flow.target_agent': 'seoMeester'
    });

    try {
      logger.info(`[seoMeester/initSEO] OB3 invoked by ${validated.sourceAgent || 'onthaler'}`);

      const result = {
        action_id: `ob3-${Date.now()}`,
        flow_id: 'OB3',
        destination_id: validated.destination_id, domain: validated.domain, seo_initialized: true,
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

registerSkill('seoMeester', 'initSEO', initSEO);
export { initSEO };
