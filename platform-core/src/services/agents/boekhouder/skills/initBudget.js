/**
 * GF9 Flow: Onthaler -> Boekhouder/initBudget
 * Initializes budget tracking for new tenant/destination
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  destination_name: z.string(),
  monthly_budget: z.number().default(421),
  currency: z.string().default('EUR'),
  providers: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function initBudget(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-boekhouder');

  return await tracer.startActiveSpan('boekhouder.initBudget', async (span) => {
    span.setAttributes({
      'flow.id': 'GF9',
      'flow.source_agent': validated.sourceAgent || 'onthaler',
      'flow.target_agent': 'boekhouder',
      'destination_id': validated.destination_id,
      'budget.monthly': validated.monthly_budget
    });

    try {
      logger.info(`[boekhouder/initBudget] dest=${validated.destination_id} (${validated.destination_name}): ${validated.currency} ${validated.monthly_budget}/month`);

      const result = {
        budget_id: `bud-init-${Date.now()}`,
        flow_id: 'GF9',
        destination_id: validated.destination_id,
        monthly_budget: validated.monthly_budget,
        currency: validated.currency,
        status: 'initialized',
        timestamp: new Date().toISOString()
      };

      span.setStatus({ code: 1 });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}

registerSkill('boekhouder', 'initBudget', initBudget);
export { initBudget };
