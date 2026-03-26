/**
 * SimpleAnalytics Event Tracking — Customer Portal (calpetrip.com desktop)
 * Mirror of hb-websites analytics.ts for consistent event tracking across both codebases.
 *
 * Events appear in: simpleanalytics.com/calpetrip.com/events
 * Naming: {component}_{action}_{device}
 */

declare global {
  interface Window {
    sa_event?: (eventName: string, metadata?: Record<string, string | number>) => void;
  }
}

function getDevice(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

function trackEvent(eventName: string, metadata?: Record<string, string | number>): void {
  try {
    if (typeof window !== 'undefined' && window.sa_event) {
      window.sa_event(eventName, { ...metadata, device: getDevice() });
    }
  } catch { /* silent */ }
}

export const analytics = {
  // Chatbot
  chatbot_opened: () => trackEvent(`chatbot_opened_${getDevice()}`),
  chatbot_message_sent: (lang?: string) => trackEvent(`chatbot_message_${getDevice()}`, lang ? { language: lang } : undefined),
  chatbot_quick_action_tip: () => trackEvent(`chatbot_quick_tip_van_de_dag_${getDevice()}`),
  chatbot_quick_action_itinerary: () => trackEvent(`chatbot_quick_programma_samenstellen_${getDevice()}`),
  chatbot_quick_action_category: () => trackEvent(`chatbot_quick_zoeken_op_rubriek_${getDevice()}`),
  chatbot_quick_action_directions: () => trackEvent(`chatbot_quick_routebeschrijving_${getDevice()}`),

  // POI & Events
  poi_detail_opened: (poiName: string) => trackEvent(`poi_detail_opened_${getDevice()}`, { poi: poiName.substring(0, 50) }),
  event_detail_opened: (eventTitle: string) => trackEvent(`event_detail_opened_${getDevice()}`, { event: eventTitle.substring(0, 50) }),

  // Navigation
  logo_clicked: () => trackEvent(`logo_calpetrip_clicked_${getDevice()}`),
  hamburger_menu_item: (item: string) => trackEvent(`hamburger_menu_${getDevice()}`, { item }),
  scroll_to_top: () => trackEvent(`scroll_to_top_${getDevice()}`),

  // Language & Accessibility
  language_changed: (from: string, to: string) => trackEvent(`language_changed_${getDevice()}`, { from, to }),
  wcag_modal_opened: () => trackEvent(`wcag_modal_opened_${getDevice()}`),

  // Search
  search_used: (query: string) => trackEvent(`search_used_${getDevice()}`, { query: query.substring(0, 30) }),

  // Tip
  tip_of_day_viewed: () => trackEvent(`tip_of_day_viewed_${getDevice()}`),
};

export default analytics;
