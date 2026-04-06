/**
 * SimpleAnalytics Event Tracking — Customer Portal (calpetrip.com desktop)
 * Mirror of hb-websites analytics.ts v3.0 for consistent event tracking.
 *
 * Events appear in: simpleanalytics.com/calpetrip.com/events
 * Naming: {component}_{action}_{device}
 *
 * Uses navigator.sendBeacon() as insurance for navigation events.
 *
 * @version 3.0.0
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

const SA_ENDPOINT = 'https://queue.simpleanalyticscdn.com/events';

function sendViaBeacon(eventName: string, metadata?: Record<string, string | number>): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const payload = JSON.stringify({
        type: 'event',
        hostname: window.location.hostname,
        event: eventName,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        ua: navigator.userAgent,
      });
      return navigator.sendBeacon(SA_ENDPOINT, payload);
    }
  } catch { /* silent */ }
  return false;
}

function trackEvent(eventName: string, metadata?: Record<string, string | number>): void {
  try {
    if (typeof window === 'undefined') return;
    const enriched = { ...metadata, device: getDevice() };
    if (window.sa_event) {
      window.sa_event(eventName, enriched);
      return;
    }
    sendViaBeacon(eventName, enriched);
  } catch { /* silent */ }
}

/** Track event AND send via beacon (for clicks that navigate away) */
function trackBeforeNav(eventName: string, metadata?: Record<string, string | number>): void {
  try {
    if (typeof window === 'undefined') return;
    const enriched = { ...metadata, device: getDevice() };
    if (window.sa_event) window.sa_event(eventName, enriched);
    sendViaBeacon(eventName, enriched);
  } catch { /* silent */ }
}

/** Track section visibility via IntersectionObserver (fires once per section per page) */
const viewedSections = new Set<string>();
export function trackSectionViewed(element: HTMLElement | null, sectionName: string): (() => void) | undefined {
  if (!element || typeof IntersectionObserver === 'undefined') return;
  if (viewedSections.has(sectionName)) return;

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
    { threshold: 0.3 }
  );
  observer.observe(element);
  return () => observer.disconnect();
}

export const analytics = {
  // --- Chatbot ---
  chatbot_opened: () => trackEvent(`chatbot_opened_${getDevice()}`),
  chatbot_message_sent: (lang?: string) => trackEvent(`chatbot_message_${getDevice()}`, lang ? { language: lang } : undefined),
  chatbot_quick_action_tip: () => trackEvent(`chatbot_quick_tip_van_de_dag_${getDevice()}`),
  chatbot_quick_action_itinerary: () => trackEvent(`chatbot_quick_programma_samenstellen_${getDevice()}`),
  chatbot_quick_action_category: () => trackEvent(`chatbot_quick_zoeken_op_rubriek_${getDevice()}`),
  chatbot_quick_action_directions: () => trackEvent(`chatbot_quick_routebeschrijving_${getDevice()}`),

  // --- POI ---
  poi_card_clicked: (poiName: string) => trackEvent(`poi_card_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),
  poi_detail_opened: (poiName: string) => trackEvent(`poi_detail_opened_${getDevice()}`, { poi: poiName.substring(0, 50) }),
  poi_menu_clicked: (poiName: string) => trackBeforeNav(`poi_menu_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),
  poi_reservation_clicked: (poiName: string) => trackBeforeNav(`poi_reservation_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),
  poi_booking_clicked: (poiName: string) => trackBeforeNav(`poi_booking_clicked_${getDevice()}`, { poi: poiName.substring(0, 50) }),
  poi_similar_clicked: (fromPoi: string, toPoi: string) => trackEvent(`poi_similar_clicked_${getDevice()}`, { from: fromPoi.substring(0, 50), to: toPoi.substring(0, 50) }),
  poi_website_clicked: (poiName: string, url: string) => trackBeforeNav(`poi_website_clicked_${getDevice()}`, { poi: poiName.substring(0, 50), url: url.substring(0, 80) }),

  // --- Events / Agenda ---
  event_card_clicked: (eventTitle: string) => trackEvent(`event_card_clicked_${getDevice()}`, { event: eventTitle.substring(0, 50) }),
  event_detail_opened: (eventTitle: string) => trackEvent(`event_detail_opened_${getDevice()}`, { event: eventTitle.substring(0, 50) }),

  // --- Navigation ---
  logo_clicked: () => trackEvent(`logo_clicked_${getDevice()}`),
  nav_link_clicked: (label: string) => trackBeforeNav(`nav_link_clicked_${getDevice()}`, { label: label.substring(0, 50) }),
  footer_link_clicked: (label: string) => trackBeforeNav(`footer_link_clicked_${getDevice()}`, { label: label.substring(0, 50) }),
  social_link_clicked: (platform: string) => trackBeforeNav(`social_link_clicked_${getDevice()}`, { platform }),
  hamburger_menu_item: (item: string) => trackBeforeNav(`hamburger_menu_${getDevice()}`, { item }),
  scroll_to_top: () => trackEvent(`scroll_to_top_${getDevice()}`),

  // --- Language & Accessibility ---
  language_changed: (from: string, to: string) => trackEvent(`language_changed_${getDevice()}`, { from, to }),
  wcag_modal_opened: () => trackEvent(`wcag_modal_opened_${getDevice()}`),

  // --- Search ---
  search_used: (query: string) => trackEvent(`search_used_${getDevice()}`, { query: query.substring(0, 30) }),

  // --- Filters ---
  category_filter_clicked: (category: string) => trackEvent(`category_filter_clicked_${getDevice()}`, { category }),
  filter_applied: (filterType: string, value: string) => trackEvent(`filter_applied_${getDevice()}`, { type: filterType, value }),

  // --- Content ---
  tip_of_day_viewed: () => trackEvent(`tip_of_day_viewed_${getDevice()}`),

  // --- Blog ---
  blog_list_viewed: () => trackEvent(`blog_list_viewed_${getDevice()}`),
  blog_card_clicked: (slug: string, title: string) => trackBeforeNav(`blog_card_clicked_${getDevice()}`, { slug, title: title.substring(0, 50) }),
  blog_article_viewed: (slug: string, title: string) => trackEvent(`blog_article_viewed_${getDevice()}`, { slug, title: title.substring(0, 50) }),
  blog_back_clicked: () => trackBeforeNav(`blog_back_clicked_${getDevice()}`),

  // --- Page views (SPA navigation) ---
  page_viewed: (page: string) => trackEvent(`page_viewed_${getDevice()}`, { page: page.substring(0, 50) }),
};

export default analytics;
