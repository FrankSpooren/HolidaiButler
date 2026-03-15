/**
 * Content Templates — Pre-defined templates per destination + content type
 * Used as first step in content generation.
 *
 * @version 1.0.0
 */

const TEMPLATES = {
  1: [ // Calpe
    {
      id: 'calpe-hidden-gems',
      name: 'Verborgen Pareltjes',
      content_type: 'blog',
      platform: 'website',
      description: 'Ontdek de verborgen schatten van Calpe die alleen locals kennen',
      prompt_template: 'Write a blog post about hidden gems and local secrets in Calpe. Focus on lesser-known places that tourists usually miss. Include practical tips like best time to visit and how to get there.',
      tone: 'warm, conversational, insider',
      suggested_keywords: ['hidden gems', 'calpe secrets', 'local tips', 'off the beaten path'],
    },
    {
      id: 'calpe-seasonal-guide',
      name: 'Seizoensgids',
      content_type: 'blog',
      platform: 'website',
      description: 'Wat te doen in Calpe dit seizoen — activiteiten, events en tips',
      prompt_template: 'Write a seasonal guide for Calpe covering the current season. Include best activities, local events, weather expectations, and practical tips for visitors.',
      tone: 'informative, enthusiastic, helpful',
      suggested_keywords: ['calpe season', 'what to do', 'activities', 'weather'],
    },
    {
      id: 'calpe-poi-spotlight',
      name: 'POI Spotlight',
      content_type: 'social_post',
      platform: 'instagram',
      description: 'Spotlight op een bijzondere locatie in Calpe',
      prompt_template: 'Create an Instagram post highlighting a special place in Calpe. Start with a captivating hook, describe what makes this place unique, and end with a call-to-action.',
      tone: 'inspiring, visual, engaging',
      suggested_keywords: ['calpe', 'visit', 'discover', 'travel'],
    },
    {
      id: 'calpe-event-promo',
      name: 'Event Promotie',
      content_type: 'social_post',
      platform: 'facebook',
      description: 'Promoot een aankomend event in Calpe',
      prompt_template: 'Create a Facebook post promoting an upcoming event in Calpe. Include date, location, what to expect, and why people should attend.',
      tone: 'enthusiastic, inviting, FOMO-inducing',
      suggested_keywords: ['event', 'calpe', 'join us', 'this weekend'],
    },
    {
      id: 'calpe-daily-tip',
      name: 'Tip van de Dag',
      content_type: 'social_post',
      platform: 'instagram',
      description: 'Korte, krachtige tip voor bezoekers',
      prompt_template: 'Write a short daily tip for Calpe visitors. Keep it under 150 words. Include one practical piece of advice that makes their visit better.',
      tone: 'friendly, concise, practical',
      suggested_keywords: ['tip', 'calpe', 'travel tip', 'insider'],
    },
    {
      id: 'calpe-restaurant-highlight',
      name: 'Restaurant Highlight',
      content_type: 'social_post',
      platform: 'instagram',
      description: 'Feature een restaurant of culinaire ervaring',
      prompt_template: 'Create a food-focused Instagram post highlighting a restaurant or culinary experience in Calpe. Describe the ambiance, signature dishes, and what makes it special.',
      tone: 'appetizing, descriptive, visual',
      suggested_keywords: ['foodie', 'calpe dining', 'restaurant', 'gastronomy'],
    },
  ],
  2: [ // Texel
    {
      id: 'texel-hidden-gems',
      name: 'Verborgen Pareltjes',
      content_type: 'blog',
      platform: 'website',
      description: 'Ontdek de verborgen schatten van Texel',
      prompt_template: 'Write a blog post about hidden gems on Texel island. Focus on nature spots, quiet beaches, and local favorites that most tourists miss.',
      tone: 'adventurous, nature-loving, authentic',
      suggested_keywords: ['texel hidden gems', 'nature', 'wadden', 'island secrets'],
    },
    {
      id: 'texel-seasonal-guide',
      name: 'Seizoensgids',
      content_type: 'blog',
      platform: 'website',
      description: 'Wat te doen op Texel dit seizoen',
      prompt_template: 'Write a seasonal guide for Texel covering activities, wildlife watching, weather, and events for the current season.',
      tone: 'informative, enthusiastic, outdoor-focused',
      suggested_keywords: ['texel season', 'activities', 'wadden', 'nature'],
    },
    {
      id: 'texel-poi-spotlight',
      name: 'POI Spotlight',
      content_type: 'social_post',
      platform: 'instagram',
      description: 'Spotlight op een bijzondere plek op Texel',
      prompt_template: 'Create an Instagram post about a unique location on Texel. Highlight the natural beauty and what visitors can experience there.',
      tone: 'adventurous, visual, nature-inspired',
      suggested_keywords: ['texel', 'wadden', 'island', 'nature'],
    },
    {
      id: 'texel-event-promo',
      name: 'Event Promotie',
      content_type: 'social_post',
      platform: 'facebook',
      description: 'Promoot een Texels event',
      prompt_template: 'Create a Facebook post promoting an event on Texel. Emphasize the island atmosphere and unique experience.',
      tone: 'inviting, island-vibes, community-focused',
      suggested_keywords: ['texel event', 'island', 'join'],
    },
    {
      id: 'texel-daily-tip',
      name: 'Tip van de Dag',
      content_type: 'social_post',
      platform: 'instagram',
      description: 'Dagelijkse Texel tip',
      prompt_template: 'Write a short daily tip for Texel visitors. Focus on nature, weather-dependent activities, or local customs.',
      tone: 'friendly, outdoor, practical',
      suggested_keywords: ['texel tip', 'island', 'nature tip'],
    },
  ],
  4: [ // WarreWijzer
    {
      id: 'warre-nature-escape',
      name: 'Natuur Ontsnapping',
      content_type: 'blog',
      platform: 'website',
      description: 'Back to basics — ontspannen in de natuur van Warredal',
      prompt_template: 'Write a blog about disconnecting from daily life and reconnecting with nature at WarreWijzer. Focus on slow living, mindfulness, and the natural surroundings.',
      tone: 'calm, mindful, slow-living',
      suggested_keywords: ['slow living', 'nature', 'disconnect', 'warredal'],
    },
    {
      id: 'warre-family-activity',
      name: 'Gezinsactiviteit',
      content_type: 'social_post',
      platform: 'facebook',
      description: 'Leuke activiteiten voor het hele gezin',
      prompt_template: 'Create a Facebook post about family activities at WarreWijzer. Highlight what kids and parents can enjoy together.',
      tone: 'warm, family-friendly, playful',
      suggested_keywords: ['family', 'kids', 'activities', 'warredal'],
    },
  ],
};

/**
 * Get templates for a destination
 * @param {number} destinationId
 * @returns {Array} Template list
 */
export function getTemplates(destinationId) {
  return TEMPLATES[destinationId] || TEMPLATES[1]; // fallback to Calpe
}

/**
 * Get a specific template by ID
 * @param {string} templateId
 * @param {number} destinationId
 * @returns {Object|null}
 */
export function getTemplate(templateId, destinationId) {
  const templates = getTemplates(destinationId);
  return templates.find(t => t.id === templateId) || null;
}

/**
 * Get all templates across all destinations
 */
export function getAllTemplates() {
  return TEMPLATES;
}

export default { getTemplates, getTemplate, getAllTemplates };
