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
}

const DEFAULT_QUICK_ACTIONS = [
  { emoji: '🗓️', label: { nl: 'Programma', en: 'Program', de: 'Programm', es: 'Programa' }, action: 'itinerary' },
  { emoji: '💡', label: { nl: 'Tip van de Dag', en: 'Tip of the Day', de: 'Tipp des Tages', es: 'Consejo del Día' }, action: 'tip' },
  { emoji: '🍽️', label: { nl: 'Restaurants', en: 'Restaurants', de: 'Restaurants', es: 'Restaurantes' }, action: '__CATEGORY__restaurants' },
  { emoji: '🚴', label: { nl: 'Actief', en: 'Active', de: 'Aktiv', es: 'Activo' }, action: '__CATEGORY__active' },
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
}: DesktopHeroProps) {
  const [query, setQuery] = useState('');
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

  const handleSubmit = () => {
    if (!query.trim()) {
      window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'general' } }));
      return;
    }
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { message: query.trim() } }));
    setQuery('');
  };

  const handleQuickAction = (action: string) => {
    if (action === 'tip') {
      window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'tip' } }));
    } else if (action === 'itinerary') {
      window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'itinerary' } }));
    } else if (action.startsWith('__CATEGORY__')) {
      window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'category', category: action.replace('__CATEGORY__', '') } }));
    } else {
      window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { message: action } }));
    }
  };

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '420px' }}>
      {/* Background image */}
      {resolvedImage && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolvedImage} alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        </div>
      )}
      {!resolvedImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--hb-primary)] to-[var(--hb-secondary,var(--hb-primary))]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-6 flex flex-col items-center justify-center text-center" style={{ minHeight: '420px' }}>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] mb-4">
          {t(greeting || defaultGreeting, locale)}
        </h1>
        <p className="text-lg sm:text-xl text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] mb-8 max-w-2xl">
          {t(subtitle || defaultSubtitle, locale)}
        </p>

        {/* Chatbot input bar */}
        <div className="w-full max-w-xl flex items-center bg-white rounded-full shadow-xl overflow-hidden mb-6">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder={t(chatbotPlaceholder || defaultPlaceholder, locale)}
            className="flex-1 px-6 py-4 text-gray-700 placeholder-gray-400 text-base outline-none bg-transparent"
          />
          <button
            onClick={handleSubmit}
            className="px-6 py-4 font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--hb-primary)' }}
          >
            {locale === 'nl' ? 'Zoek' : locale === 'de' ? 'Suche' : locale === 'es' ? 'Buscar' : 'Search'} →
          </button>
        </div>

        {/* Quick action chips */}
        <div className="flex flex-wrap justify-center gap-3">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action.action)}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium hover:bg-white/30 transition-colors border border-white/30"
            >
              {action.emoji} {t(action.label, locale)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
