'use client';

import { useState, useEffect } from 'react';
import type { BlockConfig, PageLayout } from '@/types/blocks';

const BLOCK_LABELS: Record<string, string> = {
  hero: 'Hero',
  desktop_hero: 'Hero + Chatbot',
  hero_chatbot: 'Hero + Chatbot',
  poi_grid: 'POI Grid',
  poi_grid_filtered: 'POI Grid (filtered)',
  event_calendar: 'Events',
  event_calendar_filtered: 'Events (filtered)',
  rich_text: 'Rich Text',
  card_group: 'Card Group',
  curated_cards: 'Curated Cards',
  map: 'Map',
  map_preview: 'Map Preview',
  mobile_map: 'Map (mobile)',
  testimonials: 'Testimonials',
  cta: 'Call to Action',
  gallery: 'Gallery',
  faq: 'FAQ',
  ticket_shop: 'Ticket Shop',
  reservation_widget: 'Reservations',
  chatbot_widget: 'Chatbot',
  video: 'Video',
  social_feed: 'Social Feed',
  contact_form: 'Contact Form',
  newsletter: 'Newsletter',
  weather_widget: 'Weather',
  banner: 'Banner',
  alert_status: 'Alert / Status',
  partners: 'Partners',
  downloads: 'Downloads',
  programme: 'Dagprogramma + Tip',
  desktop_program_tip: 'Dagprogramma + Tip',
  desktop_events: 'Vandaag Events',
  today_events: 'Vandaag Events',
  mobile_events: 'Events (mobile)',
  mobile_program: 'Dagprogramma (mobile)',
  mobile_tip: 'Tip van de Dag',
  tip_of_the_day: 'Tip van de Dag',
  category_grid: 'Categorie Grid',
  // E2 blocks
  search: 'Search',
  filter_bar: 'Filter Bar',
  map_list: 'Map + List',
  related_items: 'Related Items',
  featured_item: 'Featured Item',
  add_to_calendar: 'Add to Calendar',
  itinerary: 'Itinerary / Route',
  save_to_trip: 'Save to Trip',
  opening_hours: 'Opening Hours',
  location_details: 'Location Details',
  calendar_view: 'Calendar View',
  breadcrumbs: 'Breadcrumbs',
  anchor_nav: 'Anchor Navigation',
  offer: 'Offer / Package',
  consent_embed: 'Consent Embed',
};

const BLOCK_COLORS: Record<string, string> = {
  hero: '#7FA594',
  desktop_hero: '#7FA594',
  hero_chatbot: '#7FA594',
  poi_grid: '#5E8B7E',
  poi_grid_filtered: '#5E8B7E',
  event_calendar: '#E76F51',
  event_calendar_filtered: '#E76F51',
  rich_text: '#6B7280',
  cta: '#E76F51',
  gallery: '#3B82F6',
  video: '#8B5CF6',
  map: '#10B981',
  map_preview: '#10B981',
  mobile_map: '#10B981',
  contact_form: '#F59E0B',
  newsletter: '#EC4899',
  weather_widget: '#06B6D4',
  banner: '#F97316',
  alert_status: '#F97316',
  faq: '#6366F1',
  partners: '#78716C',
  downloads: '#14B8A6',
  card_group: '#8B5CF6',
  curated_cards: '#8B5CF6',
  ticket_shop: '#EF4444',
  reservation_widget: '#3B82F6',
  chatbot_widget: '#10B981',
  testimonials: '#F59E0B',
  social_feed: '#EC4899',
  programme: '#5E8B7E',
  desktop_program_tip: '#5E8B7E',
  desktop_events: '#E76F51',
  today_events: '#E76F51',
  mobile_events: '#E76F51',
  mobile_program: '#5E8B7E',
  mobile_tip: '#F59E0B',
  tip_of_the_day: '#F59E0B',
  category_grid: '#8B5CF6',
  // E2
  search: '#3B82F6',
  filter_bar: '#6366F1',
  map_list: '#10B981',
  related_items: '#8B5CF6',
  featured_item: '#F59E0B',
  add_to_calendar: '#3B82F6',
  itinerary: '#10B981',
  save_to_trip: '#6366F1',
  opening_hours: '#06B6D4',
  location_details: '#EF4444',
  calendar_view: '#E76F51',
  breadcrumbs: '#78716C',
  anchor_nav: '#6366F1',
  offer: '#EF4444',
  consent_embed: '#78716C',
};

/** Resolve a value to a display string (handles i18n objects, strings, numbers) */
function str(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
    const obj = val as Record<string, string>;
    return obj.nl || obj.en || obj.de || obj.es || Object.values(obj)[0] || '';
  }
  return '';
}

/** Keys to skip in generic summary (internal, non-displayable) */
const SKIP_KEYS = new Set([
  'featureFlag', 'visibility', 'style', 'id', 'type',
  'image', 'backgroundImage', 'bgImage', 'bgColor', 'backgroundColor',
  'chatbotPlaceholder', 'chatbotPrompt',
]);

/** Generic block summary: extracts ALL meaningful props, not just hardcoded keys */
function getBlockSummary(block: BlockConfig): string {
  const p = block.props as Record<string, unknown>;
  if (!p || Object.keys(p).length === 0) return 'Default configuration';

  const parts: string[] = [];

  for (const [key, value] of Object.entries(p)) {
    if (SKIP_KEYS.has(key)) continue;
    if (value === null || value === undefined || value === '' || value === true || value === false) continue;

    if (typeof value === 'string' && value.length > 0 && value.length < 100) {
      parts.push(value);
    } else if (typeof value === 'number') {
      // Format key nicely: programSize → Program Size, limit → Limit
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      parts.push(`${label}: ${value}`);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const resolved = str(value);
      if (resolved && resolved.length < 100) parts.push(resolved);
    } else if (Array.isArray(value) && value.length > 0) {
      if (typeof value[0] === 'string') {
        parts.push(value.slice(0, 3).join(', '));
      } else {
        parts.push(`${value.length} items`);
      }
    }
  }

  return parts.slice(0, 4).join(' \u00B7 ') || 'Default configuration';
}

