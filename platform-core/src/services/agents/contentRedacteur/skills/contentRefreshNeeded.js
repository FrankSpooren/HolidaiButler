/**
 * A11 Flow: Verfrisser -> Redacteur/contentRefreshNeeded
 * Notifies redacteur when content freshness score drops below threshold
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  content_id: z.number(),
  content_type: z.enum(['poi_description', 'blog', 'social_post', 'page_block']),
  freshness_score: z.number().min(0).max(100),
  threshold: z.number().default(40),
  stale_reasons: z.array(z.string()).optional(),
  last_updated: z.string().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function contentRefreshNeeded(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.contentRefreshNeeded', async (span) => {
    span.setAttributes({
      'flow.id': 'A11',
      'flow.source_agent': validated.sourceAgent || 'verfrisser',
      'flow.target_agent': 'redacteur',
      'content.id': validated.content_id,
      'content.type': validated.content_type,
      'content.freshness_score': validated.freshness_score,
      'destination_id': validated.destination_id || 0
    });

    try {
      const priority = validated.freshness_score < 20 ? 'high' :
                       validated.freshness_score < validated.threshold ? 'medium' : 'low';

      logger.info(`[redacteur/contentRefreshNeeded] ${validated.content_type} #${validated.content_id}: freshness=${validated.freshness_score} (${priority})`);

      const result = {
        refresh_id: `ref-${Date.now()}`,
        flow_id: 'A11',
        content_id: validated.content_id,
        content_type: validated.content_type,
        freshness_score: validated.freshness_score,
        priority,
        queued: true,
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

registerSkill('redacteur', 'contentRefreshNeeded', contentRefreshNeeded);

export { contentRefreshNeeded };
