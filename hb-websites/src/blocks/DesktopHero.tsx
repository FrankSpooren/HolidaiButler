'use client';

import { useState } from 'react';
import { resolveAssetUrl } from '@/lib/assets';

interface DesktopHeroProps {
  greeting?: Record<string, string>;
  subtitle?: Record<string, string>;
  chatbotPlaceholder?: Record<string, string>;
  image?: string;
  quickActions?: Array<{ emoji: string; label: Record<string, string>; action: string }>;
  locale?: string;
  chatbotName?: string;
  layout?: 'overlay' | 'split';
  schemaType?: 'TouristDestination' | 'TouristAttraction' | 'none';
  destinationName?: string;
  destinationGeo?: { lat: number; lng: number };
}

const DEFAULT_QUICK_ACTIONS = [
  { emoji: '🗓️', label: { nl: 'Programma', en: 'Program', de: 'Programm', es: 'Programa' }, action: 'itinerary' },
  { emoji: '💡', label: { nl: 'Tip van de Dag', en: 'Tip of the Day', de: 'Tipp des Tages', es: 'Consejo del Día' }, action: '__TIP_VAN_DE_DAG__' },
  { emoji: '🧭', label: { nl: 'Routebeschrijving', en: 'Directions', de: 'Wegbeschreibung', es: 'Direcciones' }, action: '__DIRECTIONS__' },
  { emoji: '🔍', label: { nl: 'Zoeken op Rubriek', en: 'Browse Categories', de: 'Nach Kategorie suchen', es: 'Buscar por Categoría' }, action: '__CATEGORY__' },
];

function t(obj: Record<string, string> | string | undefined, locale: string): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[locale] || obj.en || obj.nl || Object.values(obj)[0] || '';
}

