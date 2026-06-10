'use client';

import { useEffect, useState } from 'react';
import { weatherIcons } from '@/lib/weather';
import { getLocalized } from '@/lib/i18n';

export interface WeatherData {
  current: {
    temperature: number;
    feels_like: number;
    humidity: number | null;
    pressure: number | null;
    description: string | null;
    icon: string | null;
    wind_speed: number;
  };
  forecast_5d: Array<{
    date: string;
    temp_min: number;
    temp_max: number;
    icon: string | null;
    description: string | null;
  }>;
  brand_tip: Record<string, string> | null;
  brand_tip_validation?: Record<string, { passed: boolean; hallucinationRate?: number }> | null;
  supported_languages: string[];
  default_language: string;
}

interface WeatherWidgetViewProps {
  data: WeatherData;
  locale: string;
  tenantDisplayName: string;
  initialLayout: string;
  initialShowBrandTip: boolean;
}

// OpenWeather icon code -> internal SVG key mapping
const OWM_ICON_MAP: Record<string, string> = {
  '01d': 'sun', '01n': 'sun',
  '02d': 'cloud-sun', '02n': 'cloud-sun',
  '03d': 'cloud', '03n': 'cloud',
  '04d': 'cloud', '04n': 'cloud',
  '09d': 'rain', '09n': 'rain',
  '10d': 'rain-light', '10n': 'rain-light',
  '11d': 'thunder', '11n': 'thunder',
  '13d': 'snow', '13n': 'snow',
  '50d': 'fog', '50n': 'fog',
};

const I18N_LABELS: Record<string, Record<string, string>> = {
  wind:       { en: 'Wind',       nl: 'Wind',       de: 'Wind',       es: 'Viento',    fr: 'Vent' },
  feelsLike:  { en: 'Feels like',  nl: 'Voelt als',  de: 'Gefühlt',    es: 'Sensación', fr: 'Ressenti' },
  humidity:   { en: 'Humidity',   nl: 'Vochtigheid', de: 'Luftfeuchte', es: 'Humedad',   fr: 'Humidité' },
  forecast:   { en: 'Forecast',   nl: 'Voorspelling', de: 'Vorhersage', es: 'Pronóstico', fr: 'Prévisions' },
  region:     { en: 'Weather',    nl: 'Weer',       de: 'Wetter',     es: 'Tiempo',    fr: 'Météo' },
};

function pickLabel(key: string, locale: string): string {
  return I18N_LABELS[key]?.[locale] || I18N_LABELS[key]?.en || key;
}

function WeatherIcon({ owmIcon, className }: { owmIcon: string | null; className?: string }) {
  const internalKey = owmIcon ? (OWM_ICON_MAP[owmIcon] || 'cloud') : 'cloud';
  const svgContent = weatherIcons[internalKey] ?? weatherIcons.cloud;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: svgContent }} />
  );
}

function formatDay(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  const localeMap: Record<string, string> = { nl: 'nl-NL', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR' };
  return date.toLocaleDateString(localeMap[locale] || 'en-US', { weekday: 'short' });
}

export default function WeatherWidgetView({
  data,
  locale,
  tenantDisplayName,
  initialLayout,
  initialShowBrandTip,
}: WeatherWidgetViewProps) {
  const [layout, setLayout] = useState<string>(initialLayout);
  const [showBrandTip, setShowBrandTip] = useState<boolean>(initialShowBrandTip);

  // Live-edit support: when this page is loaded inside the Page Builder iframe,
  // the admin parent posts layout-update messages. Find this block's props
  // (type: 'weather_widget') and sync layout + showBrandTip without refetch.
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return;

    const trustedOriginParts = ['holidaibutler.com', 'texelmaps.nl', 'warrewijzer.be', 'localhost'];
    const handler = (event: MessageEvent) => {
      if (!event.origin || !trustedOriginParts.some(p => event.origin.includes(p))) return;
      const payload = event.data;
      if (!payload || payload.type !== 'layout-update' || !payload.layout?.blocks) return;

      // Find first weather_widget block in the layout (page-builder convention)
      const weatherBlock = payload.layout.blocks.find((b: { type?: string }) => b.type === 'weather_widget');
      if (!weatherBlock) return;
      const props = weatherBlock.props || {};
      if (props.layout && props.layout !== layout) setLayout(props.layout);
      if (typeof props.showBrandTip === 'boolean' && props.showBrandTip !== showBrandTip) setShowBrandTip(props.showBrandTip);
    };

    window.addEventListener('message', handler);
    // Signal readiness so admin sends current state immediately
    try { window.parent.postMessage({ type: 'weather-widget-ready' }, '*'); } catch { /* cross-origin guard */ }

    return () => window.removeEventListener('message', handler);
  }, [layout, showBrandTip]);

  const isDetailed = layout === 'detailed';
  const brandTipText = data.brand_tip ? getLocalized(data.brand_tip, locale, '') : '';

  return (
    <section
      className={isDetailed ? 'py-12' : 'py-6'}
      role="region"
      aria-label={pickLabel('region', locale)}
      style={isDetailed ? { containerType: 'inline-size' } : undefined}
      data-block="weather_widget"
      data-layout={layout}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center gap-${isDetailed ? '6' : '4'} ${isDetailed ? 'mb-8' : ''} bg-surface rounded-tenant p-4 shadow-sm`}>
          <WeatherIcon owmIcon={data.current.icon} className={isDetailed ? 'w-16 h-16 text-primary' : 'w-10 h-10 text-primary'} />
          <div>
            <p className={isDetailed ? 'text-4xl font-bold text-foreground' : 'text-2xl font-bold text-foreground'}>{data.current.temperature}°C</p>
            <p className={isDetailed ? 'text-lg text-muted' : 'text-sm text-muted'}>{data.current.description}</p>
            <p className="text-sm text-muted">
              {pickLabel('feelsLike', locale)} {data.current.feels_like}°C · {pickLabel('wind', locale)} {data.current.wind_speed} km/h
              {data.current.humidity !== null && ` · ${pickLabel('humidity', locale)} ${data.current.humidity}%`}
            </p>
          </div>
          {!isDetailed && tenantDisplayName && (
            <div className="ml-auto text-right">
              <p className="text-xs text-muted">{tenantDisplayName}</p>
            </div>
          )}
        </div>

        {showBrandTip && brandTipText && (
          <div className="mt-3 p-3 bg-primary/10 border-l-4 border-primary rounded-tenant">
            <p className="text-sm text-foreground">{brandTipText}</p>
          </div>
        )}

        {isDetailed && data.forecast_5d.length > 0 && (
          <div className="weather-forecast-grid gap-3 mt-6">
            {data.forecast_5d.map((day) => (
              <div key={day.date} className="bg-surface rounded-tenant p-4 text-center shadow-sm">
                <p className="text-sm font-medium text-muted mb-2">{formatDay(day.date, locale)}</p>
                <WeatherIcon owmIcon={day.icon} className="w-8 h-8 mx-auto text-primary mb-2" />
                <p className="text-sm font-bold text-foreground">{day.temp_max}° / {day.temp_min}°</p>
              </div>
            ))}
          </div>
        )}

        {isDetailed && (
          <style dangerouslySetInnerHTML={{ __html: `
            .weather-forecast-grid { display: grid; grid-template-columns: repeat(2, 1fr); }
            @container (min-width: 600px) { .weather-forecast-grid { grid-template-columns: repeat(5, 1fr); } }
          `}} />
        )}
      </div>
    </section>
  );
}
