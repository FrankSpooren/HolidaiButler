/**
 * ACK1: verkenner -> trendspotter discovery acknowledgement
 * Fase 19.C -- Bidirectional Closure
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  original_flow_id: z.string(),
  original_request_id: z.string(),
  status: z.enum(['success', 'partial', 'failed']),
  pois_discovered: z.number().min(0),
  pois_persisted: z.number().min(0),
  errors: z.array(z.string()).optional(),
  destination_id: z.number()
});

const OutputSchema = z.object({
  acknowledgement_id: z.string(),
  follow_up_triggered: z.boolean()
});

async function discoveryComplete(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-trendspotter');

  return await tracer.startActiveSpan('trendspotter.discoveryComplete', async (span) => {
    span.setAttributes({
      'flow.id': 'ACK1',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    const ackId = 'ack1-' + Date.now();
    span.setAttribute('ack.original_flow', validated.original_flow_id);
    span.setAttribute('ack.status', validated.status);
    span.setAttribute('ack.pois_persisted', validated.pois_persisted);

    const followUp = validated.status === 'partial' && validated.pois_persisted < 5;

    return OutputSchema.parse({
      acknowledgement_id: ackId,
      follow_up_triggered: followUp
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

registerSkill('trendspotter', 'discoveryComplete', discoveryComplete);

export { discoveryComplete };