export default function DesktopHero({
  greeting,
  subtitle,
  chatbotPlaceholder,
  image,
  quickActions,
  locale = 'nl',
  chatbotName,
  layout = 'overlay',
  schemaType = 'TouristDestination',
  destinationName,
  destinationGeo,
}: DesktopHeroProps) {
  const [query, setQuery] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);
  const actions = quickActions && quickActions.length > 0 ? quickActions : DEFAULT_QUICK_ACTIONS;

  const resolvedImage = image ? resolveAssetUrl(image) : '';

  const defaultGreeting = { nl: 'Welkom! 👋', en: 'Welcome! 👋', de: 'Willkommen! 👋', es: '¡Bienvenido! 👋' };
  const defaultSubtitle = {
    nl: `Ontdek alles met je persoonlijke AI-reisassistent${chatbotName ? ` ${chatbotName}` : ''}`,
    en: `Discover everything with your personal AI travel assistant${chatbotName ? ` ${chatbotName}` : ''}`,
    de: `Entdecke alles mit deinem persönlichen KI-Reiseassistenten${chatbotName ? ` ${chatbotName}` : ''}`,
    es: `Descubre todo con tu asistente de viaje personal${chatbotName ? ` ${chatbotName}` : ''}`,
  };
  const defaultPlaceholder = {
    nl: `💬 Stel een vraag aan ${chatbotName || 'je assistent'}...`,
    en: `💬 Ask ${chatbotName || 'your assistant'} a question...`,
    de: `💬 Stell ${chatbotName || 'deinem Assistenten'} eine Frage...`,
    es: `💬 Haz una pregunta a ${chatbotName || 'tu asistente'}...`,
  };

  const greetingText = t(greeting || defaultGreeting, locale);
  const subtitleText = t(subtitle || defaultSubtitle, locale);
  const placeholderText = t(chatbotPlaceholder || defaultPlaceholder, locale);

  const handleSubmit = () => {
    if (!query.trim()) {
      window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'general' } }));
      return;
    }
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { message: query.trim() } }));
    setQuery('');
  };

  const handleQuickAction = (action: string) => {
    if (action === '__TIP_VAN_DE_DAG__' || action === '__DIRECTIONS__' || action === '__CATEGORY__' || action === 'itinerary') {
      window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action } }));
    } else if (action.startsWith('__CATEGORY__')) {
      window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'category', category: action.replace('__CATEGORY__', '') } }));
    } else {
      window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { message: action } }));
    }
  };

  // Schema.org JSON-LD
  const schemaLd = schemaType !== 'none' ? {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: destinationName || greetingText.replace(/[!👋]/g, '').trim(),
    description: subtitleText,
    ...(resolvedImage ? { image: resolvedImage } : {}),
    ...(destinationGeo ? { geo: { '@type': 'GeoCoordinates', latitude: destinationGeo.lat, longitude: destinationGeo.lng } } : {}),
  } : null;

  // Shared chatbot input + quick actions
  const chatbotSection = (
    <>
      {/* Chatbot input bar */}
      <div className="w-full max-w-xl flex items-center bg-white rounded-full shadow-xl overflow-hidden mb-4 sm:mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder={placeholderText}
          className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-gray-700 placeholder-gray-400 text-sm sm:text-base outline-none bg-transparent"
          aria-label={placeholderText}
        />
        <button
          onClick={handleSubmit}
          className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-white transition-colors min-w-[44px] min-h-[44px]"
          style={{ backgroundColor: 'var(--hb-primary)' }}
          aria-label={locale === 'nl' ? 'Zoeken' : 'Search'}
        >
          <span className="hidden sm:inline">{locale === 'nl' ? 'Zoek' : locale === 'de' ? 'Suche' : locale === 'es' ? 'Buscar' : 'Search'} →</span>
          <span className="sm:hidden">→</span>
        </button>
      </div>

      {/* Quick action chips */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => handleQuickAction(action.action)}
            className="px-3 sm:px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs sm:text-sm font-medium hover:bg-white/30 transition-colors border border-white/30 min-h-[44px] min-w-[44px]"
          >
            {action.emoji} {t(action.label, locale)}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <>
      {/* Schema.org */}
      {schemaLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaLd) }} />
      )}

      <section className="relative overflow-hidden" style={{ minHeight: '360px' }}>
        {/* Skeleton loader — shown until image loads */}
        {resolvedImage && !imgLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" aria-hidden="true" />
        )}

        {/* Background image */}
        {resolvedImage && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedImage}
              alt=""
              className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="eager"
              onLoad={() => setImgLoaded(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
          </div>
        )}
        {!resolvedImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--hb-primary)] to-[var(--hb-secondary,var(--hb-primary))]">
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        )}

        {/* Mobile layout: stacked, portrait-friendly */}
        <div className="relative lg:hidden flex flex-col items-center justify-center text-center px-4 sm:px-6" style={{ minHeight: '360px', aspectRatio: '4/5', maxHeight: '80vh' }}>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] mb-3">
            {greetingText}
          </h1>
          <p className="text-base sm:text-lg text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] mb-6 max-w-lg">
            {subtitleText}
          </p>
          {chatbotSection}
        </div>

        {/* Desktop layout: split or overlay */}
        <div className="relative hidden lg:flex items-center" style={{ minHeight: '420px' }}>
          {layout === 'split' ? (
            /* Split layout: 60% image (already bg) + 40% content right */
            <div className="max-w-7xl mx-auto px-8 w-full flex">
              <div className="w-[60%]" /> {/* Image side — background handles this */}
              <div className="w-[40%] flex flex-col justify-center py-12">
                <h1 className="text-4xl xl:text-5xl font-heading font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] mb-4">
                  {greetingText}
                </h1>
                <p className="text-lg xl:text-xl text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] mb-8 max-w-lg">
                  {subtitleText}
                </p>
                {chatbotSection}
              </div>
            </div>
          ) : (
            /* Overlay layout: centered (current default) */
            <div className="max-w-4xl mx-auto px-6 flex flex-col items-center justify-center text-center w-full py-16">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] mb-4">
                {greetingText}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] mb-8 max-w-2xl">
                {subtitleText}
              </p>
              {chatbotSection}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
