/**
 * GF2 Flow: reisleider -> trendspotter/reportUserTrend
 * Report user behavior trend for analysis
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  trendType: z.string(), data: z.any().optional(), destinationId: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function reportUserTrend(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-trendspotter');

  return await tracer.startActiveSpan('trendspotter.reportUserTrend', async (span) => {
    span.setAttributes({
      'flow.id': 'GF2',
      'flow.source_agent': validated.sourceAgent || 'reisleider',
      'flow.target_agent': 'trendspotter'
    });

    try {
      logger.info(`[trendspotter/reportUserTrend] GF2 invoked by ${validated.sourceAgent || 'reisleider'}`);

      const result = {
        action_id: 'gf2-' + Date.now(),
        flow_id: 'GF2',
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

registerSkill('trendspotter', 'reportUserTrend', reportUserTrend);
export { reportUserTrend };
