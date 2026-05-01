/**
 * D8 Flow: optimaliseerder -> leermeester/reportOptimizationResult
 * Report A/B test or optimization result
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  experiment: z.string(), variant: z.string().optional(), result: z.string().optional(), liftPct: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function reportOptimizationResult(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-leermeester');

  return await tracer.startActiveSpan('leermeester.reportOptimizationResult', async (span) => {
    span.setAttributes({
      'flow.id': 'D8',
      'flow.source_agent': validated.sourceAgent || 'optimaliseerder',
      'flow.target_agent': 'leermeester'
    });

    try {
      logger.info(`[leermeester/reportOptimizationResult] D8 invoked by ${validated.sourceAgent || 'optimaliseerder'}`);

      const result = {
        action_id: 'd8-' + Date.now(),
        flow_id: 'D8',
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

registerSkill('leermeester', 'reportOptimizationResult', reportOptimizationResult);
export { reportOptimizationResult };
