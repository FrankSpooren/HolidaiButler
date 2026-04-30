/**
 * D2 Flow: maestro -> thermostaat/adjustConfig
 * Adjust agent configuration parameter
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  configKey: z.string(), oldValue: z.any(), newValue: z.any(), reason: z.string(),
  sourceAgent: z.string().optional()
});

async function adjustConfig(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-thermostaat');

  return await tracer.startActiveSpan('thermostaat.adjustConfig', async (span) => {
    span.setAttributes({
      'flow.id': 'D2',
      'flow.source_agent': validated.sourceAgent || 'maestro',
      'flow.target_agent': 'thermostaat'
    });

    try {
      logger.info(`[thermostaat/adjustConfig] D2 invoked by ${validated.sourceAgent || 'maestro'}`);

      const result = {
        action_id: 'd2-' + Date.now(),
        flow_id: 'D2',
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

registerSkill('thermostaat', 'adjustConfig', adjustConfig);
export { adjustConfig };
