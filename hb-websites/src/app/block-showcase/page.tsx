import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getBlock } from '@/blocks/index';
import { resolveLocalizedProps } from '@/lib/i18n';
import type { BlockConfig } from '@/types/blocks';
import BlockRenderer from '@/components/ui/BlockRenderer';
import { Suspense } from 'react';

/**
 * Block Showcase — Server Component for destination-neutral thumbnail screenshots.
 * Renders blocks with generic placeholder props, no API dependencies.
 *
 * /__block-showcase?type=hero → renders hero with neutral sample content
 */

// Destination-neutral sample props per block type
const SAMPLE_PROPS: Record<string, Record<string, unknown>> = {
  hero: { headline: { en: 'Discover your destination', nl: 'Ontdek je bestemming' }, description: { en: 'Find the best places, events and experiences', nl: 'Vind de mooiste plekken, evenementen en ervaringen' }, height: 'compact', backgroundType: 'color', bgColor: '#1a5c3a' },
  desktop_hero: { greeting: { en: 'Welcome!', nl: 'Welkom!' }, subtitle: { en: 'Discover everything with your personal AI travel assistant', nl: 'Ontdek alles met je persoonlijke AI-reisassistent' }, chatbotPlaceholder: { en: 'Ask a question...', nl: 'Stel een vraag...' } },
  rich_text: { content: '<h2>Over deze bestemming</h2><p>Een prachtige plek met rijke geschiedenis, adembenemende natuur en heerlijke lokale gerechten. Of je nu houdt van wandelen, cultuur of culinair genieten — er is voor iedereen iets te beleven.</p><h3>Natuur en Stranden</h3><p>Kilometers aan ongerepte kustlijn, beschermde natuurgebieden en unieke flora en fauna maken dit tot een paradijs voor natuurliefhebbers.</p>' },
  cta: { headline: { en: 'Ready to explore?', nl: 'Klaar om te ontdekken?' }, description: { en: 'Let our AI assistant plan your perfect day', nl: 'Laat onze AI-assistent je perfecte dag plannen' }, backgroundStyle: 'primary', buttons: [{ label: 'Start nu', variant: 'primary' }, { label: 'Meer info', variant: 'secondary' }] },
  banner: { message: 'Zomeractie: 20% korting op alle tickets', variant: 'info', dismissible: true },
  alert_status: { message: 'Weersalarm: harde wind verwacht', severity: 'warning' },
  breadcrumbs: { source: 'manual', manualItems: [{ label: 'Home', href: '/' }, { label: 'Ontdekken', href: '/explore' }, { label: 'Restaurant De Goede Smaak' }], showHomeIcon: true },
  anchor_nav: { source: 'manual', manualAnchors: [{ id: 's1', label: 'Over' }, { id: 's2', label: 'Reviews' }, { id: 's3', label: 'Kaart' }, { id: 's4', label: 'FAQ' }], variant: 'pills', position: 'top' },
  consent_embed: { embedType: 'youtube', consentText: 'Klik om YouTube-content te laden', privacyNoteText: 'Door te klikken ga je akkoord met cookies van derden.' },
  search: { placeholder: { en: 'Search places, events, articles...', nl: 'Zoek plekken, evenementen, artikelen...' }, variant: 'hero', showSuggestions: true, enableChatbotFallback: true },
  filter_bar: { filters: ['category', 'rating'], categories: ['Natuur', 'Restaurants', 'Cultuur', 'Actief', 'Winkelen'], layout: 'auto', showResetButton: true },
  faq: { items: [{ question: { en: 'How do I get there?', nl: 'Hoe kom ik er?' }, answer: { en: 'There are several transport options.', nl: 'Er zijn verschillende vervoersmogelijkheden.' } }, { question: { en: 'What is the best time to visit?', nl: 'Wat is de beste tijd om te bezoeken?' }, answer: { en: 'Every season has its charm.', nl: 'Elk seizoen heeft zijn eigen charme.' } }, { question: { en: 'Are there activities for children?', nl: 'Zijn er activiteiten voor kinderen?' }, answer: { en: 'Yes, many family-friendly activities.', nl: 'Ja, tal van gezinsvriendelijke activiteiten.' } }] },
  opening_hours: { source: 'manual', showOpenNow: true, variant: 'detailed', manualHours: [{ day: 'mon', from: '09:00', to: '17:00' }, { day: 'tue', from: '09:00', to: '17:00' }, { day: 'wed', from: '09:00', to: '21:00' }, { day: 'thu', from: '09:00', to: '17:00' }, { day: 'fri', from: '09:00', to: '17:00' }, { day: 'sat', from: '10:00', to: '16:00' }, { day: 'sun', closed: true }] },
  location_details: { source: 'manual', manualLocation: { address: 'Hoofdstraat 1', city: 'Centrum', postalCode: '1234 AB', country: 'Nederland' }, showOpenInMaps: true, showCopyAddress: true, variant: 'detailed' },
  offer: { variant: 'comparison', offers: [{ title: 'Dagpas', discountedPrice: 29, originalPrice: 36, currency: 'EUR', badge: 'Populair', features: ['Alle musea', 'Openbaar vervoer', 'Rondleiding'], bookingType: 'internal_ticket_shop' }, { title: 'Weekend Deal', discountedPrice: 49, currency: 'EUR', features: ['Alles van Dagpas', '2 nachten verblijf'], bookingType: 'external_url' }] },
  newsletter: { title: { en: 'Stay updated!', nl: 'Blijf op de hoogte!' }, variant: 'inline' },
  contact_form: { fields: ['name', 'email', 'message'], requireGdpr: true },
  add_to_calendar: { source: 'manual', manualEvent: { title: 'Zomerfestival', startDate: '2026-07-15T14:00:00', location: 'Centrumplein' }, providers: ['google', 'apple', 'outlook', 'yahoo'], buttonStyle: 'dropdown' },
  itinerary: { source: 'manual_waypoints', mode: 'foot', variant: 'timeline', showMap: false, showTimeEstimates: true, title: 'Dagwandeling', manualWaypoints: [{ name: 'Start: Bezoekerscentrum', lat: 52.37, lon: 4.89, durationMinutes: 30 }, { name: 'Natuurgebied', lat: 52.38, lon: 4.90, durationMinutes: 60 }, { name: 'Strandpaviljoen (lunch)', lat: 52.39, lon: 4.88, durationMinutes: 45 }] },
  save_to_trip: { variant: 'add_button', showCount: true },
};

