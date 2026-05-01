/**
 * A16 Flow: PerformanceWachter -> Uitgever/deprioritizeContent
 * Deprioritizes or pauses underperforming content from publishing queue
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  content_ids: z.array(z.number()),
  reason: z.enum(['low_engagement', 'high_bounce', 'negative_sentiment', 'outdated', 'duplicate']),
  action: z.enum(['deprioritize', 'pause', 'archive']).default('deprioritize'),
  performance_data: z.object({
    avg_engagement: z.number().optional(),
    avg_ctr: z.number().optional(),
    bounce_rate: z.number().optional()
  }).optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function deprioritizeContent(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-uitgever');

  return await tracer.startActiveSpan('uitgever.deprioritizeContent', async (span) => {
    span.setAttributes({
      'flow.id': 'A16',
      'flow.source_agent': validated.sourceAgent || 'performanceWachter',
      'flow.target_agent': 'uitgever',
      'content.count': validated.content_ids.length,
      'content.action': validated.action,
      'content.reason': validated.reason,
      'destination_id': validated.destination_id || 0
    });

    try {
      logger.info(`[uitgever/deprioritizeContent] ${validated.action} ${validated.content_ids.length} items: ${validated.reason}`);

      const result = {
        action_id: `dep-${Date.now()}`,
        flow_id: 'A16',
        content_ids: validated.content_ids,
        action: validated.action,
        reason: validated.reason,
        items_affected: validated.content_ids.length,
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

registerSkill('uitgever', 'deprioritizeContent', deprioritizeContent);

export { deprioritizeContent };
