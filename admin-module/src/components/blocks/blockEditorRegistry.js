import { lazy } from 'react';

// Lazy-load editors for code splitting
const HeroEditor = lazy(() => import('./editors/HeroEditor.jsx'));
const RichTextEditor = lazy(() => import('./editors/RichTextEditor.jsx'));
const CtaEditor = lazy(() => import('./editors/CtaEditor.jsx'));
const BannerEditor = lazy(() => import('./editors/BannerEditor.jsx'));
const FaqEditor = lazy(() => import('./editors/FaqEditor.jsx'));
const PartnersEditor = lazy(() => import('./editors/PartnersEditor.jsx'));
const DownloadsEditor = lazy(() => import('./editors/DownloadsEditor.jsx'));
const PoiGridEditor = lazy(() => import('./editors/PoiGridEditor.jsx'));
const EventCalendarEditor = lazy(() => import('./editors/EventCalendarEditor.jsx'));
const MapEditor = lazy(() => import('./editors/MapEditor.jsx'));
const CardGroupEditor = lazy(() => import('./editors/CardGroupEditor.jsx'));
const GalleryEditor = lazy(() => import('./editors/GalleryEditor.jsx'));
const VideoEditor = lazy(() => import('./editors/VideoEditor.jsx'));
const ContactFormEditor = lazy(() => import('./editors/ContactFormEditor.jsx'));
const NewsletterEditor = lazy(() => import('./editors/NewsletterEditor.jsx'));
const WeatherWidgetEditor = lazy(() => import('./editors/WeatherWidgetEditor.jsx'));
const SocialFeedEditor = lazy(() => import('./editors/SocialFeedEditor.jsx'));
const TicketShopEditor = lazy(() => import('./editors/TicketShopEditor.jsx'));
const ReservationWidgetEditor = lazy(() => import('./editors/ReservationWidgetEditor.jsx'));
const ChatbotWidgetEditor = lazy(() => import('./editors/ChatbotWidgetEditor.jsx'));

/**
 * Block Editor Registry
 * Maps block type → { editor, icon, label, description, category }
 * MUI icon names (resolved to components in BlockSelectorDialog)
 */
const blockEditorRegistry = {
  hero: {
    editor: HeroEditor,
    icon: 'Panorama',
    label: 'Hero',
    description: 'Full-width header with image, video, or gradient background',
    category: 'Content'
  },
  rich_text: {
    editor: RichTextEditor,
    icon: 'Article',
    label: 'Rich Text',
    description: 'WYSIWYG text editor with formatting',
    category: 'Content'
  },
  cta: {
    editor: CtaEditor,
    icon: 'TouchApp',
    label: 'Call to Action',
    description: 'Highlighted section with buttons',
    category: 'Content'
  },
  banner: {
    editor: BannerEditor,
    icon: 'Campaign',
    label: 'Banner',
    description: 'Dismissible notification or promo bar',
    category: 'Content'
  },
  faq: {
    editor: FaqEditor,
    icon: 'QuestionAnswer',
    label: 'FAQ',
    description: 'Expandable question & answer list',
    category: 'Content'
  },
  gallery: {
    editor: GalleryEditor,
    icon: 'Collections',
    label: 'Gallery',
    description: 'Image and video gallery with lightbox',
    category: 'Media'
  },
  video: {
    editor: VideoEditor,
    icon: 'PlayCircle',
    label: 'Video',
    description: 'YouTube, Vimeo, or self-hosted video',
    category: 'Media'
  },
  partners: {
    editor: PartnersEditor,
    icon: 'Handshake',
    label: 'Partners',
    description: 'Logo grid with links',
    category: 'Media'
  },
  downloads: {
    editor: DownloadsEditor,
    icon: 'FileDownload',
    label: 'Downloads',
    description: 'File list with type icons',
    category: 'Media'
  },
  poi_grid: {
    editor: PoiGridEditor,
    icon: 'GridView',
    label: 'POI Grid',
    description: 'Grid of points of interest with filters',
    category: 'Data'
  },
  event_calendar: {
    editor: EventCalendarEditor,
    icon: 'Event',
    label: 'Events',
    description: 'Event listing from agenda',
    category: 'Data'
  },
  map: {
    editor: MapEditor,
    icon: 'Map',
    label: 'Map',
    description: 'Interactive map with POI markers',
    category: 'Data'
  },
  weather_widget: {
    editor: WeatherWidgetEditor,
    icon: 'WbSunny',
    label: 'Weather',
    description: 'Current weather and forecast',
    category: 'Data'
  },
  social_feed: {
    editor: SocialFeedEditor,
    icon: 'Share',
    label: 'Social Feed',
    description: 'Social media embed (privacy-first)',
    category: 'Data'
  },
  contact_form: {
    editor: ContactFormEditor,
    icon: 'ContactMail',
    label: 'Contact Form',
    description: 'Configurable contact form with GDPR',
    category: 'Interactie'
  },
  newsletter: {
    editor: NewsletterEditor,
    icon: 'Email',
    label: 'Newsletter',
    description: 'Email signup via MailerLite',
    category: 'Interactie'
  },
  chatbot_widget: {
    editor: ChatbotWidgetEditor,
    icon: 'SmartToy',
    label: 'Chatbot',
    description: 'AI chatbot widget',
    category: 'Interactie'
  },
  ticket_shop: {
    editor: TicketShopEditor,
    icon: 'ConfirmationNumber',
    label: 'Ticket Shop',
    description: 'Ticket listing and booking',
    category: 'Commerce'
  },
  reservation_widget: {
    editor: ReservationWidgetEditor,
    icon: 'BookOnline',
    label: 'Reservations',
    description: 'Reservation booking widget',
    category: 'Commerce'
  },
  card_group: {
    editor: CardGroupEditor,
    icon: 'ViewModule',
    label: 'Card Group',
    description: 'Grid of content cards with images',
    category: 'Commerce'
  }
};

export const CATEGORIES = ['Content', 'Media', 'Data', 'Interactie', 'Commerce'];

export function getBlocksByCategory(category) {
  return Object.entries(blockEditorRegistry)
    .filter(([, meta]) => meta.category === category)
    .map(([type, meta]) => ({ type, ...meta }));
}

export function getBlockMeta(type) {
  return blockEditorRegistry[type] || null;
}

export default blockEditorRegistry;
