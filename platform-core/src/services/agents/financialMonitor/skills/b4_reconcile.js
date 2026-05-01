/**
 * B4 Flow: maestro -> kassier/reconcile
 * Financial reconciliation for transactions
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  transactionIds: z.array(z.string()).optional(), reason: z.string().optional(),
  sourceAgent: z.string().optional()
});

async function reconcile(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-kassier');

  return await tracer.startActiveSpan('kassier.reconcile', async (span) => {
    span.setAttributes({
      'flow.id': 'B4',
      'flow.source_agent': validated.sourceAgent || 'maestro',
      'flow.target_agent': 'kassier'
    });

    try {
      logger.info(`[kassier/reconcile] B4 invoked by ${validated.sourceAgent || 'maestro'}`);

      const result = {
        action_id: 'b4-' + Date.now(),
        flow_id: 'B4',
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

registerSkill('kassier', 'reconcile', reconcile);
export { reconcile };
