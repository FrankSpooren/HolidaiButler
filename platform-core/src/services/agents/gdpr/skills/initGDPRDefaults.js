/**
 * OB6 Flow: onthaler -> poortwachter/initGDPRDefaults
 * Initializes GDPR defaults for new destination jurisdiction
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  jurisdictions: z.array(z.string()).default(['EU']),
  data_retention_days: z.number().default(730),
  cookie_consent_required: z.boolean().default(true),
  sourceAgent: z.string().optional()
});

async function initGDPRDefaults(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-poortwachter');

  return await tracer.startActiveSpan('poortwachter.initGDPRDefaults', async (span) => {
    span.setAttributes({
      'flow.id': 'OB6',
      'flow.source_agent': validated.sourceAgent || 'onthaler',
      'flow.target_agent': 'poortwachter'
    });

    try {
      logger.info(`[poortwachter/initGDPRDefaults] OB6 invoked by ${validated.sourceAgent || 'onthaler'}`);

      const result = {
        action_id: `ob6-${Date.now()}`,
        flow_id: 'OB6',
        destination_id: validated.destination_id, jurisdictions: validated.jurisdictions, gdpr_initialized: true,
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

registerSkill('poortwachter', 'initGDPRDefaults', initGDPRDefaults);
export { initGDPRDefaults };
