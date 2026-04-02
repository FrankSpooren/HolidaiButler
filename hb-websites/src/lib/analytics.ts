/**
 * SimpleAnalytics Event Tracking — CalpeTrip.com
 * Sends custom events to SimpleAnalytics dashboard.
 * Events appear in: simpleanalytics.com/calpetrip.com/events
 *
 * Naming convention: {component}_{action}_{device}
 * Device: desktop or mobile (auto-detected)
 *
 * @version 2.0.0
 */

declare global {
  interface Window {
    sa_event?: (eventName: string, metadata?: Record<string, string | number>) => void;
  }
}

/** Detect mobile vs desktop based on viewport width */
function getDevice(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

/**
 * Track a custom event in SimpleAnalytics
 * @param eventName - Event name (alphanumeric + underscores, auto-lowercased by SA)
 * @param metadata - Optional metadata key-value pairs
 */
function trackEvent(eventName: string, metadata?: Record<string, string | number>): void {
  try {
    if (typeof window !== 'undefined' && window.sa_event) {
      const enriched = { ...metadata, device: getDevice() };
      window.sa_event(eventName, enriched);
    }
  } catch {
    // Silent fail — analytics should never break the app
  }
}

// ============================================================
// CHATBOT EVENTS
// ============================================================

export const analytics = {
  // --- Chatbot ---
  chatbot_opened: () =>
    trackEvent(`chatbot_opened_${getDevice()}`),

  chatbot_message_sent: (lang?: string) =>
    trackEvent(`chatbot_message_${getDevice()}`, lang ? { language: lang } : undefined),

  chatbot_quick_action_tip: () =>
    trackEvent(`chatbot_quick_tip_van_de_dag_${getDevice()}`),

  chatbot_quick_action_itinerary: () =>
    trackEvent(`chatbot_quick_programma_samenstellen_${getDevice()}`),

  chatbot_quick_action_category: () =>
    trackEvent(`chatbot_quick_zoeken_op_rubriek_${getDevice()}`),

  chatbot_quick_action_directions: () =>
    trackEvent(`chatbot_quick_routebeschrijving_${getDevice()}`),

  // --- POI ---
  poi_card_clicked: (poiName: string) =>
    trackEvent(`poi_card_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),

  poi_detail_opened: (poiName: string) =>
    trackEvent(`poi_detail_opened_${getDevice()}`, { poi: poiName.substring(0, 50) }),

  // --- Events / Agenda ---
  event_card_clicked: (eventTitle: string) =>
    trackEvent(`event_card_clicked_${getDevice()}`, { event: eventTitle.substring(0, 50) }),

  event_detail_opened: (eventTitle: string) =>
    trackEvent(`event_detail_opened_${getDevice()}`, { event: eventTitle.substring(0, 50) }),

  // --- Filters & Categories ---
  category_button_clicked: (category: string) =>
    trackEvent(`category_button_${getDevice()}`, { category }),

  filter_applied: (filterType: string, value: string) =>
    trackEvent(`filter_applied_${getDevice()}`, { type: filterType, value }),

  // --- Navigation ---
  logo_clicked: () =>
    trackEvent(`logo_clicked_${getDevice()}`),

  hamburger_menu_item: (item: string) =>
    trackEvent(`hamburger_menu_${getDevice()}`, { item }),

  mobile_bottom_nav: (tab: string) =>
    trackEvent(`mobile_bottom_nav_${tab}`),

  scroll_to_top: () =>
    trackEvent(`scroll_to_top_${getDevice()}`),

  // --- Language ---
  language_changed: (from: string, to: string) =>
    trackEvent(`language_changed_${getDevice()}`, { from, to }),

  // --- Auth / Account ---
  login_clicked: () =>
    trackEvent(`login_clicked_${getDevice()}`),

  signup_clicked: () =>
    trackEvent(`signup_clicked_${getDevice()}`),

  social_login: (provider: string) =>
    trackEvent(`social_login_${provider}_${getDevice()}`),

  // --- Onboarding ---
  onboarding_step: (step: number) =>
    trackEvent(`onboarding_step_${step}_${getDevice()}`),

  onboarding_completed: () =>
    trackEvent(`onboarding_completed_${getDevice()}`),

  // --- Accessibility ---
  wcag_modal_opened: () =>
    trackEvent(`wcag_modal_opened_${getDevice()}`),

  // --- Search ---
  search_used: (query: string) =>
    trackEvent(`search_used_${getDevice()}`, { query: query.substring(0, 30) }),

  // --- Map ---
  map_interaction: () =>
    trackEvent(`map_interaction_${getDevice()}`),

  // --- Content ---
  tip_of_day_viewed: () =>
    trackEvent(`tip_of_day_viewed_${getDevice()}`),

  cta_clicked: (label: string) =>
    trackEvent(`cta_clicked_${getDevice()}`, { label: label.substring(0, 50) }),

  // --- POI Detail Actions ---
  poi_menu_clicked: (poiName: string) =>
    trackEvent(`poi_menu_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),

  poi_reservation_clicked: (poiName: string) =>
    trackEvent(`poi_reservation_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),

  poi_booking_clicked: (poiName: string) =>
    trackEvent(`poi_booking_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),

  poi_similar_clicked: (fromPoi: string, toPoi: string) =>
    trackEvent(`poi_similar_clicked_${getDevice()}`, { from: fromPoi.substring(0, 50), to: toPoi.substring(0, 50) }),
  poi_website_clicked: (poiName: string, url: string) =>
    trackEvent(`poi_website_clicked_${getDevice()}`, { poi: poiName.substring(0, 50), url: url.substring(0, 80) }),
};

export default analytics;
