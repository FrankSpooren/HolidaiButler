/**
 * SimpleAnalytics Event Tracking Helper
 * Sends custom events to SimpleAnalytics dashboard.
 * Events appear in: simpleanalytics.com/calpetrip.com/events
 *
 * @version 1.0.0
 */

declare global {
  interface Window {
    sa_event?: (eventName: string, metadata?: Record<string, string | number>) => void;
  }
}

/**
 * Track a custom event in SimpleAnalytics
 * @param eventName - Event name (alphanumeric + underscores, auto-lowercased)
 * @param metadata - Optional metadata key-value pairs
 */
export function trackEvent(eventName: string, metadata?: Record<string, string | number>): void {
  try {
    if (typeof window !== 'undefined' && window.sa_event) {
      if (metadata && Object.keys(metadata).length > 0) {
        window.sa_event(eventName, metadata);
      } else {
        window.sa_event(eventName);
      }
    }
  } catch {
    // Silent fail — analytics should never break the app
  }
}

// Pre-defined event trackers for common interactions
export const analytics = {
  chatbotOpened: () => trackEvent('chatbot_opened'),
  chatbotMessageSent: (lang?: string) => trackEvent('chatbot_message_sent', lang ? { language: lang } : undefined),
  quickAction: (action: string) => trackEvent('quick_action', { action }),
  poiDetailOpened: (poiName: string) => trackEvent('poi_detail_opened', { poi: poiName.substring(0, 50) }),
  eventDetailOpened: (eventTitle: string) => trackEvent('event_detail_opened', { event: eventTitle.substring(0, 50) }),
  filterApplied: (filterType: string, value: string) => trackEvent('filter_applied', { type: filterType, value }),
  languageChanged: (from: string, to: string) => trackEvent('language_changed', { from, to }),
  scrollToTop: () => trackEvent('scroll_to_top'),
  socialLogin: (provider: string) => trackEvent('social_login', { provider }),
  onboardingStep: (step: number) => trackEvent('onboarding_step', { step }),
  onboardingCompleted: () => trackEvent('onboarding_completed'),
  ctaClicked: (label: string) => trackEvent('cta_clicked', { label: label.substring(0, 50) }),
  searchUsed: (query: string) => trackEvent('search_used', { query: query.substring(0, 30) }),
  mapInteraction: () => trackEvent('map_interaction'),
  tipOfDayViewed: () => trackEvent('tip_of_day_viewed'),
};

export default analytics;
