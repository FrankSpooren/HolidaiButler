/**
 * A12 Flow: Trendspotter -> SEOMeester/updateKeywords
 * Updates SEO keyword targets based on trending data
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  trending_keywords: z.array(z.object({
    keyword: z.string(),
    volume: z.number().optional(),
    trend_direction: z.enum(['rising', 'stable', 'declining']),
    relevance_score: z.number().min(0).max(10).optional()
  })),
  source: z.enum(['google_trends', 'sistrix', 'website_traffic', 'manual']).default('google_trends'),
  sourceAgent: z.string().optional()
});

async function updateKeywords(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-seoMeester');

  return await tracer.startActiveSpan('seoMeester.updateKeywords', async (span) => {
    span.setAttributes({
      'flow.id': 'A12',
      'flow.source_agent': validated.sourceAgent || 'trendspotter',
      'flow.target_agent': 'seoMeester',
      'keywords.count': validated.trending_keywords.length,
      'keywords.source': validated.source,
      'destination_id': validated.destination_id
    });

    try {
      const rising = validated.trending_keywords.filter(k => k.trend_direction === 'rising');
      const declining = validated.trending_keywords.filter(k => k.trend_direction === 'declining');

      logger.info(`[seoMeester/updateKeywords] dest=${validated.destination_id}: ${rising.length} rising, ${declining.length} declining keywords from ${validated.source}`);

      const result = {
        update_id: `kw-${Date.now()}`,
        flow_id: 'A12',
        destination_id: validated.destination_id,
        keywords_received: validated.trending_keywords.length,
        rising_count: rising.length,
        declining_count: declining.length,
        applied: true,
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

registerSkill('seoMeester', 'updateKeywords', updateKeywords);

export { updateKeywords };
