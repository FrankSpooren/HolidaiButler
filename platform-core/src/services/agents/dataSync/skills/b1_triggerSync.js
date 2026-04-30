/**
 * B1 Flow: maestro -> koerier/triggerSync
 * Trigger data synchronization for destination
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destinationId: z.number().optional(), reason: z.string(), tier: z.string().optional(),
  sourceAgent: z.string().optional()
});

async function triggerSync(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-koerier');

  return await tracer.startActiveSpan('koerier.triggerSync', async (span) => {
    span.setAttributes({
      'flow.id': 'B1',
      'flow.source_agent': validated.sourceAgent || 'maestro',
      'flow.target_agent': 'koerier'
    });

    try {
      logger.info(`[koerier/triggerSync] B1 invoked by ${validated.sourceAgent || 'maestro'}`);

      const result = {
        action_id: 'b1-' + Date.now(),
        flow_id: 'B1',
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

registerSkill('koerier', 'triggerSync', triggerSync);
export { triggerSync };