/** Hero-type blocks get special large rendering */
const HERO_TYPES = new Set(['hero', 'desktop_hero', 'hero_chatbot']);

/** Keys to try for hero headline */
const HERO_HEADLINE_KEYS = ['headline', 'greeting', 'title'];
/** Keys to try for hero subtitle */
const HERO_SUBTITLE_KEYS = ['description', 'subtitle', 'tagline', 'payoff'];

function BlockPreview({ block, index }: { block: BlockConfig; index: number }) {
  const color = BLOCK_COLORS[block.type] || '#6B7280';
  const label = BLOCK_LABELS[block.type] || block.type.replace(/_/g, ' ');
  const isHero = HERO_TYPES.has(block.type);
  const p = (block.props || {}) as Record<string, unknown>;

  // Find hero headline from multiple possible keys
  const heroHeadline = isHero
    ? HERO_HEADLINE_KEYS.map(k => str(p[k])).find(v => v.length > 0) || ''
    : '';
  const heroSubtitle = isHero
    ? HERO_SUBTITLE_KEYS.map(k => str(p[k])).find(v => v.length > 0) || ''
    : '';

  // Visibility badge
  const visibility = (block as unknown as Record<string, unknown>).visibility as string | undefined;
  const visLabel = visibility === 'mobile' ? 'Mobile' : visibility === 'desktop' ? 'Desktop' : null;

  return (
    <div
      style={{
        borderLeft: `4px solid ${color}`,
        backgroundColor: isHero ? color : '#ffffff',
        color: isHero ? '#ffffff' : '#1a1a1a',
        padding: isHero ? '3rem 2rem' : '1rem 1.5rem',
        marginBottom: '2px',
        minHeight: isHero ? 180 : 56,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span style={{
          backgroundColor: isHero ? 'rgba(255,255,255,0.2)' : `${color}15`,
          color: isHero ? '#fff' : color,
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: '0.7rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {label}
        </span>
        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>#{index + 1}</span>
        {visLabel && (
          <span style={{
            backgroundColor: isHero ? 'rgba(255,255,255,0.15)' : '#f1f5f9',
            color: isHero ? 'rgba(255,255,255,0.8)' : '#94a3b8',
            padding: '1px 6px', borderRadius: 3, fontSize: '0.6rem', fontWeight: 500,
          }}>
            {visLabel}
          </span>
        )}
      </div>

      {/* Hero: show headline + subtitle */}
      {isHero && heroHeadline ? (
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0 0.25rem', lineHeight: 1.2 }}>
          {heroHeadline}
        </h1>
      ) : null}
      {isHero && heroSubtitle ? (
        <p style={{ fontSize: '0.95rem', opacity: 0.85, margin: 0 }}>
          {heroSubtitle}
        </p>
      ) : null}

      {/* Non-hero: show generic summary */}
      {!isHero && (
        <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem' }}>
          {getBlockSummary(block)}
        </div>
      )}

      {/* Rich text: show content preview */}
      {block.type === 'rich_text' && typeof p.content === 'string' ? (
        <div
          style={{ fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.6, maxHeight: 100, overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: (p.content as string).slice(0, 500) }}
        />
      ) : null}
    </div>
  );
}

export default function PreviewPage() {
  const [layout, setLayout] = useState<PageLayout | null>(null);
  const [viewWidth, setViewWidth] = useState(1024);

  useEffect(() => {
    setViewWidth(window.innerWidth);
    const h = () => setViewWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    const trustedDomains = ['holidaibutler.com', 'texelmaps.nl', 'warrewijzer.be', 'localhost'];
    const handler = (event: MessageEvent) => {
      const isTrusted = trustedDomains.some(d => event.origin.includes(d));
      if (!isTrusted) return;
      if (event.data?.type === 'layout-update' && event.data.layout) {
        setLayout(event.data.layout);
      }
    };

    window.addEventListener('message', handler);
    window.parent?.postMessage({ type: 'preview-ready' }, '*');

    return () => window.removeEventListener('message', handler);
  }, []);

  if (!layout) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999', fontFamily: "system-ui, sans-serif" }}>
        <p>Preview verschijnt hier bij het bewerken van blocks</p>
      </div>
    );
  }

  const blocks = layout.blocks ?? [];

  if (blocks.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999', fontFamily: "system-ui, sans-serif" }}>
        <p>Nog geen blocks toegevoegd</p>
      </div>
    );
  }

  // Filter blocks by visibility based on iframe width (admin viewport toggle)
  const isMobile = viewWidth < 500;
  const filteredBlocks = blocks.filter((block: BlockConfig) => {
    const vis = (block as unknown as Record<string, unknown>).visibility as string | undefined;
    if (!vis || vis === 'all') return true;
    if (vis === 'mobile' && !isMobile) return false;
    if (vis === 'desktop' && isMobile) return false;
    return true;
  });

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#fafaf9' }}>
      {filteredBlocks.map((block: BlockConfig, index: number) => (
        <BlockPreview key={block.id || index} block={block} index={index} />
      ))}
    </div>
  );
}
