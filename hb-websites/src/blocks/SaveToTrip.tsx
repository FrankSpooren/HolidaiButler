'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * SaveToTrip Block — VII-E2 Batch B, Block B3
 *
 * localStorage-based trip planner. Visitors can save POIs and events
 * to a personal plan without needing an account.
 *
 * Variants:
 * - add_button: small "+ Add to plan" button (for detail pages)
 * - view_my_plan: full plan view with reorder + remove + share
 * - mini_widget: compact count badge (for header/sidebar)
 */

export interface SaveToTripProps {
  variant?: 'add_button' | 'view_my_plan' | 'mini_widget';
  showCount?: boolean;
  ctaLabel?: string;
  emptyStateMessage?: string;
  itemType?: 'poi' | 'event';
  itemId?: number;
}

interface TripItem {
  type: 'poi' | 'event';
  id: number;
  name?: string;
  addedAt: string;
}

const STORAGE_KEY = 'hb_my_trip';
const MAX_ITEMS = 50;

function getTrip(): TripItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveTrip(items: TripItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* full */ }
}

export default function SaveToTrip(props: SaveToTripProps) {
  const {
    variant = 'view_my_plan',
    showCount = true,
    ctaLabel,
    emptyStateMessage,
    itemType,
    itemId: explicitId,
  } = props;

  const [items, setItems] = useState<TripItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  useEffect(() => {
    setItems(getTrip());
    setMounted(true);

    // Listen for cross-component updates
    const handler = () => setItems(getTrip());
    window.addEventListener('hb:trip:updated', handler);
    return () => window.removeEventListener('hb:trip:updated', handler);
  }, []);

  const resolveItemId = (): number | null => {
    if (explicitId) return explicitId;
    if (typeof window === 'undefined') return null;
    const match = window.location.pathname.match(/\/(poi|event)\/(\d+)/);
    return match ? parseInt(match[2]) : null;
  };

  const resolveItemType = (): 'poi' | 'event' => {
    if (itemType) return itemType;
    if (typeof window === 'undefined') return 'poi';
    return window.location.pathname.includes('/event/') ? 'event' : 'poi';
  };

  const addItem = useCallback(() => {
    const id = resolveItemId();
    if (!id) return;
    const type = resolveItemType();

    const current = getTrip();
    if (current.some(i => i.type === type && i.id === id)) return; // already added
    if (current.length >= MAX_ITEMS) return;

    const title = document.querySelector('h1')?.textContent || '';
    const next = [...current, { type, id, name: title, addedAt: new Date().toISOString() }];
    saveTrip(next);
    setItems(next);
    window.dispatchEvent(new Event('hb:trip:updated'));

    if ((window as any).sa_event) {
      (window as any).sa_event('save_to_trip', { type, id });
    }
  }, [explicitId, itemType]);

  const removeItem = useCallback((type: string, id: number) => {
    const next = getTrip().filter(i => !(i.type === type && i.id === id));
    saveTrip(next);
    setItems(next);
    window.dispatchEvent(new Event('hb:trip:updated'));
  }, []);

  const clearAll = useCallback(() => {
    saveTrip([]);
    setItems([]);
    window.dispatchEvent(new Event('hb:trip:updated'));
  }, []);

  const shareTrip = useCallback(() => {
    const ids = items.map(i => `${i.type}:${i.id}`).join(',');
    const url = `${window.location.origin}/trip?items=${encodeURIComponent(ids)}`;
    if (navigator.share) {
      navigator.share({ title: 'My Trip Plan', url });
    } else {
      navigator.clipboard.writeText(url).then(() => alert(locale === 'nl' ? 'Link gekopieerd!' : 'Link copied!'));
    }
  }, [items, locale]);

  if (!mounted) return null;

  const labels = {
    addToTrip: { en: 'Save to plan', nl: 'Bewaar in plan', de: 'Zum Plan hinzufugen', es: 'Guardar en plan' },
    added: { en: 'In your plan', nl: 'In je plan', de: 'In deinem Plan', es: 'En tu plan' },
    myPlan: { en: 'My Plan', nl: 'Mijn Plan', de: 'Mein Plan', es: 'Mi Plan' },
    empty: { en: 'Your plan is empty. Save POIs and events to build your itinerary.', nl: 'Je plan is leeg. Bewaar POIs en evenementen om je reisplan samen te stellen.', de: 'Dein Plan ist leer.', es: 'Tu plan esta vacio.' },
    clear: { en: 'Clear all', nl: 'Alles wissen', de: 'Alles loschen', es: 'Borrar todo' },
    share: { en: 'Share plan', nl: 'Plan delen', de: 'Plan teilen', es: 'Compartir plan' },
    remove: { en: 'Remove', nl: 'Verwijder', de: 'Entfernen', es: 'Eliminar' },
  };
  const t = (key: string) => (labels[key as keyof typeof labels] as Record<string, string>)?.[locale] || (labels[key as keyof typeof labels] as Record<string, string>)?.en || key;

  // === VARIANT: add_button ===
  if (variant === 'add_button') {
    const id = resolveItemId();
    const type = resolveItemType();
    const isAdded = id ? items.some(i => i.type === type && i.id === id) : false;

    return (
      <button
        onClick={isAdded ? undefined : addItem}
        disabled={isAdded}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
          isAdded
            ? 'bg-green-100 text-green-800 cursor-default'
            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
        aria-label={isAdded ? t('added') : (ctaLabel || t('addToTrip'))}
      >
        {isAdded ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t('added')}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {ctaLabel || t('addToTrip')}
            {showCount && items.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-blue-100 text-blue-700">
                {items.length}
              </span>
            )}
          </>
        )}
      </button>
    );
  }

  // === VARIANT: mini_widget ===
  if (variant === 'mini_widget') {
    return (
      <a
        href="/trip"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] relative"
        aria-label={`${t('myPlan')} (${items.length})`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {showCount && items.length > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-blue-600 text-white">
            {items.length}
          </span>
        )}
      </a>
    );
  }

  // === VARIANT: view_my_plan ===
  return (
    <section className="save-to-trip-block" role="region" aria-label={t('myPlan')}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('myPlan')} {items.length > 0 && <span className="text-gray-400 font-normal">({items.length})</span>}
        </h3>
        {items.length > 0 && (
          <div className="flex gap-2">
            <button onClick={shareTrip} className="text-sm text-blue-600 hover:underline min-h-[44px] px-2">{t('share')}</button>
            <button onClick={clearAll} className="text-sm text-red-500 hover:underline min-h-[44px] px-2">{t('clear')}</button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 px-6 rounded-xl border-2 border-dashed border-gray-200">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="text-sm text-gray-500">{emptyStateMessage || t('empty')}</p>
        </div>
      ) : (
        <ul className="space-y-2" role="list">
          {items.map((item, i) => (
            <li
              key={`${item.type}-${item.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200"
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <a href={`/${item.type}/${item.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block">
                  {item.name || `${item.type} #${item.id}`}
                </a>
                <span className="text-xs text-gray-400 capitalize">{item.type}</span>
              </div>
              <button
                onClick={() => removeItem(item.type, item.id)}
                className="text-gray-400 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={`${t('remove')} ${item.name || item.id}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
