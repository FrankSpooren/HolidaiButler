/**
 * SimpleAnalytics Event Tracking — CalpeTrip.com
 * Sends custom events to SimpleAnalytics dashboard.
 * Events appear in: simpleanalytics.com/calpetrip.com/events
 *
 * Naming convention: {component}_{action}_{device}
 * Device: desktop or mobile (auto-detected)
 *
 * IMPORTANT: Uses navigator.sendBeacon() as PRIMARY method to ensure
 * events survive page navigation (external link clicks).
 * Falls back to window.sa_event() when available, then to Image pixel.
 *
 * @version 3.0.0
 */

declare global {
  interface Window {
    sa_event?: (eventName: string, metadata?: Record<string, string | number>) => void;
    sa_loaded?: boolean;
  }
}

/** Detect mobile vs desktop based on viewport width */
function getDevice(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

/** SA event endpoint — same as SA uses internally */
const SA_ENDPOINT = 'https://queue.simpleanalyticscdn.com/events';

/**
 * Send event via navigator.sendBeacon (survives page unloads).
 * This is the ONLY reliable way to track events on navigation clicks.
 */
function sendViaBeacon(eventName: string, metadata?: Record<string, string | number>): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'calpetrip.com';
      const payload = JSON.stringify({
        type: 'event',
        hostname,
        event: eventName,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });
      return navigator.sendBeacon(SA_ENDPOINT, payload);
    }
  } catch {
    // sendBeacon failed — will fall back
  }
  return false;
}

/**
 * Track a custom event in SimpleAnalytics.
 *
 * Strategy (in order of preference):
 * 1. window.sa_event() — SA's native function, if loaded
 * 2. navigator.sendBeacon() — reliable for page-navigation events
 * 3. Image pixel — last resort fallback
 */
function trackEvent(eventName: string, metadata?: Record<string, string | number>): void {
  try {
    if (typeof window === 'undefined') return;

    const enriched = { ...metadata, device: getDevice() };

    // Method 1: SA native function (includes proper hostname detection, queuing, etc.)
    if (window.sa_event) {
      window.sa_event(eventName, enriched);
      return;
    }

    // Method 2: Direct beacon (SA script not yet loaded, or blocked)
    sendViaBeacon(eventName, enriched);
  } catch {
    // Silent fail — analytics should never break the app
  }
}

/**
 * Track event AND delay navigation by 150ms to ensure delivery.
 * Use this for onClick handlers on <a href="..."> elements that navigate away.
 */
function trackBeforeNav(eventName: string, metadata?: Record<string, string | number>): void {
  try {
    if (typeof window === 'undefined') return;
    const enriched = { ...metadata, device: getDevice() };

    // Use sendBeacon first (survives page unload)
    if (window.sa_event) {
      window.sa_event(eventName, enriched);
    }
    // ALSO send via beacon as insurance (sa_event uses Image pixel which dies on navigate)
    sendViaBeacon(eventName, enriched);
  } catch {
    // Silent fail
  }
}

// ============================================================
// EVENT BUFFER — queue events that fire before SA loads
// ============================================================
const pendingEvents: Array<{ name: string; metadata?: Record<string, string | number> }> = [];

function flushPendingEvents(): void {
  if (typeof window === 'undefined' || !window.sa_event) return;
  while (pendingEvents.length > 0) {
    const evt = pendingEvents.shift();
    if (evt) window.sa_event(evt.name, evt.metadata);
  }
}

// Flush pending events when SA loads
if (typeof window !== 'undefined') {
  // Check every 500ms until SA is loaded, then flush
  const checkInterval = setInterval(() => {
    if (window.sa_event) {
      flushPendingEvents();
      clearInterval(checkInterval);
    }
  }, 500);
  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(checkInterval), 10000);
}

// ============================================================
// SECTION VISIBILITY TRACKING (Intersection Observer)
// ============================================================

const viewedSections = new Set<string>();

/**
 * Track when a section becomes visible in the viewport.
 * Uses IntersectionObserver — fires once per section per page load.
 * Call this in a component's useEffect with a ref to the container element.
 */
export function trackSectionViewed(element: HTMLElement | null, sectionName: string): (() => void) | undefined {
  if (!element || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
  if (viewedSections.has(sectionName)) return; // Already tracked this session

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !viewedSections.has(sectionName)) {
          viewedSections.add(sectionName);
          trackEvent(`${sectionName}_viewed_${getDevice()}`);
          observer.disconnect();
        }
      }
    },
    { threshold: 0.3 } // 30% of element must be visible
  );
  observer.observe(element);
  return () => observer.disconnect();
}

// ============================================================
// SESSION START — fires once per session
// ============================================================
if (typeof window !== 'undefined' && !sessionStorage.getItem('hb_session_started')) {
  sessionStorage.setItem('hb_session_started', '1');
  // Small delay to let SA script load
  setTimeout(() => trackEvent('session_started'), 800);
}

