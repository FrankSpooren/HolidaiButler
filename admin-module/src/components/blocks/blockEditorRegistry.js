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
    category: 'Content',
    thumbnail: THUMBNAILS.hero
  },
  rich_text: {
    editor: RichTextEditor,
    icon: 'Article',
    label: 'Rich Text',
    description: 'WYSIWYG text editor with formatting',
    category: 'Content',
    thumbnail: THUMBNAILS.rich_text
  },
  cta: {
    editor: CtaEditor,
    icon: 'TouchApp',
    label: 'Call to Action',
    description: 'Highlighted section with buttons',
    category: 'Content',
    thumbnail: THUMBNAILS.cta
  },
  banner: {
    editor: BannerEditor,
    icon: 'Campaign',
    label: 'Banner',
    description: 'Dismissible notification or promo bar',
    category: 'Content',
    thumbnail: THUMBNAILS.banner
  },
  faq: {
    editor: FaqEditor,
    icon: 'QuestionAnswer',
    label: 'FAQ',
    description: 'Expandable question & answer list',
    category: 'Content',
    thumbnail: THUMBNAILS.faq
  },
  gallery: {
    editor: GalleryEditor,
    icon: 'Collections',
    label: 'Gallery',
    description: 'Image and video gallery with lightbox',
    category: 'Media',
    thumbnail: THUMBNAILS.gallery
  },
  video: {
    editor: VideoEditor,
    icon: 'PlayCircle',
    label: 'Video',
    description: 'YouTube, Vimeo, or self-hosted video',
    category: 'Media',
    thumbnail: THUMBNAILS.video
  },
  partners: {
    editor: PartnersEditor,
    icon: 'Handshake',
    label: 'Partners',
    description: 'Logo grid with links',
    category: 'Media',
    thumbnail: THUMBNAILS.partners
  },
  downloads: {
    editor: DownloadsEditor,
    icon: 'FileDownload',
    label: 'Downloads',
    description: 'File list with type icons',
    category: 'Media',
    thumbnail: THUMBNAILS.downloads
  },
  poi_grid: {
    editor: PoiGridEditor,
    icon: 'GridView',
    label: 'POI Grid',
    description: 'Grid of points of interest',
    category: 'Data',
    thumbnail: THUMBNAILS.poi_grid
  },
  poi_grid_filtered: {
    editor: PoiGridEditor,
    icon: 'FilterList',
    label: 'POI Grid (Filtered)',
    description: 'Grid of POIs with category/rating filter bar',
    category: 'Data',
    thumbnail: THUMBNAILS.poi_grid
  },
  event_calendar: {
    editor: EventCalendarEditor,
    icon: 'Event',
    label: 'Events',
    description: 'Event listing from agenda',
    category: 'Data',
    thumbnail: THUMBNAILS.event_calendar
  },
  event_calendar_filtered: {
    editor: EventCalendarEditor,
    icon: 'EventNote',
    label: 'Events (Filtered)',
    description: 'Event listing with date/category filter bar',
    category: 'Data',
    thumbnail: THUMBNAILS.event_calendar
  },
  map: {
    editor: MapEditor,
    icon: 'Map',
    label: 'Map',
    description: 'Interactive map with POI markers',
    category: 'Data',
    thumbnail: THUMBNAILS.map
  },
  weather_widget: {
    editor: WeatherWidgetEditor,
    icon: 'WbSunny',
    label: 'Weather',
    description: 'Current weather and forecast',
    category: 'Data',
    thumbnail: THUMBNAILS.weather_widget
  },
  social_feed: {
    editor: SocialFeedEditor,
    icon: 'Share',
    label: 'Social Feed',
    description: 'Social media embed (privacy-first)',
    category: 'Data',
    thumbnail: THUMBNAILS.social_feed
  },
  contact_form: {
    editor: ContactFormEditor,
    icon: 'ContactMail',
    label: 'Contact Form',
    description: 'Configurable contact form with GDPR',
    category: 'Interactie',
    thumbnail: THUMBNAILS.contact_form
  },
  newsletter: {
    editor: NewsletterEditor,
    icon: 'Email',
    label: 'Newsletter',
    description: 'Email signup via MailerLite',
    category: 'Interactie',
    thumbnail: THUMBNAILS.newsletter
  },
  chatbot_widget: {
    editor: ChatbotWidgetEditor,
    icon: 'SmartToy',
    label: 'Chatbot',
    description: 'AI chatbot widget',
    category: 'Interactie',
    thumbnail: THUMBNAILS.chatbot_widget
  },
  ticket_shop: {
    editor: TicketShopEditor,
    icon: 'ConfirmationNumber',
    label: 'Ticket Shop',
    description: 'Ticket listing and booking',
    category: 'Commerce',
    thumbnail: THUMBNAILS.ticket_shop
  },
  reservation_widget: {
    editor: ReservationWidgetEditor,
    icon: 'BookOnline',
    label: 'Reservations',
    description: 'Reservation booking widget',
    category: 'Commerce',
    thumbnail: THUMBNAILS.reservation_widget
  },
  card_group: {
    editor: CardGroupEditor,
    icon: 'ViewModule',
    label: 'Card Group',
    description: 'Grid of content cards with images',
    category: 'Commerce',
    thumbnail: THUMBNAILS.card_group
  },
  testimonials: {
    editor: TestimonialsEditor,
    icon: 'FormatQuote',
    label: 'Recensies / Testimonials',
    description: 'Reviews van bezoekers',
    category: 'Data',
    thumbnail: THUMBNAILS.poi_grid
  },
  // Desktop homepage blocks (primary names used in templates + DB)
  desktop_hero: {
    editor: HeroEditor,
    icon: 'Chat',
    label: 'Hero + Chatbot',
    description: 'Hero met chatbot-input en quick actions',
    category: 'Content',
    thumbnail: THUMBNAILS.hero
  },
  desktop_program_tip: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Programma + Tip (2-kolom)',
    description: 'Dagprogramma links + Tip van de Dag rechts',
    category: 'Content',
    thumbnail: THUMBNAILS.mobile_program
  },
  desktop_events: {
    editor: MobileEventsEditor,
    icon: 'EventNote',
    label: 'Vandaag Events (grid)',
    description: 'Responsive events grid (3-kolom desktop)',
    category: 'Data',
    thumbnail: THUMBNAILS.mobile_events
  },
  category_grid: {
    editor: MobileMapEditor,
    icon: 'Category',
    label: 'Categorie Grid',
    description: 'Ontdek op categorie (4-kolom grid)',
    category: 'Data',
    thumbnail: THUMBNAILS.mobile_events
  },
  // Desktop homepage block aliases (backward compat)
  hero_chatbot: {
    editor: HeroEditor,
    icon: 'Chat',
    label: 'Hero + Chatbot',
    description: 'Hero met chatbot-input en quick actions',
    category: 'Content',
    thumbnail: THUMBNAILS.hero
  },
  program_card: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Programma + Tip (2-kolom)',
    description: 'Dagprogramma links + Tip van de Dag rechts',
    category: 'Content',
    thumbnail: THUMBNAILS.mobile_program
  },
  today_events: {
    editor: MobileEventsEditor,
    icon: 'EventNote',
    label: 'Vandaag Events (grid)',
    description: 'Responsive events grid (3-kolom desktop)',
    category: 'Data',
    thumbnail: THUMBNAILS.mobile_events
  },
  popular_pois: {
    editor: PoiGridEditor,
    icon: 'Stars',
    label: 'Populaire POIs',
    description: 'Top POIs grid met titel',
    category: 'Data',
    thumbnail: THUMBNAILS.poi_grid
  },
  map_preview: {
    editor: MapEditor,
    icon: 'PinDrop',
    label: 'Kaart met overlay',
    description: 'Interactieve kaart met overlay label',
    category: 'Data',
    thumbnail: THUMBNAILS.map
  },
  mobile_program: {
    editor: MobileProgramEditor,
    icon: 'ViewTimeline',
    label: 'Dagprogramma',
    description: 'Mobiel dagprogramma (ochtend/middag/avond)',
    category: 'Mobiel',
    thumbnail: THUMBNAILS.mobile_program
  },
  mobile_tip: {
    editor: MobileTipEditor,
    icon: 'TipsAndUpdates',
    label: 'Tip van de Dag',
    description: 'Dagelijkse aanbeveling op basis van interesses',
    category: 'Mobiel',
    thumbnail: THUMBNAILS.mobile_tip
  },
  mobile_events: {
    editor: MobileEventsEditor,
    icon: 'EventNote',
    label: 'Vandaag Events',
    description: 'Horizontale scrolllijst van vandaag\'s evenementen',
    category: 'Mobiel',
    thumbnail: THUMBNAILS.mobile_events
  },
  mobile_map: {
    editor: MobileMapEditor,
    icon: 'PinDrop',
    label: 'Kaart Preview',
    description: 'Interactieve kaart met top POIs',
    category: 'Mobiel',
    thumbnail: THUMBNAILS.mobile_map
  }
};

export const CATEGORIES = ['Content', 'Media', 'Data', 'Interactie', 'Commerce', 'Mobiel'];

export function getBlocksByCategory(category) {
  return Object.entries(blockEditorRegistry)
    .filter(([, meta]) => meta.category === category)
    .map(([type, meta]) => ({ type, ...meta }));
}

export function getBlockMeta(type) {
  return blockEditorRegistry[type] || null;
}

export default blockEditorRegistry;
