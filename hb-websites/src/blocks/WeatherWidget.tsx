import { headers } from 'next/headers';
import { fetchTenantConfig } from '@/lib/api';
import { fetchWeather, weatherIcons } from '@/lib/weather';
import type { WeatherWidgetProps } from '@/types/blocks';

function WeatherIcon({ icon, className }: { icon: string; className?: string }) {
  const svgContent = weatherIcons[icon] ?? weatherIcons.cloud;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

function formatDay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en', { weekday: 'short' });
}

export default async function WeatherWidget({ layout = 'compact', showForecast = false }: WeatherWidgetProps) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const tenant = await fetchTenantConfig(tenantSlug);

  if (!tenant?.latitude || !tenant?.longitude) return null;

  const weather = await fetchWeather(tenant.latitude, tenant.longitude);
  if (!weather) return null;

  if (layout === 'compact') {
    return (
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 bg-surface rounded-tenant p-4 shadow-sm">
            <WeatherIcon icon={weather.current.icon} className="w-10 h-10 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{weather.current.temperature}°C</p>
              <p className="text-sm text-muted">{weather.current.description}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-muted">Wind: {weather.current.windSpeed} km/h</p>
              <p className="text-xs text-muted">{tenant.displayName}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Detailed layout with 5-day forecast
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Current weather */}
        <div className="flex items-center gap-6 mb-8">
          <WeatherIcon icon={weather.current.icon} className="w-16 h-16 text-primary" />
          <div>
            <p className="text-4xl font-bold text-foreground">{weather.current.temperature}°C</p>
            <p className="text-lg text-muted">{weather.current.description}</p>
            <p className="text-sm text-muted">Wind: {weather.current.windSpeed} km/h</p>
          </div>
        </div>

        {/* 5-day forecast */}
        {(showForecast || layout === 'detailed') && weather.forecast.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {weather.forecast.map((day) => (
              <div key={day.date} className="bg-surface rounded-tenant p-4 text-center shadow-sm">
                <p className="text-sm font-medium text-muted mb-2">{formatDay(day.date)}</p>
                <WeatherIcon icon={day.icon} className="w-8 h-8 mx-auto text-primary mb-2" />
                <p className="text-sm font-bold text-foreground">
                  {day.tempMax}° / {day.tempMin}°
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
