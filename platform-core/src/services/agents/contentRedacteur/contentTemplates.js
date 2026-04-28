/**
 * Content Templates — Pre-defined templates per destination + content type
 * Used as first step in content generation.
 *
 * Tourism destinations: destination-specific + global + generic templates
 * Content-only destinations: generic + global templates (no tourism-specific)
 *
 * @version 2.0.0
 */

import { mysqlSequelize } from '../../../config/database.js';

// ============================================================
// DESTINATION-SPECIFIC TEMPLATES (tourism only)
// ============================================================

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

// ============================================================
// GLOBAL TEMPLATES — available for ALL destinations (tourism + content_only)
// ============================================================

const GLOBAL_TEMPLATES = [
  {
    id: 'global-hidden-gems',
    name: 'Verborgen Pareltjes',
    content_type: 'blog',
    platform: 'website',
    description: 'Ontdek verborgen schatten die alleen locals kennen',
    prompt_template: 'Write a blog post about hidden gems and local secrets in {destination}. Focus on lesser-known places that tourists usually miss. Include practical tips.',
    tone: 'warm, conversational, insider',
    suggested_keywords: ['hidden gems', 'local tips', 'off the beaten path'],
  },
  {
    id: 'global-seasonal-guide',
    name: 'Seizoensgids',
    content_type: 'blog',
    platform: 'website',
    description: 'Wat te doen dit seizoen — activiteiten, events en tips',
    prompt_template: 'Write a seasonal guide covering the current season. Include best activities, local events, weather expectations, and practical tips for visitors.',
    tone: 'informative, enthusiastic, helpful',
    suggested_keywords: ['season', 'what to do', 'activities', 'weather'],
  },
  {
    id: 'global-top-10',
    name: 'Top 10 Lijst',
    content_type: 'blog',
    platform: 'website',
    description: 'Top 10 lijst van de beste bezienswaardigheden of activiteiten',
    prompt_template: 'Write a top 10 list blog post about the best things to see or do. Make each entry descriptive with practical info and insider tips.',
    tone: 'authoritative, engaging, practical',
    suggested_keywords: ['top 10', 'best', 'must visit', 'highlights'],
  },
  {
    id: 'global-poi-spotlight',
    name: 'POI Spotlight',
    content_type: 'social_post',
    platform: 'instagram',
    description: 'Spotlight op een bijzondere locatie',
    prompt_template: 'Create an Instagram post highlighting a special place. Start with a captivating hook, describe what makes it unique, and end with a call-to-action.',
    tone: 'inspiring, visual, engaging',
    suggested_keywords: ['discover', 'visit', 'travel', 'explore'],
  },
  {
    id: 'global-event-promo',
    name: 'Event Promotie',
    content_type: 'social_post',
    platform: 'facebook',
    description: 'Promoot een aankomend event',
    prompt_template: 'Create a Facebook post promoting an upcoming event. Include date, location, what to expect, and why people should attend.',
    tone: 'enthusiastic, inviting, FOMO-inducing',
    suggested_keywords: ['event', 'join us', 'this weekend', 'dont miss'],
  },
  {
    id: 'global-daily-tip',
    name: 'Tip van de Dag',
    content_type: 'social_post',
    platform: 'instagram',
    description: 'Korte, krachtige tip voor bezoekers',
    prompt_template: 'Write a short daily tip for visitors. Keep it under 150 words. Include one practical piece of advice.',
    tone: 'friendly, concise, practical',
    suggested_keywords: ['tip', 'travel tip', 'insider', 'local advice'],
  },
  {
    id: 'global-restaurant-highlight',
    name: 'Restaurant Highlight',
    content_type: 'social_post',
    platform: 'instagram',
    description: 'Feature een restaurant of culinaire ervaring',
    prompt_template: 'Create a food-focused Instagram post highlighting a restaurant or culinary experience. Describe ambiance, signature dishes, and what makes it special.',
    tone: 'appetizing, descriptive, visual',
    suggested_keywords: ['foodie', 'dining', 'restaurant', 'gastronomy'],
  },
  {
    id: 'global-video-intro',
    name: 'Video Introductie',
    content_type: 'video_script',
    platform: 'youtube',
    description: 'Video script voor een introductievideo van de bestemming',
    prompt_template: 'Write a video script introducing the destination. Include hook (first 5 seconds), main content with 3-4 highlight scenes, and strong call-to-action ending.',
    tone: 'energetic, visual, storytelling',
    suggested_keywords: ['travel video', 'destination guide', 'explore'],
  },
];

// ============================================================
// GENERIC TEMPLATES — for content_only + tourism destinations
// Sector-agnostic: works for retail, horeca, cultuur, sport, etc.
// ============================================================

