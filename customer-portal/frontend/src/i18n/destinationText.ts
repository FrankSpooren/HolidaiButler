/**
 * Destination-aware text processing
 *
 * This module provides functions to replace destination-specific placeholders
 * in translations with actual values from the destination config.
 *
 * Placeholders:
 * - {{destinationName}} - e.g., "TexelMaps" or "HolidaiButler"
 * - {{destinationLocation}} - e.g., "Texel" or "Calpe"
 * - {{destinationRegion}} - e.g., "Waddeneilanden" or "Costa Blanca"
 * - {{destinationTagline}} - e.g., "Ontdek Texel" or "Costa Blanca Experiences"
 */

import { getDestinationConfig, type DestinationConfig } from '../shared/contexts/DestinationContext';

// Destination-specific content for each destination
const destinationContent: Record<string, {
  name: string;
  location: string;
  region: string;
  tagline: string;
  footerTagline: Record<string, string>;
  footerMadeWith: Record<string, string>;
  holibotWelcome: Record<string, string>;
  holibotPlaceholder: Record<string, string>;
}> = {
  calpe: {
    name: 'HolidaiButler',
    location: 'Calpe',
    region: 'Costa Blanca',
    tagline: 'Costa Blanca Experiences',
    footerTagline: {
      nl: 'Jouw Persoonlijke Butler aan de Costa Blanca',
      en: 'Your Personal Butler on the Costa Blanca',
      de: 'Ihr persönlicher Butler an der Costa Blanca',
      es: 'Tu Butler Personal en la Costa Blanca',
      sv: 'Din Personliga Butler på Costa Blanca',
      pl: 'Twój Osobisty Butler na Costa Blanca',
    },
    footerMadeWith: {
      nl: 'Gemaakt met ❤️ in Costa Blanca',
      en: 'Made with ❤️ in Costa Blanca',
      de: 'Mit ❤️ an der Costa Blanca gemacht',
      es: 'Hecho con ❤️ en la Costa Blanca',
      sv: 'Gjord med ❤️ på Costa Blanca',
      pl: 'Stworzone z ❤️ na Costa Blanca',
    },
    holibotWelcome: {
      nl: 'Jouw persoonlijke Calpe-gids. Hoe kan ik je helpen?',
      en: 'Your personal Calpe guide. How can I help you?',
      de: 'Dein persönlicher Calpe-Guide. Wie kann ich dir helfen?',
      es: 'Tu guía personal de Calpe. ¿Cómo puedo ayudarte?',
      sv: 'Din personliga Calpe-guide. Hur kan jag hjälpa dig?',
      pl: 'Twój osobisty przewodnik po Calpe. Jak mogę Ci pomóc?',
    },
    holibotPlaceholder: {
      nl: 'Stel een vraag over Calpe...',
      en: 'Ask a question about Calpe...',
      de: 'Stelle eine Frage über Calpe...',
      es: 'Haz una pregunta sobre Calpe...',
      sv: 'Ställ en fråga om Calpe...',
      pl: 'Zadaj pytanie o Calpe...',
    },
  },
  texel: {
    name: 'TexelMaps',
    location: 'Texel',
    region: 'Waddeneilanden',
    tagline: 'Ontdek Texel',
    footerTagline: {
      nl: 'Jouw persoonlijke eilandgids voor Texel',
      en: 'Your personal island guide for Texel',
      de: 'Ihr persönlicher Inselführer für Texel',
      es: 'Tu guía personal de la isla de Texel',
      sv: 'Din personliga öguide för Texel',
      pl: 'Twój osobisty przewodnik po wyspie Texel',
    },
    footerMadeWith: {
      nl: 'Gemaakt met ❤️ voor Texel',
      en: 'Made with ❤️ for Texel',
      de: 'Mit ❤️ für Texel gemacht',
      es: 'Hecho con ❤️ para Texel',
      sv: 'Gjord med ❤️ för Texel',
      pl: 'Stworzone z ❤️ dla Texel',
    },
    holibotWelcome: {
      nl: 'Jouw persoonlijke Texel-gids. Hoe kan ik je helpen?',
      en: 'Your personal Texel guide. How can I help you?',
      de: 'Dein persönlicher Texel-Guide. Wie kann ich dir helfen?',
      es: 'Tu guía personal de Texel. ¿Cómo puedo ayudarte?',
      sv: 'Din personliga Texel-guide. Hur kan jag hjälpa dig?',
      pl: 'Twój osobisty przewodnik po Texel. Jak mogę Ci pomóc?',
    },
    holibotPlaceholder: {
      nl: 'Stel een vraag over Texel...',
      en: 'Ask a question about Texel...',
      de: 'Stelle eine Frage über Texel...',
      es: 'Haz una pregunta sobre Texel...',
      sv: 'Ställ en fråga om Texel...',
      pl: 'Zadaj pytanie o Texel...',
    },
  },
};

/**
 * Get destination-specific content based on current destination config
 */
export function getDestinationContent() {
  const config = getDestinationConfig();
  return destinationContent[config.id] || destinationContent.calpe;
}

/**
 * Replace destination placeholders in a string
 */
export function replaceDestinationPlaceholders(text: string, destConfig?: DestinationConfig): string {
  const config = destConfig || getDestinationConfig();
  const content = destinationContent[config.id] || destinationContent.calpe;

  return text
    .replace(/\{\{destinationName\}\}/g, content.name)
    .replace(/\{\{destinationLocation\}\}/g, content.location)
    .replace(/\{\{destinationRegion\}\}/g, content.region)
    .replace(/\{\{destinationTagline\}\}/g, content.tagline)
    // Also replace hardcoded values for backwards compatibility
    .replace(/HolidaiButler/g, content.name)
    .replace(/Calpe(?!\s*Turismo)/g, content.location) // Don't replace "Calpe Turismo"
    .replace(/Costa Blanca/g, content.region);
}

/**
 * Process an entire translations object and replace destination placeholders
 */
export function processTranslations<T>(translations: T, language: string): T {
  const config = getDestinationConfig();
  const content = destinationContent[config.id] || destinationContent.calpe;

  function processValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return replaceDestinationPlaceholders(value);
    }
    if (Array.isArray(value)) {
      return value.map(processValue);
    }
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = processValue(val);
      }
      return result;
    }
    return value;
  }

  // Process the translations object
  const processed = processValue(translations) as T;

  // Override specific fields with destination-specific content
  const lang = language as keyof typeof content.footerTagline;
  if (processed && typeof processed === 'object') {
    const p = processed as Record<string, unknown>;
    if (p.footer && typeof p.footer === 'object') {
      const footer = p.footer as Record<string, unknown>;
      footer.tagline = content.footerTagline[lang] || content.footerTagline.en;
      footer.madeWith = content.footerMadeWith[lang] || content.footerMadeWith.en;
      footer.copyright = `© ${new Date().getFullYear()} ${content.name}. Powered by AI. Made with love for travelers.`;
    }
    if (p.holibot && typeof p.holibot === 'object') {
      const holibot = p.holibot as Record<string, unknown>;
      holibot.welcomeSubtitle = content.holibotWelcome[lang] || content.holibotWelcome.en;
      holibot.inputPlaceholder = content.holibotPlaceholder[lang] || content.holibotPlaceholder.en;
    }
  }

  return processed;
}

export default {
  getDestinationContent,
  replaceDestinationPlaceholders,
  processTranslations,
};
