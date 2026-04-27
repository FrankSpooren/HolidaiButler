import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Grid, Skeleton, Button, ButtonGroup, Tooltip, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, ToggleButton, ToggleButtonGroup,
  IconButton, Tabs, Tab, TextField
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PlaceIcon from '@mui/icons-material/Place';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ChatIcon from '@mui/icons-material/Chat';
import MessageIcon from '@mui/icons-material/Message';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerIcon from '@mui/icons-material/Timer';
import LanguageIcon from '@mui/icons-material/Language';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import PrintIcon from '@mui/icons-material/Print';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PublicIcon from '@mui/icons-material/Public';
import DevicesIcon from '@mui/icons-material/Devices';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import LinkIcon from '@mui/icons-material/Link';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, Area, AreaChart
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAnalyticsOverview, useChatbotAnalytics, useAnalyticsTrend, useAnalyticsSnapshot, useWebsiteAnalytics, useAnalyticsReport } from '../hooks/useAnalytics.js';
import { analyticsService } from '../api/analyticsService.js';
import { ChromaDBStatusPanel, FallbackAnalysisPanel, SyncTriggersPanel } from '../components/chatbot/ChatbotAdminPanels.jsx';
import useDestinationStore from '../stores/destinationStore.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { formatNumber } from '../utils/formatters.js';
import ContentAnalyseTab from './ContentAnalyseTab.jsx';
import EditNoteIcon from '@mui/icons-material/EditNote';

const PIE_COLORS = ['#5E8B7E', '#1976d2', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
const LANG_LABELS = { nl: 'Nederlands', en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français' };

function DeltaBadge({ value, suffix = '' }) {
  if (value === null || value === undefined || value === 0) {
    return (
      <Chip icon={<RemoveIcon sx={{ fontSize: 14 }} />} label={`0${suffix}`} size="small"
        sx={{ height: 20, fontSize: 11, bgcolor: 'action.hover', color: 'text.secondary', '& .MuiChip-icon': { color: 'text.secondary' } }} />
    );
  }
  const isPositive = value > 0;
  return (
    <Chip
      icon={isPositive ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardIcon sx={{ fontSize: 14 }} />}
      label={`${isPositive ? '+' : ''}${value}${suffix}`} size="small"
      sx={{ height: 20, fontSize: 11,
        bgcolor: isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
        color: isPositive ? '#16a34a' : '#dc2626',
        '& .MuiChip-icon': { color: isPositive ? '#16a34a' : '#dc2626' }
      }}
    />
  );
}

function KpiCard({ icon: Icon, label, value, color, delta, clickable, onClick, loading }) {
  if (loading) return <Skeleton variant="rounded" height={90} />;
  return (
    <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, ...(clickable && { cursor: 'pointer', '&:hover': { boxShadow: 3 } }) }}
      onClick={clickable ? onClick : undefined}>
      <Box sx={{ p: 1, borderRadius: 1, bgcolor: color + '18' }}>
        <Icon sx={{ color }} />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {typeof value === 'number' ? formatNumber(value) : (value ?? '—')}
          </Typography>
          {delta !== undefined && <DeltaBadge value={delta} />}
        </Box>
      </Box>
      {clickable && <OpenInNewIcon sx={{ fontSize: 14, color: '#94a3b8' }} />}
    </Card>
  );
}

function TrendDialog({ open, onClose, metric, destination, t }) {
  const [period, setPeriod] = useState(30);
  const { data, isLoading } = useAnalyticsTrend(metric, destination, period, open);
  const points = data?.data?.points || [];
  const metricLabels = { sessions: t('analytics.chatbot.sessions'), reviews: t('analytics.kpi.totalReviews'), messages: t('analytics.chatbot.messages'), pois: t('analytics.kpi.totalPois') };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('analytics.trend.title')}: {metricLabels[metric] || metric}
        <IconButton onClick={onClose} size="small" aria-label="Sluiten"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small">
            <ToggleButton value={7}>7d</ToggleButton>
            <ToggleButton value={30}>30d</ToggleButton>
            <ToggleButton value={90}>90d</ToggleButton>
            <ToggleButton value={365}>1y</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {isLoading ? <Skeleton variant="rounded" height={300} /> : points.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={points}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} />
              <ReTooltip />
              <Area type="monotone" dataKey="value" stroke="#5E8B7E" fill="#5E8B7E18" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>{t('analytics.trend.noData')}</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════
