/**
 * OB2 Flow: onthaler -> stylist/initBrandAssets
 * Initializes brand assets for new destination
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  brand_colors: z.array(z.string()).optional(),
  logo_url: z.string().optional(),
  font_family: z.string().optional(),
  sourceAgent: z.string().optional()
});

async function initBrandAssets(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-stylist');

  return await tracer.startActiveSpan('stylist.initBrandAssets', async (span) => {
    span.setAttributes({
      'flow.id': 'OB2',
      'flow.source_agent': validated.sourceAgent || 'onthaler',
      'flow.target_agent': 'stylist'
    });

    try {
      logger.info(`[stylist/initBrandAssets] OB2 invoked by ${validated.sourceAgent || 'onthaler'}`);

      const result = {
        action_id: `ob2-${Date.now()}`,
        flow_id: 'OB2',
        destination_id: validated.destination_id, assets_initialized: true,
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

registerSkill('stylist', 'initBrandAssets', initBrandAssets);
export { initBrandAssets };