// Blocks that fetch data dynamically — use viewport screenshot from homepage instead
const DYNAMIC_BLOCKS = new Set([
  'poi_grid', 'poi_grid_filtered', 'event_calendar', 'event_calendar_filtered',
  'map', 'map_list', 'map_preview', 'mobile_map', 'category_grid',
  'today_events', 'programme', 'tip_of_the_day', 'popular_pois',
  'gallery', 'video', 'testimonials', 'partners', 'downloads',
  'social_feed', 'curated_cards', 'blog_grid', 'chatbot_widget',
  'weather_widget', 'ticket_shop', 'reservation_widget',
  'calendar_view', 'related_items', 'featured_item',
]);

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
        <h2>Static blocks (with sample props):</h2>
        <ul>
          {Object.keys(SAMPLE_PROPS).map(t => (
            <li key={t}><a href={`/block-showcase?type=${t}`}>{t}</a></li>
          ))}
        </ul>
        <h2>Dynamic blocks (render from live data):</h2>
        <ul>
          {Array.from(DYNAMIC_BLOCKS).map(t => (
            <li key={t}><a href={`/block-showcase?type=${t}`}>{t} (dynamic)</a></li>
          ))}
        </ul>
      </div>
    );
  }

  const headersList = await headers();
  const locale = headersList.get('x-tenant-locale') ?? 'nl';

  // For dynamic blocks, show a message — Puppeteer will screenshot these from real pages
  if (DYNAMIC_BLOCKS.has(type) && !SAMPLE_PROPS[type]) {
    return (
      <div data-block-type={type} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontFamily: 'system-ui', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Dynamic block — screenshot from live page</p>
      </div>
    );
  }

  const BlockComponent = getBlock(type as any);
  if (!BlockComponent) {
    return <div style={{ padding: 40 }}>Block type "{type}" niet gevonden</div>;
  }

  const rawProps = SAMPLE_PROPS[type] || {};
  const resolvedProps = resolveLocalizedProps(rawProps, locale);

  return (
    <div data-block-type={type} style={{ background: '#fff', minHeight: 200 }}>
      <BlockRenderer blockType={type}>
        <Suspense fallback={<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
          <BlockComponent {...resolvedProps} />
        </Suspense>
      </BlockRenderer>
    </div>
  );
}
