import { useState, useEffect, useCallback } from 'react';
import {
  Grid, Typography, Box, Skeleton, Card, CardContent, Chip, Alert,
  Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControlLabel, FormGroup, ToggleButton, ToggleButtonGroup,
  Menu, MenuItem, ListItemIcon, ListItemText, Snackbar, Divider,
  Select, FormControl, InputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExploreIcon from "@mui/icons-material/Explore";
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
import CloseIcon from '@mui/icons-material/Close';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import DraftsIcon from '@mui/icons-material/Drafts';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import PaletteIcon from '@mui/icons-material/Palette';
import ArticleIcon from '@mui/icons-material/Article';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../stores/authStore.js';
import useDestinationStore from '../stores/destinationStore.js';
import client from '../api/client.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { useNavigate, Navigate } from 'react-router-dom';
import { isStudioMode } from '../utils/studioMode.js';

const WIDGET_STORAGE_KEY = 'hb-dashboard-widgets';
const PERIOD_STORAGE_KEY = 'hb-dashboard-period';

function fmtNum(n) {
  if (n === null || n === undefined || n === '\u2014') return '\u2014';
  return Number(n).toLocaleString('nl-NL');
}

// -- Delta Badge --
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

// -- Widget definitions --
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

// -- All available shortcuts --
const ALL_SHORTCUTS = [
  { id: 'newContent', label: 'Nieuwe content', icon: NoteAddIcon, path: '/content-studio?tab=suggesties', color: '#5E8B7E' },
  { id: 'calendar', label: 'Kalender', icon: CalendarMonthIcon, path: '/content-studio?tab=kalender', color: '#1976d2' },
  { id: 'analytics', label: 'Analytics', icon: BarChartIcon, path: '/analytics', color: '#8b5cf6' },
  { id: 'poiManagement', label: 'POI beheer', icon: PlaceIcon, path: '/pois', color: '#f59e0b' },
  { id: 'contentStudio', label: 'Content Studio', icon: AutoAwesomeIcon, path: '/content-studio', color: '#5E8B7E' },
  { id: 'reviews', label: 'Reviews', icon: RateReviewIcon, path: '/reviews', color: '#ef4444' },
  { id: 'media', label: 'Media Library', icon: PermMediaIcon, path: '/media', color: '#06b6d4' },
  { id: 'branding', label: 'Branding', icon: PaletteIcon, path: '/branding', color: '#ec4899' },
  { id: 'pages', label: "Pagina's", icon: ArticleIcon, path: '/pages', color: '#8b5cf6' },
  { id: 'agents', label: 'Agents', icon: SmartToyIcon, path: '/agents', color: '#22c55e' },
  { id: 'users', label: 'Gebruikers', icon: PeopleIcon, path: '/users', color: '#06b6d4' },
  { id: 'settings', label: 'Instellingen', icon: SettingsIcon, path: '/settings', color: '#64748b' },
];

const DEFAULT_SHORTCUTS = ['newContent', 'calendar', 'analytics', 'poiManagement'];

function getStored(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

// -- KPI Widget --
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

// -- Action Row with controls --
function ActionRow({ actionKey, icon, text, onClick, isRead, isDismissed, delegatedToName, onDismiss, onToggleRead, onDelegate, onMenuOpen }) {
  if (isDismissed) return null;
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 1, borderRadius: 1,
        bgcolor: isRead ? 'transparent' : 'action.hover',
        opacity: isRead ? 0.85 : 1,
        '&:hover': { bgcolor: 'action.hover' },

      }}
    >
      <Box
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
        onClick={onClick}
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, cursor: onClick ? 'pointer' : 'default' }}
      >
        {icon}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: isRead ? 400 : 600 }}>{text}</Typography>
          {delegatedToName && (
            <Typography variant="caption" color="primary" sx={{ fontSize: 10 }}>
              Gedelegeerd aan {delegatedToName}
            </Typography>
          )}
        </Box>
      </Box>
      {!isRead && (
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
      )}
      <Box className="action-controls" sx={{ display: 'flex', gap: 0.25 }}>
        <Tooltip title={isRead ? 'Markeer als ongelezen' : 'Markeer als gelezen'}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggleRead(actionKey, !isRead); }}
            sx={{ p: 0.5, color: 'text.secondary' }}>
            {isRead ? <MailOutlineIcon sx={{ fontSize: 16 }} /> : <DraftsIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Delegeren">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelegate(actionKey, e); }}
            sx={{ p: 0.5, color: 'text.secondary' }}>
            <PersonAddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Verwijderen">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDismiss(actionKey); }}
            sx={{ p: 0.5, color: 'text.secondary' }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}


// =================================================================
// MAIN COMPONENT
// =================================================================
export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const allDestinations = useDestinationStore(s => s.destinations);
  const selectedDest = useDestinationStore(s => s.selectedDestination);

  const [visibleWidgets, setVisibleWidgets] = useState(() => getStored(WIDGET_STORAGE_KEY, DEFAULT_WIDGETS));
  const [period, setPeriod] = useState(() => getStored(PERIOD_STORAGE_KEY, 30));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempWidgets, setTempWidgets] = useState(visibleWidgets);
  const [snackMsg, setSnackMsg] = useState('');
  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false);
  const [delegateActionKey, setDelegateActionKey] = useState(null);
  const [delegateUserId, setDelegateUserId] = useState('');
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const [dismissedMenuAnchor, setDismissedMenuAnchor] = useState(null);
  const [tempShortcuts, setTempShortcuts] = useState([]);

  // Studio mode redirect
  if (isStudioMode()) {
    return <Navigate to="/content-studio" replace />;
  }

  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.goodMorning', 'Goedemorgen') : hour < 18 ? t('dashboard.goodAfternoon', 'Goedemiddag') : t('dashboard.goodEvening', 'Goedenavond');
  const userDest = allDestinations?.find(d => d.code === selectedDest || d.id === selectedDest);
  const destParam = selectedDest && selectedDest !== 'all' ? selectedDest : 'all';

  // Fetch KPIs
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

  // Fetch action states (read/dismissed/delegated)
  const { data: statesData, refetch: statesRefetch } = useQuery({
    queryKey: ['dashboard-action-states'],
    queryFn: () => client.get('/dashboard/action-states').then(r => r.data),
    staleTime: 30 * 1000,
  });

  // Fetch user shortcuts
  const { data: shortcutsData } = useQuery({
    queryKey: ['dashboard-shortcuts'],
    queryFn: () => client.get('/dashboard/shortcuts').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch delegates list
  const { data: delegatesData } = useQuery({
    queryKey: ['dashboard-delegates'],
    queryFn: () => client.get('/dashboard/delegates').then(r => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: delegateDialogOpen,
  });

  const kpis = kpiData?.data?.kpis || {};
  const actionsResponse = actionData?.data || {};
  const actions = actionsResponse.actions || actionsResponse || {};
  const actionStates = statesData?.data?.states || [];
  const delegatedToMe = statesData?.data?.delegatedToMe || [];
  const delegates = delegatesData?.data?.users || [];
  const savedShortcuts = shortcutsData?.data?.shortcuts;
  const activeShortcuts = savedShortcuts || DEFAULT_SHORTCUTS;

  const refetch = useCallback(() => { kpiRefetch(); actionRefetch(); statesRefetch(); }, [kpiRefetch, actionRefetch, statesRefetch]);

  // Helper: get state for action key
  const getState = (key) => actionStates.find(s => s.action_key === key) || {};

  // -- Mutations --
  const dismissMutation = useMutation({
    mutationFn: ({ actionKey, snapshotValue }) => client.post(`/dashboard/actions/${actionKey}/dismiss`, { snapshotValue }),
    onSuccess: () => { statesRefetch(); setSnackMsg(t('dashboard.actionDismissed', 'Actie verwijderd')); },
  });

  const readMutation = useMutation({
    mutationFn: ({ actionKey, isRead }) => client.post(`/dashboard/actions/${actionKey}/read`, { isRead }),
    onSuccess: () => statesRefetch(),
  });

  const delegateMutation = useMutation({
    mutationFn: ({ actionKey, delegateTo, snapshotValue }) => client.post(`/dashboard/actions/${actionKey}/delegate`, { delegateTo, snapshotValue }),
    onSuccess: (res) => {
      statesRefetch();
      setDelegateDialogOpen(false);
      setDelegateUserId('');
      const name = res?.data?.data?.delegatedTo || '';
      setSnackMsg(t('dashboard.actionDelegated', 'Actie gedelegeerd aan {{name}}', { name }));
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ actionKey }) => client.post(`/dashboard/actions/${actionKey}/restore`),
    onSuccess: () => { statesRefetch(); setSnackMsg(t('dashboard.actionRestored', 'Actie hersteld')); },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: ({ actionKey }) => client.delete(`/dashboard/actions/${actionKey}`),
    onSuccess: () => { statesRefetch(); setSnackMsg(t('dashboard.actionPermanentlyDeleted', 'Actie permanent verwijderd')); },
  });

  const saveShortcutsMutation = useMutation({
    mutationFn: (shortcuts) => client.put('/dashboard/shortcuts', { shortcuts }),
    onSuccess: () => { queryClient.invalidateQueries(['dashboard-shortcuts']); setSnackMsg(t('dashboard.shortcutsSaved', 'Snelkoppelingen opgeslagen')); },
  });

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

  const handleDismiss = (actionKey) => {
    const snapshot = getSnapshotValue(actionKey);
    dismissMutation.mutate({ actionKey, snapshotValue: snapshot });
  };

  const handleToggleRead = (actionKey, isRead) => {
    readMutation.mutate({ actionKey, isRead });
  };

  const handleOpenDelegate = (actionKey) => {
    setDelegateActionKey(actionKey);
    setDelegateUserId('');
    setDelegateDialogOpen(true);
  };

  const handleConfirmDelegate = () => {
    if (!delegateUserId || !delegateActionKey) return;
    const snapshot = getSnapshotValue(delegateActionKey);
    delegateMutation.mutate({ actionKey: delegateActionKey, delegateTo: delegateUserId, snapshotValue: snapshot });
  };

  const handleOpenShortcuts = () => {
    setTempShortcuts([...activeShortcuts]);
    setShortcutsDialogOpen(true);
  };

  const handleSaveShortcuts = () => {
    saveShortcutsMutation.mutate(tempShortcuts);
    setShortcutsDialogOpen(false);
  };

  // Get current snapshot value for an action to track changes
  const getSnapshotValue = (key) => {
    switch (key) {
      case 'draft_items': return String(actions.draftItems || 0);
      case 'pending_reviews': return String(actions.pendingReviews || 0);
      case 'failed_publishes': return String(actions.failedPublishes || 0);
      case 'top_performer': return actions.topPerformer?.title?.substring(0, 50) || '';
      case 'trending_topic': return actions.trendingTopic?.keyword || '';
      default:
        if (key.startsWith('expiring_token_')) return key;
        return '';
    }
  };

  // Check if dismissed action has changed (show again if data changed)
  const isEffectivelyDismissed = (key) => {
    const state = getState(key);
    if (state.is_permanently_deleted) return true;
    if (!state.is_dismissed) return false;
    const currentSnapshot = getSnapshotValue(key);
    if (state.snapshot_value && currentSnapshot && state.snapshot_value !== currentSnapshot) return false;
    return true;
  };

  // Build widget data
  const getWidgetData = (id) => {
    const k = kpis;
    switch (id) {
      case 'pois': return { value: k.pois?.active || 0, subtext: `${fmtNum(k.pois?.total || 0)} totaal \u00B7 ${fmtNum(k.pois?.added || 0)} nieuw`, delta: k.pois?.delta };
      case 'reviews': return { value: k.reviews?.total || 0, subtext: `${fmtNum(k.reviews?.new || 0)} nieuw in periode`, delta: k.reviews?.delta };
      case 'chatbot': return { value: k.chatbot?.sessions || 0, subtext: `${fmtNum(k.chatbot?.messages || 0)} berichten`, delta: k.chatbot?.delta };
      case 'content': return { value: k.content?.total || 0, subtext: `${k.content?.published || 0} gepubliceerd \u00B7 ${k.content?.drafts || 0} concept`, delta: k.content?.delta };
      case 'users': return { value: k.users?.active || 0, subtext: `${k.users?.total || 0} totaal`, delta: null };
      case 'agents': return { value: k.agents?.total || 0, subtext: `${k.agents?.alerts || 0} alerts \u00B7 ${fmtNum(k.agents?.jobs || 0)} jobs`, delta: null };
      case 'uptime': return { value: `${k.uptime?.hours || 0}h`, subtext: t('dashboard.processUptime', 'Process uptime'), delta: null };
      default: return { value: '\u2014' };
    }
  };

  const periodLabel = period === 7 ? '7 dagen' : period === 30 ? '30 dagen' : '90 dagen';

  // Build action items list
  const actionItems = [];
  if (actions.draftItems > 0) {
    actionItems.push({
      key: 'draft_items',
      icon: <EditIcon fontSize="small" color="info" />,
      text: `${actions.draftItems} ${t('dashboard.draftItems', 'concept items klaar voor review')}`,
      onClick: () => navigate('/content-studio?tab=items'),
    });
  }
  if (actions.pendingReviews > 0) {
    actionItems.push({
      key: 'pending_reviews',
      icon: <EditIcon fontSize="small" color="warning" />,
      text: `${actions.pendingReviews} ${t('dashboard.pendingReviews', 'items wachten op goedkeuring')}`,
      onClick: () => navigate('/content-studio?tab=items'),
    });
  }
  if (actions.failedPublishes > 0) {
    actionItems.push({
      key: 'failed_publishes',
      icon: <WarningAmberIcon fontSize="small" color="error" />,
      text: `${actions.failedPublishes} ${t('dashboard.failedPublishes', 'publicaties mislukt')}`,
      onClick: () => navigate('/content-studio?tab=items'),
    });
  }
  if (actions.expiringTokens?.length > 0) {
    actions.expiringTokens.forEach((tok, i) => {
      actionItems.push({
        key: `expiring_token_${tok.platform}_${i}`,
        icon: <WarningAmberIcon fontSize="small" color="warning" />,
        text: `${tok.platform} token ${tok.days_left < 0 ? 'verlopen' : `verloopt over ${tok.days_left} dagen`}`,
        onClick: () => navigate('/content-studio?tab=social'),
      });
    });
  }
  if (actions.topPerformer) {
    actionItems.push({
      key: 'top_performer',
      icon: <TrendingUpIcon fontSize="small" color="success" />,
      text: `${t('dashboard.topPerformer', 'Top performer')}: "${actions.topPerformer.title?.substring(0, 40)}" (${fmtNum(actions.topPerformer.total_reach || actions.topPerformer.total_engagement || 0)} reach)`,
    });
  }
  if (actions.trendingTopic) {
    actionItems.push({
      key: 'trending_topic',
      icon: <TrendingUpIcon fontSize="small" color="primary" />,
      text: `${t('dashboard.trending', 'Trending')}: ${actions.trendingTopic.keyword}`,
    });
  }
  if (actions.pendingProspects > 0) {
    actionItems.push({
      key: 'pending_prospects',
      icon: <ExploreIcon fontSize="small" color="info" />,
      text: `${actions.pendingProspects} ${t('dashboard.pendingProspects', 'nieuwe POIs wachten op beoordeling (OSM Discovery)')}`,
      onClick: () => navigate('/pois'),
    });
  }
  if (actions.stalePois > 0) {
    actionItems.push({
      key: 'stale_pois',
      icon: <WarningAmberIcon fontSize="small" color="warning" />,
      text: `${actions.stalePois} ${t('dashboard.stalePois', 'POIs met verouderde content (freshness < 50)')}`,
      onClick: () => navigate('/pois'),
    });
  }

  // Add delegated-to-me items
  delegatedToMe.forEach(d => {
    actionItems.push({
      key: `delegated_${d.action_key}_${d.delegated_by_id}`,
      icon: <PersonAddIcon fontSize="small" color="info" />,
      text: `${t('dashboard.delegatedToYou', 'Gedelegeerd door')} ${d.delegated_by_name}: ${d.action_key.replace(/_/g, ' ')}`,
      isDelegatedToMe: true,
    });
  });

  // Count dismissed items (exclude permanently deleted from the "hidden" list)
  const dismissedKeys = actionItems.filter(a => {
    const state = getState(a.key);
    return isEffectivelyDismissed(a.key) && !state.is_permanently_deleted;
  }).map(a => a.key);
  const visibleActions = actionItems.filter(a => !isEffectivelyDismissed(a.key));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {greeting}, {firstName}!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.platformDashboard', 'Platform Dashboard')} &middot; {userDest?.name || t('dashboard.allDestinations', 'Alle bestemmingen')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
              <KpiWidget widget={widget} value={data.value} subtext={data.subtext} delta={data.delta} loading={kpiLoading}
                onClick={widget.path ? () => navigate(widget.path) : undefined} />
            </Grid>
          );
        })}
      </Grid>

      {/* Actions Required */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
          {t('dashboard.actionsRequired', 'Acties vereist')}
          {visibleActions.length > 0 && (
            <Chip label={visibleActions.filter(a => !getState(a.key).is_read).length} size="small"
              sx={{ ml: 1, height: 18, fontSize: 10, bgcolor: 'primary.main', color: 'white' }} />
          )}
        </Typography>
        {dismissedKeys.length > 0 && (
          <>
            <Button size="small" startIcon={<RestoreIcon sx={{ fontSize: 14 }} />}
              onClick={(e) => setDismissedMenuAnchor(e.currentTarget)}
              sx={{ textTransform: 'none', fontSize: 11 }}>
              {dismissedKeys.length} {t('dashboard.dismissed', 'verborgen')}
            </Button>
            <Menu anchorEl={dismissedMenuAnchor} open={Boolean(dismissedMenuAnchor)}
              onClose={() => setDismissedMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
              <MenuItem onClick={() => { dismissedKeys.forEach(k => restoreMutation.mutate({ actionKey: k })); setDismissedMenuAnchor(null); }}>
                <ListItemIcon><RestoreIcon fontSize="small" /></ListItemIcon>
                <ListItemText>{t('dashboard.restoreAll', 'Alles herstellen')}</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { dismissedKeys.forEach(k => permanentDeleteMutation.mutate({ actionKey: k })); setDismissedMenuAnchor(null); }}
                sx={{ color: 'error.main' }}>
                <ListItemIcon><DeleteForeverIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText>{t('dashboard.permanentDeleteAll', 'Permanent verwijderen')}</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {actionLoading ? (
            <Box><Skeleton height={32} /><Skeleton height={32} /><Skeleton height={32} /></Box>
          ) : visibleActions.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {visibleActions.map(action => {
                const state = getState(action.key);
                return (
                  <ActionRow
                    key={action.key}
                    actionKey={action.key}
                    icon={action.icon}
                    text={action.text}
                    onClick={action.onClick}
                    isRead={!!state.is_read}
                    isDismissed={false}
                    delegatedToName={state.delegated_to_name?.trim() || null}
                    onDismiss={handleDismiss}
                    onToggleRead={handleToggleRead}
                    onDelegate={handleOpenDelegate}
                  />
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              {t('dashboard.noActions', 'Geen openstaande acties. Alles op orde!')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
          {t('dashboard.quickActions', 'Snelkoppelingen')}
        </Typography>
        <Tooltip title={t('dashboard.customizeShortcuts', 'Snelkoppelingen aanpassen')}>
          <IconButton onClick={handleOpenShortcuts} size="small" sx={{ p: 0.5 }}>
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {activeShortcuts.map(shortcutId => {
          const shortcut = ALL_SHORTCUTS.find(s => s.id === shortcutId);
          if (!shortcut) return null;
          const ShortcutIcon = shortcut.icon;
          return (
            <Grid item xs={6} md={3} key={shortcutId}>
              <Card role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(shortcut.path); } }}
                sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }, transition: 'all 200ms ease' }}
                onClick={() => navigate(shortcut.path)}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ color: shortcut.color }}><ShortcutIcon /></Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{shortcut.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
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

      {/* Delegate Dialog */}
      <Dialog open={delegateDialogOpen} onClose={() => setDelegateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('dashboard.delegateAction', 'Actie delegeren')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard.delegateDesc', 'Kies een gebruiker om deze actie aan te delegeren.')}
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>{t('dashboard.selectUser', 'Selecteer gebruiker')}</InputLabel>
            <Select
              value={delegateUserId}
              onChange={(e) => setDelegateUserId(e.target.value)}
              label={t('dashboard.selectUser', 'Selecteer gebruiker')}
            >
              {delegates.map(u => (
                <MenuItem key={u.id} value={u.id}>
                  <Box>
                    <Typography variant="body2">{u.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{u.email} &middot; {u.role}</Typography>
                  </Box>
                </MenuItem>
              ))}
              {delegates.length === 0 && (
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.noUsersAvailable', 'Geen gebruikers beschikbaar')}
                  </Typography>
                </MenuItem>
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelegateDialogOpen(false)}>{t('common.cancel', 'Annuleren')}</Button>
          <Button onClick={handleConfirmDelegate} variant="contained" disabled={!delegateUserId || delegateMutation.isLoading}>
            {t('dashboard.delegate', 'Delegeren')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Shortcuts Customize Dialog */}
      <Dialog open={shortcutsDialogOpen} onClose={() => setShortcutsDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('dashboard.customizeShortcuts', 'Snelkoppelingen aanpassen')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('dashboard.shortcutsDesc', 'Selecteer welke snelkoppelingen je op het dashboard wilt zien.')}
          </Typography>
          <FormGroup>
            {ALL_SHORTCUTS.map(shortcut => {
              const ShortcutIcon = shortcut.icon;
              return (
                <FormControlLabel
                  key={shortcut.id}
                  control={
                    <Checkbox
                      checked={tempShortcuts.includes(shortcut.id)}
                      onChange={(e) => {
                        if (e.target.checked) setTempShortcuts(prev => [...prev, shortcut.id]);
                        else setTempShortcuts(prev => prev.filter(id => id !== shortcut.id));
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ShortcutIcon sx={{ fontSize: 18, color: shortcut.color }} />
                      <Typography variant="body2">{shortcut.label}</Typography>
                    </Box>
                  }
                />
              );
            })}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setTempShortcuts([...DEFAULT_SHORTCUTS]); }} color="inherit" sx={{ mr: 'auto' }}>
            {t('common.reset', 'Standaard')}
          </Button>
          <Button onClick={() => setShortcutsDialogOpen(false)}>{t('common.cancel', 'Annuleren')}</Button>
          <Button onClick={handleSaveShortcuts} variant="contained">{t('common.save', 'Opslaan')}</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={!!snackMsg}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
