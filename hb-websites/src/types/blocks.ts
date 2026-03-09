export type BlockType =
  | 'hero'
  | 'poi_grid'
  | 'poi_grid_filtered'
  | 'event_calendar'
  | 'event_calendar_filtered'
  | 'rich_text'
  | 'card_group'
  | 'map'
  | 'gallery'
  | 'testimonials'
  | 'cta'
  | 'faq'
  | 'ticket_shop'
  | 'reservation_widget'
  | 'chatbot_widget'
  | 'video'
  | 'social_feed'
  | 'contact_form'
  | 'newsletter'
  | 'weather_widget'
  | 'banner'
  | 'partners'
  | 'downloads';

export interface BlockStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  borderColor?: string;
  paddingY?: 'none' | 'small' | 'medium' | 'large' | 'xlarge';
  fullWidth?: boolean;
}

export interface BlockConfig {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  style?: BlockStyle;
  featureFlag?: string;
}

export interface HeroButton {
  label: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'chatbot';
  chatbotAction?: string;
}

export interface HeroProps {
  headline: string;
  description?: string;
  image?: string;
  tagline?: string;
  buttons?: HeroButton[];
  backgroundType?: 'image' | 'video' | 'color';
  videoUrl?: string;
  videoPosterImage?: string;
  height?: 'compact' | 'default' | 'tall' | 'fullscreen';
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

export interface TestimonialsProps {
  limit?: number;
  minRating?: number;
}

export interface CtaProps {
  headline: string;
  description?: string;
  backgroundStyle?: 'primary' | 'accent' | 'gradient';
  buttons?: HeroButton[];
}

export interface GalleryProps {
  images: Array<{ src: string; alt?: string; caption?: string }>;
  items?: GalleryItem[];
  columns?: 2 | 3 | 4;
  layout?: 'grid' | 'masonry';
}

export interface FaqProps {
  items: Array<{ question: string; answer: string }>;
  title?: string;
}

export interface TicketShopProps {
  limit?: number;
  layout?: 'grid' | 'list';
  showPrices?: boolean;
}

export interface ReservationWidgetProps {
  defaultPoiId?: number;
  showSearch?: boolean;
}

export interface VideoProps {
  youtubeUrl?: string;
  vimeoUrl?: string;
  videoFile?: string;
  headline?: string;
  description?: string;
  posterImage?: string;
  layout?: 'full-width' | 'contained' | 'side-by-side';
  autoplay?: boolean;
  muted?: boolean;
  backgroundColor?: 'transparent' | 'primary' | 'surface';
}

export interface SocialFeedProps {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube';
  headline?: string;
  showFollowButton?: boolean;
}

export interface ContactFormProps {
  headline?: string;
  description?: string;
  fields?: Array<{
    name: string;
    type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
    label: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
  }>;
  layout?: 'default' | 'side-by-side';
}

export interface NewsletterProps {
  headline?: string;
  description?: string;
  backgroundColor?: 'primary' | 'secondary' | 'surface';
  layout?: 'stacked' | 'inline';
  mailerliteGroupId?: string;
}

export interface WeatherWidgetProps {
  layout?: 'compact' | 'detailed';
  showForecast?: boolean;
}

export interface BannerProps {
  message: string;
  type?: 'info' | 'warning' | 'success' | 'promo';
  dismissible?: boolean;
  link?: { label: string; href: string };
}

export interface PartnersProps {
  headline?: string;
  logos: Array<{ src: string; alt: string; href?: string }>;
  columns?: 3 | 4 | 5 | 6;
}

export interface DownloadsProps {
  headline?: string;
  files: Array<{
    name: string;
    url: string;
    description?: string;
    fileType?: string;
    fileSize?: string;
  }>;
}

export interface GalleryItem {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
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
