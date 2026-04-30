/**
 * C9 Flow: Auditeur -> Poortwachter/gdprViolation
 * Notifies GDPR agent when compliance audit detects a potential GDPR violation
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  violation_type: z.enum(['data_retention', 'consent_missing', 'pii_exposure', 'cross_border', 'access_request_overdue', 'breach_notification']),
  description: z.string().max(2000),
  affected_records: z.number().optional(),
  gdpr_article: z.string().optional(),
  remediation_required: z.boolean().default(true),
  deadline_hours: z.number().default(72),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function gdprViolation(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-poortwachter');

  return await tracer.startActiveSpan('poortwachter.gdprViolation', async (span) => {
    span.setAttributes({
      'flow.id': 'C9',
      'flow.source_agent': validated.sourceAgent || 'auditeur',
      'flow.target_agent': 'poortwachter',
      'violation.type': validated.violation_type,
      'violation.affected_records': validated.affected_records || 0,
      'destination_id': validated.destination_id || 0
    });

    try {
      // GDPR violations are always high priority
      const severity = validated.violation_type === 'pii_exposure' || validated.violation_type === 'breach_notification'
        ? 'critical' : 'high';

      logger.warn(`[poortwachter/gdprViolation] ${severity} ${validated.violation_type}: ${validated.description}`);

      const result = {
        violation_id: `gdpr-${Date.now()}`,
        flow_id: 'C9',
        violation_type: validated.violation_type,
        severity,
        remediation_required: validated.remediation_required,
        deadline_hours: validated.deadline_hours,
        gdpr_article: validated.gdpr_article,
        status: 'investigation_started',
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

registerSkill('poortwachter', 'gdprViolation', gdprViolation);

export { gdprViolation };
