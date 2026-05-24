import { headers } from 'next/headers';
import { fetchTenantConfig } from '@/lib/api';
import { weatherIcons } from '@/lib/weather';
import { getLocalized } from '@/lib/i18n';
import type { WeatherWidgetProps } from '@/types/blocks';

/**
 * WeatherWidget v2 (BLOK F UX-feedback — 2026-05-24)
 *
 * Verbeteringen:
 *   - Fetcht via /api/v1/weather/public (OpenWeatherMap consistent met
 *     Chatbot + personaliseerder + content-readiness)
 *   - brand_tip i18n-object render via getLocalized() helper
 *   - Locale uit document.documentElement.lang (Next.js i18n context)
 *   - layout single-source-of-truth: 'compact' vs 'detailed' bepaalt
 *     5-day forecast visibility (showForecast prop deprecated)
 *   - i18n labels per locale (Wind, etc.)
 */

interface WeatherData {
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
  supported_languages: string[];
  default_language: string;
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

async function fetchPublicWeather(destinationId: number, locale: string, withTip: boolean): Promise<WeatherData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const url = `${baseUrl}/api/v1/weather/public?destinationId=${destinationId}&locale=${locale}&withTip=${withTip ? 'true' : 'false'}`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export default async function WeatherWidget({ layout = 'compact', showBrandTip = false }: WeatherWidgetProps & { showBrandTip?: boolean }) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = (headersList.get('x-tenant-locale') || 'en').toLowerCase().slice(0, 2);
  const tenant = await fetchTenantConfig(tenantSlug);
  if (!tenant?.id) return null;

  const weather = await fetchPublicWeather(Number(tenant.id), locale, !!showBrandTip);
  if (!weather) return null;

  const isDetailed = layout === 'detailed';
  const brandTipText = weather.brand_tip ? getLocalized(weather.brand_tip, locale, '') : '';

  return (
    <section className={isDetailed ? 'py-12' : 'py-6'} role="region" aria-label={pickLabel('region', locale)} style={isDetailed ? { containerType: 'inline-size' } : undefined}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center gap-${isDetailed ? '6' : '4'} ${isDetailed ? 'mb-8' : ''} bg-surface rounded-tenant p-4 shadow-sm`}>
          <WeatherIcon owmIcon={weather.current.icon} className={isDetailed ? 'w-16 h-16 text-primary' : 'w-10 h-10 text-primary'} />
          <div>
            <p className={isDetailed ? 'text-4xl font-bold text-foreground' : 'text-2xl font-bold text-foreground'}>{weather.current.temperature}°C</p>
            <p className={isDetailed ? 'text-lg text-muted' : 'text-sm text-muted'}>{weather.current.description}</p>
            <p className="text-sm text-muted">
              {pickLabel('feelsLike', locale)} {weather.current.feels_like}°C · {pickLabel('wind', locale)} {weather.current.wind_speed} km/h
              {weather.current.humidity !== null && ` · ${pickLabel('humidity', locale)} ${weather.current.humidity}%`}
            </p>
          </div>
          {!isDetailed && (
            <div className="ml-auto text-right">
              <p className="text-xs text-muted">{tenant.displayName}</p>
            </div>
          )}
        </div>

        {showBrandTip && brandTipText && (
          <div className="mt-3 p-3 bg-primary/10 border-l-4 border-primary rounded-tenant">
            <p className="text-sm text-foreground">{brandTipText}</p>
          </div>
        )}

        {isDetailed && weather.forecast_5d.length > 0 && (
          <div className="weather-forecast-grid gap-3 mt-6">
            {weather.forecast_5d.map((day) => (
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
