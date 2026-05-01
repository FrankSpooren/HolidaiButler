/**
 * B14 Flow: Weermeester -> Personaliseerder/weatherContext
 * Provides weather context for personalization recommendations
 */
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { registerSkill } from '../../../../a2a/a2aSkillRegistry.js';
import logger from '../../../../utils/logger.js';

const InputSchema = z.object({
  destination_id: z.number(),
  weather: z.object({
    temperature: z.number(),
    condition: z.string(),
    wind_speed: z.number().optional(),
    precipitation_chance: z.number().optional(),
    uv_index: z.number().optional()
  }),
  forecast: z.array(z.object({
    date: z.string(),
    condition: z.string(),
    temp_min: z.number(),
    temp_max: z.number()
  })).optional(),
  recommendations: z.array(z.string()).optional(),
  sourceAgent: z.string().optional()
});

async function weatherContext(input) {
  const validated = InputSchema.parse(input);
  const tracer = trace.getTracer('hb-personaliseerder');

  return await tracer.startActiveSpan('personaliseerder.weatherContext', async (span) => {
    span.setAttributes({
      'flow.id': 'B14',
      'flow.source_agent': validated.sourceAgent || 'weermeester',
      'flow.target_agent': 'personaliseerder',
      'weather.temperature': validated.weather.temperature,
      'weather.condition': validated.weather.condition,
      'destination_id': validated.destination_id
    });

    try {
      // Derive activity context from weather
      const temp = validated.weather.temperature;
      const condition = validated.weather.condition.toLowerCase();
      const activityContext = [];

      if (temp > 25 && !condition.includes('rain')) activityContext.push('beach', 'outdoor_dining', 'water_sports');
      else if (temp > 15) activityContext.push('hiking', 'sightseeing', 'terrace');
      else activityContext.push('museums', 'indoor_activities', 'wellness');

      if (condition.includes('rain')) activityContext.push('indoor', 'shopping', 'spa');
      if (validated.weather.uv_index && validated.weather.uv_index > 7) activityContext.push('shade_preferred', 'evening_activities');

      logger.info(`[personaliseerder/weatherContext] dest=${validated.destination_id}, ${temp}C ${condition} → ${activityContext.join(', ')}`);

      const result = {
        context_id: `wx-${Date.now()}`,
        flow_id: 'B14',
        destination_id: validated.destination_id,
        activity_context: activityContext,
        weather_summary: `${temp}°C, ${validated.weather.condition}`,
        applied: true,
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

registerSkill('personaliseerder', 'weatherContext', weatherContext);

export { weatherContext };
