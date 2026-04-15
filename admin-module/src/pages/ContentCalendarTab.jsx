import { useState, useMemo, useCallback } from 'react';
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  Box, Typography, Paper, Grid, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, IconButton,
  Tooltip, Card, CardContent, CircularProgress, Alert, Badge, Snackbar,
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
import { useTranslation } from 'react-i18next';
import {
  useContentCalendar, useScheduleItem, usePublishNow, useCancelSchedule,
  useRescheduleItem, useSocialAccounts,
} from '../hooks/useContent.js';

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

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export default function ContentCalendarTab({ destinationId, onEditConcept }) {
  const { t } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [scheduleDialog, setScheduleDialog] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const [autoFilling, setAutoFilling] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [autoFillSnack, setAutoFillSnack] = useState(null);
  const [undoData, setUndoData] = useState(null); // { type, ids } for undo
  const [draggingItem, setDraggingItem] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: calendarData, isLoading, refetch } = useContentCalendar(destinationId, { month: month + 1, year });
  const { data: accountsData } = useSocialAccounts(destinationId);
  const scheduleMut = useScheduleItem();
  const publishMut = usePublishNow();
  const cancelMut = useCancelSchedule();
  const rescheduleMut = useRescheduleItem();

  const handleAutoSchedule = async () => {
    setAutoScheduling(true);
    try {
      const client = (await import('../api/client.js')).default;
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
      const client = (await import('../api/client.js')).default;
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

  const items = calendarData?.data?.items || [];
  const seasons = calendarData?.data?.seasons || [];
  const accounts = accountsData?.data || [];

  // Build calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const itemsByDay = useMemo(() => {
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

  // Active season for this month
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

  const navigateMonth = useCallback((delta) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setMonth(newMonth);
    setYear(newYear);
  }, [month, year]);

  const monthName = new Date(year, month).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  const handleDragStart = (event) => {
    const id = Number(event.active.id);
    const it = items.find(i => i.id === id);
    setDraggingItem(it || null);
  };

  const handleDragEnd = async (event) => {
    setDraggingItem(null);
    const { active, over } = event;
    console.debug('[Calendar DnD]', { activeId: active?.id, overId: over?.id });
    if (!over) {
      setAutoFillSnack('Sleep het item op een dag-vakje (geen drop-target gedetecteerd)');
      return;
    }
    const itemId = Number(active.id);
    const targetDay = Number(String(over.id).replace('day-', ''));
    if (!targetDay) {
      setAutoFillSnack(`Onbekend drop-target: ${over.id}`);
      return;
    }
    const item = items.find(i => i.id === itemId);
    if (!item) {
      setAutoFillSnack(`Item ${itemId} niet gevonden in cache`);
      return;
    }
    console.debug('[Calendar DnD] item status:', item.approval_status, 'targetDay:', targetDay);
    if (['published', 'rejected', 'failed'].includes(item.approval_status)) {
      setAutoFillSnack(`Item "${item.title || item.content_type}" heeft status "${item.approval_status}" en kan niet verplaatst worden`);
      return;
    }
    // Behoud uur/min van bestaande planning of default 09:00
    const oldDate = item.scheduled_at ? new Date(item.scheduled_at) : new Date(year, month, targetDay, 9, 0, 0);
    const newDate = new Date(year, month, targetDay, oldDate.getHours() || 9, oldDate.getMinutes() || 0, 0);
    // Voor draft items zonder scheduled_at: oude dag is created_at-dag, nieuwe dag is targetDay → altijd doorgaan
    const oldDayKey = item.scheduled_at
      ? `${oldDate.getFullYear()}-${oldDate.getMonth()}-${oldDate.getDate()}`
      : null;
    const newDayKey = `${newDate.getFullYear()}-${newDate.getMonth()}-${newDate.getDate()}`;
    if (oldDayKey === newDayKey) {
      setAutoFillSnack('Item staat al op deze dag');
      return;
    }
    try {
      const result = await rescheduleMut.mutateAsync({ id: itemId, data: { scheduled_at: newDate.toISOString() } });
      console.debug('[Calendar DnD] reschedule OK:', result);
      setAutoFillSnack(`Verplaatst naar ${newDate.toLocaleDateString('nl-NL')}`);
      await refetch();
    } catch (err) {
      console.error('[Calendar DnD] reschedule FAIL:', err);
      setAutoFillSnack(`Verplaatsen mislukt: ${err.response?.data?.error?.message || err.message || 'onbekende fout'}`);
    }
  };

  const handleSchedule = async (itemId, scheduledAt, socialAccountId) => {
    await scheduleMut.mutateAsync({ id: itemId, data: { scheduled_at: scheduledAt, social_account_id: socialAccountId } });
    setScheduleDialog(null);
  };

  const handlePublishNow = async (itemId, socialAccountId) => {
    await publishMut.mutateAsync({ id: itemId, data: { social_account_id: socialAccountId } });
  };

  const handleCancel = async (itemId) => {
    await cancelMut.mutateAsync(itemId);
  };

  // Calendar grid cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day) => {
    return day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  };

  const isInSeason = (day) => {
    if (!activeSeason) return false;
    const date = new Date(year, month, day);
    return date >= new Date(activeSeason.start_date) && date <= new Date(activeSeason.end_date);
  };

  // Opdracht 8-K2: gap-detection — werkdagen (ma-vr) zonder content worden als gap gemarkeerd
  const gapCount = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const weekday = date.getDay(); // 0=zo, 6=za
      const isWeekday = weekday !== 0 && weekday !== 6;
      const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Alleen toekomstige werkdagen in dezelfde maand tellen als gap
      if (isWeekday && !isPast && (!itemsByDay[d] || itemsByDay[d].length === 0)) count++;
    }
    return count;
  }, [daysInMonth, year, month, itemsByDay, now]);

  return (
    <Box>
      {/* Opdracht 8-K3: Hero Auto-Fill balk bovenaan */}
      <Paper
        elevation={0}
        sx={{
          p: 2, mb: 2,
          background: 'linear-gradient(135deg, #5E8B7E 0%, #2C3E50 100%)',
          color: '#fff',
          borderRadius: 2,
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25, color: '#fff' }}>
            {t('contentStudio.calendar.heroTitle', 'Vul je contentkalender met AI')}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, color: '#fff' }}>
            {gapCount > 0
              ? t('contentStudio.calendar.heroSubtitleGaps', '{{count}} werkdagen zonder geplande content in {{month}}. Laat AI dit automatisch aanvullen.', { count: gapCount, month: monthName })
              : t('contentStudio.calendar.heroSubtitle', 'Laat AI content-suggesties genereren voor elke werkdag in {{month}}.', { month: monthName })}
          </Typography>
        </Box>
        <Tooltip title={t('contentStudio.calendar.autoFillTooltip', 'AI genereert nieuwe draft content items (titels + tekst + image) voor de komende 4 weken, op basis van je merkprofiel, pillars en trending topics. Items verschijnen als Draft in de kalender en Content Items.')} arrow>
          <span>
          <Button
            variant="contained"
            size="large"
            startIcon={autoFilling ? <CircularProgress size={18} sx={{ color: '#5E8B7E' }} /> : <AutoAwesomeIcon />}
            onClick={handleAutoFill}
            disabled={autoFilling}
            sx={{
              bgcolor: '#fff', color: '#2C3E50', fontWeight: 700, px: 3,
              '&:hover': { bgcolor: '#f0f0f0' },
              '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.5)' },
            }}
          >
            {autoFilling ? t('contentStudio.calendar.filling', 'Genereren...') : t('contentStudio.calendar.autoFill', 'Vul kalender met AI')}
          </Button>
          </span>
        </Tooltip>
        <Tooltip title={t('contentStudio.calendar.autoScheduleTooltip', 'Plant alle goedgekeurde (approved) items automatisch in op optimale tijdstippen per platform, verspreid over de komende 7 dagen. Alleen items met status Approved worden ingepland.')} arrow>
          <span>
          <Button
            variant="outlined"
            size="large"
            startIcon={autoScheduling ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <ScheduleIcon />}
            onClick={handleAutoSchedule}
            disabled={autoScheduling}
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#fff' } }}
          >
            {autoScheduling ? 'Plannen...' : t('contentStudio.calendar.autoSchedule', 'Auto-inplannen')}
          </Button>
          </span>
        </Tooltip>
      </Paper>

      {/* Month navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigateMonth(-1)} size="small"><ChevronLeftIcon /></IconButton>
          <Typography variant="h6" sx={{ textTransform: 'capitalize', minWidth: 180, textAlign: 'center' }}>
            {monthName}
          </Typography>
          <IconButton onClick={() => navigateMonth(1)} size="small"><ChevronRightIcon /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {activeSeason && (
            <Chip label={`${t('contentStudio.calendar.season', 'Seizoen')}: ${activeSeason.season_name}`} color="primary" variant="outlined" size="small" />
          )}
        </Box>
      </Box>
      <Snackbar
        open={!!autoFillSnack}
        autoHideDuration={undoData ? 15000 : 5000}
        onClose={() => { setAutoFillSnack(null); setUndoData(null); }}
        message={autoFillSnack}
        action={undoData ? (
          <Button
            color="warning" size="small" variant="outlined"
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', fontWeight: 700 }}
            onClick={async () => {
              try {
                const client = (await import('../api/client.js')).default;
                if (undoData.type === 'autofill') {
                  // Delete generated concepts + items
                  for (const cid of undoData.ids) {
                    await client.delete(`/content/concepts/${cid}`);
                  }
                  setAutoFillSnack(`${undoData.ids.length} items ongedaan gemaakt`);
                } else if (undoData.type === 'autoschedule') {
                  // Revert scheduled → approved
                  for (const id of undoData.ids) {
                    await client.delete(`/content/items/${id}/schedule`);
                  }
                  setAutoFillSnack(`${undoData.ids.length} items teruggezet naar Approved`);
                }
                setUndoData(null);
                refetch();
              } catch (err) {
                setAutoFillSnack(`Ongedaan maken mislukt: ${err.message}`);
                setUndoData(null);
              }
            }}
          >
            {t('contentStudio.calendar.undo', 'Ongedaan maken')}
          </Button>
        ) : null}
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* Weekday headers */}
          <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
            {WEEKDAYS.map(wd => (
              <Grid item xs={12 / 7} key={wd}>
                <Typography variant="caption" fontWeight={600} textAlign="center" display="block" color="text.secondary">
                  {wd}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Calendar grid */}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Grid container spacing={0.5}>
            {cells.map((day, idx) => {
              // Opdracht 8-K2: gap-detection
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
                <DroppableDayCell
                  day={day}
                  isToday={day && isToday(day)}
                  isInSeason={day && isInSeason(day)}
                  isGap={isGap}
                  onClick={() => day && setSelectedDay(day)}
                >
                  {day && (
                    <>
                      {isToday(day) && (
                        <Box sx={{ position: 'absolute', top: 2, right: 4 }}>
                          <Chip label="Vandaag" size="small" color="primary" sx={{ height: 16, fontSize: 9, fontWeight: 700 }} />
                        </Box>
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: isToday(day) ? 700 : 400,
                          bgcolor: isToday(day) ? '#1976d2' : 'transparent',
                          color: isToday(day) ? '#fff' : 'text.secondary',
                          borderRadius: isToday(day) ? '50%' : 0,
                          width: isToday(day) ? 22 : 'auto',
                          height: isToday(day) ? 22 : 'auto',
                          display: isToday(day) ? 'inline-flex' : 'inline',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                        }}
                      >
                        {day}
                      </Typography>
                      <Box sx={{ mt: 0.3 }}>
                        {(itemsByDay[day] || []).slice(0, 3).map(item => (
                          <DraggableCalendarItem key={item.id} item={item} />
                        ))}
                        {(itemsByDay[day] || []).length > 3 && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                            +{(itemsByDay[day] || []).length - 3} {t('contentStudio.calendar.more', 'meer')}
                          </Typography>
                        )}
                        {isGap && (
                          <Typography variant="caption" sx={{
                            fontSize: 9, color: '#FF9800', fontStyle: 'italic', fontWeight: 600, display: 'block',
                            // Opdracht 5 micro-interactie #4: pulse animatie op gat-label
                            animation: 'hbGapPulse 2s ease-in-out infinite',
                            '@keyframes hbGapPulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                            },
                            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                          }}>
                            ⚠ {t('contentStudio.calendar.gap', 'Gat')}
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
            {draggingItem ? (
              <Box sx={{
                px: 1, py: 0.5, bgcolor: 'background.paper', borderRadius: 1,
                boxShadow: 4, border: '2px solid', borderColor: 'primary.main',
                fontSize: 11, fontWeight: 600, maxWidth: 200,
              }}>
                {draggingItem.title || draggingItem.content_type}
              </Box>
            ) : null}
          </DragOverlay>
          </DndContext>

          {/* Legend */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 14, height: 14, borderRadius: 0.5, border: '2px dashed #FF9800', bgcolor: 'transparent' }} />
              <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600 }}>{t('contentStudio.calendar.gapLegend', 'Gat (werkdag zonder content)')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 14, height: 14, borderLeft: '4px solid #5E8B7E', bgcolor: '#5E8B7E15', borderRadius: 0.3 }} />
              <Typography variant="caption" sx={{ fontSize: 10 }}>{t('contentStudio.calendar.pillarLegend', 'Linkerrand = pillar-kleur')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 14, height: 14, borderRight: '3px solid #2196f3', bgcolor: '#2196f315', borderRadius: 0.3 }} />
              <Typography variant="caption" sx={{ fontSize: 10 }}>{t('contentStudio.calendar.statusLegend', 'Rechterrand = status-kleur')}</Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            {Object.entries(STATUS_COLORS).map(([status, color]) => {
              const labels = { draft: 'Concept', pending_review: 'Ter Review', approved: 'Goedgekeurd', scheduled: 'Ingepland', publishing: 'Publiceren', published: 'Gepubliceerd', failed: 'Mislukt', rejected: 'Afgekeurd' };
              return (
                <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: color }} />
                  <Typography variant="caption" sx={{ fontSize: 9 }}>{labels[status] || status}</Typography>
                </Box>
              );
            })}
          </Box>

          {/* Connected accounts summary — show all platforms */}
          <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('contentStudio.calendar.connectedAccounts', 'Gekoppelde accounts')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(() => {
                const allPlatforms = ['facebook', 'instagram', 'linkedin', 'x', 'tiktok', 'youtube', 'pinterest', 'snapchat'];
                const connectedPlatforms = accounts.map(a => a.platform);
                return allPlatforms.map(p => {
                  const acc = accounts.find(a => a.platform === p);
                  const Icon = PLATFORM_ICONS[p] || LanguageIcon;
                  const isConnected = !!acc;
                  return (
                    <Chip
                      key={p}
                      icon={<Icon sx={{ fontSize: 16 }} />}
                      label={isConnected ? `${acc.account_name || p} (${acc.status})` : `${p} (niet gekoppeld)`}
                      size="small"
                      color={isConnected && acc.status === 'active' ? 'success' : 'default'}
                      variant="outlined"
                      sx={!isConnected ? { opacity: 0.5, borderStyle: 'dashed' } : {}}
                    />
                  );
                });
              })()}
            </Box>
          </Paper>
        </>
      )}

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
                      <Chip
                        label={item.approval_status}
                        size="small"
                        sx={{ bgcolor: STATUS_COLORS[item.approval_status], color: 'common.white', fontSize: 11 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.scheduled_at ? `Gepland: ${new Date(item.scheduled_at).toLocaleString('nl-NL')}` :
                       item.published_at ? `Gepubliceerd: ${new Date(item.published_at).toLocaleString('nl-NL')}` : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                      {item.concept_id && onEditConcept && (
                        <Button
                          size="small" variant="outlined" startIcon={<EditIcon />}
                          onClick={() => { setSelectedDay(null); onEditConcept(item.concept_id); }}
                        >
                          {t('contentStudio.calendar.edit', 'Bewerken')}
                        </Button>
                      )}
                      {item.approval_status === 'approved' && (
                        <>
                          <Button
                            size="small" variant="outlined" startIcon={<ScheduleIcon />}
                            onClick={() => setScheduleDialog(item)}
                          >
                            {t('contentStudio.calendar.schedule', 'Inplannen')}
                          </Button>
                          <Button
                            size="small" variant="contained" startIcon={<PublishIcon />}
                            onClick={() => handlePublishNow(item.id, accounts[0]?.id)}
                            disabled={publishMut.isPending || accounts.length === 0}
                          >
                            {t('contentStudio.calendar.publishNow', 'Nu publiceren')}
                          </Button>
                        </>
                      )}
                      {item.approval_status === 'scheduled' && (
                        <Button
                          size="small" color="warning" variant="outlined" startIcon={<CancelIcon />}
                          onClick={() => handleCancel(item.id)}
                          disabled={cancelMut.isPending}
                        >
                          {t('contentStudio.calendar.cancelSchedule', 'Annuleren')}
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
        open={!!scheduleDialog}
        item={scheduleDialog}
        accounts={accounts}
        onClose={() => setScheduleDialog(null)}
        onSchedule={handleSchedule}
        isPending={scheduleMut.isPending}
      />
    </Box>
  );
}

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
        transition: 'background-color 150ms, border-color 150ms',
        '&:hover': day ? { bgcolor: isOver ? '#FFF3E0' : 'action.hover' } : {},
      }}
    >
      {children}
    </Paper>
  );
}

