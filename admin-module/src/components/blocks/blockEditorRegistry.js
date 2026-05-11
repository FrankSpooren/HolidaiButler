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
 * Inline SVG wireframe thumbnails (300×200) per block type.
 * Schematische wireframes die visueel tonen wat elk block doet.
 */
const THUMBNAILS = {
  hero: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f0f4f8"/><rect x="0" y="0" width="300" height="200" fill="#e2e8f0"/><rect x="20" y="10" width="60" height="8" rx="2" fill="#94a3b8"/><rect x="60" y="70" width="180" height="16" rx="3" fill="#475569"/><rect x="80" y="96" width="140" height="10" rx="2" fill="#94a3b8"/><rect x="110" y="125" width="80" height="28" rx="14" fill="#3b82f6"/><rect x="125" y="133" width="50" height="12" rx="2" fill="#fff"/><polygon points="230,30 260,55 200,55" fill="#cbd5e1"/><circle cx="245" cy="25" r="10" fill="#fbbf24"/></svg>`,
  rich_text: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="30" y="20" width="140" height="14" rx="2" fill="#334155"/><rect x="30" y="48" width="240" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="62" width="220" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="76" width="200" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="100" width="100" height="10" rx="2" fill="#475569" font-weight="bold"/><rect x="30" y="120" width="240" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="134" width="230" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="148" width="180" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="172" width="240" height="8" rx="2" fill="#94a3b8"/></svg>`,
  cta: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f0f4f8"/><rect x="20" y="30" width="260" height="140" rx="12" fill="#eff6ff"/><rect x="60" y="55" width="180" height="14" rx="2" fill="#1e40af"/><rect x="70" y="80" width="160" height="8" rx="2" fill="#64748b"/><rect x="80" y="94" width="140" height="8" rx="2" fill="#64748b"/><rect x="70" y="120" width="76" height="30" rx="15" fill="#3b82f6"/><rect x="82" y="128" width="52" height="14" rx="2" fill="#fff"/><rect x="158" y="120" width="76" height="30" rx="15" fill="none" stroke="#3b82f6" stroke-width="2"/><rect x="170" y="128" width="52" height="14" rx="2" fill="#3b82f6"/></svg>`,
  banner: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="10" y="75" width="280" height="50" rx="8" fill="#fef3c7"/><rect x="24" y="82" width="16" height="16" rx="8" fill="#f59e0b"/><text x="32" y="94" font-size="12" fill="#fff" text-anchor="middle">!</text><rect x="48" y="88" width="160" height="8" rx="2" fill="#92400e"/><rect x="48" y="100" width="120" height="6" rx="2" fill="#b45309"/><rect x="254" y="88" width="24" height="24" rx="4" fill="none" stroke="#b45309" stroke-width="1.5"/><line x1="260" y1="94" x2="272" y2="106" stroke="#b45309" stroke-width="1.5"/><line x1="272" y1="94" x2="260" y2="106" stroke="#b45309" stroke-width="1.5"/></svg>`,
  faq: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="20" y="15" width="260" height="36" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="32" y="28" width="180" height="10" rx="2" fill="#334155"/><text x="264" y="38" font-size="16" fill="#94a3b8" text-anchor="middle">+</text><rect x="20" y="59" width="260" height="60" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5"/><rect x="32" y="72" width="160" height="10" rx="2" fill="#1e40af"/><text x="264" y="82" font-size="16" fill="#3b82f6" text-anchor="middle">−</text><rect x="32" y="90" width="230" height="6" rx="2" fill="#64748b"/><rect x="32" y="100" width="200" height="6" rx="2" fill="#64748b"/><rect x="20" y="127" width="260" height="36" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="32" y="140" width="140" height="10" rx="2" fill="#334155"/><text x="264" y="150" font-size="16" fill="#94a3b8" text-anchor="middle">+</text><rect x="20" y="171" width="260" height="36" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5" opacity="0.5"/></svg>`,
  gallery: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="15" width="125" height="80" rx="6" fill="#e2e8f0"/><polygon points="30,75 60,45 90,65 105,50 125,75" fill="#cbd5e1"/><circle cx="110" cy="35" r="10" fill="#fbbf24"/><rect x="155" y="15" width="60" height="80" rx="6" fill="#e2e8f0"/><polygon points="165,75 185,50 200,75" fill="#cbd5e1"/><rect x="225" y="15" width="60" height="80" rx="6" fill="#e2e8f0"/><polygon points="235,75 255,50 270,75" fill="#cbd5e1"/><rect x="15" y="105" width="85" height="80" rx="6" fill="#e2e8f0"/><rect x="110" y="105" width="85" height="80" rx="6" fill="#e2e8f0"/><rect x="205" y="105" width="80" height="80" rx="6" fill="#e2e8f0"/></svg>`,
  video: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="25" y="20" width="250" height="160" rx="8" fill="#1e293b"/><circle cx="150" cy="100" r="28" fill="rgba(255,255,255,0.2)"/><polygon points="142,86 142,114 166,100" fill="#fff"/><rect x="50" y="165" width="200" height="4" rx="2" fill="#475569"/><rect x="50" y="165" width="80" height="4" rx="2" fill="#ef4444"/></svg>`,
  partners: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="20" y="20" width="75" height="50" rx="6" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><rect x="35" y="35" width="45" height="20" rx="4" fill="#cbd5e1"/><rect x="112" y="20" width="75" height="50" rx="6" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><rect x="127" y="35" width="45" height="20" rx="4" fill="#cbd5e1"/><rect x="205" y="20" width="75" height="50" rx="6" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><rect x="220" y="35" width="45" height="20" rx="4" fill="#cbd5e1"/><rect x="20" y="85" width="75" height="50" rx="6" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><rect x="35" y="100" width="45" height="20" rx="4" fill="#cbd5e1"/><rect x="112" y="85" width="75" height="50" rx="6" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><rect x="127" y="100" width="45" height="20" rx="4" fill="#cbd5e1"/><rect x="205" y="85" width="75" height="50" rx="6" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><rect x="220" y="100" width="45" height="20" rx="4" fill="#cbd5e1"/><rect x="80" y="160" width="140" height="10" rx="2" fill="#94a3b8"/></svg>`,
  downloads: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="20" y="18" width="260" height="40" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="32" y="28" width="24" height="20" rx="3" fill="#ef4444"/><text x="44" y="42" font-size="7" fill="#fff" text-anchor="middle">PDF</text><rect x="66" y="31" width="140" height="8" rx="2" fill="#334155"/><rect x="66" y="42" width="60" height="6" rx="2" fill="#94a3b8"/><rect x="240" y="31" width="28" height="16" rx="3" fill="#3b82f6"/><rect x="20" y="66" width="260" height="40" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="32" y="76" width="24" height="20" rx="3" fill="#22c55e"/><text x="44" y="90" font-size="7" fill="#fff" text-anchor="middle">GPX</text><rect x="66" y="79" width="120" height="8" rx="2" fill="#334155"/><rect x="66" y="90" width="50" height="6" rx="2" fill="#94a3b8"/><rect x="240" y="79" width="28" height="16" rx="3" fill="#3b82f6"/><rect x="20" y="114" width="260" height="40" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="32" y="124" width="24" height="20" rx="3" fill="#3b82f6"/><text x="44" y="138" font-size="7" fill="#fff" text-anchor="middle">DOC</text><rect x="66" y="127" width="160" height="8" rx="2" fill="#334155"/><rect x="66" y="138" width="70" height="6" rx="2" fill="#94a3b8"/><rect x="240" y="127" width="28" height="16" rx="3" fill="#3b82f6"/></svg>`,
  poi_grid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="15" width="80" height="110" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="15" y="15" width="80" height="50" rx="6 6 0 0" fill="#e2e8f0"/><polygon points="30,50 55,30 70,50" fill="#cbd5e1"/><rect x="22" y="72" width="60" height="8" rx="2" fill="#334155"/><rect x="22" y="84" width="50" height="6" rx="2" fill="#94a3b8"/><circle cx="26" cy="100" r="4" fill="#fbbf24"/><circle cx="34" cy="100" r="4" fill="#fbbf24"/><circle cx="42" cy="100" r="4" fill="#fbbf24"/><rect x="110" y="15" width="80" height="110" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="110" y="15" width="80" height="50" rx="6 6 0 0" fill="#e2e8f0"/><rect x="117" y="72" width="60" height="8" rx="2" fill="#334155"/><rect x="117" y="84" width="50" height="6" rx="2" fill="#94a3b8"/><rect x="205" y="15" width="80" height="110" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="205" y="15" width="80" height="50" rx="6 6 0 0" fill="#e2e8f0"/><rect x="212" y="72" width="60" height="8" rx="2" fill="#334155"/><rect x="212" y="84" width="50" height="6" rx="2" fill="#94a3b8"/><rect x="100" y="140" width="100" height="24" rx="12" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><rect x="115" y="148" width="70" height="8" rx="2" fill="#94a3b8"/></svg>`,
  event_calendar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="20" y="15" width="260" height="170" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="20" y="15" width="260" height="35" rx="8 8 0 0" fill="#3b82f6"/><rect x="35" y="27" width="80" height="10" rx="2" fill="#fff"/><rect x="35" y="60" width="70" height="8" rx="2" fill="#334155"/><rect x="35" y="72" width="120" height="6" rx="2" fill="#94a3b8"/><circle cx="260" cy="68" r="4" fill="#3b82f6"/><line x1="30" y1="86" x2="270" y2="86" stroke="#e2e8f0" stroke-width="1"/><rect x="35" y="96" width="60" height="8" rx="2" fill="#334155"/><rect x="35" y="108" width="100" height="6" rx="2" fill="#94a3b8"/><circle cx="260" cy="104" r="4" fill="#22c55e"/><line x1="30" y1="122" x2="270" y2="122" stroke="#e2e8f0" stroke-width="1"/><rect x="35" y="132" width="80" height="8" rx="2" fill="#334155"/><rect x="35" y="144" width="90" height="6" rx="2" fill="#94a3b8"/><circle cx="260" cy="140" r="4" fill="#f59e0b"/><line x1="30" y1="158" x2="270" y2="158" stroke="#e2e8f0" stroke-width="1"/><rect x="35" y="165" width="55" height="8" rx="2" fill="#334155" opacity="0.5"/></svg>`,
  map: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#e8f4e8"/><path d="M0,120 Q75,80 150,110 T300,90 L300,200 L0,200 Z" fill="#d4edda" opacity="0.5"/><path d="M0,150 Q100,130 200,145 T300,135 L300,200 L0,200 Z" fill="#c3e6cb" opacity="0.4"/><line x1="60" y1="0" x2="80" y2="200" stroke="#b8daff" stroke-width="2" opacity="0.5"/><line x1="180" y1="50" x2="200" y2="200" stroke="#b8daff" stroke-width="1.5" opacity="0.4"/><g transform="translate(90,60)"><circle cx="0" cy="0" r="8" fill="#ef4444"/><circle cx="0" cy="0" r="4" fill="#fff"/></g><g transform="translate(180,90)"><circle cx="0" cy="0" r="8" fill="#ef4444"/><circle cx="0" cy="0" r="4" fill="#fff"/></g><g transform="translate(220,50)"><circle cx="0" cy="0" r="8" fill="#3b82f6"/><circle cx="0" cy="0" r="4" fill="#fff"/></g><g transform="translate(140,130)"><circle cx="0" cy="0" r="6" fill="#f59e0b"/><circle cx="0" cy="0" r="3" fill="#fff"/></g><rect x="200" y="150" width="85" height="35" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="208" y="158" width="10" height="8" rx="1" fill="#22c55e"/><rect x="222" y="160" width="50" height="4" rx="1" fill="#94a3b8"/><rect x="208" y="172" width="10" height="8" rx="1" fill="#ef4444"/><rect x="222" y="174" width="40" height="4" rx="1" fill="#94a3b8"/></svg>`,
  weather_widget: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f0f9ff"/><rect x="30" y="20" width="240" height="160" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><circle cx="80" cy="70" r="24" fill="#fbbf24"/><circle cx="80" cy="70" r="18" fill="#fde68a"/><rect x="130" y="48" width="40" height="24" rx="2" fill="#1e40af"/><text x="150" y="66" font-size="18" fill="#fff" text-anchor="middle">22°</text><rect x="130" y="78" width="60" height="8" rx="2" fill="#94a3b8"/><line x1="50" y1="110" x2="250" y2="110" stroke="#e2e8f0" stroke-width="1"/><rect x="50" y="125" width="20" height="6" rx="2" fill="#64748b"/><rect x="50" y="135" width="16" height="8" rx="2" fill="#94a3b8"/><circle cx="58" cy="152" r="6" fill="#fde68a"/><rect x="110" y="125" width="20" height="6" rx="2" fill="#64748b"/><rect x="110" y="135" width="16" height="8" rx="2" fill="#94a3b8"/><circle cx="118" cy="152" r="6" fill="#93c5fd"/><rect x="170" y="125" width="20" height="6" rx="2" fill="#64748b"/><rect x="170" y="135" width="16" height="8" rx="2" fill="#94a3b8"/><circle cx="178" cy="152" r="6" fill="#fde68a"/><rect x="230" y="125" width="20" height="6" rx="2" fill="#64748b"/><rect x="230" y="135" width="16" height="8" rx="2" fill="#94a3b8"/><circle cx="238" cy="152" r="6" fill="#d1d5db"/></svg>`,
  social_feed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="20" y="15" width="120" height="170" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="28" y="23" width="104" height="80" rx="4" fill="#e2e8f0"/><polygon points="50,80 80,50 100,70 110,60 124,80" fill="#cbd5e1"/><circle cx="36" cy="112" r="8" fill="#e1306c"/><rect x="50" y="108" width="60" height="6" rx="2" fill="#334155"/><rect x="28" y="126" width="100" height="6" rx="2" fill="#94a3b8"/><rect x="28" y="136" width="80" height="6" rx="2" fill="#94a3b8"/><rect x="28" y="156" width="20" height="6" rx="2" fill="#e1306c"/><rect x="160" y="15" width="120" height="170" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="168" y="23" width="104" height="80" rx="4" fill="#e2e8f0"/><circle cx="176" cy="112" r="8" fill="#1da1f2"/><rect x="190" y="108" width="60" height="6" rx="2" fill="#334155"/><rect x="168" y="126" width="100" height="6" rx="2" fill="#94a3b8"/><rect x="168" y="136" width="80" height="6" rx="2" fill="#94a3b8"/><rect x="168" y="156" width="20" height="6" rx="2" fill="#1da1f2"/></svg>`,
  contact_form: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="40" y="15" width="220" height="170" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="56" y="30" width="80" height="6" rx="2" fill="#64748b"/><rect x="56" y="42" width="188" height="28" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><rect x="56" y="80" width="80" height="6" rx="2" fill="#64748b"/><rect x="56" y="92" width="188" height="28" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><rect x="56" y="130" width="80" height="6" rx="2" fill="#64748b"/><rect x="56" y="142" width="188" height="22" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><rect x="160" y="172" width="84" height="28" rx="14" fill="#3b82f6"/><rect x="175" y="180" width="54" height="12" rx="2" fill="#fff"/></svg>`,
  newsletter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f0fdf4"/><rect x="30" y="40" width="240" height="120" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="95" y="60" width="110" height="12" rx="2" fill="#334155"/><rect x="80" y="80" width="140" height="8" rx="2" fill="#94a3b8"/><rect x="52" y="106" width="140" height="32" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><rect x="62" y="117" width="80" height="10" rx="2" fill="#cbd5e1"/><rect x="198" y="106" width="56" height="32" rx="6" fill="#22c55e"/><rect x="208" y="117" width="36" height="10" rx="2" fill="#fff"/></svg>`,
  chatbot_widget: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="160" y="10" width="130" height="180" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="160" y="10" width="130" height="32" rx="12 12 0 0" fill="#3b82f6"/><circle cx="180" cy="26" r="8" fill="#fff" opacity="0.3"/><rect x="192" y="22" width="50" height="8" rx="2" fill="#fff"/><rect x="172" y="52" width="80" height="20" rx="10" fill="#eff6ff"/><rect x="180" y="58" width="64" height="8" rx="2" fill="#3b82f6"/><rect x="210" y="80" width="70" height="20" rx="10" fill="#f1f5f9"/><rect x="218" y="86" width="54" height="8" rx="2" fill="#475569"/><rect x="172" y="108" width="90" height="20" rx="10" fill="#eff6ff"/><rect x="180" y="114" width="74" height="8" rx="2" fill="#3b82f6"/><rect x="168" y="152" width="96" height="28" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><rect x="178" y="162" width="56" height="8" rx="2" fill="#cbd5e1"/><circle cx="70" cy="150" r="30" fill="#3b82f6"/><rect x="55" y="140" width="30" height="20" rx="4" fill="#fff" opacity="0.3"/><circle cx="62" cy="146" r="3" fill="#3b82f6"/><circle cx="78" cy="146" r="3" fill="#3b82f6"/></svg>`,
  ticket_shop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="20" width="125" height="160" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="15" y="20" width="125" height="60" rx="8 8 0 0" fill="#e2e8f0"/><rect x="40" y="42" width="75" height="16" rx="4" fill="#cbd5e1"/><rect x="25" y="90" width="100" height="8" rx="2" fill="#334155"/><rect x="25" y="104" width="60" height="6" rx="2" fill="#94a3b8"/><rect x="25" y="126" width="40" height="14" rx="2" fill="#22c55e"/><text x="45" y="137" font-size="10" fill="#fff" text-anchor="middle">€25</text><rect x="25" y="148" width="105" height="24" rx="12" fill="#3b82f6"/><rect x="45" y="155" width="65" height="10" rx="2" fill="#fff"/><rect x="160" y="20" width="125" height="160" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="160" y="20" width="125" height="60" rx="8 8 0 0" fill="#e2e8f0"/><rect x="185" y="42" width="75" height="16" rx="4" fill="#cbd5e1"/><rect x="170" y="90" width="100" height="8" rx="2" fill="#334155"/><rect x="170" y="104" width="60" height="6" rx="2" fill="#94a3b8"/><rect x="170" y="126" width="40" height="14" rx="2" fill="#22c55e"/><rect x="170" y="148" width="105" height="24" rx="12" fill="#3b82f6"/><rect x="190" y="155" width="65" height="10" rx="2" fill="#fff"/></svg>`,
  reservation_widget: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="25" y="15" width="250" height="170" rx="10" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="80" y="28" width="140" height="12" rx="2" fill="#334155"/><rect x="40" y="55" width="100" height="6" rx="2" fill="#64748b"/><rect x="40" y="67" width="100" height="26" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><rect x="50" y="76" width="40" height="8" rx="2" fill="#94a3b8"/><rect x="160" y="55" width="100" height="6" rx="2" fill="#64748b"/><rect x="160" y="67" width="100" height="26" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><rect x="170" y="76" width="40" height="8" rx="2" fill="#94a3b8"/><rect x="40" y="105" width="60" height="6" rx="2" fill="#64748b"/><rect x="40" y="117" width="220" height="26" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><rect x="50" y="126" width="50" height="8" rx="2" fill="#94a3b8"/><rect x="85" y="155" width="130" height="24" rx="12" fill="#3b82f6"/><rect x="110" y="162" width="80" height="10" rx="2" fill="#fff"/></svg>`,
  card_group: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="15" width="80" height="110" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="15" y="15" width="80" height="45" rx="6 6 0 0" fill="#e2e8f0"/><polygon points="30,48 55,30 70,48" fill="#cbd5e1"/><rect x="22" y="68" width="60" height="8" rx="2" fill="#334155"/><rect x="22" y="80" width="50" height="6" rx="2" fill="#94a3b8"/><rect x="22" y="100" width="40" height="14" rx="7" fill="#3b82f6"/><rect x="110" y="15" width="80" height="110" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="110" y="15" width="80" height="45" rx="6 6 0 0" fill="#e2e8f0"/><rect x="117" y="68" width="60" height="8" rx="2" fill="#334155"/><rect x="117" y="80" width="50" height="6" rx="2" fill="#94a3b8"/><rect x="117" y="100" width="40" height="14" rx="7" fill="#3b82f6"/><rect x="205" y="15" width="80" height="110" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="205" y="15" width="80" height="45" rx="6 6 0 0" fill="#e2e8f0"/><rect x="212" y="68" width="60" height="8" rx="2" fill="#334155"/><rect x="212" y="80" width="50" height="6" rx="2" fill="#94a3b8"/><rect x="212" y="100" width="40" height="14" rx="7" fill="#3b82f6"/><rect x="100" y="145" width="100" height="10" rx="2" fill="#94a3b8"/></svg>`,
  mobile_program: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#F5F2EC"/><rect x="30" y="15" width="240" height="170" rx="12" fill="#fff"/><rect x="42" y="28" width="120" height="10" rx="2" fill="#5E8B7E"/><rect x="42" y="50" width="12" height="12" rx="6" fill="#e2e8f0"/><rect x="60" y="50" width="140" height="10" rx="2" fill="#334155"/><rect x="60" y="64" width="80" height="6" rx="2" fill="#5E8B7E"/><line x1="48" y1="80" x2="48" y2="92" stroke="#d5e8df" stroke-width="2"/><rect x="42" y="96" width="12" height="12" rx="6" fill="#e2e8f0"/><rect x="60" y="96" width="120" height="10" rx="2" fill="#334155"/><rect x="60" y="110" width="70" height="6" rx="2" fill="#5E8B7E"/><line x1="48" y1="126" x2="48" y2="138" stroke="#d5e8df" stroke-width="2"/><rect x="42" y="142" width="12" height="12" rx="6" fill="#e2e8f0"/><rect x="60" y="142" width="100" height="10" rx="2" fill="#334155"/><rect x="60" y="156" width="90" height="6" rx="2" fill="#5E8B7E"/></svg>`,
  mobile_tip: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#F5F2EC"/><rect x="30" y="30" width="240" height="140" rx="12" fill="linear-gradient(135deg, #fef3c7, #fde68a)"/><rect x="30" y="30" width="240" height="140" rx="12" fill="#fef3c7"/><rect x="50" y="50" width="80" height="10" rx="2" fill="#92400e"/><rect x="50" y="68" width="200" height="8" rx="2" fill="#78350f"/><rect x="50" y="82" width="160" height="8" rx="2" fill="#78350f"/><rect x="50" y="100" width="60" height="50" rx="8" fill="#e2e8f0"/><rect x="120" y="105" width="130" height="8" rx="2" fill="#92400e"/><rect x="120" y="120" width="100" height="6" rx="2" fill="#a16207"/></svg>`,
  mobile_events: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#F5F2EC"/><rect x="15" y="30" width="10" height="10" rx="2" fill="#94a3b8"/><rect x="30" y="30" width="100" height="10" rx="2" fill="#334155"/><rect x="15" y="55" width="80" height="120" rx="10" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="15" y="55" width="80" height="60" rx="10 10 0 0" fill="#e2e8f0"/><rect x="23" y="122" width="64" height="8" rx="2" fill="#334155"/><rect x="23" y="136" width="40" height="6" rx="2" fill="#94a3b8"/><rect x="105" y="55" width="80" height="120" rx="10" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="105" y="55" width="80" height="60" rx="10 10 0 0" fill="#e2e8f0"/><rect x="113" y="122" width="64" height="8" rx="2" fill="#334155"/><rect x="113" y="136" width="40" height="6" rx="2" fill="#94a3b8"/><rect x="195" y="55" width="80" height="120" rx="10" fill="#fff" stroke="#e2e8f0" stroke-width="1" opacity="0.6"/><rect x="195" y="55" width="80" height="60" rx="10 10 0 0" fill="#e2e8f0" opacity="0.6"/></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="40" y="70" width="220" height="44" rx="22" fill="#fff" stroke="#e2e8f0" stroke-width="2"/><circle cx="72" cy="92" r="10" fill="none" stroke="#94a3b8" stroke-width="2"/><line x1="79" y1="99" x2="86" y2="106" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/><rect x="96" y="86" width="100" height="10" rx="2" fill="#cbd5e1"/><rect x="50" y="125" width="200" height="8" rx="2" fill="#e2e8f0"/><rect x="50" y="140" width="160" height="8" rx="2" fill="#e2e8f0"/><rect x="50" y="155" width="120" height="8" rx="2" fill="#e2e8f0"/></svg>`,
  mobile_map: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#F5F2EC"/><rect x="15" y="15" width="270" height="170" rx="12" fill="#e8f4e8"/><path d="M15,120 Q90,80 165,105 T285,90 L285,185 L15,185 Z" fill="#d4edda" opacity="0.5"/><g transform="translate(80,55)"><circle r="8" fill="#ef4444"/><circle r="4" fill="#fff"/></g><g transform="translate(170,85)"><circle r="8" fill="#3b82f6"/><circle r="4" fill="#fff"/></g><g transform="translate(220,50)"><circle r="6" fill="#f59e0b"/><circle r="3" fill="#fff"/></g><rect x="30" y="145" width="60" height="24" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="38" y="153" width="44" height="8" rx="2" fill="#94a3b8"/><rect x="100" y="145" width="60" height="24" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="108" y="153" width="44" height="8" rx="2" fill="#94a3b8"/></svg>`
};

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
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e3a5f"/><stop offset="100%" stop-color="#2d6a4f"/></linearGradient></defs><rect width="300" height="200" fill="url(#hg)"/><rect x="40" y="50" width="180" height="18" rx="3" fill="#fff" opacity="0.95"/><rect x="40" y="78" width="220" height="10" rx="2" fill="#fff" opacity="0.6"/><rect x="40" y="94" width="160" height="10" rx="2" fill="#fff" opacity="0.4"/><rect x="40" y="125" width="90" height="32" rx="16" fill="#fff"/><rect x="52" y="135" width="66" height="12" rx="2" fill="#1e3a5f"/><rect x="140" y="125" width="90" height="32" rx="16" fill="none" stroke="#fff" stroke-width="2"/><rect x="152" y="135" width="66" height="12" rx="2" fill="#fff"/></svg>`
  },
  rich_text: {
    editor: RichTextEditor,
    icon: 'Article',
    label: 'Rich Text',
    description: 'WYSIWYG text editor with formatting',
    category: 'Page Structure',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#fff"/><rect x="30" y="20" width="160" height="16" rx="2" fill="#1e293b"/><rect x="30" y="48" width="240" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="62" width="230" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="76" width="200" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="100" width="120" height="12" rx="2" fill="#334155"/><rect x="30" y="120" width="240" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="134" width="220" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="148" width="180" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="168" width="240" height="8" rx="2" fill="#94a3b8"/><rect x="30" y="182" width="140" height="8" rx="2" fill="#94a3b8"/></svg>`
  },
  cta: {
    editor: CtaEditor,
    icon: 'TouchApp',
    label: 'Call to Action',
    description: 'Highlighted section with buttons',
    category: 'Page Structure',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f0fdf4"/><rect x="25" y="40" width="250" height="120" rx="12" fill="#065f46"/><rect x="65" y="60" width="170" height="16" rx="2" fill="#fff"/><rect x="80" y="84" width="140" height="10" rx="2" fill="#fff" opacity="0.6"/><rect x="75" y="115" width="70" height="30" rx="15" fill="#fff"/><rect x="87" y="124" width="46" height="12" rx="2" fill="#065f46"/><rect x="155" y="115" width="70" height="30" rx="15" fill="none" stroke="#fff" stroke-width="2"/><rect x="167" y="124" width="46" height="12" rx="2" fill="#fff"/></svg>`
  },
  banner: {
    editor: BannerEditor,
    icon: 'Campaign',
    label: 'Banner',
    description: 'Dismissible notification or promo bar',
    category: 'Page Structure',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="70" width="270" height="60" rx="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="1"/><circle cx="40" cy="100" r="12" fill="#f59e0b" opacity="0.2"/><text x="40" y="104" font-size="14" fill="#f59e0b" text-anchor="middle">!</text><text x="60" y="93" font-size="10" fill="#92400e" font-weight="600">Zomerkorting: 20% op alle tickets</text><text x="60" y="110" font-size="8" fill="#b45309">Geldig t/m 31 augustus 2026</text><rect x="230" y="87" width="20" height="20" rx="4" fill="none" stroke="#b45309" stroke-width="1.5"/><line x1="235" y1="92" x2="245" y2="102" stroke="#b45309" stroke-width="1.5"/><line x1="245" y1="92" x2="235" y2="102" stroke="#b45309" stroke-width="1.5"/></svg>`
  },
  alert_status: {
    editor: AlertStatusEditor,
    icon: 'Campaign',
    label: 'Alert / Status',
    description: 'Operationele melding: sluiting, weersalarm, capaciteit',
    category: 'Page Structure',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="65" width="270" height="70" rx="8" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><circle cx="40" cy="90" r="12" fill="#ef4444"/><text x="40" y="95" font-size="14" fill="#fff" text-anchor="middle">⚠</text><text x="60" y="85" font-size="10" fill="#991b1b" font-weight="600">Weersalarm: Storm verwacht</text><text x="60" y="100" font-size="8" fill="#b91c1c">Strand gesloten vandaag 12:00-18:00</text><text x="60" y="115" font-size="8" fill="#dc2626">Bel 0222-123456 voor meer info</text></svg>`
  },
  search: {
    editor: SearchEditor,
    icon: 'Search',
    label: 'Search',
    description: 'Full-site search across POIs, events, and articles with typeahead',
    category: 'Discovery',
    featureFlag: 'hasSearchBlock',
    addedIn: 'VII-E2 Batch A',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="35" y="30" width="230" height="44" rx="22" fill="#fff" stroke="#e2e8f0" stroke-width="2"/><circle cx="62" cy="52" r="10" fill="none" stroke="#94a3b8" stroke-width="2"/><line x1="69" y1="59" x2="76" y2="66" stroke="#94a3b8" stroke-width="2"/><text x="88" y="56" font-size="12" fill="#94a3b8">Zoek stranden, restaurants...</text><rect x="45" y="85" width="210" height="30" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><circle cx="60" cy="100" r="4" fill="#ef4444"/><text x="70" y="103" font-size="9" fill="#334155">Strandpaviljoen Paal 17</text><text x="200" y="103" font-size="8" fill="#94a3b8">POI</text><rect x="45" y="120" width="210" height="30" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><circle cx="60" cy="135" r="4" fill="#3b82f6"/><text x="70" y="138" font-size="9" fill="#334155">Strandmarkt De Koog</text><text x="200" y="138" font-size="8" fill="#94a3b8">Event</text><rect x="45" y="155" width="210" height="30" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><circle cx="60" cy="170" r="4" fill="#8b5cf6"/><text x="70" y="173" font-size="9" fill="#334155">Beste stranden op Texel</text><text x="200" y="173" font-size="8" fill="#94a3b8">Blog</text></svg>`
  },
  filter_bar: {
    editor: FilterBarEditor,
    icon: 'FilterList',
    label: 'Filter Bar',
    description: 'Reusable filter bar for POIs, events, and more. Place above content blocks.',
    category: 'Discovery',
    featureFlag: 'hasFilterBarBlock',
    addedIn: 'VII-E2 Batch A',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="75" width="270" height="50" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="25" y="87" width="55" height="26" rx="13" fill="#7CB342"/><text x="52" y="104" font-size="9" fill="#fff" text-anchor="middle">Natuur</text><rect x="86" y="87" width="75" height="26" rx="13" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><text x="123" y="104" font-size="9" fill="#64748b" text-anchor="middle">Eten & Drinken</text><rect x="167" y="87" width="45" height="26" rx="13" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><text x="189" y="104" font-size="9" fill="#64748b" text-anchor="middle">Actief</text><rect x="218" y="87" width="55" height="26" rx="13" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><text x="245" y="104" font-size="9" fill="#64748b" text-anchor="middle">★ 4.0+</text></svg>`
  },
  map_list: {
    editor: MapListEditor,
    icon: 'SplitscreenOutlined',
    label: 'Map + List',
    description: 'Synchronized map and list with bidirectional interaction',
    category: 'Discovery',
    featureFlag: 'hasMapListBlock',
    addedIn: 'VII-E2 Batch A',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="5" y="5" width="175" height="190" rx="8" fill="#e8f4e8"/><circle cx="60" cy="65" r="8" fill="#ef4444"/><circle cx="60" cy="65" r="4" fill="#fff"/><circle cx="120" cy="95" r="8" fill="#3b82f6"/><circle cx="120" cy="95" r="4" fill="#fff"/><circle cx="85" cy="140" r="6" fill="#f59e0b"/><circle cx="85" cy="140" r="3" fill="#fff"/><rect x="190" y="5" width="105" height="55" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><circle cx="200" cy="20" r="4" fill="#ef4444"/><text x="210" y="23" font-size="8" fill="#334155">Paal 17 Aan Zee</text><text x="210" y="35" font-size="7" fill="#94a3b8">★ 4.8 · Eten</text><rect x="190" y="65" width="105" height="55" rx="6" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/><circle cx="200" cy="80" r="4" fill="#3b82f6"/><text x="210" y="83" font-size="8" fill="#1e40af">De Stal Texel</text><text x="210" y="95" font-size="7" fill="#64748b">★ 4.7 · Eten</text><rect x="190" y="125" width="105" height="55" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><circle cx="200" cy="140" r="4" fill="#f59e0b"/><text x="210" y="143" font-size="8" fill="#334155">Ecomare</text><text x="210" y="155" font-size="7" fill="#94a3b8">★ 4.5 · Natuur</text></svg>`
  },
  related_items: {
    editor: RelatedItemsEditor,
    icon: 'Recommend',
    label: 'Related Items',
    description: 'Show related POIs or events based on category or proximity',
    category: 'Discovery',
    featureFlag: 'hasRelatedItemsBlock',
    addedIn: 'VII-E2 Batch A',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><text x="20" y="25" font-size="12" fill="#334155" font-weight="600">Bekijk ook</text><rect x="10" y="40" width="130" height="70" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="10" y="40" width="130" height="30" rx="8 8 0 0" fill="#e2e8f0"/><text x="20" y="85" font-size="9" fill="#334155">Strand De Koog</text><text x="20" y="98" font-size="8" fill="#f59e0b">★ 4.6</text><rect x="155" y="40" width="130" height="70" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="155" y="40" width="130" height="30" rx="8 8 0 0" fill="#e2e8f0"/><text x="165" y="85" font-size="9" fill="#334155">Vuurtoren Texel</text><text x="165" y="98" font-size="8" fill="#f59e0b">★ 4.8</text><rect x="10" y="120" width="130" height="70" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="10" y="120" width="130" height="30" rx="8 8 0 0" fill="#e2e8f0"/><text x="20" y="165" font-size="9" fill="#334155">Museum Kaap Skil</text><rect x="155" y="120" width="130" height="70" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="155" y="120" width="130" height="30" rx="8 8 0 0" fill="#e2e8f0"/><text x="165" y="165" font-size="9" fill="#334155">Slufter Wandeling</text></svg>`
  },
  featured_item: {
    editor: FeaturedItemEditor,
    icon: 'Star',
    label: 'Featured Item',
    description: 'Highlight a single POI, event, or article with rich presentation',
    category: 'Discovery',
    featureFlag: 'hasFeaturedItemBlock',
    addedIn: 'VII-E2 Batch A',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="10" width="270" height="180" rx="10" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="15" y="10" width="135" height="180" rx="10 0 0 10" fill="#2d6a4f"/><rect x="25" y="20" width="50" height="18" rx="9" fill="#f59e0b"/><text x="50" y="33" font-size="8" fill="#fff" text-anchor="middle">Tip van de dag</text><rect x="160" y="30" width="110" height="14" rx="2" fill="#1e293b"/><text x="165" y="41" font-size="10" fill="#fff">Strandpaviljoen</text><text x="160" y="60" font-size="9" fill="#64748b">Paal 17 Aan Zee</text><text x="160" y="80" font-size="8" fill="#94a3b8">Het gezelligste strandpaviljoen</text><text x="160" y="93" font-size="8" fill="#94a3b8">van Texel met uitzicht op zee</text><text x="160" y="115" font-size="10" fill="#f59e0b">★★★★★ 4.8</text><rect x="160" y="135" width="90" height="30" rx="15" fill="#3b82f6"/><text x="205" y="154" font-size="10" fill="#fff" text-anchor="middle">Bekijken</text></svg>`
  },
  add_to_calendar: {
    editor: AddToCalendarEditor,
    icon: 'CalendarMonth',
    label: 'Add to Calendar',
    description: 'Calendar links for Google, Apple, Outlook, Yahoo',
    category: 'Events & Programme',
    featureFlag: 'hasAddToCalendarBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="60" y="50" width="180" height="100" rx="10" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="60" y="50" width="180" height="30" rx="10 10 0 0" fill="#3b82f6"/><text x="150" y="70" font-size="10" fill="#fff" text-anchor="middle">Toevoegen aan agenda</text><rect x="75" y="92" width="150" height="20" rx="4" fill="#4285F4" opacity="0.1"/><text x="82" y="106" font-size="9" fill="#4285F4">📅 Google Calendar</text><rect x="75" y="116" width="150" height="20" rx="4" fill="#333" opacity="0.1"/><text x="82" y="130" font-size="9" fill="#333">🍎 Apple / iCal</text></svg>`
  },
  opening_hours: {
    editor: OpeningHoursEditor,
    icon: 'Schedule',
    label: 'Opening Hours',
    description: 'Show opening hours with live open/closed status',
    category: 'Events & Programme',
    featureFlag: 'hasOpeningHoursBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#fff"/><rect x="30" y="15" width="80" height="20" rx="10" fill="#dcfce7"/><text x="70" y="29" font-size="9" fill="#16a34a" text-anchor="middle">● Nu geopend</text><g font-size="10"><text x="30" y="55" fill="#334155">Maandag</text><text x="220" y="55" fill="#94a3b8" text-anchor="end">09:00 - 17:00</text><text x="30" y="75" fill="#334155">Dinsdag</text><text x="220" y="75" fill="#94a3b8" text-anchor="end">09:00 - 17:00</text><text x="30" y="95" fill="#1e40af" font-weight="600">Woensdag</text><text x="220" y="95" fill="#1e40af" text-anchor="end" font-weight="600">09:00 - 21:00</text><rect x="25" y="84" width="200" height="18" rx="4" fill="#eff6ff" opacity="0.5"/><text x="30" y="115" fill="#334155">Donderdag</text><text x="220" y="115" fill="#94a3b8" text-anchor="end">09:00 - 17:00</text><text x="30" y="135" fill="#334155">Vrijdag</text><text x="220" y="135" fill="#94a3b8" text-anchor="end">09:00 - 17:00</text><text x="30" y="155" fill="#334155">Zaterdag</text><text x="220" y="155" fill="#94a3b8" text-anchor="end">10:00 - 16:00</text><text x="30" y="175" fill="#334155">Zondag</text><text x="220" y="175" fill="#ef4444" text-anchor="end">Gesloten</text></g></svg>`
  },
  location_details: {
    editor: LocationDetailsEditor,
    icon: 'Place',
    label: 'Location Details',
    description: 'Address, directions, parking, and accessibility info',
    category: 'Events & Programme',
    featureFlag: 'hasLocationDetailsBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#fff"/><rect x="20" y="15" width="260" height="170" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><circle cx="45" cy="45" r="12" fill="#ef4444" opacity="0.15"/><circle cx="45" cy="45" r="6" fill="#ef4444"/><text x="65" y="43" font-size="10" fill="#1e293b" font-weight="600">Strandweg 17, De Koog</text><text x="65" y="58" font-size="9" fill="#94a3b8">1796 AA Texel, Nederland</text><rect x="35" y="75" width="110" height="30" rx="15" fill="#3b82f6"/><text x="90" y="94" font-size="9" fill="#fff" text-anchor="middle">🗺 Route plannen</text><rect x="155" y="75" width="80" height="30" rx="15" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/><text x="195" y="94" font-size="9" fill="#64748b" text-anchor="middle">Kopieer</text><line x1="35" y1="120" x2="245" y2="120" stroke="#e2e8f0"/><text x="55" y="142" font-size="9" fill="#64748b">🅿️ Parkeren</text><text x="55" y="158" font-size="8" fill="#94a3b8">Gratis parkeerplaats naast het strand</text><text x="55" y="178" font-size="9" fill="#64748b">♿ Toegankelijk</text></svg>`
  },
  itinerary: {
    editor: ItineraryEditor,
    icon: 'Route',
    label: 'Itinerary / Route',
    description: 'Multi-stop route planner with OSRM-powered routing',
    category: 'Events & Programme',
    featureFlag: 'hasItineraryBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><circle cx="40" cy="30" r="14" fill="#3b82f6"/><text x="40" y="35" font-size="12" fill="#fff" text-anchor="middle" font-weight="700">1</text><text x="62" y="28" font-size="10" fill="#1e293b" font-weight="600">Vuurtoren Eierland</text><text x="62" y="42" font-size="8" fill="#94a3b8">30 min wandelen</text><line x1="40" y1="44" x2="40" y2="62" stroke="#93c5fd" stroke-width="2"/><text x="50" y="57" font-size="7" fill="#94a3b8">2.1 km · 25 min</text><circle cx="40" cy="76" r="14" fill="#3b82f6"/><text x="40" y="81" font-size="12" fill="#fff" text-anchor="middle" font-weight="700">2</text><text x="62" y="74" font-size="10" fill="#1e293b" font-weight="600">Slufter Wandeling</text><text x="62" y="88" font-size="8" fill="#94a3b8">1 uur hier</text><line x1="40" y1="90" x2="40" y2="108" stroke="#93c5fd" stroke-width="2"/><text x="50" y="103" font-size="7" fill="#94a3b8">3.5 km · 42 min</text><circle cx="40" cy="122" r="14" fill="#3b82f6"/><text x="40" y="127" font-size="12" fill="#fff" text-anchor="middle" font-weight="700">3</text><text x="62" y="120" font-size="10" fill="#1e293b" font-weight="600">Paal 17 Aan Zee</text><text x="62" y="134" font-size="8" fill="#94a3b8">Lunch</text><rect x="170" y="15" width="115" height="155" rx="8" fill="#e8f4e8" stroke="#d1d5db" stroke-width="1"/><circle cx="200" cy="50" r="5" fill="#3b82f6"/><circle cx="230" cy="85" r="5" fill="#3b82f6"/><circle cx="210" cy="130" r="5" fill="#3b82f6"/><path d="M200,50 Q220,65 230,85 Q225,110 210,130" fill="none" stroke="#3b82f6" stroke-width="2"/></svg>`
  },
  save_to_trip: {
    editor: SaveToTripEditor,
    icon: 'BookmarkAdd',
    label: 'Save to Trip',
    description: 'Let visitors save POIs and events to a personal plan',
    category: 'Events & Programme',
    featureFlag: 'hasSaveToTripBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><text x="20" y="25" font-size="12" fill="#334155" font-weight="600">Mijn Plan (3)</text><rect x="15" y="40" width="270" height="40" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><circle cx="35" cy="60" r="10" fill="#eff6ff"/><text x="35" y="64" font-size="9" fill="#3b82f6" text-anchor="middle">1</text><text x="55" y="57" font-size="9" fill="#334155">Vuurtoren Eierland</text><text x="55" y="70" font-size="8" fill="#94a3b8">POI</text><rect x="15" y="85" width="270" height="40" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><circle cx="35" cy="105" r="10" fill="#eff6ff"/><text x="35" y="109" font-size="9" fill="#3b82f6" text-anchor="middle">2</text><text x="55" y="102" font-size="9" fill="#334155">Strandmarkt De Koog</text><text x="55" y="115" font-size="8" fill="#94a3b8">Event</text><rect x="15" y="130" width="270" height="40" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><circle cx="35" cy="150" r="10" fill="#eff6ff"/><text x="35" y="154" font-size="9" fill="#3b82f6" text-anchor="middle">3</text><text x="55" y="147" font-size="9" fill="#334155">Paal 17 Aan Zee</text><text x="55" y="160" font-size="8" fill="#94a3b8">POI</text><rect x="85" y="178" width="60" height="18" rx="9" fill="#3b82f6"/><text x="115" y="190" font-size="8" fill="#fff" text-anchor="middle">Delen</text><rect x="155" y="178" width="60" height="18" rx="9" fill="#ef4444" opacity="0.1"/><text x="185" y="190" font-size="8" fill="#ef4444" text-anchor="middle">Wissen</text></svg>`
  },
  calendar_view: {
    editor: CalendarViewEditor,
    icon: 'CalendarViewMonth',
    label: 'Calendar View',
    description: 'Full calendar with month, week, and agenda views (FullCalendar)',
    category: 'Events & Programme',
    featureFlag: 'hasCalendarViewBlock',
    addedIn: 'VII-E2 Batch B',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#fff"/><rect x="15" y="10" width="270" height="180" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="15" y="10" width="270" height="30" rx="8 8 0 0" fill="#3b82f6"/><text x="30" y="30" font-size="11" fill="#fff" font-weight="600">Mei 2026</text><text x="235" y="30" font-size="9" fill="#fff" opacity="0.7">‹  ›</text><g font-size="8" fill="#94a3b8"><text x="30" y="55">Ma</text><text x="68" y="55">Di</text><text x="106" y="55">Wo</text><text x="144" y="55">Do</text><text x="182" y="55">Vr</text><text x="220" y="55">Za</text><text x="255" y="55">Zo</text></g><g font-size="9" fill="#334155"><text x="33" y="75">5</text><text x="71" y="75">6</text><text x="109" y="75">7</text><text x="147" y="75">8</text><text x="185" y="75">9</text><text x="223" y="75">10</text><text x="258" y="75">11</text></g><rect x="25" y="80" width="30" height="4" rx="2" fill="#7c3aed"/><rect x="140" y="80" width="30" height="4" rx="2" fill="#ef4444"/><g font-size="9" fill="#334155"><text x="33" y="105">12</text><text x="71" y="105">13</text><text x="109" y="105">14</text><text x="147" y="105">15</text><text x="185" y="105">16</text><text x="223" y="105">17</text><text x="258" y="105">18</text></g><rect x="63" y="110" width="45" height="4" rx="2" fill="#3b82f6"/><rect x="215" y="110" width="30" height="4" rx="2" fill="#f59e0b"/></svg>`
  },
  breadcrumbs: {
    editor: BreadcrumbsEditor, icon: 'NavigateNext', label: 'Breadcrumbs',
    description: 'Page navigation breadcrumbs with Schema.org SEO',
    category: 'Page Structure', featureFlag: 'hasBreadcrumbsBlock', addedIn: 'VII-E2 Batch C',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#fff"/><rect x="20" y="88" width="260" height="24" rx="4" fill="#f8fafc"/><g fill="#64748b" font-size="11"><text x="30" y="104">Home</text><text x="68" y="104" fill="#cbd5e1">›</text><text x="80" y="104">Ontdekken</text><text x="145" y="104" fill="#cbd5e1">›</text><text x="157" y="104" fill="#1e293b" font-weight="600">Strandpaviljoen</text></g></svg>`
  },
  anchor_nav: {
    editor: AnchorNavEditor, icon: 'Anchor', label: 'Anchor Navigation',
    description: 'In-page section navigation with active highlighting',
    category: 'Page Structure', featureFlag: 'hasAnchorNavBlock', addedIn: 'VII-E2 Batch C',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#fff"/><rect x="15" y="80" width="270" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><rect x="25" y="90" width="60" height="20" rx="10" fill="#3b82f6"/><text x="55" y="104" font-size="9" fill="#fff" text-anchor="middle">Over</text><rect x="95" y="90" width="65" height="20" rx="10" fill="#f1f5f9"/><text x="127" y="104" font-size="9" fill="#64748b" text-anchor="middle">Reviews</text><rect x="170" y="90" width="50" height="20" rx="10" fill="#f1f5f9"/><text x="195" y="104" font-size="9" fill="#64748b" text-anchor="middle">Kaart</text><rect x="230" y="90" width="45" height="20" rx="10" fill="#f1f5f9"/><text x="252" y="104" font-size="9" fill="#64748b" text-anchor="middle">FAQ</text></svg>`
  },
  offer: {
    editor: OfferEditor, icon: 'LocalOffer', label: 'Offer / Package',
    description: 'Deals, bundles, and promotions with pricing and CTA',
    category: 'Commerce & Conversion', featureFlag: 'hasOfferPackageBlock', addedIn: 'VII-E2 Batch C',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="10" width="130" height="180" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="15" y="10" width="130" height="50" rx="8 8 0 0" fill="#e2e8f0"/><rect x="25" y="20" width="50" height="16" rx="8" fill="#f59e0b"/><text x="50" y="32" font-size="8" fill="#fff" text-anchor="middle">Bestseller</text><rect x="110" y="20" width="28" height="16" rx="8" fill="#ef4444"/><text x="124" y="32" font-size="8" fill="#fff" text-anchor="middle">-20%</text><text x="25" y="80" font-size="10" fill="#1e293b" font-weight="600">Texel Dagpas</text><text x="25" y="100" font-size="20" fill="#1e293b" font-weight="700">€29</text><text x="75" y="95" font-size="11" fill="#94a3b8" text-decoration="line-through">€36</text><text x="25" y="120" font-size="8" fill="#16a34a">✓ Ecomare</text><text x="25" y="135" font-size="8" fill="#16a34a">✓ Kaap Skil</text><text x="25" y="150" font-size="8" fill="#16a34a">✓ Zeehonden</text><rect x="25" y="162" width="110" height="22" rx="11" fill="#3b82f6"/><text x="80" y="177" font-size="9" fill="#fff" text-anchor="middle">Boek nu</text><rect x="155" y="10" width="130" height="180" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="155" y="10" width="130" height="50" rx="8 8 0 0" fill="#e2e8f0"/><text x="165" y="80" font-size="10" fill="#1e293b" font-weight="600">Weekend Deal</text><text x="165" y="100" font-size="20" fill="#1e293b" font-weight="700">€49</text></svg>`
  },
  consent_embed: {
    editor: ConsentEmbedEditor, icon: 'PrivacyTip', label: 'Consent-aware Embed',
    description: 'GDPR-compliant embed for YouTube, Maps, social (loads after consent)',
    category: 'Page Structure', featureFlag: 'hasConsentEmbedBlock', addedIn: 'VII-E2 Batch C',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#0f172a"/><rect x="30" y="15" width="240" height="135" rx="8" fill="#1e293b"/><circle cx="150" cy="65" r="22" fill="rgba(255,255,255,0.1)"/><polygon points="144,55 144,75 162,65" fill="rgba(255,255,255,0.5)"/><text x="150" y="105" font-size="10" fill="rgba(255,255,255,0.7)" text-anchor="middle">Klik om YouTube te laden</text><rect x="100" y="118" width="100" height="24" rx="12" fill="#fff"/><text x="150" y="134" font-size="9" fill="#0f172a" text-anchor="middle">Inhoud laden</text><text x="150" y="168" font-size="8" fill="rgba(255,255,255,0.3)" text-anchor="middle">Door te klikken ga je akkoord met cookies</text></svg>`
  },
  faq: {
    editor: FaqEditor,
    icon: 'QuestionAnswer',
    label: 'FAQ',
    description: 'Expandable question & answer list',
    category: 'Page Structure',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#fff"/><rect x="20" y="15" width="260" height="40" rx="6" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5"/><text x="32" y="38" font-size="9" fill="#1e40af" font-weight="600">Hoe kom ik op Texel?</text><text x="248" y="38" font-size="14" fill="#3b82f6">−</text><text x="32" y="55" font-size="8" fill="#64748b">Met de TESO boot vanaf Den Helder...</text><rect x="20" y="70" width="260" height="36" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="32" y="92" font-size="9" fill="#334155">Wat is de beste tijd om te bezoeken?</text><text x="248" y="92" font-size="14" fill="#94a3b8">+</text><rect x="20" y="112" width="260" height="36" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="32" y="134" font-size="9" fill="#334155">Kan ik mijn hond meenemen?</text><text x="248" y="134" font-size="14" fill="#94a3b8">+</text><rect x="20" y="154" width="260" height="36" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5" opacity="0.6"/><text x="32" y="176" font-size="9" fill="#334155" opacity="0.6">Zijn er fietsverhuurders?</text></svg>`
  },
  gallery: {
    editor: GalleryEditor,
    icon: 'Collections',
    label: 'Gallery',
    description: 'Image and video gallery with lightbox',
    category: 'Media & Proof',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="10" y="10" width="135" height="85" rx="6" fill="#bfdbfe"/><rect x="155" y="10" width="65" height="85" rx="6" fill="#d9f99d"/><rect x="228" y="10" width="62" height="85" rx="6" fill="#fde68a"/><rect x="10" y="105" width="90" height="85" rx="6" fill="#fecaca"/><rect x="108" y="105" width="90" height="85" rx="6" fill="#c4b5fd"/><rect x="206" y="105" width="84" height="85" rx="6" fill="#a7f3d0"/><text x="77" y="58" font-size="10" fill="#1e40af" text-anchor="middle">🏖️ Strand</text><text x="187" y="58" font-size="9" fill="#365314" text-anchor="middle">🌿</text><text x="259" y="58" font-size="9" fill="#854d0e" text-anchor="middle">☀️</text></svg>`
  },
  video: {
    editor: VideoEditor,
    icon: 'PlayCircle',
    label: 'Video',
    description: 'YouTube, Vimeo, or self-hosted video',
    category: 'Media & Proof',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#0f172a"/><rect x="20" y="15" width="260" height="145" rx="8" fill="#1e293b"/><circle cx="150" cy="87" r="24" fill="rgba(255,255,255,0.15)"/><polygon points="142,75 142,99 164,87" fill="#fff"/><rect x="20" y="150" width="260" height="4" rx="2" fill="#334155"/><rect x="20" y="150" width="100" height="4" rx="2" fill="#ef4444"/><text x="30" y="180" font-size="9" fill="#94a3b8">Ontdek Texel vanuit de lucht</text><text x="230" y="180" font-size="9" fill="#94a3b8">3:42</text></svg>`
  },
  partners: {
    editor: PartnersEditor,
    icon: 'Handshake',
    label: 'Partners',
    description: 'Logo grid with links',
    category: 'Media & Proof',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><text x="150" y="25" font-size="11" fill="#334155" text-anchor="middle" font-weight="600">Onze Partners</text><rect x="20" y="40" width="75" height="50" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><text x="57" y="70" font-size="8" fill="#94a3b8" text-anchor="middle">TESO</text><rect x="112" y="40" width="75" height="50" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><text x="149" y="70" font-size="8" fill="#94a3b8" text-anchor="middle">Ecomare</text><rect x="204" y="40" width="75" height="50" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><text x="241" y="70" font-size="8" fill="#94a3b8" text-anchor="middle">VVV Texel</text><rect x="20" y="100" width="75" height="50" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><text x="57" y="130" font-size="8" fill="#94a3b8" text-anchor="middle">De Koog</text><rect x="112" y="100" width="75" height="50" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><text x="149" y="130" font-size="8" fill="#94a3b8" text-anchor="middle">Kaap Skil</text><rect x="204" y="100" width="75" height="50" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><text x="241" y="130" font-size="8" fill="#94a3b8" text-anchor="middle">Jutters</text></svg>`
  },
  downloads: {
    editor: DownloadsEditor,
    icon: 'FileDownload',
    label: 'Downloads',
    description: 'File list with type icons',
    category: 'Media & Proof',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="20" y="20" width="260" height="45" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="32" y="32" width="24" height="20" rx="3" fill="#ef4444"/><text x="44" y="46" font-size="7" fill="#fff" text-anchor="middle">PDF</text><text x="66" y="42" font-size="9" fill="#334155">Wandelroute Slufter (3.2 MB)</text><text x="66" y="54" font-size="8" fill="#94a3b8">Laatste update: mei 2026</text><rect x="242" y="36" width="28" height="16" rx="3" fill="#3b82f6"/><text x="256" y="48" font-size="7" fill="#fff" text-anchor="middle">↓</text><rect x="20" y="75" width="260" height="45" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="32" y="87" width="24" height="20" rx="3" fill="#22c55e"/><text x="44" y="101" font-size="7" fill="#fff" text-anchor="middle">GPX</text><text x="66" y="97" font-size="9" fill="#334155">Fietsroute Texel Rondje (1.1 MB)</text><text x="66" y="109" font-size="8" fill="#94a3b8">42 km, 3-4 uur</text><rect x="242" y="91" width="28" height="16" rx="3" fill="#3b82f6"/><rect x="20" y="130" width="260" height="45" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="32" y="142" width="24" height="20" rx="3" fill="#3b82f6"/><text x="44" y="156" font-size="7" fill="#fff" text-anchor="middle">PNG</text><text x="66" y="152" font-size="9" fill="#334155">Plattegrond Texel (5.8 MB)</text></svg>`
  },
  poi_grid: {
    editor: PoiGridEditor,
    icon: 'GridView',
    label: 'POI Grid',
    description: 'Grid of points of interest',
    category: 'Discovery',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="10" y="10" width="85" height="120" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="10" y="10" width="85" height="50" rx="6 6 0 0" fill="#bfdbfe"/><rect x="17" y="68" width="12" height="12" rx="6" fill="#7CB342"/><text x="35" y="77" font-size="7" fill="#64748b">Natuur</text><text x="17" y="93" font-size="9" fill="#334155" font-weight="600">Slufter</text><text x="17" y="108" font-size="8" fill="#f59e0b">★ 4.7 (89)</text><rect x="105" y="10" width="85" height="120" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="105" y="10" width="85" height="50" rx="6 6 0 0" fill="#fde68a"/><rect x="112" y="68" width="12" height="12" rx="6" fill="#E53935"/><text x="130" y="77" font-size="7" fill="#64748b">Eten</text><text x="112" y="93" font-size="9" fill="#334155" font-weight="600">Paal 17</text><text x="112" y="108" font-size="8" fill="#f59e0b">★ 4.8 (124)</text><rect x="200" y="10" width="85" height="120" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="200" y="10" width="85" height="50" rx="6 6 0 0" fill="#d9f99d"/><rect x="207" y="68" width="12" height="12" rx="6" fill="#004B87"/><text x="225" y="77" font-size="7" fill="#64748b">Cultuur</text><text x="207" y="93" font-size="9" fill="#334155" font-weight="600">Kaap Skil</text><text x="207" y="108" font-size="8" fill="#f59e0b">★ 4.6 (201)</text></svg>`
  },
  poi_grid_filtered: {
    editor: PoiGridEditor,
    icon: 'FilterList',
    label: 'POI Grid (Filtered)',
    description: 'Grid of POIs with category/rating filter bar',
    category: 'Discovery',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="10" y="10" width="85" height="120" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="10" y="10" width="85" height="50" rx="6 6 0 0" fill="#bfdbfe"/><rect x="17" y="68" width="12" height="12" rx="6" fill="#7CB342"/><text x="35" y="77" font-size="7" fill="#64748b">Natuur</text><text x="17" y="93" font-size="9" fill="#334155" font-weight="600">Slufter</text><text x="17" y="108" font-size="8" fill="#f59e0b">★ 4.7 (89)</text><rect x="105" y="10" width="85" height="120" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="105" y="10" width="85" height="50" rx="6 6 0 0" fill="#fde68a"/><rect x="112" y="68" width="12" height="12" rx="6" fill="#E53935"/><text x="130" y="77" font-size="7" fill="#64748b">Eten</text><text x="112" y="93" font-size="9" fill="#334155" font-weight="600">Paal 17</text><text x="112" y="108" font-size="8" fill="#f59e0b">★ 4.8 (124)</text><rect x="200" y="10" width="85" height="120" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="200" y="10" width="85" height="50" rx="6 6 0 0" fill="#d9f99d"/><rect x="207" y="68" width="12" height="12" rx="6" fill="#004B87"/><text x="225" y="77" font-size="7" fill="#64748b">Cultuur</text><text x="207" y="93" font-size="9" fill="#334155" font-weight="600">Kaap Skil</text><text x="207" y="108" font-size="8" fill="#f59e0b">★ 4.6 (201)</text></svg>`
  },
  event_calendar: {
    editor: EventCalendarEditor,
    icon: 'Event',
    label: 'Events',
    description: 'Event listing from agenda',
    category: 'Events & Programme',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="10" y="10" width="280" height="45" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="18" y="18" width="28" height="28" rx="4" fill="#3b82f6"/><text x="32" y="30" font-size="8" fill="#fff" text-anchor="middle">12</text><text x="32" y="40" font-size="6" fill="#bfdbfe" text-anchor="middle">MEI</text><text x="55" y="30" font-size="9" fill="#334155" font-weight="600">Strandmarkt De Koog</text><text x="55" y="43" font-size="8" fill="#94a3b8">10:00 - 17:00 · Dorpsplein</text><rect x="10" y="62" width="280" height="45" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="18" y="70" width="28" height="28" rx="4" fill="#7c3aed"/><text x="32" y="82" font-size="8" fill="#fff" text-anchor="middle">14</text><text x="32" y="92" font-size="6" fill="#c4b5fd" text-anchor="middle">MEI</text><text x="55" y="82" font-size="9" fill="#334155" font-weight="600">Jazz op het Strand</text><text x="55" y="95" font-size="8" fill="#94a3b8">19:00 - 23:00 · Paal 9</text><rect x="10" y="114" width="280" height="45" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="18" y="122" width="28" height="28" rx="4" fill="#f59e0b"/><text x="32" y="134" font-size="8" fill="#fff" text-anchor="middle">18</text><text x="32" y="144" font-size="6" fill="#fde68a" text-anchor="middle">MEI</text><text x="55" y="134" font-size="9" fill="#334155" font-weight="600">Texel Culinair Festival</text><text x="55" y="147" font-size="8" fill="#94a3b8">12:00 - 21:00 · Den Burg</text></svg>`
  },
  event_calendar_filtered: {
    editor: EventCalendarEditor,
    icon: 'EventNote',
    label: 'Events (Filtered)',
    description: 'Event listing with date/category filter bar',
    category: 'Events & Programme',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="10" y="10" width="280" height="45" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="18" y="18" width="28" height="28" rx="4" fill="#3b82f6"/><text x="32" y="30" font-size="8" fill="#fff" text-anchor="middle">12</text><text x="32" y="40" font-size="6" fill="#bfdbfe" text-anchor="middle">MEI</text><text x="55" y="30" font-size="9" fill="#334155" font-weight="600">Strandmarkt De Koog</text><text x="55" y="43" font-size="8" fill="#94a3b8">10:00 - 17:00 · Dorpsplein</text><rect x="10" y="62" width="280" height="45" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="18" y="70" width="28" height="28" rx="4" fill="#7c3aed"/><text x="32" y="82" font-size="8" fill="#fff" text-anchor="middle">14</text><text x="32" y="92" font-size="6" fill="#c4b5fd" text-anchor="middle">MEI</text><text x="55" y="82" font-size="9" fill="#334155" font-weight="600">Jazz op het Strand</text><text x="55" y="95" font-size="8" fill="#94a3b8">19:00 - 23:00 · Paal 9</text><rect x="10" y="114" width="280" height="45" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="18" y="122" width="28" height="28" rx="4" fill="#f59e0b"/><text x="32" y="134" font-size="8" fill="#fff" text-anchor="middle">18</text><text x="32" y="144" font-size="6" fill="#fde68a" text-anchor="middle">MEI</text><text x="55" y="134" font-size="9" fill="#334155" font-weight="600">Texel Culinair Festival</text><text x="55" y="147" font-size="8" fill="#94a3b8">12:00 - 21:00 · Den Burg</text></svg>`
  },
  map: {
    editor: MapEditor,
    icon: 'Map',
    label: 'Map',
    description: 'Interactive map with POI markers',
    category: 'Discovery',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#e8f4e8"/><path d="M0,130 Q80,100 150,120 T300,100 L300,200 L0,200 Z" fill="#d4edda" opacity="0.5"/><path d="M50,30 Q60,10 80,15 Q100,20 90,40 Q80,60 70,65 Q60,70 55,60 Q45,50 50,30 Z" fill="#bfdbfe" opacity="0.3"/><circle cx="80" cy="55" r="8" fill="#ef4444"/><circle cx="80" cy="55" r="4" fill="#fff"/><circle cx="180" cy="80" r="8" fill="#3b82f6"/><circle cx="180" cy="80" r="4" fill="#fff"/><circle cx="130" cy="120" r="6" fill="#f59e0b"/><circle cx="130" cy="120" r="3" fill="#fff"/><circle cx="220" cy="45" r="7" fill="#7c3aed"/><circle cx="220" cy="45" r="3.5" fill="#fff"/><rect x="180" y="150" width="100" height="35" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><circle cx="192" cy="160" r="4" fill="#ef4444"/><text x="200" y="163" font-size="7" fill="#334155">Eten</text><circle cx="192" cy="175" r="4" fill="#3b82f6"/><text x="200" y="178" font-size="7" fill="#334155">Actief</text><circle cx="240" cy="160" r="4" fill="#f59e0b"/><text x="248" y="163" font-size="7" fill="#334155">Natuur</text></svg>`
  },
  weather_widget: {
    editor: WeatherWidgetEditor,
    icon: 'WbSunny',
    label: 'Weather',
    description: 'Current weather and forecast',
    category: 'Utility & Practical Info',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f0f9ff"/><rect x="30" y="20" width="240" height="160" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><circle cx="75" cy="65" r="22" fill="#fbbf24"/><circle cx="75" cy="65" r="16" fill="#fde68a"/><text x="140" y="60" font-size="28" fill="#1e293b" font-weight="700">18°C</text><text x="140" y="80" font-size="10" fill="#94a3b8">Deels bewolkt · Texel</text><line x1="50" y1="105" x2="250" y2="105" stroke="#e2e8f0"/><text x="65" y="125" font-size="8" fill="#64748b" text-anchor="middle">Ma</text><text x="65" y="140" font-size="10" fill="#334155" text-anchor="middle">17°</text><text x="65" y="155" font-size="12" text-anchor="middle">☀️</text><text x="125" y="125" font-size="8" fill="#64748b" text-anchor="middle">Di</text><text x="125" y="140" font-size="10" fill="#334155" text-anchor="middle">15°</text><text x="125" y="155" font-size="12" text-anchor="middle">🌧</text><text x="185" y="125" font-size="8" fill="#64748b" text-anchor="middle">Wo</text><text x="185" y="140" font-size="10" fill="#334155" text-anchor="middle">19°</text><text x="185" y="155" font-size="12" text-anchor="middle">⛅</text><text x="240" y="125" font-size="8" fill="#64748b" text-anchor="middle">Do</text><text x="240" y="140" font-size="10" fill="#334155" text-anchor="middle">20°</text><text x="240" y="155" font-size="12" text-anchor="middle">☀️</text></svg>`
  },
  social_feed: {
    editor: SocialFeedEditor,
    icon: 'Share',
    label: 'Social Feed',
    description: 'Social media embed (privacy-first)',
    category: 'Media & Proof',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="10" width="125" height="180" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="15" y="10" width="125" height="80" rx="8 8 0 0" fill="#bfdbfe"/><circle cx="33" cy="102" r="10" fill="#E1306C"/><text x="33" y="106" font-size="8" fill="#fff" text-anchor="middle">IG</text><text x="50" y="103" font-size="8" fill="#334155" font-weight="600">@texelmaps</text><text x="25" y="122" font-size="7" fill="#64748b">Prachtige zonsondergang bij</text><text x="25" y="133" font-size="7" fill="#64748b">Paal 17 vanavond! 🌅</text><text x="25" y="150" font-size="7" fill="#E1306C">♥ 284 likes</text><rect x="155" y="10" width="125" height="180" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="155" y="10" width="125" height="80" rx="8 8 0 0" fill="#d9f99d"/><circle cx="173" cy="102" r="10" fill="#1877F2"/><text x="173" y="106" font-size="8" fill="#fff" text-anchor="middle">FB</text><text x="190" y="103" font-size="8" fill="#334155" font-weight="600">TexelMaps</text><text x="165" y="122" font-size="7" fill="#64748b">Nieuwe fietsroute langs de</text><text x="165" y="133" font-size="7" fill="#64748b">mooiste plekken van Texel 🚴</text></svg>`
  },
  contact_form: {
    editor: ContactFormEditor,
    icon: 'ContactMail',
    label: 'Contact Form',
    description: 'Configurable contact form with GDPR',
    category: 'Forms & Assistance',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="40" y="10" width="220" height="180" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="56" y="35" font-size="8" fill="#64748b">Naam *</text><rect x="56" y="40" width="188" height="28" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><text x="66" y="58" font-size="9" fill="#94a3b8">Jan de Vries</text><text x="56" y="82" font-size="8" fill="#64748b">E-mail *</text><rect x="56" y="87" width="188" height="28" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><text x="66" y="105" font-size="9" fill="#94a3b8">jan@voorbeeld.nl</text><text x="56" y="130" font-size="8" fill="#64748b">Bericht *</text><rect x="56" y="135" width="188" height="30" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><rect x="160" y="172" width="84" height="24" rx="12" fill="#3b82f6"/><text x="202" y="188" font-size="9" fill="#fff" text-anchor="middle">Versturen</text></svg>`
  },
  newsletter: {
    editor: NewsletterEditor,
    icon: 'Email',
    label: 'Newsletter',
    description: 'Email signup via MailerLite',
    category: 'Forms & Assistance',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f0fdf4"/><rect x="30" y="40" width="240" height="120" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="150" y="72" font-size="12" fill="#334155" text-anchor="middle" font-weight="600">Blijf op de hoogte!</text><text x="150" y="90" font-size="9" fill="#94a3b8" text-anchor="middle">Ontvang wekelijks tips en events van Texel</text><rect x="50" y="105" width="140" height="32" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><text x="62" y="125" font-size="9" fill="#94a3b8">je@email.nl</text><rect x="196" y="105" width="56" height="32" rx="6" fill="#22c55e"/><text x="224" y="125" font-size="9" fill="#fff" text-anchor="middle">Aanmelden</text></svg>`
  },
  chatbot_widget: {
    editor: ChatbotWidgetEditor,
    icon: 'SmartToy',
    label: 'Chatbot',
    description: 'AI chatbot widget',
    category: 'Forms & Assistance',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="60" y="5" width="180" height="190" rx="12" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="60" y="5" width="180" height="35" rx="12 12 0 0" fill="#30c59b"/><text x="150" y="27" font-size="10" fill="#fff" text-anchor="middle" font-weight="600">Tessa</text><rect x="75" y="52" width="120" height="22" rx="11" fill="#eff6ff"/><text x="85" y="67" font-size="8" fill="#3b82f6">Hoi! Waarmee kan ik helpen?</text><rect x="115" y="80" width="110" height="22" rx="11" fill="#f1f5f9"/><text x="125" y="95" font-size="8" fill="#475569">Wat is er te doen vandaag?</text><rect x="75" y="108" width="140" height="22" rx="11" fill="#eff6ff"/><text x="85" y="123" font-size="8" fill="#3b82f6">Er zijn 3 events vandaag! 🎉</text><rect x="75" y="150" width="150" height="28" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><text x="88" y="168" font-size="8" fill="#94a3b8">Stel een vraag aan Tessa...</text></svg>`
  },
  ticket_shop: {
    editor: TicketShopEditor,
    icon: 'ConfirmationNumber',
    label: 'Ticket Shop',
    description: 'Ticket listing and booking',
    category: 'Commerce & Conversion',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="15" y="10" width="125" height="180" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="15" y="10" width="125" height="55" rx="8 8 0 0" fill="#bfdbfe"/><text x="77" y="45" font-size="9" fill="#1e40af" text-anchor="middle">🎫 Ecomare</text><text x="25" y="82" font-size="9" fill="#334155" font-weight="600">Entree Volwassene</text><text x="25" y="100" font-size="18" fill="#16a34a" font-weight="700">€15,50</text><text x="25" y="120" font-size="8" fill="#94a3b8">Incl. zeehondenshow</text><rect x="25" y="152" width="105" height="28" rx="14" fill="#3b82f6"/><text x="77" y="170" font-size="9" fill="#fff" text-anchor="middle">Boek nu</text><rect x="160" y="10" width="125" height="180" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="160" y="10" width="125" height="55" rx="8 8 0 0" fill="#fde68a"/><text x="222" y="45" font-size="9" fill="#854d0e" text-anchor="middle">🎫 Kaap Skil</text><text x="170" y="82" font-size="9" fill="#334155" font-weight="600">Entree Museum</text><text x="170" y="100" font-size="18" fill="#16a34a" font-weight="700">€12,00</text></svg>`
  },
  reservation_widget: {
    editor: ReservationWidgetEditor,
    icon: 'BookOnline',
    label: 'Reservations',
    description: 'Reservation booking widget',
    category: 'Commerce & Conversion',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="30" y="15" width="240" height="170" rx="10" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="150" y="38" font-size="11" fill="#334155" text-anchor="middle" font-weight="600">Reserveer een tafel</text><text x="45" y="62" font-size="8" fill="#64748b">Datum</text><rect x="45" y="67" width="95" height="28" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><text x="55" y="85" font-size="9" fill="#334155">12 mei 2026</text><text x="155" y="62" font-size="8" fill="#64748b">Tijd</text><rect x="155" y="67" width="95" height="28" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><text x="165" y="85" font-size="9" fill="#334155">19:00</text><text x="45" y="112" font-size="8" fill="#64748b">Aantal personen</text><rect x="45" y="117" width="205" height="28" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/><text x="55" y="135" font-size="9" fill="#334155">4 personen</text><rect x="85" y="155" width="130" height="28" rx="14" fill="#3b82f6"/><text x="150" y="173" font-size="10" fill="#fff" text-anchor="middle">Reserveer</text></svg>`
  },
  curated_cards: {
    editor: CardGroupEditor,
    icon: 'ViewModule',
    label: 'Curated Cards',
    description: 'Content cards met variant (curated/aanbieding/gerelateerd)',
    category: 'Recommendations & Planning',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="10" y="10" width="85" height="115" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="10" y="10" width="85" height="45" rx="6 6 0 0" fill="#bfdbfe"/><text x="17" y="68" font-size="9" fill="#334155" font-weight="600">Top 5 Stranden</text><text x="17" y="82" font-size="7" fill="#94a3b8">De mooiste stranden</text><text x="17" y="93" font-size="7" fill="#94a3b8">van het eiland</text><rect x="17" y="105" width="50" height="14" rx="7" fill="#3b82f6"/><text x="42" y="115" font-size="7" fill="#fff" text-anchor="middle">Lees meer</text><rect x="105" y="10" width="85" height="115" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="105" y="10" width="85" height="45" rx="6 6 0 0" fill="#fde68a"/><text x="112" y="68" font-size="9" fill="#334155" font-weight="600">Weekend Tips</text><rect x="200" y="10" width="85" height="115" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><rect x="200" y="10" width="85" height="45" rx="6 6 0 0" fill="#d9f99d"/><text x="207" y="68" font-size="9" fill="#334155" font-weight="600">Met Kids</text></svg>`
  },
  card_group: {
    editor: CardGroupEditor,
    icon: 'ViewModule',
    label: 'Card Group (alias)',
    description: 'Alias voor Curated Cards',
    category: 'Recommendations & Planning',
    thumbnail: THUMBNAILS.card_group,
    hidden: true
  },
  testimonials: {
    editor: TestimonialsEditor,
    icon: 'FormatQuote',
    label: 'Recensies / Testimonials',
    description: 'Reviews van bezoekers met sterren en citaten',
    category: 'Recommendations & Planning',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="30" y="20" width="240" height="160" rx="10" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="45" y="48" font-size="24" fill="#e2e8f0">"</text><text x="65" y="55" font-size="9" fill="#475569">Texel is fantastisch! De stranden zijn</text><text x="45" y="70" font-size="9" fill="#475569">prachtig en de natuur is overweldigend.</text><text x="45" y="85" font-size="9" fill="#475569">Tessa hielp ons de beste plekken vinden.</text><text x="45" y="115" font-size="10" fill="#f59e0b">★★★★★</text><circle cx="45" cy="142" r="14" fill="#e2e8f0"/><text x="45" y="146" font-size="10" text-anchor="middle">👤</text><text x="68" y="138" font-size="9" fill="#334155" font-weight="600">Familie De Jong</text><text x="68" y="152" font-size="8" fill="#94a3b8">Bezocht mei 2026</text></svg>`
  },
  // Desktop homepage blocks (primary names used in templates + DB)
  desktop_hero: {
    editor: HeroEditor,
    icon: 'Chat',
    label: 'Hero + Chatbot',
    description: 'Hero met chatbot-input en quick actions',
    category: 'Page Structure',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><defs><linearGradient id="dhg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#30c59b"/><stop offset="100%" stop-color="#3572de"/></linearGradient></defs><rect width="300" height="200" fill="url(#dhg)"/><text x="40" y="55" font-size="14" fill="#fff" font-weight="700">Welkom op Texel! 🏖️</text><text x="40" y="78" font-size="9" fill="#fff" opacity="0.8">Ontdek het eiland met Tessa</text><rect x="40" y="100" width="220" height="36" rx="18" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/><text x="60" y="122" font-size="9" fill="#fff" opacity="0.6">Stel een vraag aan Tessa...</text><rect x="40" y="150" width="60" height="8" rx="4" fill="rgba(255,255,255,0.3)"/><rect x="110" y="150" width="60" height="8" rx="4" fill="rgba(255,255,255,0.2)"/><rect x="180" y="150" width="60" height="8" rx="4" fill="rgba(255,255,255,0.2)"/></svg>`
  },
  programme: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Dagprogramma + Tip',
    description: 'Responsive dagprogramma met tip van de dag',
    category: 'Events & Programme',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><text x="20" y="25" font-size="11" fill="#334155" font-weight="600">Dagprogramma</text><circle cx="30" cy="52" r="8" fill="#e2e8f0"/><text x="30" y="56" font-size="8" text-anchor="middle">🌅</text><text x="45" y="49" font-size="9" fill="#334155">08:00 · Yoga op het strand</text><text x="45" y="62" font-size="8" fill="#30c59b">Strand Paal 17</text><line x1="30" y1="64" x2="30" y2="76" stroke="#e2e8f0" stroke-width="2"/><circle cx="30" cy="88" r="8" fill="#e2e8f0"/><text x="30" y="92" font-size="8" text-anchor="middle">🚶</text><text x="45" y="85" font-size="9" fill="#334155">10:00 · Wadlopen excursie</text><text x="45" y="98" font-size="8" fill="#30c59b">Vertrek haven Oudeschild</text><line x1="30" y1="100" x2="30" y2="112" stroke="#e2e8f0" stroke-width="2"/><circle cx="30" cy="124" r="8" fill="#e2e8f0"/><text x="30" y="128" font-size="8" text-anchor="middle">🍽️</text><text x="45" y="121" font-size="9" fill="#334155">12:30 · Lunch bij De Stal</text><text x="45" y="134" font-size="8" fill="#30c59b">Den Burg centrum</text><rect x="160" y="30" width="120" height="140" rx="8" fill="#fef3c7" stroke="#fbbf24" stroke-width="1"/><text x="170" y="50" font-size="9" fill="#92400e" font-weight="600">💡 Tip van de dag</text><text x="170" y="70" font-size="8" fill="#78350f">Bezoek de Vuurtoren bij</text><text x="170" y="83" font-size="8" fill="#78350f">zonsondergang voor het</text><text x="170" y="96" font-size="8" fill="#78350f">mooiste uitzicht van Texel!</text></svg>`
  },
  desktop_program_tip: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Programma + Tip (alias)',
    description: 'Alias voor Dagprogramma + Tip',
    category: 'Events & Programme',
    thumbnail: THUMBNAILS.mobile_program,
    hidden: true
  },
  desktop_events: {
    editor: MobileEventsEditor,
    icon: 'EventNote',
    label: 'Vandaag Events (alias)',
    description: 'Alias voor Today Events',
    category: 'Events & Programme',
    thumbnail: THUMBNAILS.mobile_events,
    hidden: true
  },
  category_grid: {
    editor: MobileMapEditor,
    icon: 'Category',
    label: 'Categorie Grid',
    description: 'Responsive categorie browser: scroll op mobiel, 4-kolom grid op desktop',
    category: 'Discovery',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="10" y="10" width="85" height="85" rx="10" fill="#7CB342" opacity="0.15"/><text x="52" y="45" font-size="20" text-anchor="middle">🌿</text><text x="52" y="70" font-size="9" fill="#365314" text-anchor="middle" font-weight="600">Natuur</text><text x="52" y="83" font-size="7" fill="#4d7c0f" text-anchor="middle">98 locaties</text><rect x="105" y="10" width="85" height="85" rx="10" fill="#E53935" opacity="0.12"/><text x="147" y="45" font-size="20" text-anchor="middle">🍽️</text><text x="147" y="70" font-size="9" fill="#991b1b" text-anchor="middle" font-weight="600">Eten</text><text x="147" y="83" font-size="7" fill="#b91c1c" text-anchor="middle">135 locaties</text><rect x="200" y="10" width="85" height="85" rx="10" fill="#FF6B00" opacity="0.12"/><text x="242" y="45" font-size="20" text-anchor="middle">🚴</text><text x="242" y="70" font-size="9" fill="#9a3412" text-anchor="middle" font-weight="600">Actief</text><text x="242" y="83" font-size="7" fill="#c2410c" text-anchor="middle">57 locaties</text><rect x="10" y="105" width="85" height="85" rx="10" fill="#004B87" opacity="0.12"/><text x="52" y="140" font-size="20" text-anchor="middle">🏛️</text><text x="52" y="165" font-size="9" fill="#1e3a5f" text-anchor="middle" font-weight="600">Cultuur</text><text x="52" y="178" font-size="7" fill="#1e40af" text-anchor="middle">96 locaties</text></svg>`
  },
  // Desktop homepage block aliases (backward compat)
  hero_chatbot: {
    editor: HeroEditor,
    icon: 'Chat',
    label: 'Hero + Chatbot (alias)',
    description: 'Alias voor Desktop Hero',
    category: 'Page Structure',
    thumbnail: THUMBNAILS.hero,
    hidden: true
  },
  program_card: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Programma + Tip (alias)',
    description: 'Alias voor Dagprogramma + Tip',
    category: 'Events & Programme',
    thumbnail: THUMBNAILS.mobile_program,
    hidden: true
  },
  today_events: {
    editor: MobileEventsEditor,
    icon: 'EventNote',
    label: 'Vandaag Events',
    description: 'Responsive events: scroll op mobiel, grid op desktop',
    category: 'Events & Programme',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><text x="15" y="22" font-size="11" fill="#334155" font-weight="600">Vandaag op Texel</text><rect x="10" y="32" width="85" height="120" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="10" y="32" width="85" height="55" rx="8 8 0 0" fill="#bfdbfe"/><text x="17" y="100" font-size="8" fill="#334155" font-weight="600">Strandmarkt</text><text x="17" y="114" font-size="7" fill="#94a3b8">10:00 · De Koog</text><text x="17" y="128" font-size="7" fill="#3b82f6">Gratis</text><rect x="105" y="32" width="85" height="120" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="105" y="32" width="85" height="55" rx="8 8 0 0" fill="#fde68a"/><text x="112" y="100" font-size="8" fill="#334155" font-weight="600">Jazz Avond</text><text x="112" y="114" font-size="7" fill="#94a3b8">19:00 · Paal 9</text><rect x="200" y="32" width="85" height="120" rx="8" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="200" y="32" width="85" height="55" rx="8 8 0 0" fill="#d9f99d"/><text x="207" y="100" font-size="8" fill="#334155" font-weight="600">Yoga Strand</text><text x="207" y="114" font-size="7" fill="#94a3b8">08:00 · Paal 17</text></svg>`
  },
  popular_pois: {
    editor: PoiGridEditor,
    icon: 'Stars',
    label: 'Populaire POIs',
    description: 'Top POIs grid met titel',
    category: 'Discovery',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="10" y="10" width="85" height="120" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="10" y="10" width="85" height="50" rx="6 6 0 0" fill="#bfdbfe"/><rect x="17" y="68" width="12" height="12" rx="6" fill="#7CB342"/><text x="35" y="77" font-size="7" fill="#64748b">Natuur</text><text x="17" y="93" font-size="9" fill="#334155" font-weight="600">Slufter</text><text x="17" y="108" font-size="8" fill="#f59e0b">★ 4.7 (89)</text><rect x="105" y="10" width="85" height="120" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="105" y="10" width="85" height="50" rx="6 6 0 0" fill="#fde68a"/><rect x="112" y="68" width="12" height="12" rx="6" fill="#E53935"/><text x="130" y="77" font-size="7" fill="#64748b">Eten</text><text x="112" y="93" font-size="9" fill="#334155" font-weight="600">Paal 17</text><text x="112" y="108" font-size="8" fill="#f59e0b">★ 4.8 (124)</text><rect x="200" y="10" width="85" height="120" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="200" y="10" width="85" height="50" rx="6 6 0 0" fill="#d9f99d"/><rect x="207" y="68" width="12" height="12" rx="6" fill="#004B87"/><text x="225" y="77" font-size="7" fill="#64748b">Cultuur</text><text x="207" y="93" font-size="9" fill="#334155" font-weight="600">Kaap Skil</text><text x="207" y="108" font-size="8" fill="#f59e0b">★ 4.6 (201)</text></svg>`
  },
  map_preview: {
    editor: MapEditor,
    icon: 'PinDrop',
    label: 'Kaart met overlay',
    description: 'Interactieve kaart met overlay label',
    category: 'Discovery',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#e8f4e8"/><path d="M0,130 Q80,100 150,120 T300,100 L300,200 L0,200 Z" fill="#d4edda" opacity="0.5"/><path d="M50,30 Q60,10 80,15 Q100,20 90,40 Q80,60 70,65 Q60,70 55,60 Q45,50 50,30 Z" fill="#bfdbfe" opacity="0.3"/><circle cx="80" cy="55" r="8" fill="#ef4444"/><circle cx="80" cy="55" r="4" fill="#fff"/><circle cx="180" cy="80" r="8" fill="#3b82f6"/><circle cx="180" cy="80" r="4" fill="#fff"/><circle cx="130" cy="120" r="6" fill="#f59e0b"/><circle cx="130" cy="120" r="3" fill="#fff"/><circle cx="220" cy="45" r="7" fill="#7c3aed"/><circle cx="220" cy="45" r="3.5" fill="#fff"/><rect x="180" y="150" width="100" height="35" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><circle cx="192" cy="160" r="4" fill="#ef4444"/><text x="200" y="163" font-size="7" fill="#334155">Eten</text><circle cx="192" cy="175" r="4" fill="#3b82f6"/><text x="200" y="178" font-size="7" fill="#334155">Actief</text><circle cx="240" cy="160" r="4" fill="#f59e0b"/><text x="248" y="163" font-size="7" fill="#334155">Natuur</text></svg>`
  },
  mobile_program: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Dagprogramma (alias)',
    description: 'Alias voor Dagprogramma + Tip',
    category: 'Events & Programme',
    thumbnail: THUMBNAILS.mobile_program,
    hidden: true
  },
  tip_of_the_day: {
    editor: MobileTipEditor,
    icon: 'TipsAndUpdates',
    label: 'Tip van de Dag',
    description: 'Dagelijkse aanbeveling op basis van interesses',
    category: 'Recommendations & Planning',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="25" y="25" width="250" height="150" rx="12" fill="#fef3c7" stroke="#fbbf24" stroke-width="1.5"/><text x="45" y="55" font-size="12" fill="#92400e" font-weight="600">💡 Tip van de dag</text><rect x="45" y="68" width="70" height="55" rx="8" fill="#fde68a"/><text x="80" y="100" font-size="16" text-anchor="middle">🌅</text><text x="125" y="82" font-size="10" fill="#78350f" font-weight="600">Vuurtoren Eierland</text><text x="125" y="98" font-size="8" fill="#92400e">Het noordelijkste punt van</text><text x="125" y="111" font-size="8" fill="#92400e">Texel. Spectaculair bij</text><text x="125" y="124" font-size="8" fill="#92400e">zonsondergang!</text><text x="45" y="155" font-size="8" fill="#b45309">★ 4.9 · Natuur · De Cocksdorp</text></svg>`
  },
  mobile_tip: {
    editor: MobileTipEditor,
    icon: 'TipsAndUpdates',
    label: 'Tip van de Dag (alias)',
    description: 'Alias voor Tip van de Dag',
    category: 'Recommendations & Planning',
    thumbnail: THUMBNAILS.mobile_tip,
    hidden: true
  },
  mobile_events: {
    editor: MobileEventsEditor,
    icon: 'EventNote',
    label: 'Vandaag Events (alias)',
    description: 'Alias voor Today Events (responsive)',
    category: 'Events & Programme',
    thumbnail: THUMBNAILS.mobile_events,
    hidden: true
  },
  mobile_map: {
    editor: MobileMapEditor,
    icon: 'PinDrop',
    label: 'Kaart Preview (compact)',
    description: 'Compacte kaart met top POIs per categorie (verschilt van volledige Map)',
    category: 'Discovery',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#e8f4e8"/><circle cx="90" cy="60" r="7" fill="#ef4444"/><circle cx="90" cy="60" r="3.5" fill="#fff"/><circle cx="180" cy="90" r="7" fill="#3b82f6"/><circle cx="180" cy="90" r="3.5" fill="#fff"/><circle cx="130" cy="130" r="6" fill="#f59e0b"/><circle cx="130" cy="130" r="3" fill="#fff"/><rect x="25" y="155" width="65" height="26" rx="13" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><text x="57" y="172" font-size="8" fill="#334155" text-anchor="middle">Natuur</text><rect x="100" y="155" width="65" height="26" rx="13" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><text x="132" y="172" font-size="8" fill="#334155" text-anchor="middle">Eten</text><rect x="175" y="155" width="65" height="26" rx="13" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><text x="207" y="172" font-size="8" fill="#334155" text-anchor="middle">Actief</text></svg>`
  },
  blog_grid: {
    editor: BlogGridEditor,
    icon: 'Article',
    label: 'Blog Grid',
    description: 'Overzicht van gepubliceerde blog artikelen uit Content Studio',
    category: 'Utility & Practical Info',
    thumbnail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="10" y="10" width="85" height="130" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="10" y="10" width="85" height="50" rx="6 6 0 0" fill="#bfdbfe"/><text x="17" y="75" font-size="8" fill="#334155" font-weight="600">10 Mooiste</text><text x="17" y="87" font-size="8" fill="#334155" font-weight="600">Stranden</text><text x="17" y="103" font-size="7" fill="#94a3b8">De ultieme gids voor</text><text x="17" y="114" font-size="7" fill="#94a3b8">strandliefhebbers...</text><text x="17" y="132" font-size="7" fill="#3b82f6">Lees meer →</text><rect x="105" y="10" width="85" height="130" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="105" y="10" width="85" height="50" rx="6 6 0 0" fill="#d9f99d"/><text x="112" y="75" font-size="8" fill="#334155" font-weight="600">Fietsen op</text><text x="112" y="87" font-size="8" fill="#334155" font-weight="600">Texel</text><rect x="200" y="10" width="85" height="130" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/><rect x="200" y="10" width="85" height="50" rx="6 6 0 0" fill="#fecaca"/><text x="207" y="75" font-size="8" fill="#334155" font-weight="600">Wadlopen:</text><text x="207" y="87" font-size="8" fill="#334155" font-weight="600">een avontuur</text></svg>`
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
