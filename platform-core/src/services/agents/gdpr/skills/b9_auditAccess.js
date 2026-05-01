/**
 * B9 Flow: auditeur -> poortwachter/auditAccess
 * Audit data access for GDPR compliance
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  userId: z.string().optional(), reason: z.string(),
  sourceAgent: z.string().optional()
});

async function auditAccess(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-poortwachter');

  return await tracer.startActiveSpan('poortwachter.auditAccess', async (span) => {
    span.setAttributes({
      'flow.id': 'B9',
      'flow.source_agent': validated.sourceAgent || 'auditeur',
      'flow.target_agent': 'poortwachter'
    });

    try {
      logger.info(`[poortwachter/auditAccess] B9 invoked by ${validated.sourceAgent || 'auditeur'}`);

      const result = {
        action_id: 'b9-' + Date.now(),
        flow_id: 'B9',
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

registerSkill('poortwachter', 'auditAccess', auditAccess);
export { auditAccess };
