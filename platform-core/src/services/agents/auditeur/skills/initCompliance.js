/**
 * GF8 Flow: Onthaler -> Auditeur/initCompliance
 * Initializes compliance baseline for new tenant/destination
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  destination_name: z.string(),
  jurisdictions: z.array(z.string()).default(['EU']),
  compliance_types: z.array(z.enum(['gdpr', 'eu_ai_act', 'pci_dss', 'wcag'])).default(['gdpr', 'eu_ai_act']),
  sourceAgent: z.string().optional()
});

async function initCompliance(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-auditeur');

  return await tracer.startActiveSpan('auditeur.initCompliance', async (span) => {
    span.setAttributes({
      'flow.id': 'GF8',
      'flow.source_agent': validated.sourceAgent || 'onthaler',
      'flow.target_agent': 'auditeur',
      'destination_id': validated.destination_id,
      'compliance.types': validated.compliance_types.join(',')
    });

    try {
      logger.info(`[auditeur/initCompliance] dest=${validated.destination_id} (${validated.destination_name}): ${validated.compliance_types.join(', ')}`);

      const result = {
        baseline_id: `comp-init-${Date.now()}`,
        flow_id: 'GF8',
        destination_id: validated.destination_id,
        compliance_types: validated.compliance_types,
        jurisdictions: validated.jurisdictions,
        status: 'baseline_created',
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

registerSkill('auditeur', 'initCompliance', initCompliance);
export { initCompliance };
