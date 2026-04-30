/**
 * CD6: kassier -> boekhouder revenue impact correlation
 * Fase 19.D -- Cross-Domain & Meta-Flows
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';

const InputSchema = z.object({
  revenue_source: z.enum(['ticketing', 'reservations', 'intermediary', 'subscriptions']),
  amount: z.number(),
  period: z.string(),
  destination_id: z.number(),
  trend: z.enum(['up', 'stable', 'down'])
});

const OutputSchema = z.object({
  impact_recorded: z.boolean(),
  cost_revenue_ratio: z.number().optional(),
  revenue_source: z.string()
});

async function revenueImpact(input, context) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-boekhouder');

  return await tracer.startActiveSpan('boekhouder.revenueImpact', async (span) => {
    span.setAttributes({
      'flow.id': 'CD6',
      'flow.source_agent': context?.sourceAgent || 'unknown'
    });

    try {
    span.setAttribute('revenue.source', validated.revenue_source);
    span.setAttribute('revenue.amount', validated.amount);
    span.setAttribute('revenue.trend', validated.trend);
    return OutputSchema.parse({
      impact_recorded: true,
      cost_revenue_ratio: undefined,
      revenue_source: validated.revenue_source
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

registerSkill('boekhouder', 'revenueImpact', revenueImpact);

export { revenueImpact };
