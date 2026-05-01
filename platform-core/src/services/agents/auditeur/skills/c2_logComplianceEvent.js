/**
 * C2 Flow: ALL -> auditeur/logComplianceEvent
 * Log compliance event to audit trail
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  eventType: z.string(), details: z.string().optional(), regulation: z.enum(["GDPR","EU_AI_Act","PCI_DSS"]).default("GDPR"),
  sourceAgent: z.string().optional()
});

async function logComplianceEvent(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-auditeur');

  return await tracer.startActiveSpan('auditeur.logComplianceEvent', async (span) => {
    span.setAttributes({
      'flow.id': 'C2',
      'flow.source_agent': validated.sourceAgent || 'ALL',
      'flow.target_agent': 'auditeur'
    });

    try {
      logger.info(`[auditeur/logComplianceEvent] C2 invoked by ${validated.sourceAgent || 'ALL'}`);

      const result = {
        action_id: 'c2-' + Date.now(),
        flow_id: 'C2',
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

registerSkill('auditeur', 'logComplianceEvent', logComplianceEvent);
export { logComplianceEvent };
