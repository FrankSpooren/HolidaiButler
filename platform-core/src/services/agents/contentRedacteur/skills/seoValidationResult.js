/**
 * ACK3: seoMeester -> redacteur SEO validation closed loop
 * Fase 19.C -- Bidirectional Closure
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  content_id: z.string(),
  original_flow_id: z.string(),
  seo_score: z.number().min(0).max(100),
  issues: z.array(z.object({
    type: z.string(),
    severity: z.enum(['error', 'warning', 'info']),
    message: z.string()
  })).optional(),
  passed: z.boolean()
});

const OutputSchema = z.object({
  acknowledged: z.boolean(),
  action: z.enum(['publish', 'revise', 'hold']),
  content_id: z.string()
});

async function seoValidationResult(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-contentRedacteur');

  return await tracer.startActiveSpan('contentRedacteur.seoValidationResult', async (span) => {
    span.setAttributes({
      'flow.id': 'ACK3',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('ack.content_id', validated.content_id);
    span.setAttribute('ack.seo_score', validated.seo_score);
    span.setAttribute('ack.passed', validated.passed);

    let action = 'publish';
    if (!validated.passed) action = validated.seo_score < 40 ? 'hold' : 'revise';

    return OutputSchema.parse({
      acknowledged: true,
      action,
      content_id: validated.content_id
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

registerSkill('contentRedacteur', 'seoValidationResult', seoValidationResult);

export { seoValidationResult };