// TAB 1: Website Analytics (SimpleAnalytics)
// ════════════════════════════════════════════
function WebsiteTab({ destination, t }) {
  const [period, setPeriod] = useState(30);
  const { data, isLoading } = useWebsiteAnalytics(destination, period);
  const w = data?.data || {};

  const chart = w.chart || [];
  const pages = w.pages || [];
  const referrers = w.referrers || [];
  const events = w.events || [];

  // Clean event names for display
  const formatEventName = (name) => {
    return name.replace(/_/g, ' ').replace(/(desktop|mobile)$/i, (m) => `(${m})`).replace(/^./, c => c.toUpperCase());
  };

  return (
    <Box>
      {/* Period selector */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small">
          <ToggleButton value={7}>7d</ToggleButton>
          <ToggleButton value={30}>30d</ToggleButton>
          <ToggleButton value={90}>90d</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <KpiCard icon={PublicIcon} label={t('analytics.website.visitors', 'Bezoekers')} value={w.visitors} color="#5E8B7E" delta={w.visitorsGrowth} loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard icon={TouchAppIcon} label={t('analytics.website.pageviews', 'Paginaweergaven')} value={w.pageviews} color="#1976d2" delta={w.viewsGrowth} loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard icon={TrendingUpIcon} label={t('analytics.website.avgPerDay', 'Gem. per dag')} value={w.avgPerDay} color="#f59e0b" loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={3}>
          {isLoading ? <Skeleton variant="rounded" height={90} /> : (
            <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: '#8b5cf618' }}>
                <DevicesIcon sx={{ color: '#8b5cf6' }} />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">{t('analytics.website.devices', 'Apparaten')}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIphoneIcon sx={{ fontSize: 16, color: '#64748b' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{w.devices?.mobile || 0}%</Typography>
                  <DesktopWindowsIcon sx={{ fontSize: 16, color: '#64748b', ml: 1 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{w.devices?.desktop || 0}%</Typography>
                </Box>
              </Box>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Visitors chart */}
      {isLoading ? <Skeleton variant="rounded" height={280} /> : chart.length > 0 && (
        <Card sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
            {t('analytics.website.visitorsChart', 'Bezoekers & Paginaweergaven')}
          </Typography>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} />
              <ReTooltip />
              <Area type="monotone" dataKey="visitors" stroke="#5E8B7E" fill="#5E8B7E18" strokeWidth={2} name={t('analytics.website.visitors', 'Bezoekers')} />
              <Area type="monotone" dataKey="pageviews" stroke="#1976d2" fill="#1976d218" strokeWidth={1.5} name={t('analytics.website.pageviews', 'Paginaweergaven')} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Top pages */}
        <Grid item xs={12} md={6}>
          {isLoading ? <Skeleton variant="rounded" height={340} /> : (
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                {t('analytics.website.topPages', 'Top Pagina\'s')}
              </Typography>
              {pages.length > 0 ? (
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>{t('analytics.website.page', 'Pagina')}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>{t('analytics.website.visitors', 'Bezoekers')}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>{t('analytics.website.views', 'Views')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pages.map((p, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.path || '/'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{formatNumber(p.visitors)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{formatNumber(p.pageviews)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>{t('analytics.website.noData', 'Geen data beschikbaar')}</Typography>
              )}
            </Card>
          )}
        </Grid>

        {/* Referrers */}
        <Grid item xs={12} md={6}>
          {isLoading ? <Skeleton variant="rounded" height={340} /> : (
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <LinkIcon sx={{ fontSize: 18, color: '#64748b' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('analytics.website.referrers', 'Verkeersbronnen')}
                </Typography>
              </Box>
              {referrers.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={referrers.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} width={100} />
                      <ReTooltip />
                      <Bar dataKey="visitors" fill="#5E8B7E" radius={[0, 4, 4, 0]} name={t('analytics.website.visitors', 'Bezoekers')} />
                    </BarChart>
                  </ResponsiveContainer>
                  <TableContainer sx={{ maxHeight: 140, mt: 1 }}>
                    <Table size="small">
                      <TableBody>
                        {referrers.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ fontSize: '0.8rem', py: 0.5 }}>{r.source || 'Direct'}</TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.8rem', py: 0.5, fontWeight: 600 }}>{formatNumber(r.visitors)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>{t('analytics.website.noData', 'Geen data beschikbaar')}</Typography>
              )}
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Custom Events */}
      {!isLoading && events.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <TouchAppIcon sx={{ fontSize: 18, color: '#64748b' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('analytics.website.events', 'Gebruikersinteracties')}
            </Typography>
          </Box>
          <Grid container spacing={1}>
            {events.slice(0, 16).map((ev, i) => (
              <Grid item xs={6} sm={4} md={3} key={i}>
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatNumber(ev.total)}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block' }}>{formatEventName(ev.name)}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════
// TAB 2: POI & Reviews
// ════════════════════════════════════════════
function PoiReviewsTab({ destination, t, isLoading, analytics, snapshot }) {
  const overview = analytics.overview || {};
  const reviewTrends = analytics.reviewTrends || [];
  const topPois = analytics.topPois || analytics.topPOIs || [];
  const categoryDistribution = analytics.categoryDistribution || [];
  const deltas = snapshot.deltas || {};
  const [trendDialog, setTrendDialog] = useState({ open: false, metric: 'reviews' });

  return (
    <Box>
      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <KpiCard icon={PlaceIcon} label={t('analytics.kpi.totalPois')} value={overview.totalPOIs ?? overview.totalPois} color="#1976d2"
            clickable onClick={() => setTrendDialog({ open: true, metric: 'pois' })} loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard icon={StarIcon} label={t('analytics.kpi.totalReviews')} value={overview.totalReviews} color="#f59e0b"
            delta={deltas.reviews?.weeklyChange} clickable onClick={() => setTrendDialog({ open: true, metric: 'reviews' })} loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard icon={TrendingUpIcon} label={t('analytics.kpi.avgRating')}
            value={overview.avgRating ? Number(overview.avgRating).toFixed(1) : '—'} color="#22c55e" loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard icon={PlaceIcon} label={t('analytics.kpi.categories', 'Categorieën')}
            value={categoryDistribution.length} color="#8b5cf6" loading={isLoading} />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          {isLoading ? <Skeleton variant="rounded" height={300} /> : (
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{t('analytics.charts.reviewTrends')}</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={reviewTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip />
                  <Line type="monotone" dataKey="count" stroke="#5E8B7E" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {isLoading ? <Skeleton variant="rounded" height={300} /> : (
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{t('analytics.charts.categoryDistribution')}</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={categoryDistribution.slice(0, 8)} dataKey="count" nameKey="category"
                    cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryDistribution.slice(0, 8).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Top POIs */}
      {!isLoading && topPois.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{t('analytics.topPois')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                  <TableCell>#</TableCell>
                  <TableCell>{t('analytics.table.name')}</TableCell>
                  <TableCell>{t('analytics.table.destination')}</TableCell>
                  <TableCell align="center">{t('analytics.table.reviews')}</TableCell>
                  <TableCell align="center">{t('analytics.table.rating')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topPois.map((poi, i) => (
                  <TableRow key={poi.id} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{poi.name}</TableCell>
                    <TableCell>{poi.destination_id === 2 ? 'Texel' : 'Calpe'}</TableCell>
                    <TableCell align="center">{poi.reviewCount}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3 }}>
                        <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                        {Number(poi.avgRating).toFixed(1)}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* ChromaDB Status + Sync + Fallback panels */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <ChromaDBStatusPanel />
        </Grid>
        <Grid item xs={12} md={6}>
          <FallbackAnalysisPanel />
        </Grid>
      </Grid>
      <Box sx={{ mt: 2 }}>
        <SyncTriggersPanel />
      </Box>

      <TrendDialog open={trendDialog.open} onClose={() => setTrendDialog({ ...trendDialog, open: false })}
        metric={trendDialog.metric} destination={destination} t={t} />
    </Box>
  );
}

// ════════════════════════════════════════════
// TAB 3: Chatbot
// ════════════════════════════════════════════
function ChatbotTab({ destination, t }) {
  const { data: chatbotData, isLoading } = useChatbotAnalytics(destination, 30);
  const { data: snapshotData } = useAnalyticsSnapshot(destination);
  const chatbot = chatbotData?.data || {};
  const chatTotals = chatbot.totals || {};
  const sessionsPerDay = chatbot.sessionsPerDay || [];
  const chatLanguages = chatbot.languages || [];
  const deltas = snapshotData?.data?.deltas || {};
  const [trendDialog, setTrendDialog] = useState({ open: false, metric: 'sessions' });

  return (
    <Box>
      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <KpiCard icon={ChatIcon} label={t('analytics.chatbot.sessions')} value={chatTotals.sessions} color="#8b5cf6"
            delta={deltas.sessions?.weeklyChange} clickable onClick={() => setTrendDialog({ open: true, metric: 'sessions' })} loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard icon={MessageIcon} label={t('analytics.chatbot.messages')} value={chatTotals.messages} color="#1976d2"
            clickable onClick={() => setTrendDialog({ open: true, metric: 'messages' })} loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard icon={SpeedIcon} label={t('analytics.chatbot.avgMessages')} value={chatTotals.avgMessagesPerSession} color="#22c55e" loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard icon={WarningAmberIcon} label={t('analytics.chatbot.fallbackRate')}
            value={chatTotals.fallbackRate !== undefined ? `${chatTotals.fallbackRate}%` : '—'}
            color={chatTotals.fallbackRate > 30 ? '#ef4444' : '#8b5cf6'} loading={isLoading} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Sessions per day */}
        <Grid item xs={12} md={8}>
          {isLoading ? <Skeleton variant="rounded" height={280} /> : (
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{t('analytics.chatbot.sessionsPerDay')}</Typography>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={sessionsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip />
                  <Area type="monotone" dataKey="sessions" stroke="#8b5cf6" fill="#8b5cf618" strokeWidth={2} name={t('analytics.chatbot.sessions')} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}
        </Grid>

        {/* Language distribution */}
        <Grid item xs={12} md={4}>
          {isLoading ? <Skeleton variant="rounded" height={280} /> : (
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LanguageIcon sx={{ fontSize: 18, color: '#64748b' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('analytics.chatbot.languages')}</Typography>
              </Box>
              {chatLanguages.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={chatLanguages} dataKey="count" nameKey="language" cx="50%" cy="50%" outerRadius={70}
                      label={({ language, pct }) => `${LANG_LABELS[language] || language} ${pct}%`} labelLine={false}>
                      {chatLanguages.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>{t('analytics.chatbot.noData')}</Typography>
              )}
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Response time */}
      {!isLoading && chatTotals.avgResponseMs && (
        <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TimerIcon sx={{ color: '#f59e0b' }} />
          <Box>
            <Typography variant="caption" color="text.secondary">{t('analytics.chatbot.avgResponse')}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{chatTotals.avgResponseMs}ms</Typography>
          </Box>
        </Card>
      )}

      {/* ChromaDB Status + Sync + Fallback panels */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <ChromaDBStatusPanel />
        </Grid>
        <Grid item xs={12} md={6}>
          <FallbackAnalysisPanel />
        </Grid>
      </Grid>
      <Box sx={{ mt: 2 }}>
        <SyncTriggersPanel />
      </Box>

      <TrendDialog open={trendDialog.open} onClose={() => setTrendDialog({ ...trendDialog, open: false })}
        metric={trendDialog.metric} destination={destination} t={t} />
    </Box>
  );
}


// ════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════
export default function AnalyticsPage() {
  const { t } = useTranslation();
  const globalDestination = useDestinationStore(s => s.selectedDestination);
  const [destination, setDestination] = useState(globalDestination);
  const destParam = destination !== 'all' ? destination : undefined;
  const TAB_MAP = { website: 0, poi: 1, chatbot: 2, content: 3 };
  const initTab = TAB_MAP[new URLSearchParams(window.location.search).get('tab')] || 0;
  const [activeTab, setActiveTab] = useState(initTab);
  const [exporting, setExporting] = useState(null);

  useEffect(() => { setDestination(globalDestination); }, [globalDestination]);

  const { data, isLoading, error, refetch } = useAnalyticsOverview(destParam);
  const { data: snapshotData } = useAnalyticsSnapshot(destParam);
  const analytics = data?.data || {};
  const snapshot = snapshotData?.data || {};

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const blob = await analyticsService.exportCsv(type, destParam);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `holidaibutler-${type}-export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('analytics.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('analytics.subtitle')}</Typography>
        </Box>
        <ButtonGroup size="small" variant="outlined">
          <Button startIcon={<DownloadIcon />} onClick={() => handleExport('summary')} disabled={!!exporting}>
            {t('analytics.export.summary')}
          </Button>
          <Button onClick={() => handleExport('pois')} disabled={!!exporting}>{t('analytics.export.pois')}</Button>
          <Button onClick={() => handleExport('reviews')} disabled={!!exporting}>{t('analytics.export.reviews')}</Button>
        </ButtonGroup>
      </Box>

      {error && <ErrorBanner onRetry={refetch} />}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<PublicIcon sx={{ fontSize: 18 }} />} iconPosition="start"
          label={t('analytics.tab.website', 'Website')} sx={{ textTransform: 'none', minHeight: 48 }} />
        <Tab icon={<PlaceIcon sx={{ fontSize: 18 }} />} iconPosition="start"
          label={t('analytics.tab.poiReviews', 'POI & Reviews')} sx={{ textTransform: 'none', minHeight: 48 }} />
        <Tab icon={<ChatIcon sx={{ fontSize: 18 }} />} iconPosition="start"
          label={t('analytics.tab.chatbot', 'Chatbot')} sx={{ textTransform: 'none', minHeight: 48 }} />
        <Tab icon={<EditNoteIcon sx={{ fontSize: 18 }} />} iconPosition="start"
          label={t('analytics.tab.content', 'Content')} sx={{ textTransform: 'none', minHeight: 48 }} />
      </Tabs>

      {activeTab === 0 && <WebsiteTab destination={destParam} t={t} />}
      {activeTab === 1 && <PoiReviewsTab destination={destParam} t={t} isLoading={isLoading} analytics={analytics} snapshot={snapshot} />}
      {activeTab === 2 && <ChatbotTab destination={destParam} t={t} />}
      {activeTab === 3 && <ContentAnalyseTab destinationId={destParam} />}
    </Box>
  );
}