const GENERIC_TEMPLATES = [
  // === Blogs ===
  {
    id: 'generic-how-to-guide',
    name: 'How-To Gids',
    content_type: 'blog',
    platform: 'website',
    description: 'Stap-voor-stap handleiding over een onderwerp',
    prompt_template: 'Write a step-by-step guide about {topic}. Include practical tips, common mistakes to avoid, and actionable advice. Structure with numbered steps and clear headings.',
    tone: 'helpful, clear, authoritative',
    suggested_keywords: ['how to', 'guide', 'steps', 'tips'],
  },
  {
    id: 'generic-listicle',
    name: 'Lijstartikel',
    content_type: 'blog',
    platform: 'website',
    description: 'X beste / X redenen — lijstartikel formaat',
    prompt_template: 'Write a list article: "X best {topic}" with detailed descriptions per item. Each entry should have a clear benefit and practical info.',
    tone: 'engaging, scannable, informative',
    suggested_keywords: ['best', 'top', 'list', 'reasons'],
  },
  {
    id: 'generic-thought-leadership',
    name: 'Thought Leadership',
    content_type: 'blog',
    platform: 'website',
    description: 'Autoriteitsartikel met branche-inzichten en een duidelijke visie',
    prompt_template: 'Write an authoritative opinion piece about {topic}. Include industry insights, data points, and a clear perspective. Position the author as a knowledgeable expert.',
    tone: 'authoritative, insightful, professional',
    suggested_keywords: ['insight', 'trend', 'industry', 'perspective'],
  },
  {
    id: 'generic-company-news',
    name: 'Bedrijfsnieuws',
    content_type: 'blog',
    platform: 'website',
    description: 'Professioneel nieuwsbericht over een bedrijfsontwikkeling',
    prompt_template: 'Write a professional news announcement about {topic}. Include key facts, a quote from leadership, and the impact on customers or the market.',
    tone: 'professional, factual, forward-looking',
    suggested_keywords: ['announcement', 'launch', 'update', 'news'],
  },
  {
    id: 'generic-case-study',
    name: 'Case Study',
    content_type: 'blog',
    platform: 'website',
    description: 'Klantcase met uitdaging, aanpak en resultaten',
    prompt_template: 'Write a case study about {topic}. Structure: challenge the client faced, approach taken, concrete results achieved, and lessons learned.',
    tone: 'evidence-based, storytelling, professional',
    suggested_keywords: ['case study', 'results', 'success', 'solution'],
  },

  // === Social Posts ===
  {
    id: 'generic-product-highlight',
    name: 'Product Highlight',
    content_type: 'social_post',
    platform: 'instagram',
    description: 'Spotlight op een product of dienst — focus op voordelen',
    prompt_template: 'Create a social post highlighting {topic}. Focus on benefits (not features), use vivid language, and end with a clear call-to-action.',
    tone: 'enthusiastic, benefit-focused, visual',
    suggested_keywords: ['new', 'discover', 'available', 'quality'],
  },
  {
    id: 'generic-behind-scenes',
    name: 'Behind the Scenes',
    content_type: 'social_post',
    platform: 'instagram',
    description: 'Authentieke blik achter de schermen',
    prompt_template: 'Create an authentic behind-the-scenes post about {topic}. Show the human side of the brand. Be genuine and relatable.',
    tone: 'authentic, personal, relatable',
    suggested_keywords: ['behind the scenes', 'team', 'process', 'real'],
  },
  {
    id: 'generic-customer-story',
    name: 'Klantverhaal',
    content_type: 'social_post',
    platform: 'facebook',
    description: 'Deel een succesverhaal of review van een klant',
    prompt_template: 'Create a post sharing a customer success story about {topic}. Include a brief quote, the transformation or result, and gratitude.',
    tone: 'grateful, social-proof, inspiring',
    suggested_keywords: ['review', 'customer', 'thank you', 'story'],
  },
  {
    id: 'generic-tip-of-day',
    name: 'Tip van de Dag',
    content_type: 'social_post',
    platform: 'instagram',
    description: 'Korte, actiegerichte tip voor je doelgroep',
    prompt_template: 'Create a quick, actionable tip post about {topic}. Keep it concise (under 100 words). One practical piece of advice the reader can apply immediately.',
    tone: 'helpful, concise, actionable',
    suggested_keywords: ['tip', 'advice', 'pro tip', 'did you know'],
  },
  {
    id: 'generic-industry-insight',
    name: 'Branche Inzicht',
    content_type: 'social_post',
    platform: 'linkedin',
    description: 'Deel een branche-trend of inzicht op LinkedIn',
    prompt_template: 'Create a LinkedIn post sharing an industry trend or insight about {topic}. Start with a hook, provide data or evidence, and end with a question to drive engagement.',
    tone: 'professional, data-driven, thought-provoking',
    suggested_keywords: ['trend', 'insight', 'data', 'industry'],
  },
];

// ============================================================
// EXPORTS
// ============================================================

/**
 * Get templates for a destination
 * - Tourism: destination-specific + global + generic templates
 * - Content-only: generic + global templates (no tourism-specific)
 * @param {number} destinationId
 * @returns {Array} Template list
 */
export async function getTemplates(destinationId) {
  // Check destination type
  let isContentOnly = false;
  try {
    const [[dest]] = await mysqlSequelize.query(
      'SELECT destination_type FROM destinations WHERE id = :id',
      { replacements: { id: Number(destinationId) } }
    );
    isContentOnly = dest?.destination_type === 'content_only';
  } catch (err) { console.debug('[contentTemplates.js] default to tourism:', err.message); }

  if (isContentOnly) {
    // Content-only: generic templates first, then global (no destination-specific tourism templates)
    return [...GENERIC_TEMPLATES, ...GLOBAL_TEMPLATES];
  }

  // Tourism: destination-specific + generic + global
  const destTemplates = TEMPLATES[destinationId] || [];
  return [...destTemplates, ...GENERIC_TEMPLATES, ...GLOBAL_TEMPLATES];
}

/**
 * Synchronous version — for backward compatibility (uses fallback, no DB check)
 * @param {number} destinationId
 * @returns {Array}
 */
export function getTemplatesSync(destinationId) {
  const destTemplates = TEMPLATES[destinationId] || [];
  return [...destTemplates, ...GENERIC_TEMPLATES, ...GLOBAL_TEMPLATES];
}

/**
 * Get a specific template by ID
 * @param {string} templateId
 * @param {number} destinationId
 * @returns {Object|null}
 */
export async function getTemplate(templateId, destinationId) {
  const templates = await getTemplates(destinationId);
  return templates.find(t => t.id === templateId) || null;
}

/**
 * Get all templates across all destinations
 */
export function getAllTemplates() {
  return TEMPLATES;
}

export default { getTemplates, getTemplatesSync, getTemplate, getAllTemplates };
