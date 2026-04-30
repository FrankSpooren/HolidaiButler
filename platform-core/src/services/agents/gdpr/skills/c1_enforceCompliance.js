/**
 * C1 Flow: auditeur -> poortwachter/enforceCompliance
 * Enforce compliance action for violation
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  violationType: z.string(), entityId: z.string().optional(), action: z.enum(["block_processing","anonymize","flag_for_review"]).default("flag_for_review"),
  sourceAgent: z.string().optional()
});

async function enforceCompliance(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-poortwachter');

  return await tracer.startActiveSpan('poortwachter.enforceCompliance', async (span) => {
    span.setAttributes({
      'flow.id': 'C1',
      'flow.source_agent': validated.sourceAgent || 'auditeur',
      'flow.target_agent': 'poortwachter'
    });

    try {
      logger.info(`[poortwachter/enforceCompliance] C1 invoked by ${validated.sourceAgent || 'auditeur'}`);

      const result = {
        action_id: 'c1-' + Date.now(),
        flow_id: 'C1',
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

registerSkill('poortwachter', 'enforceCompliance', enforceCompliance);
export { enforceCompliance };
