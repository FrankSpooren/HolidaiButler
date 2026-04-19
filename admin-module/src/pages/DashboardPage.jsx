import { useState, useEffect, useCallback } from 'react';
import {
  Grid, Typography, Box, Skeleton, Card, CardContent, Chip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControlLabel, FormGroup, Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import CampaignIcon from '@mui/icons-material/Campaign';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlaceIcon from '@mui/icons-material/Place';
import StarIcon from '@mui/icons-material/Star';
import ChatIcon from '@mui/icons-material/Chat';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PublicIcon from '@mui/icons-material/Public';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../stores/authStore.js';
import useDestinationStore from '../stores/destinationStore.js';
import client from '../api/client.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { useNavigate } from 'react-router-dom';

function fmtNum(n) {
  if (n === null || n === undefined || n === '—') return '—';
  if (typeof n === 'string' && n.endsWith('h')) return n; // uptime
  return Number(n).toLocaleString('nl-NL');
}

const STORAGE_KEY = 'hb-dashboard-widgets';

// All available widget definitions
const ALL_WIDGETS = [
  { id: 'pois', label: 'POIs', icon: PlaceIcon, color: '#1976d2', category: 'data' },
  { id: 'reviews', label: 'Reviews', icon: StarIcon, color: '#f59e0b', category: 'data' },
  { id: 'chatbot', label: 'Chatbot', icon: ChatIcon, color: '#8b5cf6', category: 'platform' },
  { id: 'content', label: 'Content Items', icon: EditNoteIcon, color: '#5E8B7E', category: 'content' },
  { id: 'users', label: 'Gebruikers', icon: PeopleIcon, color: '#06b6d4', category: 'platform' },
  { id: 'agents', label: 'Agents', icon: SmartToyIcon, color: '#22c55e', category: 'platform' },
  { id: 'uptime', label: 'Uptime', icon: PublicIcon, color: '#3b82f6', category: 'platform' },
];

const DEFAULT_WIDGETS = ['pois', 'reviews', 'chatbot', 'content', 'users', 'agents'];

function getStoredWidgets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_WIDGETS;
}

// Status colors for content items
const STATUS_COLORS = {
  draft: 'default', pending_review: 'info', approved: 'primary',
  scheduled: 'secondary', published: 'success', failed: 'error',
};

function ActionRow({ icon, text, onClick }) {
  return (
    <Box onClick={onClick} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, px: 1, borderRadius: 1, cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { bgcolor: 'action.hover' } : {} }}>
      {icon}
      <Typography variant="body2" sx={{ flex: 1 }}>{text}</Typography>
    </Box>
  );
}

