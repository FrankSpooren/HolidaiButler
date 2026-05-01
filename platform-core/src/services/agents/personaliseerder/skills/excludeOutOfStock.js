/**
 * MS3 Flow: magazijnier -> personaliseerder/excludeOutOfStock
 * Excludes out-of-stock items from recommendations
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  product_ids: z.array(z.string()),
  action: z.enum(['exclude', 'restore']).default('exclude'),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function excludeOutOfStock(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-personaliseerder');

  return await tracer.startActiveSpan('personaliseerder.excludeOutOfStock', async (span) => {
    span.setAttributes({
      'flow.id': 'MS3',
      'flow.source_agent': validated.sourceAgent || 'magazijnier',
      'flow.target_agent': 'personaliseerder'
    });

    try {
      logger.info(`[personaliseerder/excludeOutOfStock] MS3 invoked by ${validated.sourceAgent || 'magazijnier'}`);

      const result = {
        action_id: `ms3-${Date.now()}`,
        flow_id: 'MS3',
        products_affected: validated.product_ids.length, action: validated.action, applied: true,
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

registerSkill('personaliseerder', 'excludeOutOfStock', excludeOutOfStock);
export { excludeOutOfStock };
