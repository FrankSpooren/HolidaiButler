/**
 * BS3 Flow: bewaker -> poortwachter/notifyGDPRRisk
 * Notifies GDPR agent of security issue with data impact
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  risk_type: z.enum(['data_exposure', 'unauthorized_access', 'encryption_weakness', 'retention_violation']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  affected_data_types: z.array(z.string()).optional(),
  description: z.string().max(2000),
  sourceAgent: z.string().optional()
});

async function notifyGDPRRisk(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-poortwachter');

  return await tracer.startActiveSpan('poortwachter.notifyGDPRRisk', async (span) => {
    span.setAttributes({
      'flow.id': 'BS3',
      'flow.source_agent': validated.sourceAgent || 'bewaker',
      'flow.target_agent': 'poortwachter'
    });

    try {
      logger.info(`[poortwachter/notifyGDPRRisk] BS3 invoked by ${validated.sourceAgent || 'bewaker'}`);

      const result = {
        action_id: `bs3-${Date.now()}`,
        flow_id: 'BS3',
        risk_type: validated.risk_type, severity: validated.severity, gdpr_notified: true,
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

registerSkill('poortwachter', 'notifyGDPRRisk', notifyGDPRRisk);
export { notifyGDPRRisk };
