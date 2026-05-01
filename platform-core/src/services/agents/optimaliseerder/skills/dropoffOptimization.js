/**
 * RJ2 Flow: reisleider -> optimaliseerder/dropoffOptimization
 * Optimizes pages with high drop-off rates
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  page_url: z.string(),
  dropoff_rate: z.number(),
  visitor_count: z.number().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function dropoffOptimization(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-optimaliseerder');

  return await tracer.startActiveSpan('optimaliseerder.dropoffOptimization', async (span) => {
    span.setAttributes({
      'flow.id': 'RJ2',
      'flow.source_agent': validated.sourceAgent || 'reisleider',
      'flow.target_agent': 'optimaliseerder'
    });

    try {
      logger.info(`[optimaliseerder/dropoffOptimization] RJ2 invoked by ${validated.sourceAgent || 'reisleider'}`);

      const result = {
        action_id: `rj2-${Date.now()}`,
        flow_id: 'RJ2',
        page_url: validated.page_url, dropoff_rate: validated.dropoff_rate, optimization_queued: true,
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

registerSkill('optimaliseerder', 'dropoffOptimization', dropoffOptimization);
export { dropoffOptimization };
