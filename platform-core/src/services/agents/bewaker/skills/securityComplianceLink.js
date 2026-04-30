/**
 * CD4: auditeur -> bewaker EU AI Act + security compliance link
 * Fase 19.D -- Cross-Domain & Meta-Flows
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  compliance_area: z.enum(['eu_ai_act', 'gdpr', 'pci_dss', 'general_security']),
  finding_severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  description: z.string(),
  remediation_required: z.boolean()
});

const OutputSchema = z.object({
  security_assessment: z.string(),
  action_required: z.boolean(),
  compliance_area: z.string()
});

async function securityComplianceLink(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bewaker');

  return await tracer.startActiveSpan('bewaker.securityComplianceLink', async (span) => {
    span.setAttributes({
      'flow.id': 'CD4',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('compliance.area', validated.compliance_area);
    span.setAttribute('compliance.severity', validated.finding_severity);
    return OutputSchema.parse({
      security_assessment: validated.finding_severity === 'critical' ? 'immediate_action' : 'monitored',
      action_required: validated.remediation_required,
      compliance_area: validated.compliance_area
    });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}

registerSkill('bewaker', 'securityComplianceLink', securityComplianceLink);

export { securityComplianceLink };
