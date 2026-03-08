export const QUICK_ACTIONS: Record<string, Array<{ label: string; message: string }>> = {
  nl: [
    { label: 'Programma samenstellen', message: 'Stel een dagprogramma voor me samen op basis van mijn interesses en het weer van vandaag.' },
    { label: 'Zoeken op Rubriek', message: 'Welke categorieën zijn er? Laat me zoeken op rubriek.' },
    { label: 'Routebeschrijving', message: 'Ik wil een routebeschrijving. Welke bezienswaardigheden kan ik combineren in een route?' },
    { label: 'Tip van de Dag', message: 'Wat is jouw tip van de dag? Verras me met iets leuks!' },
  ],
  en: [
    { label: 'Plan my day', message: 'Create a day program for me based on my interests and today\'s weather.' },
    { label: 'Browse categories', message: 'What categories are available? Let me browse by category.' },
    { label: 'Route planner', message: 'I want a route description. Which attractions can I combine in a route?' },
    { label: 'Tip of the Day', message: 'What\'s your tip of the day? Surprise me with something fun!' },
  ],
  de: [
    { label: 'Tagesprogramm', message: 'Erstelle ein Tagesprogramm für mich basierend auf meinen Interessen und dem heutigen Wetter.' },
    { label: 'Nach Kategorie', message: 'Welche Kategorien gibt es? Lass mich nach Kategorie suchen.' },
    { label: 'Routenplaner', message: 'Ich möchte eine Routenbeschreibung. Welche Sehenswürdigkeiten kann ich in einer Route kombinieren?' },
    { label: 'Tipp des Tages', message: 'Was ist dein Tipp des Tages? Überrasche mich mit etwas Schönem!' },
  ],
  es: [
    { label: 'Planificar el día', message: 'Crea un programa diario para mí basado en mis intereses y el clima de hoy.' },
    { label: 'Buscar por categoría', message: '¿Qué categorías hay disponibles? Déjame buscar por categoría.' },
    { label: 'Planificador de rutas', message: 'Quiero una descripción de ruta. ¿Qué atracciones puedo combinar en una ruta?' },
    { label: 'Consejo del día', message: '¡Cuál es tu consejo del día? ¡Sorpréndeme con algo divertido!' },
  ],
};

/**
 * Dispatch a CustomEvent that opens the chatbot with a pre-filled message.
 * ChatbotWidget listens for 'hb:chatbot:open' events.
 */
export function openChatbotWithMessage(message?: string): void {
  window.dispatchEvent(new CustomEvent('hb:chatbot:open', {
    detail: { message: message ?? '' },
  }));
}
