/**
 * GF6 Flow: Personaliseerder -> Trendspotter/recommendationMiss
 * Reports when personalization recommendations miss (user ignores/bounces)
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  recommendation_type: z.string(),
  poi_ids: z.array(z.number()).optional(),
  miss_reason: z.enum(['ignored', 'bounced', 'negative_feedback', 'irrelevant']),
  session_count: z.number().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function recommendationMiss(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-trendspotter');

  return await tracer.startActiveSpan('trendspotter.recommendationMiss', async (span) => {
    span.setAttributes({
      'flow.id': 'GF6',
      'flow.source_agent': validated.sourceAgent || 'personaliseerder',
      'flow.target_agent': 'trendspotter',
      'miss.reason': validated.miss_reason,
      'destination_id': validated.destination_id || 0
    });

    try {
      logger.info(`[trendspotter/recommendationMiss] ${validated.miss_reason}: ${validated.recommendation_type} (${validated.session_count || 0} sessions)`);

      const result = {
        miss_id: `rm-${Date.now()}`,
        flow_id: 'GF6',
        miss_reason: validated.miss_reason,
        recommendation_type: validated.recommendation_type,
        recorded: true,
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

registerSkill('trendspotter', 'recommendationMiss', recommendationMiss);
export { recommendationMiss };
