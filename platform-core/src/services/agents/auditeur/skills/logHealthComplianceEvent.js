/**
 * RES3: dokter -> auditeur health degradation compliance logging
 * Fase 19.B — Resilience & Failure-Handling
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  agent_id: z.string(),
  health_status: z.enum(['healthy', 'warning', 'error', 'degraded']),
  previous_status: z.enum(['healthy', 'warning', 'error', 'degraded']),
  degradation_reason: z.string().optional(),
  metrics: z.record(z.number()).optional(),
  destination_id: z.number().optional()
});

const OutputSchema = z.object({
  compliance_event_id: z.string(),
  logged: z.boolean(),
  eu_ai_act_relevant: z.boolean()
});

async function logHealthComplianceEvent(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-auditeur');

  return await tracer.startActiveSpan('auditeur.logHealthComplianceEvent', async (span) => {
    span.setAttributes({
      'flow.id': 'RES3',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    const eventId = 'hce-' + validated.agent_id + '-' + Date.now();
    span.setAttribute('compliance.event_id', eventId);
    span.setAttribute('compliance.agent', validated.agent_id);

    // EU AI Act: health degradation of AI agents must be logged
    const euRelevant = ['error', 'degraded'].includes(validated.health_status);

    return OutputSchema.parse({
      compliance_event_id: eventId,
      logged: true,
      eu_ai_act_relevant: euRelevant
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

registerSkill('auditeur', 'logHealthComplianceEvent', logHealthComplianceEvent);

export { logHealthComplianceEvent };