function DraggableCalendarItem({ item }) {
  const isDraggable = !['published', 'rejected', 'failed'].includes(item.approval_status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(item.id),
    disabled: !isDraggable,
  });
  const PlatformIcon = PLATFORM_ICONS[item.target_platform] || LanguageIcon;
  const statusColor = STATUS_COLORS[item.approval_status] || '#ccc';
  const pillarColor = item.pillar_color || statusColor;
  return (
    <Tooltip title={`${item.title || item.content_type}${item.pillar_name ? ' · ' + item.pillar_name : ''} · ${item.approval_status}${isDraggable ? ' · sleep om te verplaatsen' : ''}`}>
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
          '&:active': isDraggable ? { cursor: 'grabbing' } : {},
        }}
      >
        <PlatformIcon sx={{ fontSize: 12, color: pillarColor }} />
        <Typography variant="caption" noWrap sx={{ fontSize: 10, flex: 1, fontWeight: 500 }}>
          {item.content_source_type === "poi" ? "📍" : item.content_source_type === "event" ? "📅" : item.content_source_type === "visual" ? "📷" : item.content_source_type === "holibot" ? "💬" : ""}{" "}{item.title || item.content_type}
        </Typography>
      </Box>
    </Tooltip>
  );
}

function ScheduleDialog({ open, item, accounts, onClose, onSchedule, isPending }) {
  const { t } = useTranslation();
  const [dateTime, setDateTime] = useState('');
  const [accountId, setAccountId] = useState('');

  const handleSubmit = () => {
    if (!dateTime) return;
    onSchedule(item?.id, dateTime, accountId || undefined);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('contentStudio.calendar.scheduleTitle', 'Content inplannen')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {item?.title || item?.content_type}
        </Typography>
        <TextField
          type="datetime-local"
          label={t('contentStudio.calendar.dateTime', 'Datum & tijd')}
          value={dateTime}
          onChange={e => setDateTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        {accounts.length > 0 && (
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
          {isPending ? <CircularProgress size={20} /> : t('contentStudio.calendar.schedule', 'Inplannen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
