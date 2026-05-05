/**
 * D5 Flow: trendspotter -> redacteur/suggestSeasonalContent
 * Suggest seasonal content based on weather trends
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  season: z.string(), weatherTrend: z.string().optional(), destinationId: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function suggestSeasonalContent(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-redacteur');

  return await tracer.startActiveSpan('redacteur.suggestSeasonalContent', async (span) => {
    span.setAttributes({
      'flow.id': 'D5',
      'flow.source_agent': validated.sourceAgent || 'trendspotter',
      'flow.target_agent': 'redacteur'
    });

    try {
      logger.info(`[redacteur/suggestSeasonalContent] D5 invoked by ${validated.sourceAgent || 'trendspotter'}`);

      const result = {
        action_id: 'd5-' + Date.now(),
        flow_id: 'D5',
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

registerSkill('redacteur', 'suggestSeasonalContent', suggestSeasonalContent);
export { suggestSeasonalContent };
