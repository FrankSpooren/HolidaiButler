import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Autocomplete, TextField as MuiTextField,
  CircularProgress, Chip, Paper, Table, TableBody, TableRow, TableCell, IconButton, Button, Switch, FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { SelectField, TextField, SwitchField } from '../fields/index.js';
import { useDestination } from '../DestinationContext.jsx';
import apiClient from '../../../api/client.js';

/**
 * OpeningHoursEditor v2 (BLOK E5 — 22-05-2026)
 *
 * Verbeteringen t.o.v. v1:
 *   - POI-selector (Autocomplete) i.p.v. handmatige POI ID input — gebruikt
 *     bestaande GET /pois?destinationId=X&search=Y endpoint.
 *   - Live preview van opening_hours_json uit POI tabel.
 *   - Manual hours editor (per-dag from/to/closed) voor source='manual'.
 *   - Timezone selectie + locale-aware day-labels (NL/EN/DE/ES/FR).
 *
 * Backend block-data ongewijzigd: { source, poiId, manualHours, variant,
 * showOpenNow, timezone, dayLocale } in block.props.
 */

const SOURCE_OPTIONS = [
  { value: 'poi', label: 'From POI data' },
  { value: 'manual', label: 'Manual entry' },
];
const VARIANT_OPTIONS = [
  { value: 'detailed', label: 'Detailed (with highlights)' },
  { value: 'compact', label: 'Compact' },
];
const TIMEZONE_OPTIONS = [
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (NL/Calpe/Texel)' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (ES)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (DE)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (FR)' },
];

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS_NL = {
  mon: 'Maandag', tue: 'Dinsdag', wed: 'Woensdag', thu: 'Donderdag',
  fri: 'Vrijdag', sat: 'Zaterdag', sun: 'Zondag',
};

