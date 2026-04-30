/**
 * ACK5: optimaliseerder -> performanceWachter A/B test started acknowledgement
 * Fase 19.C -- Bidirectional Closure
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  test_id: z.string(),
  original_flow_id: z.string(),
  variant_count: z.number().min(2),
  metric_to_track: z.string(),
  duration_days: z.number().positive(),
  destination_id: z.number().optional()
});

const OutputSchema = z.object({
  acknowledged: z.boolean(),
  monitoring_started: z.boolean(),
  test_id: z.string()
});

async function abTestStarted(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-performanceWachter');

  return await tracer.startActiveSpan('performanceWachter.abTestStarted', async (span) => {
    span.setAttributes({
      'flow.id': 'ACK5',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('ack.test_id', validated.test_id);
    span.setAttribute('ack.variants', validated.variant_count);
    span.setAttribute('ack.duration_days', validated.duration_days);

    return OutputSchema.parse({
      acknowledged: true,
      monitoring_started: true,
      test_id: validated.test_id
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

registerSkill('performanceWachter', 'abTestStarted', abTestStarted);

export { abTestStarted };
