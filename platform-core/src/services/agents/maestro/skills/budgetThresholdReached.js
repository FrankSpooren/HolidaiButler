/**
 * CD5: boekhouder -> maestro budget threshold orchestration
 * Fase 19.D -- Cross-Domain & Meta-Flows
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  budget_category: z.string(),
  threshold_pct: z.number().min(0).max(100),
  current_spend: z.number(),
  budget_limit: z.number(),
  period: z.string()
});

const OutputSchema = z.object({
  action_taken: z.string(),
  agents_notified: z.number(),
  budget_category: z.string()
});

async function budgetThresholdReached(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-maestro');

  return await tracer.startActiveSpan('maestro.budgetThresholdReached', async (span) => {
    span.setAttributes({
      'flow.id': 'CD5',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('budget.category', validated.budget_category);
    span.setAttribute('budget.threshold_pct', validated.threshold_pct);
    const action = validated.threshold_pct >= 90 ? 'pause_non_essential' : 'notify_only';
    return OutputSchema.parse({
      action_taken: action,
      agents_notified: validated.threshold_pct >= 90 ? 5 : 1,
      budget_category: validated.budget_category
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

registerSkill('maestro', 'budgetThresholdReached', budgetThresholdReached);

export { budgetThresholdReached };
