export type BlockType =
  | 'hero'
  | 'poi_grid'
  | 'event_calendar'
  | 'rich_text'
  | 'card_group'
  | 'map'
  | 'gallery'
  | 'testimonials'
  | 'cta'
  | 'faq'
  | 'ticket_shop'
  | 'reservation_widget'
  | 'chatbot_widget';

export interface BlockConfig {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  featureFlag?: string;
}

export interface HeroProps {
  headline: string;
  description?: string;
  image?: string;
  tagline?: string;
  buttons?: Array<{ label: string; href: string; variant?: 'primary' | 'secondary' | 'outline' }>;
}

export interface PoiGridProps {
  categoryFilter?: string[];
  limit?: number;
  columns?: 2 | 3 | 4;
}

export interface EventCalendarProps {
  limit?: number;
  layout?: 'list' | 'grid' | 'compact';
}

export interface RichTextProps {
  content: string;
}

export interface CardGroupProps {
  cards: Array<{
    title: string;
    description?: string;
    image?: string;
    href?: string;
  }>;
  columns?: 2 | 3 | 4;
}

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  categoryFilter?: string[];
}

export interface PageLayout {
  blocks: BlockConfig[];
}

export interface PageData {
  id: number;
  destinationId: number;
  slug: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  layout: PageLayout;
  status: 'draft' | 'published';
}
