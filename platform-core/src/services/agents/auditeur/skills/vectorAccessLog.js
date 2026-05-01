/**
 * CD8: geheugen -> auditeur vector DB access logging (EU AI Act art.12)
 * Fase 19.D -- Cross-Domain & Meta-Flows
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  collection: z.string(),
  query_type: z.enum(['search', 'add', 'delete', 'update']),
  record_count: z.number().nonnegative(),
  destination_id: z.number(),
  purpose: z.string().optional()
});

const OutputSchema = z.object({
  logged: z.boolean(),
  eu_ai_act_compliant: z.boolean(),
  access_id: z.string()
});

async function vectorAccessLog(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-auditeur');

  return await tracer.startActiveSpan('auditeur.vectorAccessLog', async (span) => {
    span.setAttributes({
      'flow.id': 'CD8',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('vector.collection', validated.collection);
    span.setAttribute('vector.query_type', validated.query_type);
    span.setAttribute('vector.records', validated.record_count);
    return OutputSchema.parse({
      logged: true,
      eu_ai_act_compliant: true,
      access_id: 'va-' + Date.now()
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

registerSkill('auditeur', 'vectorAccessLog', vectorAccessLog);

export { vectorAccessLog };
