/**
 * CD9: verfrisser -> auditeur stale content compliance reporting
 * Fase 19.D -- Cross-Domain & Meta-Flows
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  poi_id: z.number(),
  content_type: z.string(),
  days_stale: z.number().positive(),
  destination_id: z.number(),
  last_verified: z.string().optional()
});

const OutputSchema = z.object({
  compliance_logged: z.boolean(),
  action_required: z.boolean(),
  poi_id: z.number()
});

async function staleContentReported(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-auditeur');

  return await tracer.startActiveSpan('auditeur.staleContentReported', async (span) => {
    span.setAttributes({
      'flow.id': 'CD9',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('content.poi_id', validated.poi_id);
    span.setAttribute('content.days_stale', validated.days_stale);
    return OutputSchema.parse({
      compliance_logged: true,
      action_required: validated.days_stale > 90,
      poi_id: validated.poi_id
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

registerSkill('auditeur', 'staleContentReported', staleContentReported);

export { staleContentReported };
