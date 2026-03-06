/**
 * Open-Meteo Weather API Client (Fase V.6)
 * Free, no API key, EU-hosted, GDPR-compliant
 */

export interface CurrentWeather {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  description: string;
  icon: string;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  description: string;
  icon: string;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: DailyForecast[];
}

// WMO Weather interpretation codes → description + icon
const WMO_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: 'sun' },
  1: { description: 'Mainly clear', icon: 'sun' },
  2: { description: 'Partly cloudy', icon: 'cloud-sun' },
  3: { description: 'Overcast', icon: 'cloud' },
  45: { description: 'Foggy', icon: 'fog' },
  48: { description: 'Rime fog', icon: 'fog' },
  51: { description: 'Light drizzle', icon: 'rain-light' },
  53: { description: 'Moderate drizzle', icon: 'rain-light' },
  55: { description: 'Dense drizzle', icon: 'rain' },
  61: { description: 'Slight rain', icon: 'rain-light' },
  63: { description: 'Moderate rain', icon: 'rain' },
  65: { description: 'Heavy rain', icon: 'rain' },
  71: { description: 'Slight snow', icon: 'snow' },
  73: { description: 'Moderate snow', icon: 'snow' },
  75: { description: 'Heavy snow', icon: 'snow' },
  80: { description: 'Rain showers', icon: 'rain' },
  81: { description: 'Moderate showers', icon: 'rain' },
  82: { description: 'Violent showers', icon: 'rain' },
  95: { description: 'Thunderstorm', icon: 'thunder' },
  96: { description: 'Thunderstorm with hail', icon: 'thunder' },
  99: { description: 'Thunderstorm with heavy hail', icon: 'thunder' },
};

function getWeatherInfo(code: number) {
  return WMO_CODES[code] ?? { description: 'Unknown', icon: 'cloud' };
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;

    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const data = await res.json();

    const currentInfo = getWeatherInfo(data.current?.weather_code ?? 0);
    const current: CurrentWeather = {
      temperature: Math.round(data.current?.temperature_2m ?? 0),
      weatherCode: data.current?.weather_code ?? 0,
      windSpeed: Math.round(data.current?.wind_speed_10m ?? 0),
      description: currentInfo.description,
      icon: currentInfo.icon,
    };

    const forecast: DailyForecast[] = (data.daily?.time ?? []).map((date: string, i: number) => {
      const info = getWeatherInfo(data.daily.weather_code[i] ?? 0);
      return {
        date,
        tempMax: Math.round(data.daily.temperature_2m_max[i] ?? 0),
        tempMin: Math.round(data.daily.temperature_2m_min[i] ?? 0),
        weatherCode: data.daily.weather_code[i] ?? 0,
        description: info.description,
        icon: info.icon,
      };
    });

    return { current, forecast };
  } catch {
    return null;
  }
}

// SVG weather icons (inline, no external dependency)
export const weatherIcons: Record<string, string> = {
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  'cloud-sun': '<path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M17.66 17.66l1.41 1.41M2 12h2M6.34 17.66l-1.41 1.41M17.07 4.93l1.41-1.41"/><circle cx="12" cy="9" r="4"/><path d="M16 13a4 4 0 11-8 0h8z"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>',
  fog: '<path d="M3 12h18M3 16h14M5 8h16"/>',
  'rain-light': '<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><line x1="8" y1="21" x2="8" y2="23"/><line x1="12" y1="21" x2="12" y2="23"/>',
  rain: '<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><line x1="8" y1="21" x2="8" y2="23"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="16" y1="21" x2="16" y2="23"/>',
  snow: '<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><circle cx="9" cy="22" r="0.5"/><circle cx="13" cy="22" r="0.5"/><circle cx="17" cy="22" r="0.5"/>',
  thunder: '<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><polyline points="13 16 10 21 14 21 11 24"/>',
};
