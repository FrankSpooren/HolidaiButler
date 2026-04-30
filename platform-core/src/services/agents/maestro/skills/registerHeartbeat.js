/**
 * RES5: ALL agents -> maestro heartbeat registration
 * Fase 19.B — Resilience & Failure-Handling
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  agent_id: z.string(),
  status: z.enum(['alive', 'busy', 'draining']),
  uptime_seconds: z.number().nonnegative(),
  current_job: z.string().optional(),
  memory_mb: z.number().optional()
});

const OutputSchema = z.object({
  registered: z.boolean(),
  agent_id: z.string(),
  next_expected_seconds: z.number()
});

async function registerHeartbeat(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-maestro');

  return await tracer.startActiveSpan('maestro.registerHeartbeat', async (span) => {
    span.setAttributes({
      'flow.id': 'RES5',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('heartbeat.agent', validated.agent_id);
    span.setAttribute('heartbeat.status', validated.status);

    return OutputSchema.parse({
      registered: true,
      agent_id: validated.agent_id,
      next_expected_seconds: 30
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

registerSkill('maestro', 'registerHeartbeat', registerHeartbeat);

export { registerHeartbeat };
