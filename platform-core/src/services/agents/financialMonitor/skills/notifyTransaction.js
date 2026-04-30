/**
 * B12 Flow: Makelaar -> Kassier/notifyTransaction
 * Notifies kassier of new intermediary transactions for budget tracking
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  transaction_id: z.string(),
  transaction_type: z.enum(['booking', 'ticket', 'reservation', 'refund', 'payout']),
  amount: z.number(),
  currency: z.string().default('EUR'),
  partner_id: z.number().optional(),
  destination_id: z.number().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('pending'),
  sourceAgent: z.string().optional()
});

async function notifyTransaction(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-kassier');

  return await tracer.startActiveSpan('kassier.notifyTransaction', async (span) => {
    span.setAttributes({
      'flow.id': 'B12',
      'flow.source_agent': validated.sourceAgent || 'makelaar',
      'flow.target_agent': 'kassier',
      'transaction.type': validated.transaction_type,
      'transaction.amount': validated.amount,
      'transaction.status': validated.status,
      'destination_id': validated.destination_id || 0
    });

    try {
      logger.info(`[kassier/notifyTransaction] ${validated.transaction_type} ${validated.currency} ${validated.amount.toFixed(2)} (${validated.status}) from ${validated.sourceAgent || 'makelaar'}`);

      // Track against monthly budget
      const budgetImpact = validated.transaction_type === 'refund' ? -validated.amount : validated.amount;

      const result = {
        notification_id: `txn-${Date.now()}`,
        flow_id: 'B12',
        transaction_id: validated.transaction_id,
        transaction_type: validated.transaction_type,
        budget_impact: budgetImpact,
        currency: validated.currency,
        recorded: true,
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

registerSkill('kassier', 'notifyTransaction', notifyTransaction);

export { notifyTransaction };
