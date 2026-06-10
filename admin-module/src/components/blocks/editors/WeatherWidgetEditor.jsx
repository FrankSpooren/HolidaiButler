import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Chip, CircularProgress, Alert, IconButton, Skeleton, Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { SelectField, SwitchField } from '../fields/index.js';
import { useDestination } from '../DestinationContext.jsx';
import apiClient from '../../../api/client.js';

/**
 * WeatherWidgetEditor v4 (Punt 2 + Punt 1 — Frank UX feedback 2026-06-10)
 *
 * v4 changes vs v3:
 *   - Optimistic UI op layout-switch: SelectField wijzigt direct visueel, toont
 *     spinner naast veld tijdens iframe render-wait (max 1.2s lock). Voorkomt
 *     dubbele klikken + geeft directe feedback.
 *   - Helper-text microcopy: "Voorbeeld wordt bijgewerkt..." + "1-3 sec bij eerste switch"
 *   - Skeleton in WeatherPreview tijdens initial fetch (geen blanco Paper meer).
 *   - Validation badge per locale chip — toont validated/failed/no-grounding state
 *     met tooltip (hallucinationRate + ungroundedEntities).
 *   - Brand-tip Alert toont ook wanneer ALLE locales validation-failed (info-alert
 *     "AI kon geen feitelijke tip genereren") — geen valse "verwijderd"-indruk meer.
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

function WeatherPreviewSkeleton() {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Skeleton variant="text" width={140} height={18} />
        <Skeleton variant="circular" width={24} height={24} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
        <Skeleton variant="text" width={70} height={40} />
        <Skeleton variant="text" width={120} height={20} />
      </Box>
      <Skeleton variant="text" width="80%" height={16} />
      <Skeleton variant="rectangular" width="100%" height={48} sx={{ mt: 1.5, borderRadius: 1 }} />
    </Paper>
  );
}

function ValidationBadge({ locale, validation, isDefault }) {
  if (!validation) {
    return (
      <Chip size="small" label={locale.toUpperCase()} sx={{ height: 18, fontSize: '0.6rem' }} variant={isDefault ? 'filled' : 'outlined'} color="primary" />
    );
  }
  const { passed, hallucinationRate, ungroundedEntities = [], retries } = validation;
  const rateLabel = typeof hallucinationRate === 'number' ? ` ${Math.round(hallucinationRate * 100)}%` : '';
  const tooltipParts = [
    `Locale: ${locale.toUpperCase()}`,
    `Status: ${passed ? 'Validated' : 'Failed'}`,
    typeof hallucinationRate === 'number' ? `Hallucinationrate: ${(hallucinationRate * 100).toFixed(1)}%` : null,
    typeof retries === 'number' ? `Retries: ${retries}` : null,
    ungroundedEntities.length > 0 ? `Ungrounded: ${ungroundedEntities.slice(0, 3).join(', ')}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Tooltip title={tooltipParts} arrow>
      <Chip
        size="small"
        icon={passed ? <CheckCircleIcon style={{ fontSize: 12 }} /> : <WarningAmberIcon style={{ fontSize: 12 }} />}
        label={`${locale.toUpperCase()}${rateLabel}`}
        sx={{ height: 18, fontSize: '0.6rem', '& .MuiChip-icon': { ml: 0.5 } }}
        variant={isDefault ? 'filled' : 'outlined'}
        color={passed ? 'success' : 'warning'}
      />
    </Tooltip>
  );
}

function WeatherPreview({ destinationId, withTip, defaultLanguage, layout = 'compact' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWeather = () => {
    if (!destinationId) { setLoading(false); return; }
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

  if (loading && !data) return <WeatherPreviewSkeleton />;

  const tipLocales = data?.brand_tip ? Object.keys(data.brand_tip) : [];
  const validationAttempted = !!data?.brand_tip_validation;
  const validationFailedAll = validationAttempted && tipLocales.length === 0 && Object.values(data.brand_tip_validation || {}).every(v => !v.passed);
  const allowedEntitiesCount = data?.brand_tip_allowed_entities_count ?? null;
  const isDetailed = layout === 'detailed';
  const layoutLabel = isDetailed ? 'Detailed' : 'Compact';
  const layoutColor = isDetailed ? 'secondary' : 'default';

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Live preview {data?.destination_name ? `(${data.destination_name})` : ''}
          </Typography>
          <Chip size="small" label={`Layout: ${layoutLabel}`} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }} color={layoutColor} variant={isDetailed ? 'filled' : 'outlined'} />
          {tipLocales.length > 0 && (
            <Chip size="small" label={`Tip in ${tipLocales.length} talen`} sx={{ height: 16, fontSize: '0.6rem' }} color="primary" variant="outlined" />
          )}
        </Box>
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

          {/* Tip in success path — validated by NER grounding */}
          {data.brand_tip && Object.keys(data.brand_tip).length > 0 && (
            <Alert severity="info" icon={<AutoAwesomeIcon fontSize="small" />} sx={{ mb: 1.5 }}>
              <Typography variant="body2">{data.brand_tip[defaultLanguage] || data.brand_tip.en || Object.values(data.brand_tip)[0]}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
                {Object.keys(data.brand_tip).map(lang => (
                  <ValidationBadge key={lang} locale={lang} validation={data.brand_tip_validation?.[lang]} isDefault={lang === defaultLanguage} />
                ))}
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                AI brand-tip — gevalideerd via NER-grounding (max 5% hallucinatie) + geographic-relevance filter. Klik badge voor details.
              </Typography>
            </Alert>
          )}

          {/* Tip failed-validation path — transparante uitleg, geen valse content */}
          {validationFailedAll && (
            <Alert severity="warning" icon={<WarningAmberIcon fontSize="small" />} sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>AI kon geen feitelijke tip genereren</Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                {allowedEntitiesCount === 0
                  ? 'Geen brand-context entiteiten beschikbaar in Knowledge Base. Voeg POIs/sources toe in Knowledge Base voor accurate tips.'
                  : 'Hallucinatie-detectie heeft alle gegenereerde varianten geweigerd. Brand-context onvoldoende specifiek voor het huidige weer.'}
              </Typography>
            </Alert>
          )}

          {/* Forecast chips alleen tonen bij detailed layout — layout-aware preview */}
          {isDetailed && data.forecast_5d && data.forecast_5d.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 500 }}>
                5-daagse forecast (alleen zichtbaar bij Detailed layout)
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {data.forecast_5d.slice(0, 5).map((day) => (
                  <Chip key={day.date} size="small" label={`${new Date(day.date).toLocaleDateString('nl-NL', { weekday: 'short' })}: ${day.temp_min}-${day.temp_max}°`} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                ))}
              </Box>
            </Box>
          )}
          {!isDetailed && data.forecast_5d && data.forecast_5d.length > 0 && (
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontStyle: 'italic' }}>
              5-daagse forecast wordt verborgen bij Compact layout (kies Detailed om te tonen).
            </Typography>
          )}

          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            Bron: openweathermap.org · consistent met Chatbot + personaliseerder + content-readiness · cost-tracked
            {allowedEntitiesCount !== null && ` · ${allowedEntitiesCount} brand-entiteiten beschikbaar`}
          </Typography>
        </>
      )}
    </Paper>
  );
}

