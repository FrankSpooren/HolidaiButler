/**
 * TA3 Flow: trendspotter -> beeldenmaker/generateTrendVisuals
 * Generates visuals for trending topics
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  trend_keyword: z.string(),
  visual_types: z.array(z.enum(['hero', 'social', 'thumbnail'])).default(['social']),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function generateTrendVisuals(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-beeldenmaker');

  return await tracer.startActiveSpan('beeldenmaker.generateTrendVisuals', async (span) => {
    span.setAttributes({
      'flow.id': 'TA3',
      'flow.source_agent': validated.sourceAgent || 'trendspotter',
      'flow.target_agent': 'beeldenmaker'
    });

    try {
      logger.info(`[beeldenmaker/generateTrendVisuals] TA3 invoked by ${validated.sourceAgent || 'trendspotter'}`);

      const result = {
        action_id: `ta3-${Date.now()}`,
        flow_id: 'TA3',
        trend_keyword: validated.trend_keyword, visuals_queued: validated.visual_types.length,
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

registerSkill('beeldenmaker', 'generateTrendVisuals', generateTrendVisuals);
export { generateTrendVisuals };
