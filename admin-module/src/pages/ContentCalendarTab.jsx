import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  Box, Typography, Paper, Grid, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, IconButton,
  Tooltip, Card, CardContent, CircularProgress, Alert, Badge, Snackbar,
  ToggleButtonGroup, ToggleButton, Checkbox, FormControlLabel, Skeleton,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PublishIcon from '@mui/icons-material/Publish';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageIcon from '@mui/icons-material/Language';
import TodayIcon from '@mui/icons-material/Today';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import {
  useContentCalendar, useScheduleItem, usePublishNow, useCancelSchedule,
  useRescheduleItem, useSocialAccounts,
} from '../hooks/useContent.js';
import contentService from '../api/contentService.js';
import client from '../api/client.js';

// ─── Constants ───────────────────────────────────────────────────
const PLATFORM_ICONS = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  website: LanguageIcon,
};

const STATUS_COLORS = {
  draft: '#9e9e9e',
  pending_review: '#ff9800',
  approved: '#4caf50',
  scheduled: '#2196f3',
  publishing: '#ff5722',
  published: '#388e3c',
  failed: '#d32f2f',
  rejected: '#f44336',
};

const WEEKDAYS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const WEEKDAYS_FULL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

const WORKLOAD_THRESHOLDS = { normal: 2, busy: 4 }; // <=2 groen, 3-4 oranje, >4 rood

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

// ─── Mini Calendar (sidebar) ──────────────────────────────────────
function MiniCalendar({ year, month, selectedDate, onSelectDate, onNavigateMonth, itemsByDay }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const now = new Date();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, month).toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' });
  const isToday = (d) => d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  const isSelected = (d) => {
    if (!selectedDate) return false;
    return d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  return (
    <Box sx={{ width: 220, flexShrink: 0, '@media print': { display: 'none' } }}>
      <Paper variant="outlined" sx={{ p: 1.5, position: 'sticky', top: 16 }}>
        {/* Nav header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <IconButton size="small" onClick={() => onNavigateMonth(-1)} aria-label="Vorige maand"><ChevronLeftIcon sx={{ fontSize: 18 }} /></IconButton>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 12, textTransform: 'capitalize' }}>{monthLabel}</Typography>
          <IconButton size="small" onClick={() => onNavigateMonth(1)} aria-label="Volgende maand"><ChevronRightIcon sx={{ fontSize: 18 }} /></IconButton>
        </Box>
        {/* Weekday headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', mb: 0.5 }}>
          {WEEKDAYS_SHORT.map(wd => (
            <Typography key={wd} variant="caption" sx={{ fontSize: 10, fontWeight: 600, textAlign: 'center', color: 'text.secondary' }}>{wd}</Typography>
          ))}
        </Box>
        {/* Day grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
          {cells.map((day, idx) => {
            const hasItems = day && itemsByDay[day] && itemsByDay[day].length > 0;
            return (
              <Box
                key={idx}
                onClick={() => day && onSelectDate(new Date(year, month, day))}
                sx={{
                  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', cursor: day ? 'pointer' : 'default', position: 'relative',
                  fontSize: 11, fontWeight: isToday(day) ? 700 : 400,
                  bgcolor: isSelected(day) ? '#02C39A' : isToday(day) ? '#1976d2' : 'transparent',
                  color: (isSelected(day) || isToday(day)) ? '#fff' : day ? 'text.primary' : 'transparent',
                  '&:hover': day ? { bgcolor: isSelected(day) ? '#02C39A' : 'action.hover' } : {},
                  transition: 'background-color 150ms',
                }}
              >
                {day || ''}
                {hasItems && !isSelected(day) && !isToday(day) && (
                  <Box sx={{ position: 'absolute', bottom: 1, width: 4, height: 4, borderRadius: '50%', bgcolor: '#02C39A' }} />
                )}
              </Box>
            );
          })}
        </Box>
        {/* Quick jump to today */}
        <Button
          size="small" fullWidth startIcon={<TodayIcon sx={{ fontSize: 14 }} />}
          onClick={() => onSelectDate(new Date())}
          sx={{ mt: 1.5, textTransform: 'none', fontSize: 11 }}
        >
          Vandaag
        </Button>
      </Paper>
    </Box>
  );
}

// ─── Workload Bar ─────────────────────────────────────────────────
function WorkloadBar({ count }) {
  const color = count <= WORKLOAD_THRESHOLDS.normal ? '#27AE60'
    : count <= WORKLOAD_THRESHOLDS.busy ? '#F2C94C'
    : '#E74C3C';
  const width = Math.min(count * 20, 100);
  return (
    <Tooltip title={`${count} items`}>
      <Box sx={{ height: 3, width: '100%', bgcolor: 'action.hover', borderRadius: 1, mt: 0.3 }}>
        <Box sx={{ height: '100%', width: `${width}%`, bgcolor: color, borderRadius: 1, transition: 'width 300ms ease' }} />
      </Box>
    </Tooltip>
  );
}

