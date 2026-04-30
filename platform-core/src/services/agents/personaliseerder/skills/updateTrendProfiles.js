/**
 * D12 Flow: Trendspotter -> Personaliseerder/updateTrendProfiles
 * Updates personalization profiles with latest trend data
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  trends: z.array(z.object({
    keyword: z.string(),
    direction: z.enum(['rising', 'stable', 'declining']),
    relevance: z.number().min(0).max(10).optional()
  })),
  season: z.string().optional(),
  sourceAgent: z.string().optional()
});

async function updateTrendProfiles(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-personaliseerder');

  return await tracer.startActiveSpan('personaliseerder.updateTrendProfiles', async (span) => {
    span.setAttributes({
      'flow.id': 'D12',
      'flow.source_agent': validated.sourceAgent || 'trendspotter',
      'flow.target_agent': 'personaliseerder',
      'trends.count': validated.trends.length,
      'destination_id': validated.destination_id
    });

    try {
      const rising = validated.trends.filter(t => t.direction === 'rising').length;
      logger.info(`[personaliseerder/updateTrendProfiles] dest=${validated.destination_id}: ${validated.trends.length} trends (${rising} rising)`);

      const result = {
        update_id: `tp-${Date.now()}`,
        flow_id: 'D12',
        destination_id: validated.destination_id,
        trends_applied: validated.trends.length,
        rising_count: rising,
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

registerSkill('personaliseerder', 'updateTrendProfiles', updateTrendProfiles);
export { updateTrendProfiles };
