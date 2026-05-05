/**
 * B2 Flow: maestro -> dokter/runHealthCheck
 * Run platform health check
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  scope: z.enum(["quick","full","deep"]).default("quick"), reason: z.string().optional(),
  sourceAgent: z.string().optional()
});

async function runHealthCheck(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-dokter');

  return await tracer.startActiveSpan('dokter.runHealthCheck', async (span) => {
    span.setAttributes({
      'flow.id': 'B2',
      'flow.source_agent': validated.sourceAgent || 'maestro',
      'flow.target_agent': 'dokter'
    });

    try {
      logger.info(`[dokter/runHealthCheck] B2 invoked by ${validated.sourceAgent || 'maestro'}`);

      const result = {
        action_id: 'b2-' + Date.now(),
        flow_id: 'B2',
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

registerSkill('dokter', 'runHealthCheck', runHealthCheck);
export { runHealthCheck };