// ─── Draggable Calendar Item ──────────────────────────────────────
function DraggableCalendarItem({ item }) {
  const isDraggable = !['published', 'rejected', 'failed'].includes(item.approval_status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(item.id),
    disabled: !isDraggable,
  });
  const PlatformIcon = PLATFORM_ICONS[item.target_platform] || LanguageIcon;
  const statusColor = STATUS_COLORS[item.approval_status] || '#ccc';
  const pillarColor = item.pillar_color || statusColor;
  const sourceEmoji = item.content_source_type === 'poi' ? '\u{1F4CD}' : item.content_source_type === 'event' ? '\u{1F4C5}' : item.content_source_type === 'visual' ? '\u{1F4F7}' : item.content_source_type === 'holibot' ? '\u{1F4AC}' : '';

  return (
    <Tooltip title={`${item.title || item.content_type}${item.pillar_name ? ' \u00B7 ' + item.pillar_name : ''} \u00B7 ${item.approval_status}${isDraggable ? ' \u00B7 sleep om te verplaatsen' : ''}`}>
      <Box
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.3, mb: 0.3,
          border: `1px solid ${pillarColor}40`,
          borderLeft: `4px solid ${pillarColor}`,
          borderRight: `3px solid ${statusColor}`,
          bgcolor: `${pillarColor}15`,
          pl: 0.5, borderRadius: 0.5,
          fontSize: 10, lineHeight: 1.2, py: 0.2,
          cursor: isDraggable ? 'grab' : 'default',
          opacity: isDragging ? 0.4 : 1,
          touchAction: isDraggable ? 'none' : undefined,
          transition: 'transform 150ms ease, box-shadow 150ms ease',
          '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' },
          '&:active': isDraggable ? { cursor: 'grabbing' } : {},
        }}
      >
        <PlatformIcon sx={{ fontSize: 12, color: pillarColor }} />
        <Typography variant="caption" noWrap sx={{ fontSize: 10, flex: 1, fontWeight: 500 }}>
          {sourceEmoji}{sourceEmoji ? ' ' : ''}{item.title || item.content_type}
        </Typography>
      </Box>
    </Tooltip>
  );
}

// ─── Droppable Day Cell ───────────────────────────────────────────
function DroppableDayCell({ day, isToday, isInSeason, isGap, onClick, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: day ? `day-${day}` : `empty-${Math.random()}`, disabled: !day });
  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      onClick={onClick}
      sx={{
        minHeight: 90, p: 0.5,
        bgcolor: day === null ? 'action.disabledBackground' :
          isOver ? '#FFF3E0' :
          isToday ? '#E3F2FD' :
          isInSeason ? '#F1F8E9' : 'background.paper',
        border: isOver ? '2px solid' : isToday ? '2px solid' : isGap ? '2px dashed' : '1px solid',
        borderColor: isOver ? '#FF9800' : isToday ? 'primary.main' : isGap ? '#FF9800' : 'divider',
        cursor: day ? 'pointer' : 'default',
        position: 'relative',
        transition: 'background-color 150ms, border-color 150ms, box-shadow 150ms',
        boxShadow: isOver ? '0 0 8px rgba(255,152,0,0.3)' : 'none',
        '&:hover': day ? { bgcolor: isOver ? '#FFF3E0' : 'action.hover' } : {},
      }}
    >
      {children}
    </Paper>
  );
}

