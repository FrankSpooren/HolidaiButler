export type BlockType =
  | 'hero'
  | 'poi_grid'
  | 'poi_grid_filtered'
  | 'event_calendar'
  | 'event_calendar_filtered'
  | 'rich_text'
  | 'card_group'
  | 'curated_cards'
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
  | 'alert_status'
  | 'search'
  | 'filter_bar'
  | 'map_list'
  | 'blog_grid'
  | 'partners'
  | 'downloads'
  | 'desktop_hero'
  | 'hero_chatbot'
  | 'desktop_program_tip'
  | 'programme'
  | 'program_card'
  | 'desktop_events'
  | 'today_events'
  | 'category_grid'
  | 'popular_pois'
  | 'map_preview'
  | 'mobile_program'
  | 'mobile_tip'
  | 'tip_of_the_day'
  | 'mobile_events'
  | 'mobile_map';

export interface BlockStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  borderColor?: string;
  paddingY?: 'none' | 'small' | 'medium' | 'large' | 'xlarge';
  fullWidth?: boolean;
}

export type BlockVisibility = 'all' | 'mobile' | 'desktop';

export interface BlockConfig {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  style?: BlockStyle;
  featureFlag?: string;
  visibility?: BlockVisibility;
}

export interface ButtonStyle {
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: 'default' | 'none' | 'sm' | 'md' | 'lg' | 'full';
  size?: 'sm' | 'md' | 'lg';
}

export interface HeroButton {
  label: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'chatbot';
  chatbotAction?: string;
  buttonStyle?: ButtonStyle;
}

export interface HeroTextStyle {
  headlineColor?: string;
  descriptionColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  overlayOpacity?: number;
  textShadow?: boolean;
  headlineSize?: 'small' | 'default' | 'large' | 'xlarge';
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
  textStyle?: HeroTextStyle;
}

export interface PoiGridProps {
  categoryFilter?: string[];
  limit?: number;
  columns?: 2 | 3 | 4;
  layout?: 'grid' | 'list' | 'compact';
  title?: string;
  /** Filter: show only POIs with tier <= this value (0 = all) */
  tierFilter?: number;
  /** Sort order: rating, alphabetical, newest, random, relevance */
  sortOrder?: string;
  /** Show tier badge overlay on POI images (default: true) */
  showTierBadge?: boolean;
}

export interface EventCalendarProps {
  limit?: number;
  layout?: 'list' | 'grid' | 'compact';
  /** Configurable section title (i18n) */
  title?: string;
  /** Category filter for events */
  categoryFilter?: string[];
  /** Show past events (default: false) */
  showPastEvents?: boolean;
}

export interface RichTextProps {
  content: string;
  /** Auto-link POI names in content (default: true) */
  enablePoiLinks?: boolean;
}

export type CuratedCardsVariant = 'curated' | 'offer' | 'related';

export interface CardGroupProps {
  variant?: CuratedCardsVariant;
  cards: Array<{
    title: string;
    description?: string;
    image?: string;
    href?: string;
    badge?: string;
    price?: string;
    priceCurrency?: string;
    buttons?: HeroButton[];
  }>;
  columns?: 2 | 3 | 4;
  layout?: 'grid' | 'carousel';
  headline?: string;
}

export interface MapMarker {
  lat: number;
  lng: number;
  name: string;
  category?: string;
  rating?: number;
  id?: number;
}

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  categoryFilter?: string[];
  markers?: MapMarker[];
  overlayLabel?: string;
  /** Show category legend below map (default: true) */
  showLegend?: boolean;
  /** Maximum number of markers to display (default: 20) */
  markerLimit?: number;
  /** Map height CSS value (default: responsive 300/400/500px) */
  height?: string;
  /** Enable marker clustering for many POIs */
  showClusters?: boolean;
}

export interface TestimonialsProps {
  limit?: number;
  minRating?: number;
}

export interface CtaProps {
  headline: string;
  description?: string;
  /** Optional background image URL */
  backgroundImage?: string;
  backgroundStyle?: 'primary' | 'accent' | 'gradient' | 'dark' | 'light';
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
  type?: 'info' | 'success' | 'promo';
  dismissible?: boolean;
  link?: { label: string; href: string; variant?: 'chatbot'; chatbotAction?: string };
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

export interface MobileProgramProps {
  programSize?: number;
}

export interface MobileTipProps {
  // Self-contained — reads onboarding interests from localStorage
}

export interface MobileEventsProps {
  destinationName?: string;
  destinationSlug?: string;
}

export interface MobileMapProps {
  poiLimit?: number;
  mapLabel?: Record<string, string>;
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
