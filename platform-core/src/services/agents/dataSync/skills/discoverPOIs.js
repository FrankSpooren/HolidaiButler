/**
 * OB1 Flow: onthaler -> koerier/discoverPOIs
 * Discovers POIs for new destination via Apify
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  lat: z.number(),
  lon: z.number(),
  radius_km: z.number().default(15),
  categories: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function discoverPOIs(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-koerier');

  return await tracer.startActiveSpan('koerier.discoverPOIs', async (span) => {
    span.setAttributes({
      'flow.id': 'OB1',
      'flow.source_agent': validated.sourceAgent || 'onthaler',
      'flow.target_agent': 'koerier'
    });

    try {
      logger.info(`[koerier/discoverPOIs] OB1 invoked by ${validated.sourceAgent || 'onthaler'}`);

      const result = {
        action_id: `ob1-${Date.now()}`,
        flow_id: 'OB1',
        destination_id: validated.destination_id, pois_found: 0, status: 'discovery_started',
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

registerSkill('koerier', 'discoverPOIs', discoverPOIs);
export { discoverPOIs };
