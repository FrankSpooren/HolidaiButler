'use client';

import { useState, useEffect } from 'react';
import type { BlockConfig, PageLayout } from '@/types/blocks';

const BLOCK_LABELS: Record<string, string> = {
  hero: 'Hero',
  poi_grid: 'POI Grid',
  event_calendar: 'Events',
  rich_text: 'Rich Text',
  card_group: 'Card Group',
  map: 'Map',
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
  partners: 'Partners',
  downloads: 'Downloads',
};

const BLOCK_COLORS: Record<string, string> = {
  hero: '#7FA594',
  poi_grid: '#5E8B7E',
  event_calendar: '#E76F51',
  rich_text: '#6B7280',
  cta: '#E76F51',
  gallery: '#3B82F6',
  video: '#8B5CF6',
  map: '#10B981',
  contact_form: '#F59E0B',
  newsletter: '#EC4899',
  weather_widget: '#06B6D4',
  banner: '#F97316',
  faq: '#6366F1',
  partners: '#78716C',
  downloads: '#14B8A6',
  card_group: '#8B5CF6',
  ticket_shop: '#EF4444',
  reservation_widget: '#3B82F6',
  chatbot_widget: '#10B981',
  testimonials: '#F59E0B',
  social_feed: '#EC4899',
};

function getBlockSummary(block: BlockConfig): string {
  const p = block.props as Record<string, unknown>;
  const parts: string[] = [];

  const h = str(p.headline);
  if (h) parts.push(h);
  const t = str(p.title);
  if (t) parts.push(t);
  const m = str(p.message);
  if (m) parts.push(m);
  if (p.layout) parts.push(`Layout: ${String(p.layout)}`);
  if (p.limit) parts.push(`Limit: ${String(p.limit)}`);
  if (p.columns) parts.push(`${String(p.columns)} columns`);
  if (p.platform) parts.push(String(p.platform));

  return parts.join(' \u00B7 ') || 'No configuration';
}

function str(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, string>;
    return obj.en || Object.values(obj)[0] || '';
  }
  return String(val);
}

function BlockPreview({ block, index }: { block: BlockConfig; index: number }) {
  const color = BLOCK_COLORS[block.type] || '#6B7280';
  const label = BLOCK_LABELS[block.type] || block.type;
  const isHero = block.type === 'hero';
  const p = block.props as Record<string, unknown>;

  return (
    <div
      style={{
        borderLeft: `4px solid ${color}`,
        backgroundColor: isHero ? color : '#ffffff',
        color: isHero ? '#ffffff' : '#1a1a1a',
        padding: isHero ? '3rem 2rem' : '1rem 1.5rem',
        marginBottom: '2px',
        minHeight: isHero ? 200 : 60,
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
      </div>
      {isHero && str(p.headline) ? (
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0 0.25rem', fontFamily: 'var(--hb-font-heading)' }}>
          {str(p.headline)}
        </h1>
      ) : null}
      {isHero && str(p.description) ? (
        <p style={{ fontSize: '1rem', opacity: 0.9, margin: 0, fontFamily: 'var(--hb-font-body)' }}>
          {str(p.description)}
        </p>
      ) : null}
      {!isHero && (
        <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem' }}>
          {getBlockSummary(block)}
        </div>
      )}
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

  useEffect(() => {
    const trustedDomains = ['holidaibutler.com', 'texelmaps.nl', 'localhost'];
    const handler = (event: MessageEvent) => {
      // Only accept messages from trusted admin portal origins
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999', fontFamily: 'system-ui' }}>
        <p>Preview will appear here when editing blocks</p>
      </div>
    );
  }

  const blocks = layout.blocks ?? [];

  if (blocks.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999', fontFamily: 'system-ui' }}>
        <p>No blocks added yet</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--hb-font-body, system-ui)', minHeight: '100vh', backgroundColor: 'var(--hb-background, #fafaf9)' }}>
      {blocks.map((block: BlockConfig, index: number) => (
        <BlockPreview key={block.id} block={block} index={index} />
      ))}
    </div>
  );
}
