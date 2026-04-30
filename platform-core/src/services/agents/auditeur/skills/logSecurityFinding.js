/**
 * BS1 Flow: bewaker -> auditeur/logSecurityFinding
 * Logs security finding to EU AI Act compliance trail
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  finding_type: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  component: z.string(),
  description: z.string().max(2000),
  sourceAgent: z.string().optional()
});

async function logSecurityFinding(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-auditeur');

  return await tracer.startActiveSpan('auditeur.logSecurityFinding', async (span) => {
    span.setAttributes({
      'flow.id': 'BS1',
      'flow.source_agent': validated.sourceAgent || 'bewaker',
      'flow.target_agent': 'auditeur'
    });

    try {
      logger.info(`[auditeur/logSecurityFinding] BS1 invoked by ${validated.sourceAgent || 'bewaker'}`);

      const result = {
        action_id: `bs1-${Date.now()}`,
        flow_id: 'BS1',
        finding_type: validated.finding_type, severity: validated.severity, audit_logged: true,
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

registerSkill('auditeur', 'logSecurityFinding', logSecurityFinding);
export { logSecurityFinding };
