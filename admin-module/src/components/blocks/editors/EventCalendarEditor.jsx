import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Chip, CircularProgress, Tooltip } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { TranslatableField, NumberField, SelectField, SwitchField, CategoryFilterField } from '../fields/index.js';
import { useDestination } from '../DestinationContext.jsx';
import apiClient from '../../../api/client.js';

const LAYOUT_OPTIONS = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
  { value: 'compact', label: 'Compact' }
];

function EventsPreview({ destinationId, limit, showPast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!destinationId) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get('/agenda/events-preview', { params: { destinationId, limit: Math.min(10, limit || 10), showPast: showPast ? '1' : '0' } })
      .then(r => { if (!cancelled) setData(r.data?.data || null); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [destinationId, limit, showPast]);

  if (!destinationId) return null;
  const brandKeywordsCount = data?.brand_keywords_count || 0;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600, color: 'text.secondary' }}>
        Live preview events {brandKeywordsCount > 0 ? `(brand-fit op ${brandKeywordsCount} brand keywords)` : ''}
      </Typography>
      {loading && <Box sx={{ py: 1, textAlign: 'center' }}><CircularProgress size={16} /></Box>}
      {!loading && data?.items && data.items.length === 0 && (
        <Typography variant="caption" color="text.secondary">Geen events gevonden voor deze destinatie.</Typography>
      )}
      {!loading && data?.items && data.items.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {data.items.slice(0, 5).map((ev) => {
            const fit = ev.brand_fit_score;
            const fitPct = (fit !== null && fit !== undefined) ? Math.round(fit * 100) : null;
            return (
              <Box key={ev.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.3 }}>
                <Typography variant="caption" sx={{ minWidth: 80, color: 'text.secondary' }}>
                  {new Date(ev.start_date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}
                </Typography>
                <Typography variant="caption" sx={{ flex: 1 }}>{ev.title}</Typography>
                {fitPct !== null && fitPct > 0 && (
                  <Tooltip title={`Brand-fit ${fitPct}% — overeenkomst met destination keywords`}>
                    <Chip
                      icon={fitPct >= 50 ? <VerifiedIcon sx={{ fontSize: '0.7rem !important' }} /> : null}
                      label={`${fitPct}%`}
                      size="small"
                      color={fitPct >= 50 ? 'success' : fitPct >= 25 ? 'primary' : 'default'}
                      variant="outlined"
                      sx={{ height: 18, fontSize: '0.6rem' }}
                    />
                  </Tooltip>
                )}
              </Box>
            );
          })}
          {data.items.length > 5 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              + {data.items.length - 5} meer events
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}

export default function EventCalendarEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });
  const { destinationId } = useDestination();

  return (
    <>
      <TranslatableField label="Title" value={props.title} onChange={v => update('title', v)} />
      <EventsPreview destinationId={destinationId} limit={props.limit} showPast={props.showPastEvents} />
      <NumberField label="Max Events" value={props.limit || 10} onChange={v => update('limit', v)} min={1} max={50} />
      <SelectField label="Layout" value={props.layout || 'list'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <SwitchField label="Show Past Events" value={props.showPastEvents} onChange={v => update('showPastEvents', v)} />
      <CategoryFilterField label="Category Filter" value={props.categoryFilter} onChange={v => update('categoryFilter', v)} />
    </>
  );
}
