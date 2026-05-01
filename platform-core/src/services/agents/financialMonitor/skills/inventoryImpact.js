/**
 * B13 Flow: Magazijnier -> Kassier/inventoryImpact
 * Notifies kassier when inventory changes affect revenue potential
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  impact_type: z.enum(['out_of_stock', 'low_stock', 'restocked', 'expired']),
  product_id: z.string(),
  product_name: z.string().optional(),
  quantity_before: z.number().optional(),
  quantity_after: z.number(),
  estimated_revenue_impact: z.number().optional(),
  currency: z.string().default('EUR'),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function inventoryImpact(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-kassier');

  return await tracer.startActiveSpan('kassier.inventoryImpact', async (span) => {
    span.setAttributes({
      'flow.id': 'B13',
      'flow.source_agent': validated.sourceAgent || 'magazijnier',
      'flow.target_agent': 'kassier',
      'inventory.impact_type': validated.impact_type,
      'inventory.quantity_after': validated.quantity_after,
      'destination_id': validated.destination_id || 0
    });

    try {
      const severity = validated.impact_type === 'out_of_stock' ? 'high' :
                       validated.impact_type === 'low_stock' ? 'medium' : 'low';

      logger.info(`[kassier/inventoryImpact] ${validated.impact_type} ${validated.product_name || validated.product_id}: qty=${validated.quantity_after}, severity=${severity}`);

      const result = {
        impact_id: `inv-${Date.now()}`,
        flow_id: 'B13',
        impact_type: validated.impact_type,
        product_id: validated.product_id,
        severity,
        quantity_after: validated.quantity_after,
        estimated_revenue_impact: validated.estimated_revenue_impact || 0,
        recorded: true,
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

registerSkill('kassier', 'inventoryImpact', inventoryImpact);

export { inventoryImpact };
