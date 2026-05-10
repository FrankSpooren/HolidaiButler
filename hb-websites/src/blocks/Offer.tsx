'use client';

/**
 * Offer/Package Block — VII-E2 Batch C, Block C3
 *
 * Marketing block for deals, bundles, passes, promotions.
 * Links to TicketShop block or external URL for booking (option c).
 * Schema.org Offer/AggregateOffer for SEO.
 */

export interface OfferProps {
  variant?: 'single_offer' | 'comparison' | 'bundle';
  offers?: Array<{
    title: string;
    description?: string;
    image?: string;
    originalPrice?: number;
    discountedPrice: number;
    currency?: string;
    validUntil?: string;
    badge?: string;
    features?: string[];
    bookingUrl?: string;
    bookingType?: 'internal_ticket_shop' | 'external_url' | 'request_only';
  }>;
  showCountdown?: boolean;
  layout?: 'horizontal' | 'vertical' | 'grid';
}

function formatPrice(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(amount);
}

function getTimeRemaining(until: string): string | null {
  const diff = new Date(until).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

function OfferCard({ offer, showCountdown }: { offer: NonNullable<OfferProps['offers']>[number]; showCountdown: boolean }) {
  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';
  const currency = offer.currency || 'EUR';
  const discount = offer.originalPrice
    ? Math.round((1 - offer.discountedPrice / offer.originalPrice) * 100)
    : null;
  const timeLeft = showCountdown && offer.validUntil ? getTimeRemaining(offer.validUntil) : null;

  const ctaLabels: Record<string, Record<string, string>> = {
    internal_ticket_shop: { en: 'Book now', nl: 'Boek nu', de: 'Jetzt buchen', es: 'Reservar ahora' },
    external_url: { en: 'View offer', nl: 'Bekijk aanbieding', de: 'Angebot ansehen', es: 'Ver oferta' },
    request_only: { en: 'Request info', nl: 'Informatie aanvragen', de: 'Info anfragen', es: 'Solicitar info' },
  };
  const ctaLabel = (ctaLabels[offer.bookingType || 'external_url'] as Record<string, string>)?.[locale] || 'Book now';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
      {/* Image */}
      {offer.image && (
        <div className="relative h-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" loading="lazy" />
          {offer.badge && (
            <span className="absolute top-3 left-3 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-amber-500 text-white rounded-full">
              {offer.badge}
            </span>
          )}
          {discount && (
            <span className="absolute top-3 right-3 px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full">
              -{discount}%
            </span>
          )}
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Badge (no image) */}
        {!offer.image && offer.badge && (
          <span className="inline-block w-fit px-3 py-1 text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700 rounded-full mb-2">
            {offer.badge}
          </span>
        )}

        <h3 className="text-lg font-bold text-gray-900 mb-1">{offer.title}</h3>
        {offer.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{offer.description}</p>
        )}

        {/* Features */}
        {offer.features && offer.features.length > 0 && (
          <ul className="space-y-1 mb-4">
            {offer.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto">
          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-gray-900">{formatPrice(offer.discountedPrice, currency)}</span>
            {offer.originalPrice && (
              <span className="text-sm text-gray-400 line-through">{formatPrice(offer.originalPrice, currency)}</span>
            )}
          </div>

          {/* Countdown */}
          {timeLeft && (
            <p className="text-xs text-amber-600 font-medium mb-3">
              ⏰ {locale === 'nl' ? `Nog ${timeLeft}` : `${timeLeft} left`}
            </p>
          )}

          {/* CTA */}
          <a
            href={offer.bookingUrl || '#'}
            className="block w-full text-center px-6 py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors min-h-[44px]"
          >
            {ctaLabel}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Offer(props: OfferProps) {
  const {
    variant = 'single_offer',
    offers = [],
    showCountdown = false,
    layout = 'grid',
  } = props;

  if (offers.length === 0) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Schema.org
  const schemaOffers = offers.map(o => ({
    '@type': 'Offer',
    name: o.title,
    description: o.description,
    price: o.discountedPrice,
    priceCurrency: o.currency || 'EUR',
    ...(o.validUntil ? { validThrough: o.validUntil } : {}),
    ...(o.originalPrice ? { priceSpecification: { '@type': 'PriceSpecification', price: o.originalPrice, priceCurrency: o.currency || 'EUR' } } : {}),
    availability: 'https://schema.org/InStock',
    url: o.bookingUrl || origin,
  }));

  const gridCols = offers.length === 1 ? '' : offers.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            offers.length === 1
              ? { '@context': 'https://schema.org', ...schemaOffers[0] }
              : { '@context': 'https://schema.org', '@type': 'AggregateOffer', offers: schemaOffers, offerCount: offers.length, lowPrice: Math.min(...offers.map(o => o.discountedPrice)), highPrice: Math.max(...offers.map(o => o.discountedPrice)), priceCurrency: offers[0]?.currency || 'EUR' }
          ),
        }}
      />

      <section className="offer-block" role="region" aria-label="Offers">
        <div className={layout === 'horizontal' ? 'flex gap-4 overflow-x-auto' : `grid grid-cols-1 ${gridCols} gap-6`}>
          {offers.map((offer, i) => (
            <OfferCard key={i} offer={offer} showCountdown={showCountdown} />
          ))}
        </div>
      </section>
    </>
  );
}
