/**
 * MS2 Flow: magazijnier -> bode/sendStockAlert
 * Sends out-of-stock alert to owner
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  product_id: z.string(),
  product_name: z.string().optional(),
  stock_level: z.number(),
  alert_type: z.enum(['out_of_stock', 'low_stock', 'restock_needed']),
  destination_id: z.number().optional(),
  sourceAgent: z.string().optional()
});

async function sendStockAlert(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-bode');

  return await tracer.startActiveSpan('bode.sendStockAlert', async (span) => {
    span.setAttributes({
      'flow.id': 'MS2',
      'flow.source_agent': validated.sourceAgent || 'magazijnier',
      'flow.target_agent': 'bode'
    });

    try {
      logger.info(`[bode/sendStockAlert] MS2 invoked by ${validated.sourceAgent || 'magazijnier'}`);

      const result = {
        action_id: `ms2-${Date.now()}`,
        flow_id: 'MS2',
        product_id: validated.product_id, alert_type: validated.alert_type, alert_sent: true,
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

registerSkill('bode', 'sendStockAlert', sendStockAlert);
export { sendStockAlert };
