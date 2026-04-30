/**
 * C10 Flow: Boekhouder -> Auditeur/costComplianceCheck
 * Verifies that cost spending patterns comply with budget policies and EU regulations
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  period: z.string(),
  total_spend: z.number(),
  budget_limit: z.number(),
  currency: z.string().default('EUR'),
  provider_breakdown: z.array(z.object({
    provider: z.string(),
    amount: z.number(),
    category: z.string().optional()
  })).optional(),
  flags: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function costComplianceCheck(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-auditeur');

  return await tracer.startActiveSpan('auditeur.costComplianceCheck', async (span) => {
    span.setAttributes({
      'flow.id': 'C10',
      'flow.source_agent': validated.sourceAgent || 'boekhouder',
      'flow.target_agent': 'auditeur',
      'cost.total_spend': validated.total_spend,
      'cost.budget_limit': validated.budget_limit,
      'cost.utilization_pct': (validated.total_spend / validated.budget_limit * 100).toFixed(1)
    });

    try {
      const utilization = validated.total_spend / validated.budget_limit * 100;
      const compliance_status = utilization > 100 ? 'exceeded' :
                                utilization > 90 ? 'warning' :
                                utilization > 75 ? 'approaching' : 'compliant';

      const findings = [];
      if (utilization > 100) findings.push('Budget exceeded — immediate review required');
      if (utilization > 90) findings.push('Budget approaching limit — consider cost optimization');
      if (validated.flags && validated.flags.length > 0) findings.push(...validated.flags);

      logger.info(`[auditeur/costComplianceCheck] Period ${validated.period}: ${compliance_status} (${utilization.toFixed(1)}% of ${validated.currency} ${validated.budget_limit})`);

      const result = {
        audit_id: `cost-${Date.now()}`,
        flow_id: 'C10',
        period: validated.period,
        compliance_status,
        utilization_pct: parseFloat(utilization.toFixed(1)),
        findings,
        total_spend: validated.total_spend,
        budget_limit: validated.budget_limit,
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

registerSkill('auditeur', 'costComplianceCheck', costComplianceCheck);

export { costComplianceCheck };
