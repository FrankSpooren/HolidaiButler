/**
 * D3 Flow: thermostaat -> leermeester/reportConfigEffect
 * Report effect of config change
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  configKey: z.string(), effect: z.string(), metricsBefore: z.object({ value: z.number() }).optional(), metricsAfter: z.object({ value: z.number() }).optional(),
  sourceAgent: z.string().optional()
});

async function reportConfigEffect(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-leermeester');

  return await tracer.startActiveSpan('leermeester.reportConfigEffect', async (span) => {
    span.setAttributes({
      'flow.id': 'D3',
      'flow.source_agent': validated.sourceAgent || 'thermostaat',
      'flow.target_agent': 'leermeester'
    });

    try {
      logger.info(`[leermeester/reportConfigEffect] D3 invoked by ${validated.sourceAgent || 'thermostaat'}`);

      const result = {
        action_id: 'd3-' + Date.now(),
        flow_id: 'D3',
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

registerSkill('leermeester', 'reportConfigEffect', reportConfigEffect);
export { reportConfigEffect };
