/**
 * CD2: maestro -> leermeester saga workflow outcome for learning
 * Fase 19.D -- Cross-Domain & Meta-Flows
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  workflow_id: z.string(),
  workflow_type: z.string(),
  outcome: z.enum(['success', 'partial', 'failed', 'compensated']),
  duration_ms: z.number().nonnegative(),
  steps_completed: z.number(),
  steps_total: z.number(),
  error_message: z.string().optional()
});

const OutputSchema = z.object({
  lesson_recorded: z.boolean(),
  pattern_detected: z.boolean(),
  workflow_type: z.string()
});

async function registerWorkflowOutcome(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-leermeester');

  return await tracer.startActiveSpan('leermeester.registerWorkflowOutcome', async (span) => {
    span.setAttributes({
      'flow.id': 'CD2',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('workflow.id', validated.workflow_id);
    span.setAttribute('workflow.outcome', validated.outcome);
    return OutputSchema.parse({
      lesson_recorded: true,
      pattern_detected: validated.outcome === 'failed',
      workflow_type: validated.workflow_type
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

registerSkill('leermeester', 'registerWorkflowOutcome', registerWorkflowOutcome);

export { registerWorkflowOutcome };
