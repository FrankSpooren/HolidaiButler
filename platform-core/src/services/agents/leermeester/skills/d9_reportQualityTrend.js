/**
 * D9 Flow: inspecteur -> leermeester/reportQualityTrend
 * Report content quality trend
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  metric: z.string(), trend: z.enum(["improving","stable","declining"]), period: z.string().optional(), currentValue: z.number(), previousValue: z.number(),
  sourceAgent: z.string().optional()
});

async function reportQualityTrend(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-leermeester');

  return await tracer.startActiveSpan('leermeester.reportQualityTrend', async (span) => {
    span.setAttributes({
      'flow.id': 'D9',
      'flow.source_agent': validated.sourceAgent || 'inspecteur',
      'flow.target_agent': 'leermeester'
    });

    try {
      logger.info(`[leermeester/reportQualityTrend] D9 invoked by ${validated.sourceAgent || 'inspecteur'}`);

      const result = {
        action_id: 'd9-' + Date.now(),
        flow_id: 'D9',
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

registerSkill('leermeester', 'reportQualityTrend', reportQualityTrend);
export { reportQualityTrend };
