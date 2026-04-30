/**
 * GF10 Flow: Bewaker -> Auditeur/securityFinding
 * Reports security findings for EU AI Act compliance audit trail
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  finding_type: z.enum(['vulnerability', 'misconfiguration', 'access_violation', 'dependency_risk', 'data_exposure']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  component: z.string(),
  description: z.string().max(2000),
  cve_id: z.string().optional(),
  remediation: z.string().optional(),
  sourceAgent: z.string().optional()
});

async function securityFinding(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-auditeur');

  return await tracer.startActiveSpan('auditeur.securityFinding', async (span) => {
    span.setAttributes({
      'flow.id': 'GF10',
      'flow.source_agent': validated.sourceAgent || 'bewaker',
      'flow.target_agent': 'auditeur',
      'finding.type': validated.finding_type,
      'finding.severity': validated.severity
    });

    try {
      logger.info(`[auditeur/securityFinding] ${validated.severity} ${validated.finding_type}: ${validated.component} — ${validated.description.substring(0, 100)}`);

      const result = {
        finding_id: `sf-${Date.now()}`,
        flow_id: 'GF10',
        finding_type: validated.finding_type,
        severity: validated.severity,
        component: validated.component,
        audit_logged: true,
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

registerSkill('auditeur', 'securityFinding', securityFinding);
export { securityFinding };
