'use client';

import { useState, useEffect } from 'react';

/**
 * LocationDetails Block — VII-E2 Batch B, Block B5
 *
 * Shows address, coordinates, transport info, parking, accessibility.
 * Can source from POI data or manual input.
 */

export interface LocationDetailsProps {
  source?: 'poi' | 'manual';
  poiId?: number;
  manualLocation?: {
    address: string;
    city?: string;
    postalCode?: string;
    country?: string;
    lat?: number;
    lon?: number;
    transportInfo?: string;
    parkingInfo?: string;
    accessibilityInfo?: string;
  };
  showMapPreview?: boolean;
  showOpenInMaps?: boolean;
  showCopyAddress?: boolean;
  variant?: 'compact' | 'detailed';
}

interface LocationData {
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lon?: number;
  transportInfo?: string;
  parkingInfo?: string;
  accessibilityInfo?: string;
}

export default function LocationDetails(props: LocationDetailsProps) {
  const {
    source = 'manual',
    poiId,
    manualLocation,
    showMapPreview = false,
    showOpenInMaps = true,
    showCopyAddress = true,
    variant = 'detailed',
  } = props;

  const [location, setLocation] = useState<LocationData | null>(manualLocation || null);
  const [copied, setCopied] = useState(false);

  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  useEffect(() => {
    if (source === 'poi' && poiId) {
      fetch(`/api/v1/pois/${poiId}`)
        .then(r => r.json())
        .then(data => {
          const poi = data?.data || data;
          if (poi) {
            setLocation({
              address: poi.address || '',
              city: poi.city || '',
              postalCode: poi.postal_code || '',
              country: poi.country || '',
              lat: poi.latitude ? parseFloat(poi.latitude) : undefined,
              lon: poi.longitude ? parseFloat(poi.longitude) : undefined,
              parkingInfo: poi.parking_info || '',
              accessibilityInfo: poi.accessibility_features || '',
            });
          }
        })
        .catch(() => {});
    }
  }, [source, poiId]);

  if (!location) return null;

  const fullAddress = [location.address, location.postalCode, location.city, location.country].filter(Boolean).join(', ');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard API not available */ }
  };

  const mapsUrl = location.lat && location.lon
    ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lon}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const labels = {
    address: { en: 'Address', nl: 'Adres', de: 'Adresse', es: 'Direccion' },
    directions: { en: 'Get directions', nl: 'Route plannen', de: 'Route planen', es: 'Obtener indicaciones' },
    copied: { en: 'Copied!', nl: 'Gekopieerd!', de: 'Kopiert!', es: 'Copiado!' },
    copy: { en: 'Copy', nl: 'Kopieer', de: 'Kopieren', es: 'Copiar' },
    parking: { en: 'Parking', nl: 'Parkeren', de: 'Parken', es: 'Aparcamiento' },
    accessibility: { en: 'Accessibility', nl: 'Toegankelijkheid', de: 'Barrierefreiheit', es: 'Accesibilidad' },
    transport: { en: 'Public transport', nl: 'Openbaar vervoer', de: 'Nahverkehr', es: 'Transporte publico' },
  };

  const t = (key: string) => (labels[key as keyof typeof labels] as Record<string, string>)?.[locale] || (labels[key as keyof typeof labels] as Record<string, string>)?.en || key;

  return (
    <section className="location-details-block" role="region" aria-label={t('address')}>
      <div className={`rounded-xl border border-gray-200 bg-white ${variant === 'compact' ? 'p-4' : 'p-5'}`}>
        {/* Address */}
        <div className="flex items-start gap-3 mb-4">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{fullAddress}</p>
            {location.lat && location.lon && variant === 'detailed' && (
              <p className="text-xs text-gray-400 mt-0.5">{location.lat.toFixed(5)}, {location.lon.toFixed(5)}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {showOpenInMaps && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {t('directions')}
            </a>
          )}
          {showCopyAddress && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              {copied ? t('copied') : t('copy')}
            </button>
          )}
        </div>

        {/* Extra info sections */}
        {variant === 'detailed' && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            {location.parkingInfo && (
              <div className="flex gap-3">
                <span className="text-gray-400 text-sm">🅿️</span>
                <div>
                  <p className="text-xs font-medium text-gray-700 uppercase tracking-wider">{t('parking')}</p>
                  <p className="text-sm text-gray-600">{location.parkingInfo}</p>
                </div>
              </div>
            )}
            {location.transportInfo && (
              <div className="flex gap-3">
                <span className="text-gray-400 text-sm">🚌</span>
                <div>
                  <p className="text-xs font-medium text-gray-700 uppercase tracking-wider">{t('transport')}</p>
                  <p className="text-sm text-gray-600">{location.transportInfo}</p>
                </div>
              </div>
            )}
            {location.accessibilityInfo && (
              <div className="flex gap-3">
                <span className="text-gray-400 text-sm">♿</span>
                <div>
                  <p className="text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accessibility')}</p>
                  <p className="text-sm text-gray-600">{location.accessibilityInfo}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