// ─── Schedule Dialog ──────────────────────────────────────────────
function ScheduleDialog({ open, item, accounts, onClose, onSchedule, onReschedule, isPending }) {
  const { t } = useTranslation();
  const isReschedule = item?.approval_status === 'scheduled';
  const [dateTime, setDateTime] = useState('');
  const [accountId, setAccountId] = useState('');

  // Pre-fill datetime when opening for reschedule
  // scheduled_at is a raw MySQL string like "2026-04-27 10:35:00" (no timezone)
  useEffect(() => {
    if (open && item?.scheduled_at) {
      const raw = String(item.scheduled_at);
      // Handle both "2026-04-27 10:35:00" and "2026-04-27T10:35:00.000Z" formats
      const local = raw.includes('T') && raw.endsWith('Z')
        ? raw.slice(0, 16) // ISO UTC — strip Z, keep as-is (matches what MySQL stored)
        : raw.replace(' ', 'T').slice(0, 16); // MySQL string — just reformat
      setDateTime(local);
    } else if (open) {
      setDateTime('');
    }
  }, [open, item?.scheduled_at]);

  const handleSubmit = () => {
    if (!dateTime) return;
    if (isReschedule && onReschedule) {
      onReschedule(item.id, dateTime);
    } else {
      onSchedule(item?.id, dateTime, accountId || undefined);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isReschedule ? 'Tijd wijzigen' : t('contentStudio.calendar.scheduleTitle', 'Content inplannen')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">{item?.title || item?.content_type}</Typography>
        {isReschedule && (
          <Alert severity="info" sx={{ py: 0.5, fontSize: 12 }}>
            Huidig gepland: {item?.scheduled_at ? new Date(item.scheduled_at).toLocaleString('nl-NL') : '—'}
          </Alert>
        )}
        <TextField
          type="datetime-local" label={isReschedule ? 'Nieuwe datum & tijd' : t('contentStudio.calendar.dateTime', 'Datum & tijd')}
          value={dateTime} onChange={e => setDateTime(e.target.value)}
          InputLabelProps={{ shrink: true }} fullWidth
        />
        {!isReschedule && accounts.length > 0 && (
          <FormControl fullWidth size="small">
            <InputLabel>{t('contentStudio.calendar.account', 'Account')}</InputLabel>
            <Select value={accountId} onChange={e => setAccountId(e.target.value)} label="Account">
              {accounts.map(acc => (
                <MenuItem key={acc.id} value={acc.id}>{acc.account_name || acc.platform}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Annuleren')}</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!dateTime || isPending}>
          {isPending ? <CircularProgress size={20} /> : isReschedule ? 'Herplannen' : t('contentStudio.calendar.schedule', 'Inplannen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────
function FilterPanel({ filters, onFilterChange, platforms, pillars, t }) {
  const statusOptions = ['draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed'];

  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, '@media print': { display: 'none' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <FilterListIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: 'text.secondary' }}>
          {t('contentStudio.calendar.filters', 'Filters')}
        </Typography>
      </Box>

      {/* Platform filter */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>Platform</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {platforms.map(p => {
            const PIcon = PLATFORM_ICONS[p] || LanguageIcon;
            const active = !filters.platform || filters.platform === p;
            return (
              <Chip
                key={p} size="small" icon={<PIcon sx={{ fontSize: 14 }} />}
                label={p} sx={{ fontSize: 10, height: 22, opacity: active ? 1 : 0.4, cursor: 'pointer' }}
                onClick={() => onFilterChange('platform', filters.platform === p ? null : p)}
                variant={filters.platform === p ? 'filled' : 'outlined'}
                color={filters.platform === p ? 'primary' : 'default'}
              />
            );
          })}
        </Box>
      </Box>

      {/* Pillar filter */}
      {pillars.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>Pillar</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {pillars.map(p => {
              const active = !filters.pillar || filters.pillar === p.name;
              return (
                <Chip
                  key={p.id} size="small"
                  label={p.name}
                  sx={{ fontSize: 10, height: 22, opacity: active ? 1 : 0.4, cursor: 'pointer',
                    borderColor: p.color || undefined, color: filters.pillar === p.name ? '#fff' : undefined,
                    bgcolor: filters.pillar === p.name ? (p.color || 'primary.main') : undefined }}
                  onClick={() => onFilterChange('pillar', filters.pillar === p.name ? null : p.name)}
                  variant={filters.pillar === p.name ? 'filled' : 'outlined'}
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* Status filter */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>Status</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {statusOptions.map(s => {
            const active = !filters.status || filters.status === s;
            return (
              <Chip
                key={s} size="small" label={s.replace('_', ' ')}
                sx={{ fontSize: 10, height: 22, opacity: active ? 1 : 0.4, cursor: 'pointer',
                  bgcolor: filters.status === s ? STATUS_COLORS[s] : undefined,
                  color: filters.status === s ? '#fff' : undefined }}
                onClick={() => onFilterChange('status', filters.status === s ? null : s)}
                variant={filters.status === s ? 'filled' : 'outlined'}
              />
            );
          })}
        </Box>
      </Box>

      {/* Clear all */}
      {(filters.platform || filters.pillar || filters.status) && (
        <Button size="small" onClick={() => { onFilterChange('platform', null); onFilterChange('pillar', null); onFilterChange('status', null); }}
          sx={{ textTransform: 'none', fontSize: 11, alignSelf: 'flex-start' }}>
          {t('contentStudio.calendar.clearFilters', 'Filters wissen')}
        </Button>
      )}
    </Paper>
  );
}

// ─── Export helpers ────────────────────────────────────────────────
function exportCalendarCSV(items, monthName) {
  const BOM = '\uFEFF';
  const header = 'Datum;Tijd;Titel;Platform;Pillar;Status\n';
  const rows = items.map(it => {
    const d = new Date(it.scheduled_at || it.published_at || it.created_at);
    return [
      d.toLocaleDateString('nl-NL'), d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      `"${(it.title || it.content_type || '').replace(/"/g, '""')}"`,
      it.target_platform || '', it.pillar_name || '', it.approval_status || '',
    ].join(';');
  }).join('\n');
  const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `content-kalender-${monthName.replace(/\s/g, '-')}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}

function exportCalendarICS(items, monthName) {
  const esc = (s) => (s || '').replace(/[,;\\]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
  const pad = (n) => String(n).padStart(2, '0');
  const toICS = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const now = toICS(new Date());
  let cal = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//PubliQio//ContentCalendar//NL\r\nCALSCALE:GREGORIAN\r\n';
  for (const it of items) {
    const d = new Date(it.scheduled_at || it.published_at || it.created_at);
    const end = new Date(d.getTime() + 30 * 60000);
    cal += `BEGIN:VEVENT\r\nDTSTAMP:${now}\r\nDTSTART:${toICS(d)}\r\nDTEND:${toICS(end)}\r\nSUMMARY:${esc(it.title || it.content_type)}\r\nDESCRIPTION:${esc(`Platform: ${it.target_platform || '-'}\\nStatus: ${it.approval_status || '-'}\\nPillar: ${it.pillar_name || '-'}`)}\r\nUID:publiqio-${it.id}@holidaibutler.com\r\nEND:VEVENT\r\n`;
  }
  cal += 'END:VCALENDAR\r\n';
  const blob = new Blob([cal], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `content-kalender-${monthName.replace(/\s/g, '-')}.ics`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}

// ─── Print Stylesheet (injected once) ─────────────────────────────
let printStyleInjected = false;
function injectPrintStyles() {
  if (printStyleInjected) return;
  const style = document.createElement('style');
  style.setAttribute('data-print-calendar', 'true');
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      [data-print-calendar-area], [data-print-calendar-area] * { visibility: visible !important; }
      [data-print-calendar-area] { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
      .MuiDrawer-root, .MuiAppBar-root, [class*="Sidebar"], nav { display: none !important; }
      @page { size: landscape; margin: 1cm; }
    }
  `;
  document.head.appendChild(style);
  printStyleInjected = true;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function ContentCalendarTab({ destinationId, onEditConcept }) {
  const { t } = useTranslation();
  const now = new Date();
  const containerRef = useRef(null);

  // ── State ──
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [calendarView, setCalendarView] = useState(() => {
    const stored = localStorage.getItem('publiqio_calendar_view');
    return stored === 'day' || stored === 'week' || stored === 'month' ? stored : 'month';
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [scheduleDialog, setScheduleDialog] = useState(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [autoFillSnack, setAutoFillSnack] = useState(null);
  const [undoData, setUndoData] = useState(null);
  const [draggingItem, setDraggingItem] = useState(null);
  const [showFilters, setShowFilters] = useState(() => localStorage.getItem('publiqio_calendar_filters') === 'true');
  const [filters, setFilters] = useState({ platform: null, pillar: null, status: null });
  const [pillars, setPillars] = useState([]);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Data ──
  const { data: calendarData, isLoading, refetch } = useContentCalendar(destinationId, { month: month + 1, year });
  const { data: accountsData } = useSocialAccounts(destinationId);
  const scheduleMut = useScheduleItem();
  const publishMut = usePublishNow();
  const cancelMut = useCancelSchedule();
  const rescheduleMut = useRescheduleItem();

  // Fetch pillars for filter
  useEffect(() => {
    if (!destinationId) return;
    contentService.getPillars(destinationId).then(res => {
      setPillars(res?.data || []);
    }).catch(() => {});
  }, [destinationId]);

  // Inject print styles once
  useEffect(() => { injectPrintStyles(); }, []);

  const items = calendarData?.data?.items || [];
  const seasons = calendarData?.data?.seasons || [];
  const accounts = accountsData?.data || [];

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (filters.platform && it.target_platform !== filters.platform) return false;
      if (filters.pillar && it.pillar_name !== filters.pillar) return false;
      if (filters.status && it.approval_status !== filters.status) return false;
      return true;
    });
  }, [items, filters]);

  // Unique platforms in data
  const activePlatforms = useMemo(() => [...new Set(items.map(i => i.target_platform).filter(Boolean))], [items]);

  // Build itemsByDay
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const itemsByDay = useMemo(() => {
    const map = {};
    for (const item of filteredItems) {
      const date = item.scheduled_at || item.published_at || item.created_at;
      if (!date) continue;
      const d = new Date(date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(item);
      }
    }
    return map;
  }, [filteredItems, year, month]);

  // All items by day (unfiltered, for mini calendar dots)
  const allItemsByDay = useMemo(() => {
    const map = {};
    for (const item of items) {
      const date = item.scheduled_at || item.published_at || item.created_at;
      if (!date) continue;
      const d = new Date(date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(item);
      }
    }
    return map;
  }, [items, year, month]);

  const activeSeason = useMemo(() => {
    if (!seasons.length) return null;
    return seasons.find(s => {
      const start = new Date(s.start_date);
      const end = new Date(s.end_date);
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month, daysInMonth);
      return start <= monthEnd && end >= monthStart;
    });
  }, [seasons, year, month, daysInMonth]);

  const monthName = new Date(year, month).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  // Gap count
  const gapCount = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const weekday = date.getDay();
      const isWeekday = weekday !== 0 && weekday !== 6;
      const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (isWeekday && !isPast && (!itemsByDay[d] || itemsByDay[d].length === 0)) count++;
    }
    return count;
  }, [daysInMonth, year, month, itemsByDay, now]);

  // ── Navigation ──
  const navigateMonth = useCallback((delta) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setMonth(newMonth);
    setYear(newYear);
  }, [month, year]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(today);
  }, []);

  const handleSelectDate = useCallback((date) => {
    setSelectedDate(date);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    if (calendarView === 'day') {
      // stay in day view, update date
    } else if (calendarView === 'month') {
      setSelectedDay(date.getDate());
    }
  }, [calendarView]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      // Skip if inside input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      switch (e.key) {
        case 't':
          e.preventDefault();
          goToToday();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (calendarView === 'day') setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
          else if (calendarView === 'week') setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
          else navigateMonth(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (calendarView === 'day') setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
          else if (calendarView === 'week') setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
          else navigateMonth(1);
          break;
        case '1':
          e.preventDefault();
          setCalendarView('day'); localStorage.setItem('publiqio_calendar_view', 'day');
          break;
        case '2':
          e.preventDefault();
          setCalendarView('week'); localStorage.setItem('publiqio_calendar_view', 'week');
          break;
        case '3':
          e.preventDefault();
          setCalendarView('month'); localStorage.setItem('publiqio_calendar_view', 'month');
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsHelp(prev => !prev);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [calendarView, navigateMonth, goToToday]);

  // ── Filter toggle persistence ──
  const handleToggleFilters = useCallback(() => {
    setShowFilters(prev => {
      const next = !prev;
      localStorage.setItem('publiqio_calendar_filters', String(next));
      return next;
    });
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // ── Auto actions ──
  const handleAutoSchedule = async () => {
    setAutoScheduling(true);
    try {
      const { data } = await client.post('/content/auto-schedule', { destination_id: destinationId });
      const scheduled = data.data?.scheduled || 0;
      const ids = (data.data?.items || []).map(s => s.id).filter(Boolean);
      setAutoFillSnack(`${scheduled} items automatisch ingepland`);
      if (ids.length > 0) setUndoData({ type: 'autoschedule', ids });
      refetch();
    } catch (err) {
      setAutoFillSnack(err.response?.data?.error?.message || 'Auto-schedule mislukt');
    } finally { setAutoScheduling(false); }
  };

  const handleAutoFill = async () => {
    setAutoFilling(true);
    try {
      const { data } = await client.post('/content/calendar/auto-fill', {
        destination_id: destinationId, month: month + 1, year
      }, { timeout: 120000 });
      const generated = data.data?.generated || 0;
      const ids = (data.data?.suggestions || []).map(s => s.concept_id).filter(Boolean);
      setAutoFillSnack(`${generated} items gegenereerd voor ${monthName}`);
      if (ids.length > 0) setUndoData({ type: 'autofill', ids });
      refetch();
    } catch (err) {
      setAutoFillSnack(err.response?.data?.error?.message || 'Auto-fill mislukt');
    } finally { setAutoFilling(false); }
  };

  // ── DnD handlers ──
  const handleDragStart = (event) => {
    const id = Number(event.active.id);
    setDraggingItem(filteredItems.find(i => i.id === id) || null);
  };

  const handleDragEnd = async (event) => {
    setDraggingItem(null);
    const { active, over } = event;
    if (!over) { setAutoFillSnack('Sleep het item op een dag-vakje'); return; }
    const itemId = Number(active.id);
    const targetDay = Number(String(over.id).replace('day-', ''));
    if (!targetDay) { setAutoFillSnack(`Onbekend drop-target: ${over.id}`); return; }
    const item = filteredItems.find(i => i.id === itemId);
    if (!item) { setAutoFillSnack(`Item ${itemId} niet gevonden`); return; }
    if (['published', 'rejected', 'failed'].includes(item.approval_status)) {
      setAutoFillSnack(`"${item.title || item.content_type}" kan niet verplaatst worden (${item.approval_status})`);
      return;
    }
    const oldDate = item.scheduled_at ? new Date(item.scheduled_at) : new Date(year, month, targetDay, 9, 0, 0);
    const newDate = new Date(year, month, targetDay, oldDate.getHours() || 9, oldDate.getMinutes() || 0, 0);
    const oldKey = item.scheduled_at ? `${oldDate.getFullYear()}-${oldDate.getMonth()}-${oldDate.getDate()}` : null;
    const newKey = `${newDate.getFullYear()}-${newDate.getMonth()}-${newDate.getDate()}`;
    if (oldKey === newKey) { setAutoFillSnack('Item staat al op deze dag'); return; }
    try {
      await rescheduleMut.mutateAsync({ id: itemId, data: { scheduled_at: newDate.toISOString() } });
      setAutoFillSnack(`Verplaatst naar ${newDate.toLocaleDateString('nl-NL')}`);
      await refetch();
    } catch (err) {
      setAutoFillSnack(`Verplaatsen mislukt: ${err.response?.data?.error?.message || err.message || 'onbekende fout'}`);
    }
  };

  const handleSchedule = async (itemId, scheduledAt, socialAccountId) => {
    await scheduleMut.mutateAsync({ id: itemId, data: { scheduled_at: scheduledAt, social_account_id: socialAccountId } });
    setScheduleDialog(null);
  };

  const handleReschedule = async (itemId, newScheduledAt) => {
    try {
      await rescheduleMut.mutateAsync({ id: itemId, data: { scheduled_at: newScheduledAt } });
      setScheduleDialog(null);
      await refetch();
    } catch (err) {
      setAutoFillSnack(`Herplannen mislukt: ${err.response?.data?.error?.message || err.message || 'onbekende fout'}`);
    }
  };

  const handlePublishNow = async (itemId, socialAccountId) => {
    await publishMut.mutateAsync({ id: itemId, data: { social_account_id: socialAccountId } });
  };

  const handleCancel = async (itemId) => {
    await cancelMut.mutateAsync(itemId);
  };

  // ── Calendar grid cells ──
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isTodayFn = (day) => day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  const isInSeason = (day) => {
    if (!activeSeason) return false;
    const date = new Date(year, month, day);
    return date >= new Date(activeSeason.start_date) && date <= new Date(activeSeason.end_date);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <Box ref={containerRef}>
      {/* Hero Auto-Fill bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2, mb: 2,
          background: 'linear-gradient(135deg, #5E8B7E 0%, #2C3E50 100%)',
          color: '#fff', borderRadius: 2,
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          '@media print': { display: 'none' },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25, color: '#fff' }}>
            {t('contentStudio.calendar.heroTitle', 'Vul je contentkalender met AI')}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, color: '#fff' }}>
            {gapCount > 0
              ? t('contentStudio.calendar.heroSubtitleGaps', '{{count}} werkdagen zonder geplande content in {{month}}.', { count: gapCount, month: monthName })
              : t('contentStudio.calendar.heroSubtitle', 'Laat AI content genereren voor {{month}}.', { month: monthName })}
          </Typography>
        </Box>
        <Tooltip title={t('contentStudio.calendar.autoFillTooltip', 'AI genereert draft content items voor de komende 4 weken.')} arrow>
          <span>
            <Button variant="contained" size="large"
              startIcon={autoFilling ? <CircularProgress size={18} sx={{ color: '#5E8B7E' }} /> : <AutoAwesomeIcon />}
              onClick={handleAutoFill} disabled={autoFilling}
              sx={{ bgcolor: '#fff', color: '#2C3E50', fontWeight: 700, px: 3, '&:hover': { bgcolor: '#f0f0f0' }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.5)' } }}>
              {autoFilling ? t('contentStudio.calendar.filling', 'Genereren...') : t('contentStudio.calendar.autoFill', 'Vul kalender met AI')}
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={t('contentStudio.calendar.autoScheduleTooltip', 'Plant goedgekeurde items in op optimale tijdstippen.')} arrow>
          <span>
            <Button variant="outlined" size="large"
              startIcon={autoScheduling ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <ScheduleIcon />}
              onClick={handleAutoSchedule} disabled={autoScheduling}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#fff' } }}>
              {autoScheduling ? 'Plannen...' : t('contentStudio.calendar.autoSchedule', 'Auto-inplannen')}
            </Button>
          </span>
        </Tooltip>
      </Paper>

      {/* Toolbar: navigation + view toggle + actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1, '@media print': { display: 'none' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Navigation arrows */}
          {calendarView === 'month' ? (
            <>
              <IconButton onClick={() => navigateMonth(-1)} size="small" aria-label="Vorige maand"><ChevronLeftIcon /></IconButton>
              <Typography variant="h6" sx={{ textTransform: 'capitalize', minWidth: 180, textAlign: 'center' }}>{monthName}</Typography>
              <IconButton onClick={() => navigateMonth(1)} size="small" aria-label="Volgende maand"><ChevronRightIcon /></IconButton>
            </>
          ) : calendarView === 'week' ? (
            <>
              <IconButton onClick={() => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })} size="small" aria-label="Vorige week"><ChevronLeftIcon /></IconButton>
              <Typography variant="h6" sx={{ minWidth: 240, textAlign: 'center' }}>
                {(() => { const s = new Date(selectedDate); s.setDate(s.getDate() - s.getDay() + 1); const e = new Date(s); e.setDate(e.getDate() + 6); return s.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) + ' \u2013 ' + e.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }); })()}
              </Typography>
              <IconButton onClick={() => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })} size="small" aria-label="Volgende week"><ChevronRightIcon /></IconButton>
            </>
          ) : (
            <>
              <IconButton onClick={() => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })} size="small" aria-label="Vorige dag"><ChevronLeftIcon /></IconButton>
              <Typography variant="h6" sx={{ minWidth: 180, textAlign: 'center' }}>
                {selectedDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Typography>
              <IconButton onClick={() => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })} size="small" aria-label="Volgende dag"><ChevronRightIcon /></IconButton>
            </>
          )}
          {/* Today button */}
          <Button size="small" variant="outlined" startIcon={<TodayIcon sx={{ fontSize: 16 }} />}
            onClick={goToToday} sx={{ textTransform: 'none', fontSize: 12, ml: 1 }}>
            Vandaag
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {activeSeason && (
            <Chip label={`${t('contentStudio.calendar.season', 'Seizoen')}: ${activeSeason.season_name}`} color="primary" variant="outlined" size="small" />
          )}

          {/* Filters toggle */}
          <Tooltip title={t('contentStudio.calendar.toggleFilters', 'Filters tonen/verbergen')}>
            <IconButton size="small" onClick={handleToggleFilters}
              sx={{ color: showFilters ? '#02C39A' : 'text.secondary' }}>
              <FilterListIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          {/* Export */}
          <Tooltip title="CSV export">
            <IconButton size="small" onClick={() => exportCalendarCSV(filteredItems, monthName)}>
              <DownloadIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="ICS export (Outlook/Google Calendar)">
            <IconButton size="small" onClick={() => exportCalendarICS(filteredItems, monthName)}>
              <ScheduleIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          {/* Print */}
          <Tooltip title={`${t('contentStudio.calendar.print', 'Afdrukken')} (Ctrl+P)`}>
            <IconButton size="small" onClick={() => window.print()}>
              <PrintIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          {/* Keyboard help */}
          <Tooltip title="Keyboard shortcuts (?)">
            <IconButton size="small" onClick={() => setShowShortcutsHelp(true)}>
              <KeyboardIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          {/* View toggle */}
          <ToggleButtonGroup size="small" value={calendarView} exclusive
            onChange={(_, v) => { if (v) { setCalendarView(v); localStorage.setItem('publiqio_calendar_view', v); } }}>
            <ToggleButton value="day" sx={{ textTransform: 'none', fontSize: 12 }}>Dag</ToggleButton>
            <ToggleButton value="week" sx={{ textTransform: 'none', fontSize: 12 }}>Week</ToggleButton>
            <ToggleButton value="month" sx={{ textTransform: 'none', fontSize: 12 }}>Maand</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={!!autoFillSnack} autoHideDuration={undoData ? 15000 : 5000}
        onClose={() => { setAutoFillSnack(null); setUndoData(null); }}
        message={autoFillSnack}
        action={undoData ? (
          <Button color="warning" size="small" variant="outlined"
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', fontWeight: 700 }}
            onClick={async () => {
              try {
                if (undoData.type === 'autofill') {
                  for (const cid of undoData.ids) { await client.delete(`/content/concepts/${cid}`); }
                  setAutoFillSnack(`${undoData.ids.length} items ongedaan gemaakt`);
                } else if (undoData.type === 'autoschedule') {
                  for (const id of undoData.ids) { await client.delete(`/content/items/${id}/schedule`); }
                  setAutoFillSnack(`${undoData.ids.length} items teruggezet naar Approved`);
                }
                setUndoData(null); refetch();
              } catch (err) { setAutoFillSnack(`Ongedaan maken mislukt: ${err.message}`); setUndoData(null); }
            }}>
            {t('contentStudio.calendar.undo', 'Ongedaan maken')}
          </Button>
        ) : null}
      />

      {/* Main layout: mini-calendar + filters (left) | calendar grid (right) */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Left sidebar: mini calendar + filters */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <MiniCalendar
            year={year} month={month} selectedDate={selectedDate}
            onSelectDate={handleSelectDate} onNavigateMonth={navigateMonth}
            itemsByDay={allItemsByDay}
          />
          {showFilters && (
            <FilterPanel
              filters={filters} onFilterChange={handleFilterChange}
              platforms={activePlatforms} pillars={pillars} t={t}
            />
          )}
        </Box>

        {/* Calendar content area */}
        <Box sx={{ flex: 1, minWidth: 0 }} data-print-calendar-area>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <>
              {/* ── DAY VIEW ── */}
              {calendarView === 'day' && (() => {
                const dayKey = selectedDate.getDate();
                const dayMonth = selectedDate.getMonth();
                const dayYear = selectedDate.getFullYear();
                const dayItems = filteredItems.filter(i => {
                  const d = new Date(i.scheduled_at || i.published_at || i.created_at);
                  return d.getDate() === dayKey && d.getMonth() === dayMonth && d.getFullYear() === dayYear;
                });
                const platformGroups = {};
                dayItems.forEach(i => {
                  const p = i.target_platform || 'other';
                  if (!platformGroups[p]) platformGroups[p] = [];
                  platformGroups[p].push(i);
                });
                return (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                    {dayItems.length === 0 ? (
                      <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center', fontStyle: 'italic' }}>
                        Geen content gepland voor deze dag.
                      </Typography>
                    ) : (
                      Object.entries(platformGroups).map(([platform, pItems]) => (
                        <Box key={platform} sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: platform === 'facebook' ? '#1877F2' : platform === 'instagram' ? '#E4405F' : platform === 'linkedin' ? '#0A66C2' : '#5E8B7E' }} />
                            {platform} ({pItems.length})
                          </Typography>
                          {pItems.map(item => (
                            <Box key={item.id} onClick={() => onEditConcept && onEditConcept(item.concept_id, item.target_platform)}
                              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1, borderRadius: 1,
                                borderLeft: '4px solid', borderLeftColor: item.pillar_color || '#5E8B7E',
                                border: '1px solid', borderColor: 'divider', cursor: 'pointer',
                                transition: 'transform 150ms ease, box-shadow 150ms ease',
                                '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-1px)', boxShadow: 1 }, minHeight: 48 }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.title || item.content_type}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.approval_status}{item.scheduled_at ? ' \u2022 ' + new Date(item.scheduled_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </Typography>
                              </Box>
                              {item.seo_score && (
                                <Chip label={item.seo_score} size="small" color={item.seo_score >= 70 ? 'success' : 'warning'} sx={{ fontSize: 11, height: 20 }} />
                              )}
                            </Box>
                          ))}
                        </Box>
                      ))
                    )}
                  </Paper>
                );
              })()}

              {/* ── WEEK VIEW ── */}
              {calendarView === 'week' && (() => {
                const weekStart = new Date(selectedDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
                const weekDays = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + i);
                  return d;
                });
                const today = new Date();
                return (
                  <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(140px, 1fr))', gap: '1px', bgcolor: 'divider', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
                      {weekDays.map((day, idx) => {
                        const dayNum = day.getDate();
                        const isTodayW = day.toDateString() === today.toDateString();
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const dayItems = filteredItems.filter(i => {
                          const d = new Date(i.scheduled_at || i.published_at || i.created_at);
                          return d.getDate() === dayNum && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
                        });
                        return (
                          <DroppableDayCell key={day.toISOString()} day={dayNum} isToday={isTodayW} isInSeason={false} isGap={false}
                            onClick={() => { setMonth(day.getMonth()); setYear(day.getFullYear()); setSelectedDay(dayNum); }}>
                            <Box sx={{ p: 1, minHeight: 320, bgcolor: isTodayW ? 'primary.50' : isWeekend ? 'action.hover' : 'background.paper' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: isTodayW ? 700 : 500, color: isTodayW ? 'primary.main' : isWeekend ? 'text.secondary' : 'text.primary', fontSize: 12 }}>
                                  {WEEKDAYS_FULL[idx]}
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: isTodayW ? 700 : 400, color: isTodayW ? 'primary.main' : 'text.secondary', fontSize: 16 }}>
                                  {dayNum}
                                </Typography>
                              </Box>
                              <WorkloadBar count={dayItems.length} />
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                                {dayItems.length === 0 && (
                                  <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', py: 2, textAlign: 'center' }}>Geen items</Typography>
                                )}
                                {dayItems.map(item => <DraggableCalendarItem key={item.id} item={item} />)}
                              </Box>
                            </Box>
                          </DroppableDayCell>
                        );
                      })}
                    </Box>
                    <DragOverlay>
                      {draggingItem && (
                        <Paper elevation={4} sx={{ p: 1, maxWidth: 200, opacity: 0.9, border: '2px solid #02C39A' }}>
                          <Typography variant="caption" sx={{ fontWeight: 500, fontSize: 11 }}>{draggingItem.title || draggingItem.content_type}</Typography>
                        </Paper>
                      )}
                    </DragOverlay>
                  </DndContext>
                );
              })()}

              {/* ── MONTH VIEW ── */}
              {calendarView === 'month' && (
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  {/* Weekday headers */}
                  <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
                    {WEEKDAYS_SHORT.map(wd => (
                      <Grid item xs={12 / 7} key={wd}>
                        <Typography variant="caption" fontWeight={600} textAlign="center" display="block" color="text.secondary">{wd}</Typography>
                      </Grid>
                    ))}
                  </Grid>

                  <Grid container spacing={0.5}>
                    {cells.map((day, idx) => {
                      const isGap = (() => {
                        if (day === null) return false;
                        const date = new Date(year, month, day);
                        const weekday = date.getDay();
                        const isWeekday = weekday !== 0 && weekday !== 6;
                        const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        return isWeekday && !isPast && (!itemsByDay[day] || itemsByDay[day].length === 0);
                      })();
                      return (
                        <Grid item xs={12 / 7} key={idx}>
                          <DroppableDayCell day={day} isToday={day && isTodayFn(day)} isInSeason={day && isInSeason(day)} isGap={isGap}
                            onClick={() => day && setSelectedDay(day)}>
                            {day && (
                              <>
                                {isTodayFn(day) && (
                                  <Box sx={{ position: 'absolute', top: 2, right: 4 }}>
                                    <Chip label="Vandaag" size="small" color="primary" sx={{ height: 16, fontSize: 9, fontWeight: 700 }} />
                                  </Box>
                                )}
                                <Typography variant="caption" sx={{
                                  fontWeight: isTodayFn(day) ? 700 : 400,
                                  bgcolor: isTodayFn(day) ? '#1976d2' : 'transparent',
                                  color: isTodayFn(day) ? '#fff' : 'text.secondary',
                                  borderRadius: isTodayFn(day) ? '50%' : 0,
                                  width: isTodayFn(day) ? 22 : 'auto', height: isTodayFn(day) ? 22 : 'auto',
                                  display: isTodayFn(day) ? 'inline-flex' : 'inline',
                                  alignItems: 'center', justifyContent: 'center', fontSize: 11,
                                }}>{day}</Typography>

                                {/* Workload bar */}
                                {(itemsByDay[day] || []).length > 0 && <WorkloadBar count={(itemsByDay[day] || []).length} />}

                                <Box sx={{ mt: 0.3 }}>
                                  {(itemsByDay[day] || []).slice(0, 3).map(item => <DraggableCalendarItem key={item.id} item={item} />)}
                                  {(itemsByDay[day] || []).length > 3 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>+{(itemsByDay[day] || []).length - 3} {t('contentStudio.calendar.more', 'meer')}</Typography>
                                  )}
                                  {isGap && (
                                    <Typography variant="caption" sx={{
                                      fontSize: 9, color: '#FF9800', fontStyle: 'italic', fontWeight: 600, display: 'block',
                                      animation: 'hbGapPulse 2s ease-in-out infinite',
                                      '@keyframes hbGapPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                                      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                                    }}>
                                      {'\u26A0'} {t('contentStudio.calendar.gap', 'Gat')}
                                    </Typography>
                                  )}
                                </Box>
                              </>
                            )}
                          </DroppableDayCell>
                        </Grid>
                      );
                    })}
                  </Grid>

                  <DragOverlay>
                    {draggingItem && (
                      <Paper elevation={4} sx={{ p: 1, maxWidth: 200, opacity: 0.9, border: '2px solid #02C39A' }}>
                        <Typography variant="caption" sx={{ fontWeight: 500, fontSize: 11 }}>{draggingItem.title || draggingItem.content_type}</Typography>
                      </Paper>
                    )}
                  </DragOverlay>
                </DndContext>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Day detail dialog */}
      <Dialog open={!!selectedDay} onClose={() => setSelectedDay(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDay && new Date(year, month, selectedDay).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </DialogTitle>
        <DialogContent>
          {selectedDay && (itemsByDay[selectedDay] || []).length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {t('contentStudio.calendar.noItems', 'Geen gepubliceerde of geplande content op deze dag.')}
            </Typography>
          ) : (
            (itemsByDay[selectedDay] || []).map(item => {
              const PlatformIcon = PLATFORM_ICONS[item.target_platform] || LanguageIcon;
              return (
                <Card key={item.id} variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <PlatformIcon sx={{ fontSize: 18 }} />
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>{item.title || item.content_type}</Typography>
                      <Chip label={item.approval_status} size="small" sx={{ bgcolor: STATUS_COLORS[item.approval_status], color: 'common.white', fontSize: 11 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.approval_status === 'failed' ? `Mislukt${item.publish_error ? ': ' + item.publish_error.substring(0, 60) : ''}` :
                       item.approval_status === 'published' && item.published_at ? `Gepubliceerd: ${new Date(item.published_at).toLocaleString('nl-NL')}` :
                       item.scheduled_at ? `Gepland: ${new Date(item.scheduled_at).toLocaleString('nl-NL')}` : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                      {item.concept_id && onEditConcept && (
                        <Button size="small" variant="outlined" startIcon={<EditIcon />}
                          onClick={() => { setSelectedDay(null); onEditConcept(item.concept_id, item.target_platform); }}>
                          {t('contentStudio.calendar.edit', 'Bewerken')}
                        </Button>
                      )}
                      {item.approval_status === 'approved' && (
                        <>
                          <Button size="small" variant="outlined" startIcon={<ScheduleIcon />}
                            onClick={() => setScheduleDialog(item)}>
                            {t('contentStudio.calendar.schedule', 'Inplannen')}
                          </Button>
                          <Button size="small" variant="contained" startIcon={<PublishIcon />}
                            onClick={() => handlePublishNow(item.id, accounts[0]?.id)}
                            disabled={publishMut.isPending || accounts.length === 0}>
                            {t('contentStudio.calendar.publishNow', 'Nu publiceren')}
                          </Button>
                        </>
                      )}
                      {item.approval_status === 'scheduled' && (
                        <>
                          <Button size="small" variant="outlined" startIcon={<ScheduleIcon />}
                            onClick={() => setScheduleDialog(item)}>
                            Herplannen
                          </Button>
                          <Button size="small" color="warning" variant="outlined" startIcon={<CancelIcon />}
                            onClick={() => handleCancel(item.id)} disabled={cancelMut.isPending}>
                            {t('contentStudio.calendar.cancelSchedule', 'Annuleren')}
                          </Button>
                        </>
                      )}
                      {item.approval_status === 'failed' && (
                        <Button size="small" variant="outlined" color="error" startIcon={<ScheduleIcon />}
                          onClick={() => setScheduleDialog({ ...item, approval_status: 'approved' })}>
                          Opnieuw inplannen
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedDay(null)}>{t('common.close', 'Sluiten')}</Button>
        </DialogActions>
      </Dialog>

      {/* Schedule dialog */}
      <ScheduleDialog
        open={!!scheduleDialog} item={scheduleDialog} accounts={accounts}
        onClose={() => setScheduleDialog(null)} onSchedule={handleSchedule} onReschedule={handleReschedule}
        isPending={scheduleMut.isPending || rescheduleMut.isPending}
      />

      {/* Keyboard shortcuts help dialog */}
      <Dialog open={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Keyboard Shortcuts
          <IconButton size="small" onClick={() => setShowShortcutsHelp(false)} aria-label="Sluiten"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {[
            ['t', 'Ga naar vandaag'],
            ['\u2190 / \u2192', 'Vorige / volgende periode'],
            ['1', 'Dag-weergave'],
            ['2', 'Week-weergave'],
            ['3', 'Maand-weergave'],
            ['?', 'Deze help tonen'],
          ].map(([key, desc]) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.75 }}>
              <Chip label={key} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 700, minWidth: 50, justifyContent: 'center' }} />
              <Typography variant="body2">{desc}</Typography>
            </Box>
          ))}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
