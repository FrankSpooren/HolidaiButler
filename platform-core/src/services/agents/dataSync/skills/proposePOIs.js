/**
 * TA1 Flow: trendspotter -> koerier/proposePOIs
 * Proposes new POIs based on trending data
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  trend_keyword: z.string(),
  trend_direction: z.enum(['rising', 'stable']),
  suggested_categories: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function proposePOIs(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-koerier');

  return await tracer.startActiveSpan('koerier.proposePOIs', async (span) => {
    span.setAttributes({
      'flow.id': 'TA1',
      'flow.source_agent': validated.sourceAgent || 'trendspotter',
      'flow.target_agent': 'koerier'
    });

    try {
      logger.info(`[koerier/proposePOIs] TA1 invoked by ${validated.sourceAgent || 'trendspotter'}`);

      const result = {
        action_id: `ta1-${Date.now()}`,
        flow_id: 'TA1',
        destination_id: validated.destination_id, trend_keyword: validated.trend_keyword, proposals_queued: true,
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

registerSkill('koerier', 'proposePOIs', proposePOIs);
export { proposePOIs };
