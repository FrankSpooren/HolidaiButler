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
const TestimonialsEditor = lazy(() => import('./editors/TestimonialsEditor.jsx'));
const MobileProgramEditor = lazy(() => import('./editors/MobileProgramEditor.jsx'));
const MobileTipEditor = lazy(() => import('./editors/MobileTipEditor.jsx'));
const MobileEventsEditor = lazy(() => import('./editors/MobileEventsEditor.jsx'));
const MobileMapEditor = lazy(() => import('./editors/MobileMapEditor.jsx'));
const BlogGridEditor = lazy(() => import('./editors/BlogGridEditor.jsx'));
const AlertStatusEditor = lazy(() => import('./editors/AlertStatusEditor.jsx'));
const SearchEditor = lazy(() => import('./editors/SearchEditor.jsx'));
const FilterBarEditor = lazy(() => import('./editors/FilterBarEditor.jsx'));
const MapListEditor = lazy(() => import('./editors/MapListEditor.jsx'));
const RelatedItemsEditor = lazy(() => import('./editors/RelatedItemsEditor.jsx'));
const FeaturedItemEditor = lazy(() => import('./editors/FeaturedItemEditor.jsx'));
const AddToCalendarEditor = lazy(() => import('./editors/AddToCalendarEditor.jsx'));
const OpeningHoursEditor = lazy(() => import('./editors/OpeningHoursEditor.jsx'));
const LocationDetailsEditor = lazy(() => import('./editors/LocationDetailsEditor.jsx'));
const ItineraryEditor = lazy(() => import('./editors/ItineraryEditor.jsx'));
const SaveToTripEditor = lazy(() => import('./editors/SaveToTripEditor.jsx'));
const CalendarViewEditor = lazy(() => import('./editors/CalendarViewEditor.jsx'));
const BreadcrumbsEditor = lazy(() => import('./editors/BreadcrumbsEditor.jsx'));
const AnchorNavEditor = lazy(() => import('./editors/AnchorNavEditor.jsx'));
const OfferEditor = lazy(() => import('./editors/OfferEditor.jsx'));
const ConsentEmbedEditor = lazy(() => import('./editors/ConsentEmbedEditor.jsx'));

/**
 * PNG thumbnail path helper — resolves to /block-thumbnails/{type}.png in public/
 */
const thumb = (type) => `/block-thumbnails/${type}.png`;

/**
 * Block Editor Registry
 * Maps block type → { editor, icon, label, description, category, thumbnail }
 * MUI icon names (resolved to components in BlockSelectorDialog)
 */
