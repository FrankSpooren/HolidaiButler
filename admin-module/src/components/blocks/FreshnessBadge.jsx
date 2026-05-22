import { useMemo } from 'react';
import { Chip, Tooltip } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';

/**
 * FreshnessBadge — toont mtime-leeftijd van blocks met dynamische data
 * (weather/events/opening-hours/poi-grid/featured-item).
 *
 * Kleuren per Frank's specs:
 *   - <24h:  groen (filled success)
 *   - <7d:   oranje (outlined warning)
 *   - >30d:  rood (filled error)
 *
 * @version BLOK F8 (22-05-2026)
 */

const DYNAMIC_BLOCK_TYPES = new Set([
  'weather_widget', 'event_calendar', 'event_calendar_filtered',
  'opening_hours', 'poi_grid', 'poi_grid_filtered',
  'featured_item', 'related_items', 'newsletter',
  'mobile_events', 'mobile_program', 'social_feed',
  'partners', 'testimonials',
]);

function formatRelative(ts) {
  if (!ts) return '—';
  const then = new Date(ts).getTime();
  if (!Number.isFinite(then)) return '—';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'nu net';
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'dag' : 'dagen'} geleden`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} ${weeks === 1 ? 'week' : 'weken'} geleden`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'maand' : 'maanden'} geleden`;
}

function classify(ts) {
  if (!ts) return { color: 'default', tone: 'unknown' };
  const ageMs = Date.now() - new Date(ts).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return { color: 'default', tone: 'unknown' };
  const days = ageMs / (24 * 3600 * 1000);
  if (days < 1) return { color: 'success', tone: 'fresh' };
  if (days < 7) return { color: 'warning', tone: 'aging' };
  if (days < 30) return { color: 'warning', tone: 'stale' };
  return { color: 'error', tone: 'outdated' };
}

export default function FreshnessBadge({ blockType, updatedAt }) {
  const isDynamic = DYNAMIC_BLOCK_TYPES.has(blockType);
  const { color, tone } = useMemo(() => classify(updatedAt), [updatedAt]);
  const label = useMemo(() => formatRelative(updatedAt), [updatedAt]);

  if (!isDynamic) return null;

  const tooltip = tone === 'unknown'
    ? 'Nog niet bewerkt sinds BLOK F8 introductie (page-level updated_at wordt fallback)'
    : tone === 'fresh' ? `Vers (${label}) — dynamische data recent ververst`
    : tone === 'aging' ? `Oud (${label}) — overweeg verversen van bron-data`
    : tone === 'stale' ? `Verouderd (${label}) — bron-data mogelijk niet meer accuraat`
    : `Sterk verouderd (${label}) — bron-data onbetrouwbaar`;

  return (
    <Tooltip title={tooltip} arrow>
      <Chip
        icon={<ScheduleIcon sx={{ fontSize: '0.85rem !important' }} />}
        label={label}
        size="small"
        color={color}
        variant={tone === 'fresh' ? 'filled' : 'outlined'}
        sx={{ height: 20, fontSize: '0.65rem', '& .MuiChip-icon': { ml: 0.5 } }}
      />
    </Tooltip>
  );
}
