/**
 * GF4 Flow: onthaler -> boekhouder/registerTenant
 * Register new tenant for cost tracking
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  tenantName: z.string(), destinationId: z.number(), expectedCosts: z.object({ monthly: z.number(), currency: z.string().default("EUR") }).optional(),
  sourceAgent: z.string().optional()
});

async function registerTenant(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-boekhouder');

  return await tracer.startActiveSpan('boekhouder.registerTenant', async (span) => {
    span.setAttributes({
      'flow.id': 'GF4',
      'flow.source_agent': validated.sourceAgent || 'onthaler',
      'flow.target_agent': 'boekhouder'
    });

    try {
      logger.info(`[boekhouder/registerTenant] GF4 invoked by ${validated.sourceAgent || 'onthaler'}`);

      const result = {
        action_id: 'gf4-' + Date.now(),
        flow_id: 'GF4',
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

registerSkill('boekhouder', 'registerTenant', registerTenant);
export { registerTenant };