function KpiWidget({ widget, value, subtext, loading }) {
  const { icon: Icon, label, color } = widget;
  if (loading) return <Skeleton variant="rounded" height={100} />;
  return (
    <Card sx={{ height: '100%', borderTop: `3px solid ${color}` }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ p: 1, borderRadius: 1, bgcolor: color + '18' }}>
          <Icon sx={{ color, fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{fmtNum(value)}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          {subtext && <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: 10 }}>{subtext}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const allDestinations = useDestinationStore(s => s.destinations);
  const selectedDest = useDestinationStore(s => s.selectedDestination);
  const isPlatformAdmin = user?.role === 'platform_admin';

  const [visibleWidgets, setVisibleWidgets] = useState(getStoredWidgets);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempWidgets, setTempWidgets] = useState(visibleWidgets);

  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.goodMorning', 'Goedemorgen') : hour < 18 ? t('dashboard.goodAfternoon', 'Goedemiddag') : t('dashboard.goodEvening', 'Goedenavond');

  const userDest = allDestinations?.find(d => d.code === selectedDest || d.id === selectedDest);

  // Fetch platform KPIs
  const { data: kpiData, isLoading: kpiLoading, error: kpiError, refetch: kpiRefetch } = useQuery({
    queryKey: ['platform-dashboard'],
    queryFn: () => client.get('/dashboard').then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch action items
  const { data: actionData, isLoading: actionLoading, refetch: actionRefetch } = useQuery({
    queryKey: ['dashboard-actions', selectedDest],
    queryFn: () => client.get('/dashboard/actions', { params: selectedDest && selectedDest !== 'all' ? { destination_id: selectedDest } : {} }).then(r => r.data),
    staleTime: 60 * 1000,
  });

  const kpis = kpiData?.data || {};
  const platform = kpis.platform || {};
  const destinations = kpis.destinations || {};
  const actionsResponse = actionData?.data || {};
  const actions = actionsResponse.actions || actionsResponse || {};

  const refetch = useCallback(() => { kpiRefetch(); actionRefetch(); }, [kpiRefetch, actionRefetch]);

  // Build KPI values from data
  const getWidgetData = (id) => {
    const calpe = destinations.calpe || {};
    const texel = destinations.texel || {};
    switch (id) {
      case 'pois': return { value: (calpe.pois?.active || 0) + (texel.pois?.active || 0), subtext: `Calpe: ${calpe.pois?.active || 0} · Texel: ${texel.pois?.active || 0}` };
      case 'reviews': return { value: (calpe.reviews || 0) + (texel.reviews || 0), subtext: `Calpe: ${calpe.reviews || 0} · Texel: ${texel.reviews || 0}` };
      case 'chatbot': return { value: platform.chatbotSessions7d || 0, subtext: t('dashboard.last7days', 'Laatste 7 dagen') };
      case 'content': return { value: actions.draftItems || 0, subtext: `${actions.pendingReviews || 0} ${t('dashboard.pendingReview', 'in review')}` };
      case 'users': return { value: platform.activeUsers || 0, subtext: `${platform.totalUsers || 0} ${t('dashboard.total', 'totaal')}` };
      case 'agents': return { value: platform.totalAgents || 0, subtext: `${platform.healthSummary?.alerts || 0} alerts` };
      case 'uptime': return { value: `${platform.uptimeHours || 0}h`, subtext: t('dashboard.processUptime', 'Process uptime') };
      default: return { value: '—' };
    }
  };

  const handleSaveWidgets = () => {
    setVisibleWidgets(tempWidgets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempWidgets));
    setSettingsOpen(false);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {greeting}, {firstName}!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.platformDashboard', 'Platform Dashboard')} · {userDest?.name || (isPlatformAdmin ? t('dashboard.allDestinations', 'Alle bestemmingen') : '')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('dashboard.customize', 'Dashboard aanpassen')}>
            <IconButton onClick={() => { setTempWidgets(visibleWidgets); setSettingsOpen(true); }} size="small"><SettingsIcon /></IconButton>
          </Tooltip>
          <Tooltip title={t('common.refresh', 'Vernieuwen')}>
            <IconButton onClick={refetch} size="small"><RefreshIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {kpiError && <ErrorBanner onRetry={refetch} />}

      {/* KPI Widgets */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {visibleWidgets.map(widgetId => {
          const widget = ALL_WIDGETS.find(w => w.id === widgetId);
          if (!widget) return null;
          const data = getWidgetData(widgetId);
          return (
            <Grid item xs={6} md={4} lg={2} key={widgetId}>
              <KpiWidget widget={widget} value={data.value} subtext={data.subtext} loading={kpiLoading || actionLoading} />
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
                <ActionRow key={i} icon={<WarningAmberIcon fontSize="small" color="warning" />} text={`${tok.platform} token verloopt over ${tok.days_left} ${t('dashboard.days', 'dagen')}`} onClick={() => navigate('/content-studio?tab=social')} />
              ))}
              {actions.topPerformer && (
                <ActionRow icon={<TrendingUpIcon fontSize="small" color="success" />} text={`${t('dashboard.topPerformer', 'Top performer')}: "${actions.topPerformer.title?.substring(0, 40)}" (${actions.topPerformer.total_reach || actions.topPerformer.total_engagement || 0} reach)`} />
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
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }, transition: 'all 200ms ease' }}
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
