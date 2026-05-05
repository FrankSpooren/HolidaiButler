/**
 * D10 Flow: personaliseerder -> weermeester/requestForecast
 * Request weather forecast for destination
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destinationId: z.number(), days: z.number().default(7),
  sourceAgent: z.string().optional()
});

async function requestForecast(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-weermeester');

  return await tracer.startActiveSpan('weermeester.requestForecast', async (span) => {
    span.setAttributes({
      'flow.id': 'D10',
      'flow.source_agent': validated.sourceAgent || 'personaliseerder',
      'flow.target_agent': 'weermeester'
    });

    try {
      logger.info(`[weermeester/requestForecast] D10 invoked by ${validated.sourceAgent || 'personaliseerder'}`);

      const result = {
        action_id: 'd10-' + Date.now(),
        flow_id: 'D10',
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

registerSkill('weermeester', 'requestForecast', requestForecast);
export { requestForecast };