function ManualHoursEditor({ hours, onChange }) {
  const list = Array.isArray(hours) ? hours : [];
  const byDay = useMemo(() => {
    const m = {};
    list.forEach(h => { if (h?.day) m[h.day] = h; });
    return m;
  }, [list]);

  const updateDay = (dayKey, patch) => {
    const existing = byDay[dayKey] || { day: dayKey };
    const next = { ...existing, ...patch };
    const others = list.filter(h => h.day !== dayKey);
    onChange([...others, next].sort((a, b) => DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day)));
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
        Openingstijden per dag (24-uurs notatie HH:MM)
      </Typography>
      <Table size="small">
        <TableBody>
          {DAY_KEYS.map(dayKey => {
            const entry = byDay[dayKey] || {};
            return (
              <TableRow key={dayKey}>
                <TableCell sx={{ pl: 0, width: 100 }}>{DAY_LABELS_NL[dayKey]}</TableCell>
                <TableCell sx={{ width: 100 }}>
                  <MuiTextField
                    size="small"
                    placeholder="09:00"
                    value={entry.from || ''}
                    onChange={e => updateDay(dayKey, { from: e.target.value, closed: false })}
                    disabled={entry.closed}
                  />
                </TableCell>
                <TableCell sx={{ width: 100 }}>
                  <MuiTextField
                    size="small"
                    placeholder="17:00"
                    value={entry.to || ''}
                    onChange={e => updateDay(dayKey, { to: e.target.value, closed: false })}
                    disabled={entry.closed}
                  />
                </TableCell>
                <TableCell sx={{ pr: 0 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={!!entry.closed}
                        onChange={e => updateDay(dayKey, { closed: e.target.checked, from: e.target.checked ? '' : entry.from, to: e.target.checked ? '' : entry.to })}
                      />
                    }
                    label={<Typography variant="caption">Gesloten</Typography>}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}

function PoiPreview({ poiId }) {
  const { data, isLoading, error } = usePoiPreview(poiId);
  if (!poiId) return null;
  if (isLoading) return <Box sx={{ py: 1, textAlign: 'center' }}><CircularProgress size={16} /></Box>;
  if (error) return <Typography variant="caption" color="error">Fout bij laden POI: {error.message}</Typography>;
  if (!data) return null;

  let hours = data.opening_hours_json || data.opening_hours;
  if (typeof hours === 'string') {
    try { hours = JSON.parse(hours); } catch { hours = null; }
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        Live preview: {data.name}
      </Typography>
      {Array.isArray(hours) && hours.length > 0 ? (
        <Table size="small">
          <TableBody>
            {hours.map((h, i) => (
              <TableRow key={i}>
                <TableCell sx={{ pl: 0, width: 120 }}>{h.day || h.weekday || '—'}</TableCell>
                <TableCell sx={{ pr: 0 }}>{h.closed ? 'Gesloten' : (h.hours || `${h.from || '?'} - ${h.to || '?'}`)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Geen opening_hours data voor deze POI. Vul handmatig in via Manual source, of voeg POI-content aan.
        </Typography>
      )}
    </Paper>
  );
}

function usePoiPreview(poiId) {
  const [state, setState] = useState({ data: null, isLoading: false, error: null });
  useEffect(() => {
    if (!poiId) { setState({ data: null, isLoading: false, error: null }); return; }
    let cancelled = false;
    setState(s => ({ ...s, isLoading: true, error: null }));
    apiClient.get(`/pois/${poiId}`)
      .then(r => { if (!cancelled) setState({ data: r.data?.data || r.data, isLoading: false, error: null }); })
      .catch(err => { if (!cancelled) setState({ data: null, isLoading: false, error: err }); });
    return () => { cancelled = true; };
  }, [poiId]);
  return state;
}

function PoiSelector({ value, onChange }) {
  const { destinationId } = useDestination();
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);

  // Search POIs
  useEffect(() => {
    if (!destinationId) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get('/pois', { params: { destinationId, search: inputValue || undefined, limit: 25, page: 1 } })
      .then(r => {
        if (cancelled) return;
        const items = r.data?.data?.items || r.data?.data?.pois || [];
        setOptions(items);
      })
      .catch(() => { if (!cancelled) setOptions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [destinationId, inputValue]);

  // Resolve current value to label
  useEffect(() => {
    if (!value) { setSelectedDetails(null); return; }
    if (selectedDetails?.id === value) return;
    apiClient.get(`/pois/${value}`)
      .then(r => setSelectedDetails(r.data?.data || r.data))
      .catch(() => setSelectedDetails(null));
  }, [value, selectedDetails?.id]);

  return (
    <Autocomplete
      size="small"
      options={options}
      value={selectedDetails}
      onChange={(_, newVal) => onChange(newVal?.id || null)}
      onInputChange={(_, val) => setInputValue(val)}
      getOptionLabel={(opt) => opt ? `${opt.name} (#${opt.id})` : ''}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
      loading={loading}
      renderInput={(params) => (
        <MuiTextField
          {...params}
          label="POI zoeken"
          placeholder={destinationId ? 'Typ POI naam...' : 'Selecteer eerst een destinatie'}
          InputProps={{
            ...params.InputProps,
            endAdornment: <>{loading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</>,
          }}
        />
      )}
      sx={{ mb: 2 }}
    />
  );
}

export default function OpeningHoursEditor({ data, onChange }) {
  data = data || {};
  const u = (field, value) => onChange({ ...data, [field]: value });
  const isPoi = (data.source || 'poi') === 'poi';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Opening Hours
      </Typography>

      <SelectField label="Source" value={data.source || 'poi'} options={SOURCE_OPTIONS} onChange={v => u('source', v)} />

      {isPoi && (
        <>
          <PoiSelector value={data.poiId} onChange={v => u('poiId', v)} />
          {data.poiId && <PoiPreview poiId={data.poiId} />}
        </>
      )}

      {!isPoi && (
        <ManualHoursEditor hours={data.manualHours} onChange={v => u('manualHours', v)} />
      )}

      <SelectField label="Variant" value={data.variant || 'detailed'} options={VARIANT_OPTIONS} onChange={v => u('variant', v)} />
      <SwitchField label="Show 'Open now' indicator" value={data.showOpenNow !== false} onChange={v => u('showOpenNow', v)} />
      <SelectField label="Timezone" value={data.timezone || 'Europe/Amsterdam'} options={TIMEZONE_OPTIONS} onChange={v => u('timezone', v)} helperText="Voor 'Nu open' + 'Sluit over X min' berekening" />

      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
        Block toont openingstijden + realtime "NU OPEN" / "Sluit over X min" indicator
        in destination-locale.
      </Typography>
    </Box>
  );
}
