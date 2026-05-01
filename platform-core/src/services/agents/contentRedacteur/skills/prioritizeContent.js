/**
 * TA2 Flow: trendspotter -> redacteur/prioritizeContent
 * Prioritizes content creation based on trends
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  trend_keyword: z.string(),
  urgency: z.enum(['high', 'medium', 'low']).default('medium'),
  content_types: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function prioritizeContent(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.prioritizeContent', async (span) => {
    span.setAttributes({
      'flow.id': 'TA2',
      'flow.source_agent': validated.sourceAgent || 'trendspotter',
      'flow.target_agent': 'redacteur'
    });

    try {
      logger.info(`[redacteur/prioritizeContent] TA2 invoked by ${validated.sourceAgent || 'trendspotter'}`);

      const result = {
        action_id: `ta2-${Date.now()}`,
        flow_id: 'TA2',
        destination_id: validated.destination_id, trend_keyword: validated.trend_keyword, prioritized: true,
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

registerSkill('redacteur', 'prioritizeContent', prioritizeContent);
export { prioritizeContent };
