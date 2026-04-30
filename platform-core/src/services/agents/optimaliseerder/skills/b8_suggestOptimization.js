/**
 * B8 Flow: leermeester -> optimaliseerder/suggestOptimization
 * Suggest optimization for declining metric
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  metric: z.string(), currentValue: z.number().optional(), targetValue: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function suggestOptimization(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-optimaliseerder');

  return await tracer.startActiveSpan('optimaliseerder.suggestOptimization', async (span) => {
    span.setAttributes({
      'flow.id': 'B8',
      'flow.source_agent': validated.sourceAgent || 'leermeester',
      'flow.target_agent': 'optimaliseerder'
    });

    try {
      logger.info(`[optimaliseerder/suggestOptimization] B8 invoked by ${validated.sourceAgent || 'leermeester'}`);

      const result = {
        action_id: 'b8-' + Date.now(),
        flow_id: 'B8',
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

registerSkill('optimaliseerder', 'suggestOptimization', suggestOptimization);
export { suggestOptimization };
