/**
 * ACK2: beeldenmaker -> redacteur image processing failure compensation
 * Fase 19.C -- Bidirectional Closure
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  content_id: z.string(),
  original_flow_id: z.string(),
  failure_reason: z.enum(['timeout', 'api_error', 'invalid_prompt', 'quota_exceeded']),
  retry_possible: z.boolean(),
  destination_id: z.number().optional()
});

const OutputSchema = z.object({
  acknowledged: z.boolean(),
  fallback_action: z.string(),
  content_id: z.string()
});

async function imageProcessingFailed(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-contentRedacteur');

  return await tracer.startActiveSpan('contentRedacteur.imageProcessingFailed', async (span) => {
    span.setAttributes({
      'flow.id': 'ACK2',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('ack.content_id', validated.content_id);
    span.setAttribute('ack.failure_reason', validated.failure_reason);

    const fallback = validated.retry_possible ? 'schedule_retry' : 'use_stock_image';

    return OutputSchema.parse({
      acknowledged: true,
      fallback_action: fallback,
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

registerSkill('contentRedacteur', 'imageProcessingFailed', imageProcessingFailed);

export { imageProcessingFailed };
