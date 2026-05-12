import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getBlock } from '@/blocks/index';
import { resolveLocalizedProps } from '@/lib/i18n';
import BlockRenderer from '@/components/ui/BlockRenderer';
import { Suspense } from 'react';

/**
 * Block Showcase — ALL 48 blocks with complete sample data.
 * Every block renders with content — NO placeholders, NO "dynamic block" messages.
 * Destination-neutral: generic labels, no Texel/Calpe specifics.
 */

const SAMPLE_PROPS: Record<string, Record<string, unknown>> = {
  // === Page Structure ===
  hero: { headline: { en: 'Discover your destination', nl: 'Ontdek je bestemming' }, description: { en: 'Find the best places, events and experiences', nl: 'Vind de mooiste plekken, evenementen en ervaringen' }, height: 'compact', backgroundType: 'color', bgColor: '#1a5c3a' },
  desktop_hero: { greeting: { en: 'Welcome!', nl: 'Welkom!' }, subtitle: { en: 'Discover everything with your personal AI travel assistant', nl: 'Ontdek alles met je persoonlijke AI-reisassistent' }, chatbotPlaceholder: { en: 'Ask a question...', nl: 'Stel een vraag...' } },
  rich_text: { content: '<h2>Over deze bestemming</h2><p>Een prachtige plek met rijke geschiedenis, adembenemende natuur en heerlijke lokale gerechten. Of je nu houdt van wandelen, cultuur of culinair genieten — er is voor iedereen iets te beleven.</p><h3>Natuur en Stranden</h3><p>Kilometers aan ongerepte kustlijn, beschermde natuurgebieden en unieke flora en fauna maken dit tot een paradijs voor natuurliefhebbers. Ontdek verborgen paadjes, observeer zeldzame vogels en geniet van de rust.</p>' },
  cta: { headline: { en: 'Ready to explore?', nl: 'Klaar om te ontdekken?' }, description: { en: 'Let our AI assistant plan your perfect day', nl: 'Laat onze AI-assistent je perfecte dag plannen' }, backgroundStyle: 'primary', buttons: [{ label: 'Start nu', variant: 'primary' }, { label: 'Meer info', variant: 'secondary' }] },
  banner: { message: { en: 'Summer sale: 20% off all tickets until August 31', nl: 'Zomeractie: 20% korting op alle tickets t/m 31 augustus' }, variant: 'info', dismissible: true },
  alert_status: { message: { en: 'Weather alert: strong winds expected. Check current conditions.', nl: 'Weersalarm: harde wind verwacht. Check de actuele situatie.' }, severity: 'warning' },
  breadcrumbs: { source: 'manual', manualItems: [{ label: 'Home', href: '/' }, { label: 'Ontdekken', href: '/explore' }, { label: 'Restaurant De Goede Smaak' }], showHomeIcon: true },
  anchor_nav: { source: 'manual', manualAnchors: [{ id: 's1', label: 'Over' }, { id: 's2', label: 'Reviews' }, { id: 's3', label: 'Kaart' }, { id: 's4', label: 'FAQ' }], variant: 'pills', position: 'top' },
  consent_embed: { embedType: 'youtube', consentText: { en: 'Click to load YouTube content', nl: 'Klik om YouTube-content te laden' }, privacyNoteText: { en: 'By clicking you agree to third-party cookies.', nl: 'Door te klikken ga je akkoord met cookies van derden.' } },

  // === Discovery — these will fetch live data which is fine for thumbnail appearance ===
  search: { placeholder: { en: 'Search places, events, articles...', nl: 'Zoek plekken, evenementen, artikelen...' }, variant: 'hero', showSuggestions: true, enableChatbotFallback: true },
  filter_bar: { filters: ['category', 'rating'], categories: ['Natuur', 'Restaurants', 'Cultuur', 'Actief', 'Winkelen'], layout: 'auto', showResetButton: true, showActiveCount: true },
  poi_grid: { title: { en: 'Popular places', nl: 'Populaire plekken' }, limit: 6, columns: 3, showFilters: false },
  poi_grid_filtered: { title: { en: 'Restaurants nearby', nl: 'Restaurants in de buurt' }, limit: 6, columns: 3 },
  category_grid: { layout: 'auto' },
  map: { height: '400px', overlayLabel: { en: 'Discover all locations', nl: 'Ontdek alle locaties' }, showLegend: true, markerLimit: 15 },
  map_list: { source: 'pois', layout: 'split_60_40', height: 'medium', limit: 10, title: { en: 'Explore the map', nl: 'Verken de kaart' } },
  map_preview: { height: '300px', showLegend: true, markerLimit: 10 },
  mobile_map: { height: '250px', markerLimit: 8 },
  popular_pois: { limit: 6, columns: 3, title: { en: 'Popular', nl: 'Populair' } },

  // === Events & Planning ===
  event_calendar: { title: { en: 'Events', nl: 'Evenementen' }, limit: 6, layout: 'list' },
  event_calendar_filtered: { title: { en: 'Events this week', nl: 'Evenementen deze week' }, limit: 6 },
  today_events: { limit: 6, layout: 'auto' },
  programme: { programSize: 4 },
  calendar_view: { view: 'dayGridMonth', startDay: 1, title: { en: 'Event calendar', nl: 'Evenementenkalender' } },
  add_to_calendar: { source: 'manual', manualEvent: { title: 'Summer Festival', startDate: '2026-07-15T14:00:00', location: 'Central Square' }, providers: ['google', 'apple', 'outlook', 'yahoo'], buttonStyle: 'dropdown' },
  itinerary: { source: 'manual_waypoints', mode: 'foot', variant: 'timeline', showMap: false, showTimeEstimates: true, title: { en: 'Day walk', nl: 'Dagwandeling' }, manualWaypoints: [{ name: 'Start: Visitor Centre', lat: 52.37, lon: 4.89, durationMinutes: 30 }, { name: 'Nature Reserve', lat: 52.38, lon: 4.90, durationMinutes: 60 }, { name: 'Beach Restaurant (lunch)', lat: 52.39, lon: 4.88, durationMinutes: 45 }] },
  save_to_trip: { variant: 'add_button', showCount: true, ctaLabel: { en: 'Save to plan', nl: 'Bewaar in plan' } },
  tip_of_the_day: {},

  // === Content ===
  gallery: {},
  video: {},
  faq: { items: [{ question: { en: 'How do I get there?', nl: 'Hoe kom ik er?' }, answer: { en: 'There are several transport options available including bus, train and ferry.', nl: 'Er zijn verschillende vervoersmogelijkheden beschikbaar, waaronder bus, trein en veerboot.' } }, { question: { en: 'What is the best time to visit?', nl: 'Wat is de beste tijd om te bezoeken?' }, answer: { en: 'Every season has its own charm. Spring and summer offer beach activities, autumn brings beautiful colors.', nl: 'Elk seizoen heeft zijn eigen charme. Lente en zomer bieden strandactiviteiten, de herfst brengt prachtige kleuren.' } }, { question: { en: 'Are there activities for children?', nl: 'Zijn er activiteiten voor kinderen?' }, answer: { en: 'Yes, there are many family-friendly activities including nature walks, museums and playgrounds.', nl: 'Ja, er zijn tal van gezinsvriendelijke activiteiten waaronder natuurwandelingen, musea en speeltuinen.' } }] },
  testimonials: {},
  partners: {},
  downloads: {},
  social_feed: {},
  curated_cards: { variant: 'curated' },
  blog_grid: {},

  // === Commerce ===
  ticket_shop: {},
  reservation_widget: {},
  offer: { variant: 'comparison', offers: [{ title: { en: 'Day Pass', nl: 'Dagpas' }, discountedPrice: 29, originalPrice: 36, currency: 'EUR', badge: 'Popular', features: ['All museums', 'Public transport', 'Guided tour'], bookingType: 'internal_ticket_shop' }, { title: { en: 'Weekend Deal', nl: 'Weekend Deal' }, discountedPrice: 49, currency: 'EUR', features: ['Everything in Day Pass', '2 nights accommodation'], bookingType: 'external_url' }] },

  // === Forms ===
  contact_form: { fields: ['name', 'email', 'message'], requireGdpr: true },
  newsletter: { title: { en: 'Stay up to date!', nl: 'Blijf op de hoogte!' }, variant: 'inline' },
  chatbot_widget: {},

  // === Utility ===
  weather_widget: {},
  opening_hours: { source: 'manual', showOpenNow: true, variant: 'detailed', manualHours: [{ day: 'mon', from: '09:00', to: '17:00' }, { day: 'tue', from: '09:00', to: '17:00' }, { day: 'wed', from: '09:00', to: '21:00' }, { day: 'thu', from: '09:00', to: '17:00' }, { day: 'fri', from: '09:00', to: '17:00' }, { day: 'sat', from: '10:00', to: '16:00' }, { day: 'sun', closed: true }] },
  location_details: { source: 'manual', manualLocation: { address: 'Hoofdstraat 1', city: 'Centrum', postalCode: '1234 AB', country: 'Nederland' }, showOpenInMaps: true, showCopyAddress: true, variant: 'detailed' },

  // === Related ===
  related_items: { itemType: 'poi', relationStrategy: 'nearby', limit: 4, title: { en: 'Nearby', nl: 'In de buurt' }, sourceId: 2048, sourceContext: 'explicit' },
  featured_item: { itemType: 'poi', itemId: 2048, variant: 'split_image_text', badgeText: { en: 'Tip of the day', nl: 'Tip van de dag' }, showCta: true },
};

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function BlockShowcasePage({ searchParams }: PageProps) {
  const { type } = await searchParams;

  if (!type) {
    return (
      <div style={{ padding: 40, fontFamily: 'system-ui' }}>
        <h1>Block Showcase</h1>
        <p>Use ?type=blockname to render a specific block.</p>
        <ul>{Object.keys(SAMPLE_PROPS).map(t => <li key={t}><a href={`/block-showcase?type=${t}`}>{t}</a></li>)}</ul>
      </div>
    );
  }

  const headersList = await headers();
  const locale = headersList.get('x-tenant-locale') ?? 'nl';

  const BlockComponent = getBlock(type as any);
  if (!BlockComponent) {
    return <div data-block-type={type} style={{ padding: 40, minHeight: 200 }}>Block "{type}" niet gevonden</div>;
  }

  const rawProps = SAMPLE_PROPS[type] || {};
  const resolvedProps = resolveLocalizedProps(rawProps, locale);

  return (
    <div data-block-type={type} style={{ background: '#fff', minHeight: 200 }}>
      <BlockRenderer blockType={type}>
        <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading block...</div>}>
          <BlockComponent {...resolvedProps} />
        </Suspense>
      </BlockRenderer>
    </div>
  );
}
