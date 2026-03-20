'use client';

import { useState, useEffect } from 'react';

interface TipData {
  name: string;
  description: string;
  id?: number;
  itemType?: 'poi' | 'event';
}

interface TipOfTheDayProps {
  locale: string;
}

const LABELS: Record<string, Record<string, string>> = {
  title: { nl: 'TIP VAN DE DAG', en: 'TIP OF THE DAY', de: 'TIPP DES TAGES', es: 'CONSEJO DEL DÍA' },
};

const FALLBACK_TIPS: Record<string, TipData> = {
  nl: { name: 'Peñón de Ifach', description: 'Beklim de iconische rots van Calpe voor een adembenemend uitzicht over de kustlijn.' },
  en: { name: 'Peñón de Ifach', description: 'Climb the iconic rock of Calpe for breathtaking views over the coastline.' },
  de: { name: 'Peñón de Ifach', description: 'Besteigen Sie den ikonischen Felsen von Calpe für atemberaubende Ausblicke.' },
  es: { name: 'Peñón de Ifach', description: 'Sube al icónico peñón de Calpe para disfrutar de vistas impresionantes.' },
};

function getLocalizedString(val: unknown, locale: string): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, string>;
    return obj[locale] || obj.en || obj.nl || Object.values(obj)[0] || '';
  }
  return '';
}

export default function TipOfTheDay({ locale }: TipOfTheDayProps) {
  const [tip, setTip] = useState<TipData | null>(null);
  const [loading, setLoading] = useState(true);
  const t = (key: string) => LABELS[key]?.[locale] || LABELS[key]?.en || key;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/holibot/daily-tip?language=${locale}`);
        const data = await res.json();
        // API returns { success, data: { itemType, poi: {...}, event: {...} } }
        const itemType = data?.data?.itemType || (data?.data?.poi ? 'poi' : 'event');
        const item = data?.data?.poi || data?.data?.event;
        if (item) {
          // Resolve localized name: try title_nl/title_es etc., then title object, then name
          const localizedTitle = item[`title_${locale}`] || item[`name_${locale}`];
          const name = localizedTitle || getLocalizedString(item.title, locale) || getLocalizedString(item.name, locale) || item.name || '';
          const localizedDesc = item[`description_${locale}`];
          const description = localizedDesc || getLocalizedString(item.description, locale) || item.description || '';
          if (name) {
            setTip({ name, description, id: item.id, itemType });
            return;
          }
        }
        // Fallback
        setTip(FALLBACK_TIPS[locale] || FALLBACK_TIPS.en);
      } catch (err) {
        console.error('TipOfTheDay load failed:', err);
        setTip(FALLBACK_TIPS[locale] || FALLBACK_TIPS.en);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [locale]);

  if (loading) {
    return (
      <div className="mx-4 rounded-2xl p-4 md:hidden animate-pulse" style={{ backgroundColor: 'rgba(232,197,71,0.12)' }}>
        <div className="h-4 w-32 bg-yellow-200/50 rounded mb-2" />
        <div className="h-3 w-full bg-yellow-200/50 rounded mb-1" />
        <div className="h-3 w-3/4 bg-yellow-200/50 rounded" />
      </div>
    );
  }

  if (!tip) return null;

  const langParam = locale !== 'en' ? `?lang=${locale}` : '';
  const handleClick = () => {
    if (tip.id && tip.itemType === 'poi') {
      window.location.href = `https://holidaibutler.com/pois/${tip.id}${langParam}`;
    } else if (tip.id && tip.itemType === 'event') {
      window.location.href = `https://holidaibutler.com/agenda/${tip.id}${langParam}`;
    }
  };

  return (
    <button
      onClick={handleClick}
      className="mx-4 rounded-2xl p-4 md:hidden text-left w-[calc(100%-2rem)] transition-transform active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, rgba(232,197,71,0.18), rgba(232,197,71,0.06))',
        border: '1px solid rgba(232,197,71,0.28)',
      }}
    >
      <p className="text-xs font-bold tracking-wider text-amber-700 mb-1.5">
        💡 {t('title')}
      </p>
      <p className="text-sm font-semibold text-gray-800">{tip.name}</p>
      {tip.description && (
        <p className="text-sm text-gray-600 leading-snug mt-0.5 line-clamp-3">{tip.description}</p>
      )}
    </button>
  );
}
