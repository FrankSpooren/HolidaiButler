import { useState, useMemo, useCallback } from 'react';
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

export default function ContentCalendarTab({ destinationId }) {
  const { t } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [scheduleDialog, setScheduleDialog] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const [autoFilling, setAutoFilling] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [autoFillSnack, setAutoFillSnack] = useState(null);

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
      setAutoFillSnack(`${data.data?.scheduled || 0} items automatisch ingepland`);
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
      setAutoFillSnack(`${data.data?.generated || 0} suggesties gegenereerd voor ${monthName}`);
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

  return (
    <Box>
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
          <Button
            variant="contained"
            size="small"
            startIcon={autoFilling ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            onClick={handleAutoFill}
            disabled={autoFilling}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {autoFilling ? t('contentStudio.calendar.filling', 'Genereren...') : t('contentStudio.calendar.autoFill', 'Vul kalender')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={autoScheduling ? <CircularProgress size={16} /> : <ScheduleIcon />}
            onClick={handleAutoSchedule}
            disabled={autoScheduling}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {autoScheduling ? 'Plannen...' : t('contentStudio.calendar.autoSchedule', 'Auto-inplannen')}
          </Button>
        </Box>
      </Box>
      <Snackbar open={!!autoFillSnack} autoHideDuration={5000} onClose={() => setAutoFillSnack(null)} message={autoFillSnack} />

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
          <Grid container spacing={0.5}>
            {cells.map((day, idx) => (
              <Grid item xs={12 / 7} key={idx}>
                <Paper
                  variant="outlined"
                  sx={{
                    minHeight: 90,
                    p: 0.5,
                    bgcolor: day === null ? 'action.disabledBackground' :
                      isToday(day) ? '#E3F2FD' :
                      isInSeason(day) ? '#F1F8E9' : 'background.paper',
                    border: isToday(day) ? '2px solid #1976d2' : '1px solid',
                    borderColor: isToday(day) ? '#1976d2' : 'divider',
                    cursor: day ? 'pointer' : 'default',
                    position: 'relative',
                    '&:hover': day ? { bgcolor: 'action.hover' } : {},
                  }}
                  onClick={() => day && setSelectedDay(day)}
                >
                  {day && (
                    <>
                      {/* Today badge */}
                      {isToday(day) && (
                        <Box sx={{ position: 'absolute', top: 2, right: 4 }}>
                          <Chip label="Vandaag" size="small" color="primary" sx={{ height: 16, fontSize: 9, fontWeight: 700 }} />
                        </Box>
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: isToday(day) ? 700 : 400,
                          color: isToday(day) ? '#1976d2' : 'text.secondary',
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
                        {(itemsByDay[day] || []).slice(0, 3).map(item => {
                          const PlatformIcon = PLATFORM_ICONS[item.target_platform] || LanguageIcon;
                          const statusColor = STATUS_COLORS[item.approval_status] || '#ccc';
                          return (
                            <Box
                              key={item.id}
                              sx={{
                                display: 'flex', alignItems: 'center', gap: 0.3, mb: 0.3,
                                border: `1.5px solid ${statusColor}`,
                                borderLeft: `4px solid ${statusColor}`,
                                bgcolor: `${statusColor}15`,
                                pl: 0.5, borderRadius: 0.5,
                                fontSize: 10, lineHeight: 1.2, py: 0.2,
                              }}
                            >
                              <PlatformIcon sx={{ fontSize: 12, color: statusColor }} />
                              <Typography variant="caption" noWrap sx={{ fontSize: 10, flex: 1, fontWeight: 500 }}>
                                {item.title || item.content_type}
                              </Typography>
                            </Box>
                          );
                        })}
                        {(itemsByDay[day] || []).length > 3 && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                            +{(itemsByDay[day] || []).length - 3} {t('contentStudio.calendar.more', 'meer')}
                          </Typography>
                        )}
                      </Box>
                    </>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Status legend */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 1.5, mb: 1 }}>
            {Object.entries(STATUS_COLORS).map(([status, color]) => {
              const labels = { draft: 'Concept', pending_review: 'Ter Review', approved: 'Goedgekeurd', scheduled: 'Ingepland', publishing: 'Publiceren', published: 'Gepubliceerd', failed: 'Mislukt', rejected: 'Afgekeurd' };
              return (
                <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color, border: `1px solid ${color}` }} />
                  <Typography variant="caption" sx={{ fontSize: 10 }}>{labels[status] || status}</Typography>
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
                        sx={{ bgcolor: STATUS_COLORS[item.approval_status], color: '#fff', fontSize: 11 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.scheduled_at ? `Gepland: ${new Date(item.scheduled_at).toLocaleString('nl-NL')}` :
                       item.published_at ? `Gepubliceerd: ${new Date(item.published_at).toLocaleString('nl-NL')}` : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
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
