/**
 * ACK4: personaliseerder -> reisleider profile update acknowledgement
 * Fase 19.C -- Bidirectional Closure
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  user_id: z.string(),
  original_flow_id: z.string(),
  profile_version: z.number(),
  updates_applied: z.array(z.string()),
  destination_id: z.number().optional()
});

const OutputSchema = z.object({
  acknowledged: z.boolean(),
  journey_refresh_needed: z.boolean(),
  user_id: z.string()
});

async function profileUpdated(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-reisleider');

  return await tracer.startActiveSpan('reisleider.profileUpdated', async (span) => {
    span.setAttributes({
      'flow.id': 'ACK4',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('ack.user_id', validated.user_id);
    span.setAttribute('ack.profile_version', validated.profile_version);

    const refreshNeeded = validated.updates_applied.length > 2;

    return OutputSchema.parse({
      acknowledged: true,
      journey_refresh_needed: refreshNeeded,
      user_id: validated.user_id
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

registerSkill('reisleider', 'profileUpdated', profileUpdated);

export { profileUpdated };