const blockEditorRegistry = {
  hero: {
    editor: HeroEditor,
    icon: 'Panorama',
    label: 'Hero',
    description: 'Full-width header with image, video, or gradient background',
    category: 'Page Structure',
    thumbnail: thumb("hero"),
  },
  rich_text: {
    editor: RichTextEditor,
    icon: 'Article',
    label: 'Rich Text',
    description: 'WYSIWYG text editor with formatting',
    category: 'Page Structure',
    thumbnail: thumb("rich_text"),
  },
  cta: {
    editor: CtaEditor,
    icon: 'TouchApp',
    label: 'Call to Action',
    description: 'Highlighted section with buttons',
    category: 'Page Structure',
    thumbnail: thumb("cta"),
  },
  banner: {
    editor: BannerEditor,
    icon: 'Campaign',
    label: 'Banner',
    description: 'Dismissible notification or promo bar',
    category: 'Page Structure',
    thumbnail: thumb("banner"),
  },
  alert_status: {
    editor: AlertStatusEditor,
    icon: 'Campaign',
    label: 'Alert / Status',
    description: 'Operationele melding: sluiting, weersalarm, capaciteit',
    category: 'Page Structure',
    thumbnail: thumb("alert_status"),
  },
  search: {
    editor: SearchEditor,
    icon: 'Search',
    label: 'Search',
    description: 'Full-site search across POIs, events, and articles with typeahead',
    category: 'Discovery',
    featureFlag: 'hasSearchBlock',
    addedIn: 'VII-E2 Batch A',
    thumbnail: thumb("search"),
  },
  filter_bar: {
    editor: FilterBarEditor,
    icon: 'FilterList',
    label: 'Filter Bar',
    description: 'Reusable filter bar for POIs, events, and more. Place above content blocks.',
    category: 'Discovery',
    featureFlag: 'hasFilterBarBlock',
    addedIn: 'VII-E2 Batch A',
    thumbnail: thumb("filter_bar"),
  },
  map_list: {
    editor: MapListEditor,
    icon: 'SplitscreenOutlined',
    label: 'Map + List',
    description: 'Synchronized map and list with bidirectional interaction',
    category: 'Discovery',
    featureFlag: 'hasMapListBlock',
    addedIn: 'VII-E2 Batch A',
    thumbnail: thumb("map_list"),
  },
  related_items: {
    editor: RelatedItemsEditor,
    icon: 'Recommend',
    label: 'Related Items',
    description: 'Show related POIs or events based on category or proximity',
    category: 'Discovery',
    featureFlag: 'hasRelatedItemsBlock',
    addedIn: 'VII-E2 Batch A',
    thumbnail: thumb("related_items"),
  },
  featured_item: {
    editor: FeaturedItemEditor,
    icon: 'Star',
    label: 'Featured Item',
    description: 'Highlight a single POI, event, or article with rich presentation',
    category: 'Discovery',
    featureFlag: 'hasFeaturedItemBlock',
    addedIn: 'VII-E2 Batch A',
    thumbnail: thumb("featured_item"),
  },
  add_to_calendar: {
    editor: AddToCalendarEditor,
    icon: 'CalendarMonth',
    label: 'Add to Calendar',
    description: 'Calendar links for Google, Apple, Outlook, Yahoo',
    category: 'Events & Programme',
    featureFlag: 'hasAddToCalendarBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: thumb("add_to_calendar"),
  },
  opening_hours: {
    editor: OpeningHoursEditor,
    icon: 'Schedule',
    label: 'Opening Hours',
    description: 'Show opening hours with live open/closed status',
    category: 'Events & Programme',
    featureFlag: 'hasOpeningHoursBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: thumb("opening_hours"),
  },
  location_details: {
    editor: LocationDetailsEditor,
    icon: 'Place',
    label: 'Location Details',
    description: 'Address, directions, parking, and accessibility info',
    category: 'Events & Programme',
    featureFlag: 'hasLocationDetailsBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: thumb("location_details"),
  },
  itinerary: {
    editor: ItineraryEditor,
    icon: 'Route',
    label: 'Itinerary / Route',
    description: 'Multi-stop route planner with OSRM-powered routing',
    category: 'Events & Programme',
    featureFlag: 'hasItineraryBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: thumb("itinerary"),
  },
  save_to_trip: {
    editor: SaveToTripEditor,
    icon: 'BookmarkAdd',
    label: 'Save to Trip',
    description: 'Let visitors save POIs and events to a personal plan',
    category: 'Events & Programme',
    featureFlag: 'hasSaveToTripBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: thumb("save_to_trip"),
  },
  calendar_view: {
    editor: CalendarViewEditor,
    icon: 'CalendarViewMonth',
    label: 'Calendar View',
    description: 'Full calendar with month, week, and agenda views (FullCalendar)',
    category: 'Events & Programme',
    featureFlag: 'hasCalendarViewBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: thumb("calendar_view"),
  },
  breadcrumbs: {
    editor: BreadcrumbsEditor, icon: 'NavigateNext', label: 'Breadcrumbs',
    description: 'Page navigation breadcrumbs with Schema.org SEO',
    category: 'Page Structure', featureFlag: 'hasBreadcrumbsBlock', addedIn: 'VII-E2 Batch C',
    thumbnail: thumb("breadcrumbs"),
  },
  anchor_nav: {
    editor: AnchorNavEditor, icon: 'Anchor', label: 'Anchor Navigation',
    description: 'In-page section navigation with active highlighting',
    category: 'Page Structure', featureFlag: 'hasAnchorNavBlock', addedIn: 'VII-E2 Batch C',
    thumbnail: thumb("anchor_nav"),
  },
  offer: {
    editor: OfferEditor, icon: 'LocalOffer', label: 'Offer / Package',
    description: 'Deals, bundles, and promotions with pricing and CTA',
    category: 'Commerce & Conversion', featureFlag: 'hasOfferPackageBlock', addedIn: 'VII-E2 Batch C',
    thumbnail: thumb("offer"),
  },
  consent_embed: {
    editor: ConsentEmbedEditor, icon: 'PrivacyTip', label: 'Consent-aware Embed',
    description: 'GDPR-compliant embed for YouTube, Maps, social (loads after consent)',
    category: 'Page Structure', featureFlag: 'hasConsentEmbedBlock', addedIn: 'VII-E2 Batch C',
    thumbnail: thumb("consent_embed"),
  },
  faq: {
    editor: FaqEditor,
    icon: 'QuestionAnswer',
    label: 'FAQ',
    description: 'Expandable question & answer list',
    category: 'Page Structure',
    thumbnail: thumb("faq"),
  },
  gallery: {
    editor: GalleryEditor,
    icon: 'Collections',
    label: 'Gallery',
    description: 'Image and video gallery with lightbox',
    category: 'Media & Proof',
    thumbnail: thumb("gallery"),
  },
  video: {
    editor: VideoEditor,
    icon: 'PlayCircle',
    label: 'Video',
    description: 'YouTube, Vimeo, or self-hosted video',
    category: 'Media & Proof',
    thumbnail: thumb("video"),
  },
  partners: {
    editor: PartnersEditor,
    icon: 'Handshake',
    label: 'Partners',
    description: 'Logo grid with links',
    category: 'Media & Proof',
    thumbnail: thumb("partners"),
  },
  downloads: {
    editor: DownloadsEditor,
    icon: 'FileDownload',
    label: 'Downloads',
    description: 'File list with type icons',
    category: 'Media & Proof',
    thumbnail: thumb("downloads"),
  },
  poi_grid: {
    editor: PoiGridEditor,
    icon: 'GridView',
    label: 'POI Grid',
    description: 'Grid of points of interest',
    category: 'Discovery',
    thumbnail: thumb("poi_grid"),
  },
  poi_grid_filtered: {
    editor: PoiGridEditor,
    icon: 'FilterList',
    label: 'POI Grid (Filtered)',
    description: 'Grid of POIs with category/rating filter bar',
    category: 'Discovery',
    thumbnail: thumb("poi_grid_filtered"),
  },
  event_calendar: {
    editor: EventCalendarEditor,
    icon: 'Event',
    label: 'Events',
    description: 'Event listing from agenda',
    category: 'Events & Programme',
    thumbnail: thumb("event_calendar"),
  },
  event_calendar_filtered: {
    editor: EventCalendarEditor,
    icon: 'EventNote',
    label: 'Events (Filtered)',
    description: 'Event listing with date/category filter bar',
    category: 'Events & Programme',
    thumbnail: thumb("event_calendar_filtered"),
  },
  map: {
    editor: MapEditor,
    icon: 'Map',
    label: 'Map',
    description: 'Interactive map with POI markers',
    category: 'Discovery',
    thumbnail: thumb("map"),
  },
  weather_widget: {
    editor: WeatherWidgetEditor,
    icon: 'WbSunny',
    label: 'Weather',
    description: 'Current weather and forecast',
    category: 'Utility & Practical Info',
    thumbnail: thumb("weather_widget"),
  },
  social_feed: {
    editor: SocialFeedEditor,
    icon: 'Share',
    label: 'Social Feed',
    description: 'Social media embed (privacy-first)',
    category: 'Media & Proof',
    thumbnail: thumb("social_feed"),
  },
  contact_form: {
    editor: ContactFormEditor,
    icon: 'ContactMail',
    label: 'Contact Form',
    description: 'Configurable contact form with GDPR',
    category: 'Forms & Assistance',
    thumbnail: thumb("contact_form"),
  },
  newsletter: {
    editor: NewsletterEditor,
    icon: 'Email',
    label: 'Newsletter',
    description: 'Email signup via MailerLite',
    category: 'Forms & Assistance',
    thumbnail: thumb("newsletter"),
  },
  chatbot_widget: {
    editor: ChatbotWidgetEditor,
    icon: 'SmartToy',
    label: 'Chatbot',
    description: 'AI chatbot widget',
    category: 'Forms & Assistance',
    thumbnail: thumb("chatbot_widget"),
  },
  ticket_shop: {
    editor: TicketShopEditor,
    icon: 'ConfirmationNumber',
    label: 'Ticket Shop',
    description: 'Ticket listing and booking',
    category: 'Commerce & Conversion',
    thumbnail: thumb("ticket_shop"),
  },
  reservation_widget: {
    editor: ReservationWidgetEditor,
    icon: 'BookOnline',
    label: 'Reservations',
    description: 'Reservation booking widget',
    category: 'Commerce & Conversion',
    thumbnail: thumb("reservation_widget"),
  },
  curated_cards: {
    editor: CardGroupEditor,
    icon: 'ViewModule',
    label: 'Curated Cards',
    description: 'Content cards met variant (curated/aanbieding/gerelateerd)',
    category: 'Recommendations & Planning',
    thumbnail: thumb("curated_cards"),
  },
  card_group: {
    editor: CardGroupEditor,
    icon: 'ViewModule',
    label: 'Card Group (alias)',
    description: 'Alias voor Curated Cards',
    category: 'Recommendations & Planning',
    thumbnail: thumb("curated_cards"),
    hidden: true
  },
  testimonials: {
    editor: TestimonialsEditor,
    icon: 'FormatQuote',
    label: 'Recensies / Testimonials',
    description: 'Reviews van bezoekers met sterren en citaten',
    category: 'Recommendations & Planning',
    thumbnail: thumb("testimonials"),
  },
  // Desktop homepage blocks (primary names used in templates + DB)
  desktop_hero: {
    editor: HeroEditor,
    icon: 'Chat',
    label: 'Hero + Chatbot',
    description: 'Hero met chatbot-input en quick actions',
    category: 'Page Structure',
    thumbnail: thumb("desktop_hero"),
  },
  programme: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Dagprogramma + Tip',
    description: 'Responsive dagprogramma met tip van de dag',
    category: 'Events & Programme',
    thumbnail: thumb("programme"),
  },
  desktop_program_tip: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Programma + Tip (alias)',
    description: 'Alias voor Dagprogramma + Tip',
    category: 'Events & Programme',
    thumbnail: thumb("programme"),
    hidden: true
  },
  desktop_events: {
    editor: MobileEventsEditor,
    icon: 'EventNote',
    label: 'Vandaag Events (alias)',
    description: 'Alias voor Today Events',
    category: 'Events & Programme',
    thumbnail: thumb("today_events"),
    hidden: true
  },
  category_grid: {
    editor: MobileMapEditor,
    icon: 'Category',
    label: 'Categorie Grid',
    description: 'Responsive categorie browser: scroll op mobiel, 4-kolom grid op desktop',
    category: 'Discovery',
    thumbnail: thumb("category_grid"),
  },
  // Desktop homepage block aliases (backward compat)
  hero_chatbot: {
    editor: HeroEditor,
    icon: 'Chat',
    label: 'Hero + Chatbot (alias)',
    description: 'Alias voor Desktop Hero',
    category: 'Page Structure',
    thumbnail: thumb("hero"),
    hidden: true
  },
  program_card: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Programma + Tip (alias)',
    description: 'Alias voor Dagprogramma + Tip',
    category: 'Events & Programme',
    thumbnail: thumb("programme"),
    hidden: true
  },
  today_events: {
    editor: MobileEventsEditor,
    icon: 'EventNote',
    label: 'Vandaag Events',
    description: 'Responsive events: scroll op mobiel, grid op desktop',
    category: 'Events & Programme',
    thumbnail: thumb("today_events"),
  },
  popular_pois: {
    editor: PoiGridEditor,
    icon: 'Stars',
    label: 'Populaire POIs',
    description: 'Top POIs grid met titel',
    category: 'Discovery',
    thumbnail: thumb("popular_pois"),
  },
  map_preview: {
    editor: MapEditor,
    icon: 'PinDrop',
    label: 'Kaart met overlay',
    description: 'Interactieve kaart met overlay label',
    category: 'Discovery',
    thumbnail: thumb("map_preview"),
  },
  mobile_program: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Dagprogramma (alias)',
    description: 'Alias voor Dagprogramma + Tip',
    category: 'Events & Programme',
    thumbnail: thumb("programme"),
    hidden: true
  },
  tip_of_the_day: {
    editor: MobileTipEditor,
    icon: 'TipsAndUpdates',
    label: 'Tip van de Dag',
    description: 'Dagelijkse aanbeveling op basis van interesses',
    category: 'Recommendations & Planning',
    thumbnail: thumb("tip_of_the_day"),
  },
  mobile_tip: {
    editor: MobileTipEditor,
    icon: 'TipsAndUpdates',
    label: 'Tip van de Dag (alias)',
    description: 'Alias voor Tip van de Dag',
    category: 'Recommendations & Planning',
    thumbnail: thumb("tip_of_the_day"),
    hidden: true
  },
  mobile_events: {
    editor: MobileEventsEditor,
    icon: 'EventNote',
    label: 'Vandaag Events (alias)',
    description: 'Alias voor Today Events (responsive)',
    category: 'Events & Programme',
    thumbnail: thumb("today_events"),
    hidden: true
  },
  mobile_map: {
    editor: MobileMapEditor,
    icon: 'PinDrop',
    label: 'Kaart Preview (compact)',
    description: 'Compacte kaart met top POIs per categorie (verschilt van volledige Map)',
    category: 'Discovery',
    thumbnail: thumb("mobile_map"),
  },
  blog_grid: {
    editor: BlogGridEditor,
    icon: 'Article',
    label: 'Blog Grid',
    description: 'Overzicht van gepubliceerde blog artikelen uit Content Studio',
    category: 'Utility & Practical Info',
    thumbnail: thumb("blog_grid"),
  }
};

export const CATEGORIES = ["Page Structure", "Discovery", "Events & Programme", "Recommendations & Planning", "Media & Proof", "Commerce & Conversion", "Forms & Assistance", "Utility & Practical Info"];

export function getBlocksByCategory(category) {
  return Object.entries(blockEditorRegistry)
    .filter(([, meta]) => meta.category === category && !meta.hidden)
    .map(([type, meta]) => ({ type, ...meta }));
}

export function getBlockMeta(type) {
  return blockEditorRegistry[type] || null;
}

export default blockEditorRegistry;
