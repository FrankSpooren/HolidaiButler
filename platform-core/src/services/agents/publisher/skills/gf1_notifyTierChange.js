/**
 * GF1 Flow: promotor -> uitgever/notifyTierChange
 * Notify publisher of POI tier change
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  poiId: z.number(), oldTier: z.number(), newTier: z.number(), destinationId: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function notifyTierChange(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-uitgever');

  return await tracer.startActiveSpan('uitgever.notifyTierChange', async (span) => {
    span.setAttributes({
      'flow.id': 'GF1',
      'flow.source_agent': validated.sourceAgent || 'promotor',
      'flow.target_agent': 'uitgever'
    });

    try {
      logger.info(`[uitgever/notifyTierChange] GF1 invoked by ${validated.sourceAgent || 'promotor'}`);

      const result = {
        action_id: 'gf1-' + Date.now(),
        flow_id: 'GF1',
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

registerSkill('uitgever', 'notifyTierChange', notifyTierChange);
export { notifyTierChange };
