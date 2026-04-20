import { useState, useEffect, useCallback } from 'react';
import {
  Grid, Typography, Box, Skeleton, Card, CardContent, Chip, Alert,
  Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControlLabel, FormGroup, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlaceIcon from '@mui/icons-material/Place';
import StarIcon from '@mui/icons-material/Star';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PublicIcon from '@mui/icons-material/Public';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../stores/authStore.js';
import useDestinationStore from '../stores/destinationStore.js';
import client from '../api/client.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { useNavigate, Navigate } from 'react-router-dom';
import { isStudioMode } from '../utils/studioMode.js';

const WIDGET_STORAGE_KEY = 'hb-dashboard-widgets';
const PERIOD_STORAGE_KEY = 'hb-dashboard-period';

function fmtNum(n) {
  if (n === null || n === undefined || n === '—') return '—';
  return Number(n).toLocaleString('nl-NL');
}

// ── Delta Badge ──────────────────────────────────────────────
function DeltaBadge({ value, suffix = '' }) {
  if (value === null || value === undefined || value === 0) {
    return (
      <Chip icon={<RemoveIcon sx={{ fontSize: 12 }} />} label={`0${suffix}`} size="small"
        sx={{ height: 18, fontSize: 10, bgcolor: 'action.hover', color: 'text.secondary', '& .MuiChip-icon': { color: 'text.secondary' } }} />
    );
  }
  const isPositive = value > 0;
  return (
    <Chip
      icon={isPositive ? <ArrowUpwardIcon sx={{ fontSize: 12 }} /> : <ArrowDownwardIcon sx={{ fontSize: 12 }} />}
      label={`${isPositive ? '+' : ''}${value}${suffix}`} size="small"
      sx={{ height: 18, fontSize: 10,
        bgcolor: isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
        color: isPositive ? '#16a34a' : '#dc2626',
        '& .MuiChip-icon': { color: isPositive ? '#16a34a' : '#dc2626' }
      }}
    />
  );
}

// ── Widget definitions ───────────────────────────────────────
const ALL_WIDGETS = [
  { id: 'pois', label: 'POIs', icon: PlaceIcon, color: '#1976d2', path: '/pois' },
  { id: 'reviews', label: 'Reviews', icon: StarIcon, color: '#f59e0b', path: '/reviews' },
  { id: 'chatbot', label: 'Chatbot', icon: ChatIcon, color: '#8b5cf6', path: '/analytics?tab=chatbot' },
  { id: 'content', label: 'Content', icon: EditNoteIcon, color: '#5E8B7E', path: '/content-studio?tab=items' },
  { id: 'users', label: 'Gebruikers', icon: PeopleIcon, color: '#06b6d4', path: '/users' },
  { id: 'agents', label: 'Agents', icon: SmartToyIcon, color: '#22c55e', path: '/agents' },
  { id: 'uptime', label: 'Uptime', icon: PublicIcon, color: '#3b82f6', path: null },
];

const DEFAULT_WIDGETS = ['pois', 'reviews', 'chatbot', 'content', 'users', 'agents'];

function getStored(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

// ── KPI Widget ───────────────────────────────────────────────
function KpiWidget({ widget, value, subtext, delta, loading, onClick }) {
  const { icon: Icon, label, color } = widget;
  if (loading) return <Skeleton variant="rounded" height={110} />;
  return (
    <Card
      role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      onClick={onClick}
      sx={{
        height: '100%', borderTop: `3px solid ${color}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 3 } : {},
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: color + '18' }}>
            <Icon sx={{ color, fontSize: 24 }} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
            {label}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{fmtNum(value)}</Typography>
          {delta !== undefined && delta !== null && <DeltaBadge value={delta} suffix="%" />}
        </Box>
        {subtext && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mt: 0.5, display: 'block' }}>{subtext}</Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ── Action Row ───────────────────────────────────────────────
function ActionRow({ icon, text, onClick }) {
  return (
    <Box role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined} onClick={onClick} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, px: 1, borderRadius: 1, cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { bgcolor: 'action.hover' } : {} }}>
      {icon}
      <Typography variant="body2" sx={{ flex: 1 }}>{text}</Typography>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const allDestinations = useDestinationStore(s => s.destinations);
  const selectedDest = useDestinationStore(s => s.selectedDestination);

  const [visibleWidgets, setVisibleWidgets] = useState(() => getStored(WIDGET_STORAGE_KEY, DEFAULT_WIDGETS));
  const [period, setPeriod] = useState(() => getStored(PERIOD_STORAGE_KEY, 30));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempWidgets, setTempWidgets] = useState(visibleWidgets);

  // Studio mode: redirect to Content Studio (PubliQio users should never see Platform Dashboard)
  if (isStudioMode()) {
    return <Navigate to="/content-studio" replace />;
  }

  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.goodMorning', 'Goedemorgen') : hour < 18 ? t('dashboard.goodAfternoon', 'Goedemiddag') : t('dashboard.goodEvening', 'Goedenavond');
  const userDest = allDestinations?.find(d => d.code === selectedDest || d.id === selectedDest);

  // Destination param for API — respect selected destination
  const destParam = selectedDest && selectedDest !== 'all' ? selectedDest : 'all';

  // Fetch KPIs with period + destination
  const { data: kpiData, isLoading: kpiLoading, error: kpiError, refetch: kpiRefetch } = useQuery({
    queryKey: ['platform-dashboard', destParam, period],
    queryFn: () => client.get('/dashboard', { params: { destination: destParam, period } }).then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch actions
  const { data: actionData, isLoading: actionLoading, refetch: actionRefetch } = useQuery({
    queryKey: ['dashboard-actions', selectedDest],
    queryFn: () => client.get('/dashboard/actions', { params: selectedDest && selectedDest !== 'all' ? { destination_id: selectedDest } : {} }).then(r => r.data),
    staleTime: 60 * 1000,
  });

  const kpis = kpiData?.data?.kpis || {};
  const actionsResponse = actionData?.data || {};
  const actions = actionsResponse.actions || actionsResponse || {};

  const refetch = useCallback(() => { kpiRefetch(); actionRefetch(); }, [kpiRefetch, actionRefetch]);

  const handlePeriodChange = (_, val) => {
    if (!val) return;
    setPeriod(val);
    localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify(val));
  };

  const handleSaveWidgets = () => {
    setVisibleWidgets(tempWidgets);
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(tempWidgets));
    setSettingsOpen(false);
  };

  // Build widget data from API response
  const getWidgetData = (id) => {
    const k = kpis;
    switch (id) {
      case 'pois': return {
        value: k.pois?.active || 0,
        subtext: `${fmtNum(k.pois?.total || 0)} totaal · ${fmtNum(k.pois?.added || 0)} nieuw`,
        delta: k.pois?.delta,
      };
      case 'reviews': return {
        value: k.reviews?.total || 0,
        subtext: `${fmtNum(k.reviews?.new || 0)} nieuw in periode`,
        delta: k.reviews?.delta,
      };
      case 'chatbot': return {
        value: k.chatbot?.sessions || 0,
        subtext: `${fmtNum(k.chatbot?.messages || 0)} berichten`,
        delta: k.chatbot?.delta,
      };
      case 'content': return {
        value: k.content?.total || 0,
        subtext: `${k.content?.published || 0} gepubliceerd · ${k.content?.drafts || 0} concept`,
        delta: k.content?.delta,
      };
      case 'users': return {
        value: k.users?.active || 0,
        subtext: `${k.users?.total || 0} totaal`,
        delta: null,
      };
      case 'agents': return {
        value: k.agents?.total || 0,
        subtext: `${k.agents?.alerts || 0} alerts · ${fmtNum(k.agents?.jobs || 0)} jobs`,
        delta: null,
      };
      case 'uptime': return {
        value: `${k.uptime?.hours || 0}h`,
        subtext: t('dashboard.processUptime', 'Process uptime'),
        delta: null,
      };
      default: return { value: '—' };
    }
  };

  const periodLabel = period === 7 ? '7 dagen' : period === 30 ? '30 dagen' : '90 dagen';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {greeting}, {firstName}!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.platformDashboard', 'Platform Dashboard')} · {userDest?.name || t('dashboard.allDestinations', 'Alle bestemmingen')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Period selector */}
          <ToggleButtonGroup value={period} exclusive onChange={handlePeriodChange} size="small">
            <ToggleButton value={7} sx={{ textTransform: 'none', fontSize: 12, px: 1.5 }}>7d</ToggleButton>
            <ToggleButton value={30} sx={{ textTransform: 'none', fontSize: 12, px: 1.5 }}>30d</ToggleButton>
            <ToggleButton value={90} sx={{ textTransform: 'none', fontSize: 12, px: 1.5 }}>90d</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title={t('dashboard.customize', 'Dashboard aanpassen')}>
            <IconButton onClick={() => { setTempWidgets(visibleWidgets); setSettingsOpen(true); }} size="small"><SettingsIcon /></IconButton>
          </Tooltip>
          <Tooltip title={t('common.refresh', 'Vernieuwen')}>
            <IconButton onClick={refetch} size="small"><RefreshIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {kpiError && <ErrorBanner onRetry={refetch} />}

      {/* Period context label */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        {t('dashboard.periodContext', 'Verandering t.o.v. vorige {{period}}', { period: periodLabel })}
      </Typography>

      {/* KPI Widgets */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {visibleWidgets.map(widgetId => {
          const widget = ALL_WIDGETS.find(w => w.id === widgetId);
          if (!widget) return null;
          const data = getWidgetData(widgetId);
          return (
            <Grid item xs={6} md={4} lg={2} key={widgetId}>
              <KpiWidget
                widget={widget}
                value={data.value}
                subtext={data.subtext}
                delta={data.delta}
                loading={kpiLoading}
                onClick={widget.path ? () => navigate(widget.path) : undefined}
              />
            </Grid>
          );
        })}
      </Grid>

      {/* Actions Required */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        {t('dashboard.actionsRequired', 'Acties vereist')}
      </Typography>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {actionLoading ? (
            <Box><Skeleton height={32} /><Skeleton height={32} /><Skeleton height={32} /></Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {actions.draftItems > 0 && (
                <ActionRow icon={<EditIcon fontSize="small" color="info" />} text={`${actions.draftItems} ${t('dashboard.draftItems', 'concept items klaar voor review')}`} onClick={() => navigate('/content-studio?tab=items')} />
              )}
              {actions.pendingReviews > 0 && (
                <ActionRow icon={<EditIcon fontSize="small" color="warning" />} text={`${actions.pendingReviews} ${t('dashboard.pendingReviews', 'items wachten op goedkeuring')}`} onClick={() => navigate('/content-studio?tab=items')} />
              )}
              {actions.failedPublishes > 0 && (
                <ActionRow icon={<WarningAmberIcon fontSize="small" color="error" />} text={`${actions.failedPublishes} ${t('dashboard.failedPublishes', 'publicaties mislukt')}`} onClick={() => navigate('/content-studio?tab=items')} />
              )}
              {actions.expiringTokens?.length > 0 && actions.expiringTokens.map((tok, i) => (
                <ActionRow key={i} icon={<WarningAmberIcon fontSize="small" color="warning" />} text={`${tok.platform} token ${tok.days_left < 0 ? 'verlopen' : `verloopt over ${tok.days_left} dagen`}`} onClick={() => navigate('/content-studio?tab=social')} />
              ))}
              {actions.topPerformer && (
                <ActionRow icon={<TrendingUpIcon fontSize="small" color="success" />} text={`${t('dashboard.topPerformer', 'Top performer')}: "${actions.topPerformer.title?.substring(0, 40)}" (${fmtNum(actions.topPerformer.total_reach || actions.topPerformer.total_engagement || 0)} reach)`} />
              )}
              {actions.trendingTopic && (
                <ActionRow icon={<TrendingUpIcon fontSize="small" color="primary" />} text={`${t('dashboard.trending', 'Trending')}: ${actions.trendingTopic.keyword}`} />
              )}
              {!actions.draftItems && !actions.pendingReviews && !actions.failedPublishes && !actions.expiringTokens?.length && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  {t('dashboard.noActions', 'Geen openstaande acties. Alles op orde!')}
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        {t('dashboard.quickActions', 'Snelkoppelingen')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: t('dashboard.newContent', 'Nieuwe content'), icon: <NoteAddIcon />, path: '/content-studio?tab=suggesties', color: '#5E8B7E' },
          { label: t('dashboard.calendar', 'Kalender'), icon: <CalendarMonthIcon />, path: '/content-studio?tab=kalender', color: '#1976d2' },
          { label: t('dashboard.analytics', 'Analytics'), icon: <BarChartIcon />, path: '/analytics', color: '#8b5cf6' },
          { label: t('dashboard.poiManagement', 'POI beheer'), icon: <PlaceIcon />, path: '/pois', color: '#f59e0b' },
        ].map((action, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(action.path); } }}
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }, transition: 'all 200ms ease' }}
              onClick={() => navigate(action.path)}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ color: action.color }}>{action.icon}</Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{action.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Widget Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('dashboard.customizeTitle', 'Dashboard aanpassen')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard.customizeDesc', 'Selecteer welke KPIs zichtbaar zijn op je dashboard.')}
          </Typography>
          <FormGroup>
            {ALL_WIDGETS.map(widget => (
              <FormControlLabel
                key={widget.id}
                control={
                  <Checkbox
                    checked={tempWidgets.includes(widget.id)}
                    onChange={(e) => {
                      if (e.target.checked) setTempWidgets(prev => [...prev, widget.id]);
                      else setTempWidgets(prev => prev.filter(id => id !== widget.id));
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <widget.icon sx={{ fontSize: 18, color: widget.color }} />
                    <Typography variant="body2">{widget.label}</Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>{t('common.cancel', 'Annuleren')}</Button>
          <Button onClick={handleSaveWidgets} variant="contained">{t('common.save', 'Opslaan')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
