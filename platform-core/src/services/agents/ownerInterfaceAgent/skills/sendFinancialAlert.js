/**
 * E4 Flow: Kassier -> Bode Financial Alert
 * Dedicated skill for financial alerts (budget overruns, payment failures, reconciliation issues)
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  severity: z.enum(['P1', 'P2', 'P3']),
  alert_type: z.enum(['budget_exceeded', 'payment_failure', 'reconciliation_error', 'cost_spike', 'provider_billing']),
  description: z.string().max(2000),
  amount: z.number().optional(),
  currency: z.string().default('EUR'),
  provider: z.string().optional(),
  budget_remaining: z.number().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function sendFinancialAlert(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bode');

  return await tracer.startActiveSpan('bode.sendFinancialAlert', async (span) => {
    span.setAttributes({
      'flow.id': 'E4',
      'flow.source_agent': validated.sourceAgent || 'kassier',
      'flow.target_agent': 'bode',
      'alert.severity': validated.severity,
      'alert.type': 'financial',
      'alert.sub_type': validated.alert_type,
      'destination_id': validated.destination_id || 0
    });

    try {
      const channels = [];

      // P1 financial alerts always go to Threema (money at risk)
      if (validated.severity === 'P1') {
        channels.push('threema', 'email');
        logger.warn(`[bode/sendFinancialAlert] CRITICAL P1 ${validated.alert_type}: ${validated.description}`);
      } else {
        channels.push('email');
        logger.info(`[bode/sendFinancialAlert] ${validated.severity} ${validated.alert_type}: ${validated.description}`);
      }

      try {
        const { default: OwnerInterfaceAgent } = await import('../../ownerInterfaceAgent/index.js');
        const agent = new OwnerInterfaceAgent();
        const amountStr = validated.amount ? ` (${validated.currency} ${validated.amount.toFixed(2)})` : '';
        await agent.sendNotification({
          subject: `[${validated.severity}] Financial: ${validated.alert_type}${amountStr}`,
          message: validated.description,
          urgency: validated.severity === 'P1' ? 5 : validated.severity === 'P2' ? 3 : 2,
          category: 'financial',
          metadata: {
            alert_type: validated.alert_type,
            amount: validated.amount,
            currency: validated.currency,
            provider: validated.provider,
            budget_remaining: validated.budget_remaining
          }
        });
      } catch (notifyErr) {
        logger.warn(`[bode/sendFinancialAlert] Notification fallback — logged only: ${notifyErr.message}`);
      }

      const result = {
        alert_id: `fin-${Date.now()}`,
        flow_id: 'E4',
        channels_notified: channels,
        severity: validated.severity,
        alert_type: validated.alert_type,
        acknowledged: false,
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

registerSkill('bode', 'sendFinancialAlert', sendFinancialAlert);

export { sendFinancialAlert };
