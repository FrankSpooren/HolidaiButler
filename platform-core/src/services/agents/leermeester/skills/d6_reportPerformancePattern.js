/**
 * D6 Flow: performanceWachter -> leermeester/reportPerformancePattern
 * Report recurring performance pattern
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  pattern: z.string(), metric: z.string().optional(), observation: z.string().optional(),
  sourceAgent: z.string().optional()
});

async function reportPerformancePattern(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-leermeester');

  return await tracer.startActiveSpan('leermeester.reportPerformancePattern', async (span) => {
    span.setAttributes({
      'flow.id': 'D6',
      'flow.source_agent': validated.sourceAgent || 'performanceWachter',
      'flow.target_agent': 'leermeester'
    });

    try {
      logger.info(`[leermeester/reportPerformancePattern] D6 invoked by ${validated.sourceAgent || 'performanceWachter'}`);

      const result = {
        action_id: 'd6-' + Date.now(),
        flow_id: 'D6',
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

registerSkill('leermeester', 'reportPerformancePattern', reportPerformancePattern);
export { reportPerformancePattern };
