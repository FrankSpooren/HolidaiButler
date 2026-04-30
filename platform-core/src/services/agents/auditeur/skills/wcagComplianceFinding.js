/**
 * CD10: stylist -> auditeur WCAG compliance finding (legal)
 * Fase 19.D -- Cross-Domain & Meta-Flows
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  wcag_criterion: z.string(),
  severity: z.enum(['A', 'AA', 'AAA']),
  component: z.string(),
  description: z.string(),
  auto_fixable: z.boolean()
});

const OutputSchema = z.object({
  compliance_logged: z.boolean(),
  legal_risk: z.enum(['high', 'medium', 'low']),
  wcag_criterion: z.string()
});

async function wcagComplianceFinding(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-auditeur');

  return await tracer.startActiveSpan('auditeur.wcagComplianceFinding', async (span) => {
    span.setAttributes({
      'flow.id': 'CD10',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('wcag.criterion', validated.wcag_criterion);
    span.setAttribute('wcag.severity', validated.severity);
    const risk = validated.severity === 'A' ? 'high' : validated.severity === 'AA' ? 'medium' : 'low';
    return OutputSchema.parse({
      compliance_logged: true,
      legal_risk: risk,
      wcag_criterion: validated.wcag_criterion
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

registerSkill('auditeur', 'wcagComplianceFinding', wcagComplianceFinding);

export { wcagComplianceFinding };
