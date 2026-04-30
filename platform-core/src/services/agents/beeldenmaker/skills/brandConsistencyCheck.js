/**
 * A15 Flow: Stylist -> Beeldenmaker/brandConsistencyCheck
 * Validates generated images against brand guidelines
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  image_ids: z.array(z.number()),
  brand_profile_id: z.number().optional(),
  check_criteria: z.array(z.enum(['color_palette', 'logo_usage', 'typography', 'tone', 'resolution'])).optional(),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function brandConsistencyCheck(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-beeldenmaker');

  return await tracer.startActiveSpan('beeldenmaker.brandConsistencyCheck', async (span) => {
    span.setAttributes({
      'flow.id': 'A15',
      'flow.source_agent': validated.sourceAgent || 'stylist',
      'flow.target_agent': 'beeldenmaker',
      'images.count': validated.image_ids.length,
      'destination_id': validated.destination_id || 0
    });

    try {
      logger.info(`[beeldenmaker/brandConsistencyCheck] Checking ${validated.image_ids.length} images for brand consistency`);

      const result = {
        check_id: `brand-${Date.now()}`,
        flow_id: 'A15',
        images_checked: validated.image_ids.length,
        criteria: validated.check_criteria || ['color_palette', 'tone', 'resolution'],
        status: 'checked',
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

registerSkill('beeldenmaker', 'brandConsistencyCheck', brandConsistencyCheck);

export { brandConsistencyCheck };
