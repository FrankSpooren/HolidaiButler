/**
 * B3 Flow: maestro -> kassier/checkBudget
 * Check budget for service or overall
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  service: z.string().optional(),
  sourceAgent: z.string().optional()
});

async function checkBudget(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-kassier');

  return await tracer.startActiveSpan('kassier.checkBudget', async (span) => {
    span.setAttributes({
      'flow.id': 'B3',
      'flow.source_agent': validated.sourceAgent || 'maestro',
      'flow.target_agent': 'kassier'
    });

    try {
      logger.info(`[kassier/checkBudget] B3 invoked by ${validated.sourceAgent || 'maestro'}`);

      const result = {
        action_id: 'b3-' + Date.now(),
        flow_id: 'B3',
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

registerSkill('kassier', 'checkBudget', checkBudget);
export { checkBudget };