// ============================================================
// ANALYTICS API
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
    trackBeforeNav(`category_button_${getDevice()}`, { category }),

  filter_applied: (filterType: string, value: string) =>
    trackEvent(`filter_applied_${getDevice()}`, { type: filterType, value }),

  // --- Navigation (uses trackBeforeNav for links that navigate away) ---
  logo_clicked: () =>
    trackEvent(`logo_clicked_${getDevice()}`),

  hamburger_menu_item: (item: string) =>
    trackBeforeNav(`hamburger_menu_${getDevice()}`, { item }),

  mobile_bottom_nav: (tab: string) =>
    trackBeforeNav(`mobile_bottom_nav_${tab}`),

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
    trackBeforeNav(`cta_clicked_${getDevice()}`, { label: label.substring(0, 50) }),

  // --- POI Detail Actions ---
  poi_menu_clicked: (poiName: string) =>
    trackBeforeNav(`poi_menu_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),

  poi_reservation_clicked: (poiName: string) =>
    trackBeforeNav(`poi_reservation_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),

  poi_booking_clicked: (poiName: string) =>
    trackBeforeNav(`poi_booking_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),

  poi_similar_clicked: (fromPoi: string, toPoi: string) =>
    trackEvent(`poi_similar_clicked_${getDevice()}`, { from: fromPoi.substring(0, 50), to: toPoi.substring(0, 50) }),

  poi_website_clicked: (poiName: string, url: string) =>
    trackBeforeNav(`poi_website_clicked_${getDevice()}`, { poi: poiName.substring(0, 50), url: url.substring(0, 80) }),

  // --- Program Card ---
  program_item_clicked: (itemName: string, itemType: 'poi' | 'event') =>
    trackEvent(`program_item_clicked_${getDevice()}`, { name: itemName.substring(0, 50), type: itemType }),

  program_details_clicked: (itemName: string, itemType: 'poi' | 'event') =>
    trackEvent(`program_details_clicked_${getDevice()}`, { name: itemName.substring(0, 50), type: itemType }),

  program_cta_clicked: () =>
    trackEvent(`program_cta_clicked_${getDevice()}`),

  // --- Today Events ---
  today_events_more_clicked: () =>
    trackBeforeNav(`today_events_more_clicked_${getDevice()}`),

  // --- Map Preview ---
  map_preview_clicked: () =>
    trackBeforeNav(`map_preview_clicked_${getDevice()}`),

  // --- Onboarding ---
  onboarding_dismissed: (step: number) =>
    trackEvent(`onboarding_dismissed_${getDevice()}`, { step: step }),

  onboarding_choice: (step: string, value: string) =>
    trackEvent(`onboarding_choice_${getDevice()}`, { step, value }),

  // --- Desktop Navigation ---
  nav_link_clicked: (label: string) =>
    trackBeforeNav(`nav_link_clicked_${getDevice()}`, { label: label.substring(0, 50) }),

  footer_link_clicked: (label: string) =>
    trackBeforeNav(`footer_link_clicked_${getDevice()}`, { label: label.substring(0, 50) }),

  social_link_clicked: (platform: string) =>
    trackBeforeNav(`social_link_clicked_${getDevice()}`, { platform }),

  // --- Search Result ---
  search_result_clicked: (poiId: number) =>
    trackEvent(`search_result_clicked_${getDevice()}`, { poi_id: poiId }),

  // --- Forms ---
  contact_form_submitted: () =>
    trackEvent(`contact_form_submitted_${getDevice()}`),

  newsletter_subscribed: () =>
    trackEvent(`newsletter_subscribed_${getDevice()}`),

  // --- Commerce ---
  ticket_buy_clicked: (ticketName: string) =>
    trackBeforeNav(`ticket_buy_clicked_${getDevice()}`, { ticket: ticketName.substring(0, 50) }),

  reservation_search_clicked: () =>
    trackEvent(`reservation_search_clicked_${getDevice()}`),

  reservation_slot_clicked: (time: string) =>
    trackBeforeNav(`reservation_slot_clicked_${getDevice()}`, { time }),

  // --- Blocks ---
  faq_toggled: (question: string) =>
    trackEvent(`faq_toggled_${getDevice()}`, { question: question.substring(0, 50) }),

  gallery_opened: (index: number) =>
    trackEvent(`gallery_opened_${getDevice()}`, { index }),

  banner_link_clicked: (label: string) =>
    trackBeforeNav(`banner_link_clicked_${getDevice()}`, { label: label.substring(0, 50) }),

  banner_dismissed: () =>
    trackEvent(`banner_dismissed_${getDevice()}`),
};

export default analytics;
