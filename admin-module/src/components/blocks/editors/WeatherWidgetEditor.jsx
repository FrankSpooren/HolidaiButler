import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, CircularProgress, Alert, Button, IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { SelectField, SwitchField } from '../fields/index.js';
import { useDestination } from '../DestinationContext.jsx';
import apiClient from '../../../api/client.js';

/**
 * WeatherWidgetEditor v2 (BLOK E2 — 22-05-2026)
 *
 * Verbeteringen:
 *   - Live preview van huidig weer (Open-Meteo via /admin-portal/weather-preview)
 *     met destination lat/lng auto-fill (geen handmatige coordinates nodig)
 *   - "Generate brand-context seizoenstip" toggle — Mistral genereert
 *     destination-specifieke 1-zins advies (Peñón de Ifach, paella valenciana
 *     i.p.v. generieke "perfect weather"). USP t.o.v. generieke weather widgets.
 *   - 5-daagse forecast preview met weather codes
 *
 * Backend block-data: { layout, showForecast, showBrandTip, tipLocale }
 * Bij runtime: WeatherWidget.tsx haalt zelf weer + tip via dezelfde endpoint.
 */

const LAYOUT_OPTIONS = [
  { value: 'compact', label: 'Compact (alleen huidig)' },
  { value: 'detailed', label: 'Detailed (5-daagse forecast)' },
];

const WMO_DESCRIPTIONS = {
  0: 'Helder',
  1: 'Overwegend helder',
  2: 'Gedeeltelijk bewolkt',
  3: 'Bewolkt',
  45: 'Mistig',
  48: 'Aanvriezende mist',
  51: 'Lichte motregen',
  53: 'Matige motregen',
  55: 'Dichte motregen',
  61: 'Lichte regen',
  63: 'Matige regen',
  65: 'Zware regen',
  71: 'Lichte sneeuw',
  73: 'Matige sneeuw',
  75: 'Zware sneeuw',
  80: 'Regenbuien',
  81: 'Matige buien',
  82: 'Hevige buien',
  95: 'Onweer',
  96: 'Onweer met hagel',
  99: 'Onweer met zware hagel',
};

function getWeatherDesc(code) {
  return WMO_DESCRIPTIONS[code] || 'Onbekend';
}

function WeatherPreview({ destinationId, withTip, tipLocale }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeather = () => {
    if (!destinationId) return;
    setLoading(true);
    setError(null);
    apiClient.get('/weather-preview', { params: { destinationId, locale: tipLocale, withTip: withTip ? 'true' : 'false' }, timeout: 30000 })
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
  }, [destinationId, withTip, tipLocale]);

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
        </Typography>
        <IconButton size="small" onClick={fetchWeather} disabled={loading} title="Refresh">
          {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 1 }}>{error}</Alert>}

      {data && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{data.current.temperature}°C</Typography>
            <Typography variant="body2" color="text.secondary">
              {getWeatherDesc(data.current.weather_code)} · Wind {data.current.wind_speed} km/u
            </Typography>
          </Box>

          {data.brand_tip && (
            <Alert severity="info" icon={<AutoAwesomeIcon fontSize="small" />} sx={{ mb: 1.5 }}>
              <Typography variant="body2">{data.brand_tip}</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                AI brand-context tip · controleer feitelijke juistheid
              </Typography>
            </Alert>
          )}

          {data.forecast_5d && data.forecast_5d.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {data.forecast_5d.slice(0, 5).map((day) => (
                <Chip
                  key={day.date}
                  size="small"
                  label={`${new Date(day.date).toLocaleDateString('nl-NL', { weekday: 'short' })}: ${day.temp_min}-${day.temp_max}°`}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
            </Box>
          )}

          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            Bron: open-meteo.com · gratis · GDPR-compliant (EU-hosted)
          </Typography>
        </>
      )}
    </Paper>
  );
}

const LOCALE_OPTIONS = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Espanol' },
  { value: 'fr', label: 'Francais' },
];

export default function WeatherWidgetEditor({ block, onChange }) {
  const props = block.props || {};
  const { destinationId, defaultLanguage = 'en' } = useDestination();
  const update = (key, val) => onChange({ ...props, [key]: val });
  const tipLocale = props.tipLocale || defaultLanguage;

  return (
    <>
      <WeatherPreview destinationId={destinationId} withTip={!!props.showBrandTip} tipLocale={tipLocale} />

      <SelectField label="Layout" value={props.layout || 'compact'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <SwitchField label="Show 5-day forecast" value={props.showForecast} onChange={v => update('showForecast', v)} />
      <SwitchField label="AI brand-context seizoenstip tonen" value={props.showBrandTip} onChange={v => update('showBrandTip', v)} />
      {props.showBrandTip && (
        <SelectField label="Brand-tip taal" value={tipLocale} onChange={v => update('tipLocale', v)} options={LOCALE_OPTIONS} helperText="Taal voor de AI-gegenereerde seizoenstip" />
      )}
    </>
  );
}
