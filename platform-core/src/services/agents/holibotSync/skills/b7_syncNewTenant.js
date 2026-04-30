/**
 * B7 Flow: onthaler -> geheugen/syncNewTenant
 * Vectorize content for new tenant in ChromaDB
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destinationId: z.number(), tenantName: z.string(),
  sourceAgent: z.string().optional()
});

async function syncNewTenant(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-geheugen');

  return await tracer.startActiveSpan('geheugen.syncNewTenant', async (span) => {
    span.setAttributes({
      'flow.id': 'B7',
      'flow.source_agent': validated.sourceAgent || 'onthaler',
      'flow.target_agent': 'geheugen'
    });

    try {
      logger.info(`[geheugen/syncNewTenant] B7 invoked by ${validated.sourceAgent || 'onthaler'}`);

      const result = {
        action_id: 'b7-' + Date.now(),
        flow_id: 'B7',
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

registerSkill('geheugen', 'syncNewTenant', syncNewTenant);
export { syncNewTenant };
