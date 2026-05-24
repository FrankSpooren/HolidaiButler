import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, CircularProgress, Alert, IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { SelectField, SwitchField } from '../fields/index.js';
import { useDestination } from '../DestinationContext.jsx';
import apiClient from '../../../api/client.js';

/**
 * WeatherWidgetEditor v3 (2026-05-24 — Frank UX feedback)
 *
 * Verbeteringen v2 -> v3:
 *   - Layout single-source-of-truth (compact = huidig weer; detailed = +5-day)
 *     showForecast switch verwijderd (was redundant met layout).
 *   - tipLocale dropdown verwijderd. Brand-tip wordt server-side gegenereerd
 *     voor ALLE supported_languages parallel; runtime block kiest locale
 *     uit Next.js i18n context. Preview toont destination default_language.
 *   - Brand-tip preview toont nu ALLE locales als ze beschikbaar zijn
 *     (compact accordion-style).
 */

const LAYOUT_OPTIONS = [
  { value: 'compact', label: 'Compact (huidig weer + tip)' },
  { value: 'detailed', label: 'Detailed (huidig weer + tip + 5-daagse forecast)' },
];

const WMO_DESCRIPTIONS = {
  0: 'Helder', 1: 'Overwegend helder', 2: 'Gedeeltelijk bewolkt', 3: 'Bewolkt',
  45: 'Mistig', 48: 'Aanvriezende mist',
  51: 'Lichte motregen', 53: 'Matige motregen', 55: 'Dichte motregen',
  61: 'Lichte regen', 63: 'Matige regen', 65: 'Zware regen',
  71: 'Lichte sneeuw', 73: 'Matige sneeuw', 75: 'Zware sneeuw',
  80: 'Regenbuien', 81: 'Matige buien', 82: 'Hevige buien',
  95: 'Onweer', 96: 'Onweer met hagel', 99: 'Onweer met zware hagel',
};

function getWeatherDesc(code, fallbackDescription) {
  if (fallbackDescription && String(fallbackDescription).trim()) return String(fallbackDescription);
  return WMO_DESCRIPTIONS[code] || 'Onbekend';
}

function WeatherPreview({ destinationId, withTip, defaultLanguage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeather = () => {
    if (!destinationId) return;
    setLoading(true);
    setError(null);
    apiClient.get('/weather-preview', { params: { destinationId, locale: defaultLanguage, withTip: withTip ? 'true' : 'false' }, timeout: 60000 })
      .then(r => setData(r.data?.data || null))
      .catch(err => {
        const code = err?.response?.data?.error?.code;
        if (code === 'MISSING_COORDINATES') {
          setError('Geen lat/lng beschikbaar voor deze destinatie. Vul branding.lat/lng in.');
        } else {
          setError(err?.response?.data?.error?.message || err.message);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationId, withTip, defaultLanguage]);

  if (!destinationId) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Geen destinatie-context — preview niet beschikbaar.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Live preview {data?.destination_name ? `(${data.destination_name})` : ''}
          {data?.brand_tip_locales?.length > 0 && (
            <Chip size="small" label={`Tip in ${data.brand_tip_locales.length} talen`} sx={{ ml: 1, height: 16, fontSize: '0.6rem' }} color="primary" variant="outlined" />
          )}
        </Typography>
        <IconButton size="small" onClick={fetchWeather} disabled={loading} title="Refresh">
          {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 1 }}>{error}</Alert>}

      {data && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{data.current.temperature}°C</Typography>
            <Typography variant="body2" color="text.secondary">
              {getWeatherDesc(data.current.weather_code, data.current.description)}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Voelt als {data.current.feels_like}°C · Wind {data.current.wind_speed} km/u
            {data.current.humidity !== null && data.current.humidity !== undefined && ` · Vochtigheid ${data.current.humidity}%`}
            {data.current.pressure && ` · ${data.current.pressure} hPa`}
          </Typography>

          {data.brand_tip && Object.keys(data.brand_tip).length > 0 && (
            <Alert severity="info" icon={<AutoAwesomeIcon fontSize="small" />} sx={{ mb: 1.5 }}>
              <Typography variant="body2">{data.brand_tip[defaultLanguage] || data.brand_tip.en || Object.values(data.brand_tip)[0]}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                {Object.keys(data.brand_tip).map(lang => (
                  <Chip key={lang} size="small" label={lang.toUpperCase()} sx={{ height: 16, fontSize: '0.6rem' }} variant={lang === defaultLanguage ? 'filled' : 'outlined'} color="primary" />
                ))}
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                AI brand-context tip · per taal gegenereerd · controleer feitelijke juistheid
              </Typography>
            </Alert>
          )}

          {data.forecast_5d && data.forecast_5d.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {data.forecast_5d.slice(0, 5).map((day) => (
                <Chip key={day.date} size="small" label={`${new Date(day.date).toLocaleDateString('nl-NL', { weekday: 'short' })}: ${day.temp_min}-${day.temp_max}°`} variant="outlined" sx={{ fontSize: '0.7rem' }} />
              ))}
            </Box>
          )}

          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            Bron: openweathermap.org · consistent met Chatbot + personaliseerder + content-readiness · cost-tracked
          </Typography>
        </>
      )}
    </Paper>
  );
}

export default function WeatherWidgetEditor({ block, onChange }) {
  const props = block.props || {};
  const { destinationId, defaultLanguage = 'en' } = useDestination();
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <WeatherPreview destinationId={destinationId} withTip={!!props.showBrandTip} defaultLanguage={defaultLanguage} />

      <SelectField label="Layout" value={props.layout || 'compact'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} helperText="Detailed-layout toont automatisch 5-daagse forecast" />
      <SwitchField label="AI brand-context seizoenstip tonen" value={props.showBrandTip} onChange={v => update('showBrandTip', v)} helperText="Tip wordt automatisch gegenereerd voor alle ondersteunde talen van deze destinatie" />
    </>
  );
}
