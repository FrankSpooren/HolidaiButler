/**
 * RES4: bewaker -> maestro security halt on critical CVE detection
 * Fase 19.B — Resilience & Failure-Handling
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  cve_id: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  affected_component: z.string(),
  recommended_action: z.enum(['halt_all', 'halt_agent', 'degrade', 'monitor']),
  details: z.string().optional()
});

const OutputSchema = z.object({
  halt_executed: z.boolean(),
  action_taken: z.string(),
  affected_component: z.string()
});

async function securityHalt(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-maestro');

  return await tracer.startActiveSpan('maestro.securityHalt', async (span) => {
    span.setAttributes({
      'flow.id': 'RES4',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('security.severity', validated.severity);
    span.setAttribute('security.component', validated.affected_component);
    span.setAttribute('security.action', validated.recommended_action);

    return OutputSchema.parse({
      halt_executed: validated.severity === 'critical',
      action_taken: validated.recommended_action,
      affected_component: validated.affected_component
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

registerSkill('maestro', 'securityHalt', securityHalt);

export { securityHalt };
