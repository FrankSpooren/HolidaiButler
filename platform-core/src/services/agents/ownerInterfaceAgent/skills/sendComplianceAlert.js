/**
 * E6 Flow: Auditeur -> Bode Compliance Alert
 * Dedicated skill for EU AI Act / GDPR compliance alerts
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  severity: z.enum(['P1', 'P2', 'P3']),
  compliance_type: z.enum(['eu_ai_act', 'gdpr', 'pci_dss', 'general']),
  description: z.string().max(2000),
  regulation_ref: z.string().optional(),
  affected_data: z.string().optional(),
  remediation_deadline: z.string().optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function sendComplianceAlert(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bode');

  return await tracer.startActiveSpan('bode.sendComplianceAlert', async (span) => {
    span.setAttributes({
      'flow.id': 'E6',
      'flow.source_agent': validated.sourceAgent || 'auditeur',
      'flow.target_agent': 'bode',
      'alert.severity': validated.severity,
      'alert.type': 'compliance',
      'alert.compliance_type': validated.compliance_type,
      'destination_id': validated.destination_id || 0
    });

    try {
      const channels = [];

      // GDPR P1 = always Threema (data breach risk)
      if (validated.severity === 'P1' || (validated.compliance_type === 'gdpr' && validated.severity === 'P2')) {
        channels.push('threema', 'email');
        logger.warn(`[bode/sendComplianceAlert] CRITICAL ${validated.compliance_type}: ${validated.description}`);
      } else {
        channels.push('email');
        logger.info(`[bode/sendComplianceAlert] ${validated.severity} ${validated.compliance_type}: ${validated.description}`);
      }

      try {
        const { default: OwnerInterfaceAgent } = await import('../../ownerInterfaceAgent/index.js');
        const agent = new OwnerInterfaceAgent();
        await agent.sendNotification({
          subject: `[${validated.severity}] Compliance ${validated.compliance_type.toUpperCase()}: ${validated.description.substring(0, 80)}`,
          message: validated.description + (validated.regulation_ref ? `\nRef: ${validated.regulation_ref}` : ''),
          urgency: validated.severity === 'P1' ? 5 : validated.severity === 'P2' ? 4 : 2,
          category: 'compliance',
          metadata: {
            compliance_type: validated.compliance_type,
            regulation_ref: validated.regulation_ref,
            affected_data: validated.affected_data,
            remediation_deadline: validated.remediation_deadline
          }
        });
      } catch (notifyErr) {
        logger.warn(`[bode/sendComplianceAlert] Notification fallback — logged only: ${notifyErr.message}`);
      }

      const result = {
        alert_id: `comp-${Date.now()}`,
        flow_id: 'E6',
        channels_notified: channels,
        severity: validated.severity,
        compliance_type: validated.compliance_type,
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

registerSkill('bode', 'sendComplianceAlert', sendComplianceAlert);

export { sendComplianceAlert };