export default function WeatherWidgetEditor({ block, onChange }) {
  const props = block.props || {};
  const { destinationId, defaultLanguage = 'en' } = useDestination();
  const [layoutPending, setLayoutPending] = useState(false);
  const lockTimerRef = useRef(null);

  useEffect(() => () => { if (lockTimerRef.current) clearTimeout(lockTimerRef.current); }, []);

  const updateOptimistic = (key, val) => {
    // Optimistic visual: emit change immediately, then lock for ~1.2s zodat
    // gebruiker visueel feedback krijgt dat Voorbeeld wordt bijgewerkt en
    // dubbel-klikken niet leidt tot queue van re-renders.
    onChange({ ...props, [key]: val });
    if (key === 'layout') {
      setLayoutPending(true);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => setLayoutPending(false), 1200);
    }
  };

  return (
    <>
      <WeatherPreview
        destinationId={destinationId}
        withTip={!!props.showBrandTip}
        defaultLanguage={defaultLanguage}
        layout={props.layout || 'compact'}
      />

      <Box sx={{ position: 'relative' }}>
        <SelectField
          label="Layout"
          value={props.layout || 'compact'}
          onChange={v => updateOptimistic('layout', v)}
          options={LAYOUT_OPTIONS}
          disabled={layoutPending}
          helperText={layoutPending
            ? 'Live preview hierboven schakelt direct; Voorbeeld-tab iframe vereist Opslaan voor reload.'
            : 'Compact toont alleen huidig weer + tip. Detailed voegt 5-daagse forecast toe. Live preview hierboven reageert direct op wijziging.'}
        />
        {layoutPending && (
          <CircularProgress
            size={16}
            sx={{ position: 'absolute', right: 36, top: 18 }}
          />
        )}
      </Box>

      <SwitchField
        label="AI brand-context seizoenstip tonen"
        value={props.showBrandTip}
        onChange={v => updateOptimistic('showBrandTip', v)}
        helperText="Tip wordt per ondersteunde taal gegenereerd via Mistral met NER-grounding (Validated RAG). Tips die hallucinatie-check niet passeren worden geweigerd — geen valse content in productie."
      />
    </>
  );
}
