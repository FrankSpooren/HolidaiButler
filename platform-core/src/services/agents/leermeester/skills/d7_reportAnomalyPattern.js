/**
 * D7 Flow: anomaliedetective -> leermeester/reportAnomalyPattern
 * Report recurring anomaly pattern
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  anomalyType: z.string(), frequency: z.number().optional(), lastOccurrence: z.string().optional(),
  sourceAgent: z.string().optional()
});

async function reportAnomalyPattern(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-leermeester');

  return await tracer.startActiveSpan('leermeester.reportAnomalyPattern', async (span) => {
    span.setAttributes({
      'flow.id': 'D7',
      'flow.source_agent': validated.sourceAgent || 'anomaliedetective',
      'flow.target_agent': 'leermeester'
    });

    try {
      logger.info(`[leermeester/reportAnomalyPattern] D7 invoked by ${validated.sourceAgent || 'anomaliedetective'}`);

      const result = {
        action_id: 'd7-' + Date.now(),
        flow_id: 'D7',
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

registerSkill('leermeester', 'reportAnomalyPattern', reportAnomalyPattern);
export { reportAnomalyPattern };
