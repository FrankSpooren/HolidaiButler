/**
 * E5 Flow: Boekhouder -> Bode Budget Alert
 * Dedicated skill for budget threshold alerts (approaching limit, exceeded, monthly report)
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  severity: z.enum(['P1', 'P2', 'P3']),
  alert_type: z.enum(['threshold_warning', 'budget_exceeded', 'monthly_report', 'provider_spike']),
  description: z.string().max(2000),
  budget_total: z.number().optional(),
  budget_used: z.number().optional(),
  budget_remaining: z.number().optional(),
  percentage_used: z.number().optional(),
  provider: z.string().optional(),
  period: z.string().optional(),
  currency: z.string().default('EUR'),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function sendBudgetAlert(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bode');

  return await tracer.startActiveSpan('bode.sendBudgetAlert', async (span) => {
    span.setAttributes({
      'flow.id': 'E5',
      'flow.source_agent': validated.sourceAgent || 'boekhouder',
      'flow.target_agent': 'bode',
      'alert.severity': validated.severity,
      'alert.type': 'budget',
      'alert.sub_type': validated.alert_type,
      'budget.percentage_used': validated.percentage_used || 0,
      'destination_id': validated.destination_id || 0
    });

    try {
      const channels = [];

      // Budget exceeded = P1 = Threema
      if (validated.severity === 'P1') {
        channels.push('threema', 'email');
        logger.warn(`[bode/sendBudgetAlert] CRITICAL P1 ${validated.alert_type}: ${validated.description}`);
      } else if (validated.alert_type === 'monthly_report') {
        channels.push('email');
        logger.info(`[bode/sendBudgetAlert] Monthly budget report: ${validated.percentage_used || 0}% used`);
      } else {
        channels.push('email');
        logger.info(`[bode/sendBudgetAlert] ${validated.severity} ${validated.alert_type}: ${validated.description}`);
      }

      try {
        const { default: OwnerInterfaceAgent } = await import('../../ownerInterfaceAgent/index.js');
        const agent = new OwnerInterfaceAgent();
        const budgetStr = validated.budget_used && validated.budget_total
          ? ` (${validated.currency} ${validated.budget_used.toFixed(2)}/${validated.budget_total.toFixed(2)})`
          : '';
        await agent.sendNotification({
          subject: `[${validated.severity}] Budget: ${validated.alert_type}${budgetStr}`,
          message: validated.description,
          urgency: validated.severity === 'P1' ? 5 : validated.severity === 'P2' ? 3 : 1,
          category: 'budget',
          metadata: {
            alert_type: validated.alert_type,
            budget_total: validated.budget_total,
            budget_used: validated.budget_used,
            budget_remaining: validated.budget_remaining,
            percentage_used: validated.percentage_used,
            provider: validated.provider,
            period: validated.period
          }
        });
      } catch (notifyErr) {
        logger.warn(`[bode/sendBudgetAlert] Notification fallback — logged only: ${notifyErr.message}`);
      }

      const result = {
        alert_id: `bud-${Date.now()}`,
        flow_id: 'E5',
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

registerSkill('bode', 'sendBudgetAlert', sendBudgetAlert);

export { sendBudgetAlert };
