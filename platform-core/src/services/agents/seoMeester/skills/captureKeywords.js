/**
 * TA4 Flow: trendspotter -> seoMeester/captureKeywords
 * Captures trending keywords for SEO optimization
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  keywords: z.array(z.object({ keyword: z.string(), volume: z.number().optional(), trend: z.string().optional() })),
  sourceAgent: z.string().optional()
});

async function captureKeywords(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-seoMeester');

  return await tracer.startActiveSpan('seoMeester.captureKeywords', async (span) => {
    span.setAttributes({
      'flow.id': 'TA4',
      'flow.source_agent': validated.sourceAgent || 'trendspotter',
      'flow.target_agent': 'seoMeester'
    });

    try {
      logger.info(`[seoMeester/captureKeywords] TA4 invoked by ${validated.sourceAgent || 'trendspotter'}`);

      const result = {
        action_id: `ta4-${Date.now()}`,
        flow_id: 'TA4',
        destination_id: validated.destination_id, keywords_captured: validated.keywords.length,
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

registerSkill('seoMeester', 'captureKeywords', captureKeywords);
export { captureKeywords };
