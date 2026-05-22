import { createContext, useContext } from 'react';

/**
 * DestinationContext — passes huidige destinatie-info naar block editors.
 *
 * Wordt geïnstantieerd in PagesPage rondom de blocks-render-section, zodat
 * editors (HeroEditor, MapEditor, WeatherWidgetEditor, etc.) destinationId
 * + supportedLanguages kunnen lezen zonder prop-drilling via BlockEditorCard.
 *
 * Default: null destinationId — editors moeten daar tegen kunnen (graceful
 * degradation: geen quick-pick suggesties tonen indien null).
 *
 * @version BLOK C (22-05-2026) — voorzien voor BLOK E uitbreidingen (Map,
 *   Weather, FeaturedItem, OpeningHours, Chatbot block).
 */
export const DestinationContext = createContext({
  destinationId: null,
  destinationName: null,
  supportedLanguages: ['en', 'nl', 'de', 'es'],
  defaultLanguage: 'en',
  latitude: null,
  longitude: null
});

export function useDestination() {
  return useContext(DestinationContext);
}
