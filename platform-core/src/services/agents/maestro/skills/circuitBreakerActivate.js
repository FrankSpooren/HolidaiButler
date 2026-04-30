/**
 * RES2: maestro circuit breaker activation on failure-rate threshold
 * Fase 19.B — Resilience & Failure-Handling
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  target_agent: z.string(),
  failure_rate: z.number().min(0).max(1),
  threshold: z.number().min(0).max(1),
  window_minutes: z.number().positive(),
  action: z.enum(['open', 'half_open', 'close'])
});

const OutputSchema = z.object({
  circuit_state: z.string(),
  target_agent: z.string(),
  activated_at: z.string()
});

async function circuitBreakerActivate(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-maestro');

  return await tracer.startActiveSpan('maestro.circuitBreakerActivate', async (span) => {
    span.setAttributes({
      'flow.id': 'RES2',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('circuit.target', validated.target_agent);
    span.setAttribute('circuit.action', validated.action);
    span.setAttribute('circuit.failure_rate', validated.failure_rate);

    return OutputSchema.parse({
      circuit_state: validated.action,
      target_agent: validated.target_agent,
      activated_at: new Date().toISOString()
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

registerSkill('maestro', 'circuitBreakerActivate', circuitBreakerActivate);

export { circuitBreakerActivate };
