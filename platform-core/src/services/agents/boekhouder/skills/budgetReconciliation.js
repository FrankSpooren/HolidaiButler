/**
 * C8 Flow: Kassier -> Boekhouder/budgetReconciliation
 * Triggers budget reconciliation when cost tracking detects discrepancies
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  period: z.string(),
  expected_total: z.number(),
  actual_total: z.number(),
  discrepancy: z.number(),
  currency: z.string().default('EUR'),
  providers: z.array(z.object({
    name: z.string(),
    expected: z.number(),
    actual: z.number()
  })).optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function budgetReconciliation(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-boekhouder');

  return await tracer.startActiveSpan('boekhouder.budgetReconciliation', async (span) => {
    span.setAttributes({
      'flow.id': 'C8',
      'flow.source_agent': validated.sourceAgent || 'kassier',
      'flow.target_agent': 'boekhouder',
      'reconciliation.period': validated.period,
      'reconciliation.discrepancy': validated.discrepancy,
      'destination_id': validated.destination_id || 0
    });

    try {
      const severity = Math.abs(validated.discrepancy) > 50 ? 'high' :
                       Math.abs(validated.discrepancy) > 10 ? 'medium' : 'low';

      logger.info(`[boekhouder/budgetReconciliation] Period ${validated.period}: discrepancy ${validated.currency} ${validated.discrepancy.toFixed(2)} (${severity})`);

      const result = {
        reconciliation_id: `rec-${Date.now()}`,
        flow_id: 'C8',
        period: validated.period,
        expected_total: validated.expected_total,
        actual_total: validated.actual_total,
        discrepancy: validated.discrepancy,
        severity,
        status: 'reconciled',
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

registerSkill('boekhouder', 'budgetReconciliation', budgetReconciliation);

export { budgetReconciliation };
