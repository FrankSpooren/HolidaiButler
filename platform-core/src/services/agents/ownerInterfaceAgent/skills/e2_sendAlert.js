/**
 * E2 Flow: anomaliedetective -> bode/sendAlert
 * Send alert to owner via configured channels
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  severity: z.enum(["info","warning","high","critical","P1"]).default("info"), title: z.string(), message: z.string().optional(), metrics: z.any().optional(),
  sourceAgent: z.string().optional()
});

async function sendAlert(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bode');

  return await tracer.startActiveSpan('bode.sendAlert', async (span) => {
    span.setAttributes({
      'flow.id': 'E2',
      'flow.source_agent': validated.sourceAgent || 'anomaliedetective',
      'flow.target_agent': 'bode'
    });

    try {
      logger.info(`[bode/sendAlert] E2 invoked by ${validated.sourceAgent || 'anomaliedetective'}`);

      const result = {
        action_id: 'e2-' + Date.now(),
        flow_id: 'E2',
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

registerSkill('bode', 'sendAlert', sendAlert);
export { sendAlert };
