'use client';

import { useState, useEffect } from 'react';

/**
 * FeaturedItem Block — VII-E2 Batch A, Block A5
 *
 * Highlights a single POI, event, or article with rich presentation.
 * Variants: large_card, split_image_text, overlay_hero.
 */

export interface FeaturedItemProps {
  itemType?: 'poi' | 'event' | 'article';
  itemId?: number;
  variant?: 'large_card' | 'split_image_text' | 'overlay_hero';
  showCta?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  customTitle?: string;
  customDescription?: string;
  badgeText?: string;
}

interface FeaturedData {
  id: number;
  name?: string;
  title?: string;
  category?: string;
  rating?: number;
  review_count?: number;
  description?: string;
  tile_description?: string;
  images?: string[];
  thumbnail_url?: string;
  image?: string;
  date?: string;
  location_name?: string;
}

export default function FeaturedItem(props: FeaturedItemProps) {
  const {
    itemType = 'poi',
    itemId,
    variant = 'large_card',
    showCta = true,
    ctaLabel,
    ctaHref,
    customTitle,
    customDescription,
    badgeText,
  } = props;

  const [item, setItem] = useState<FeaturedData | null>(null);
  const [loading, setLoading] = useState(true);

  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  useEffect(() => {
    if (!itemId) { setLoading(false); return; }

    const endpoint = itemType === 'event'
      ? `/api/v1/agenda/events/${itemId}`
      : `/api/v1/pois/${itemId}`;

    fetch(endpoint)
      .then(r => r.json())
      .then(data => {
        setItem(data?.data || data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [itemType, itemId]);

  if (loading) {
    return (
      <div className="featured-item-block animate-pulse">
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!item) return null;

  const title = customTitle || item.name || item.title || '';
  const description = customDescription || item.tile_description || item.description || '';
  const imageUrl = item.images?.[0] || item.thumbnail_url || item.image || '';
  const href = ctaHref || (itemType === 'poi' ? `/poi/${item.id}` : `/event/${item.id}`);
  const defaultCtaLabel = locale === 'nl' ? 'Bekijken' : locale === 'de' ? 'Ansehen' : locale === 'es' ? 'Ver' : 'View';

  if (variant === 'overlay_hero') {
    return (
      <section className="featured-item-block relative rounded-xl overflow-hidden" role="region" aria-label={title}>
        <div className="relative h-72 sm:h-96">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            {badgeText && (
              <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider bg-amber-500 text-white rounded-full mb-3">
                {badgeText}
              </span>
            )}
            <h3 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h3>
            {description && <p className="text-sm text-white/80 line-clamp-2 max-w-xl">{description}</p>}
            {item.rating && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-amber-400">{'\u2605'}</span>
                <span className="font-medium">{typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating}</span>
                {item.review_count ? <span className="text-white/60 text-sm">({item.review_count} reviews)</span> : null}
              </div>
            )}
            {showCta && (
              <a
                href={href}
                className="inline-block mt-4 px-6 py-2.5 bg-white text-gray-900 font-medium rounded-full hover:bg-gray-100 transition-colors min-h-[44px]"
              >
                {ctaLabel || defaultCtaLabel}
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'split_image_text') {
    return (
      <section className="featured-item-block" role="region" aria-label={title}>
        <div className="flex flex-col md:flex-row gap-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {imageUrl && (
            <div className="md:w-1/2 h-48 md:h-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="flex-1 p-6 flex flex-col justify-center">
            {badgeText && (
              <span className="inline-block w-fit px-3 py-1 text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 rounded-full mb-3">
                {badgeText}
              </span>
            )}
            {item.category && <span className="text-xs text-gray-500 mb-1">{item.category}</span>}
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{title}</h3>
            {description && <p className="text-sm text-gray-600 line-clamp-3 mb-4">{description}</p>}
            {item.rating && (
              <div className="flex items-center gap-1 mb-4">
                <span className="text-amber-500">{'\u2605'}</span>
                <span className="font-medium text-sm">{typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating}</span>
                {item.review_count ? <span className="text-gray-400 text-xs">({item.review_count})</span> : null}
              </div>
            )}
            {showCta && (
              <a
                href={href}
                className="inline-block w-fit px-6 py-2.5 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                {ctaLabel || defaultCtaLabel}
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Default: large_card
  return (
    <section className="featured-item-block" role="region" aria-label={title}>
      <a href={href} className="block rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-shadow">
        {imageUrl && (
          <div className="h-48 sm:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-5">
          {badgeText && (
            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700 rounded-full mb-2">
              {badgeText}
            </span>
          )}
          {item.category && <span className="block text-xs text-gray-500 mb-1">{item.category}</span>}
          <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
          {description && <p className="text-sm text-gray-600 line-clamp-2">{description}</p>}
          {item.rating && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-amber-500">{'\u2605'}</span>
              <span className="font-medium text-sm">{typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating}</span>
              {item.review_count ? <span className="text-gray-400 text-xs">({item.review_count})</span> : null}
            </div>
          )}
          {showCta && (
            <span className="inline-block mt-3 text-sm font-medium text-blue-600">{ctaLabel || defaultCtaLabel} →</span>
          )}
        </div>
      </a>
    </section>
  );
}
