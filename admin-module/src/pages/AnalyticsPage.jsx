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
import useDestinationStore from '../stores/destinationStore.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { formatNumber } from '../utils/formatters.js';

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
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
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

      <TrendDialog open={trendDialog.open} onClose={() => setTrendDialog({ ...trendDialog, open: false })}
        metric={trendDialog.metric} destination={destination} t={t} />
    </Box>
  );
}


// ════════════════════════════════════════════
// TAB 4: Executive Report
// ════════════════════════════════════════════
function ReportTab({ destination, t }) {
  const [period, setPeriod] = useState('last_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [commentary, setCommentary] = useState('');

  const startParam = period === 'custom' ? customStart : undefined;
  const endParam = period === 'custom' ? customEnd : undefined;
  const enabled = period !== 'custom' || (!!customStart && !!customEnd);

  const { data, isLoading } = useAnalyticsReport(destination, period, startParam, endParam, enabled);
  const report = data?.data || {};
  const contentData = report.content || {};
  const topContent = report.topContent || [];
  const reviews = report.reviews || {};
  const chatbot = report.chatbot || {};
  const dest = report.destination || {};
  const periodInfo = report.period || {};

  const periodLabel = period === 'last_week' ? t('analytics.report.lastWeek', 'Vorige week')
    : period === 'last_month' ? t('analytics.report.lastMonth', 'Vorige maand')
    : `${periodInfo.start || customStart} — ${periodInfo.end || customEnd}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box>
      {/* Controls — hidden on print */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap', '@media print': { display: 'none' } }}>
        <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small">
          <ToggleButton value="last_week" sx={{ textTransform: 'none' }}>
            {t('analytics.report.lastWeek', 'Vorige week')}
          </ToggleButton>
          <ToggleButton value="last_month" sx={{ textTransform: 'none' }}>
            {t('analytics.report.lastMonth', 'Vorige maand')}
          </ToggleButton>
          <ToggleButton value="custom" sx={{ textTransform: 'none' }}>
            {t('analytics.report.custom', 'Aangepast')}
          </ToggleButton>
        </ToggleButtonGroup>

        {period === 'custom' && (
          <>
            <TextField type="date" size="small" label="Van" value={customStart}
              onChange={e => setCustomStart(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <TextField type="date" size="small" label="Tot" value={customEnd}
              onChange={e => setCustomEnd(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
          </>
        )}

        <Box sx={{ flex: 1 }} />

        <Tooltip title={t('analytics.report.printPdf', 'Afdrukken als PDF (Ctrl+P)')}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} size="small"
            sx={{ textTransform: 'none' }}>
            {t('analytics.report.exportPdf', 'PDF / Afdrukken')}
          </Button>
        </Tooltip>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={200} />
        </Box>
      ) : (
        <Box data-print-report-area sx={{ '@media print': { '& *': { visibility: 'visible !important' }, position: 'absolute', left: 0, top: 0, width: '100%' } }}>
          {/* ── Branded Header ── */}
          <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #5E8B7E 0%, #2C3E50 100%)', color: '#fff', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {t('analytics.report.title', 'Content Performance Rapport')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.9 }}>
                  {dest.name || 'HolidaiButler'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end', mb: 0.5 }}>
                  <CalendarTodayIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2">{periodLabel}</Typography>
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {t('analytics.report.generated', 'Gegenereerd')}: {new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* ── Executive Summary ── */}
          <Card sx={{ p: 2.5, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', fontSize: 11, color: 'text.secondary', letterSpacing: 0.5 }}>
              {t('analytics.report.executiveSummary', 'Executive Summary')}
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
              {t('analytics.report.summaryText', 'In deze periode zijn {{total}} content items aangemaakt, waarvan {{published}} gepubliceerd en {{scheduled}} ingepland. {{reviewCount}} nieuwe reviews ontvangen met een gemiddelde rating van {{avgRating}}. De chatbot heeft {{sessions}} sessies afgehandeld met {{messages}} berichten.', {
                total: contentData.total || 0,
                published: contentData.published || 0,
                scheduled: contentData.scheduled || 0,
                reviewCount: reviews.count || 0,
                avgRating: reviews.avgRating || '-',
                sessions: chatbot.sessions || 0,
                messages: chatbot.messages || 0,
              })}
            </Typography>
          </Card>

          {/* ── KPI Blocks (rapport-stijl) ── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: t('analytics.report.kpi.totalContent', 'Totaal content'), value: contentData.total || 0, color: '#5E8B7E' },
              { label: t('analytics.report.kpi.published', 'Gepubliceerd'), value: contentData.published || 0, color: '#27AE60' },
              { label: t('analytics.report.kpi.scheduled', 'Ingepland'), value: contentData.scheduled || 0, color: '#2196f3' },
              { label: t('analytics.report.kpi.drafts', 'Concepten'), value: contentData.drafts || 0, color: '#9e9e9e' },
              { label: t('analytics.report.kpi.reviews', 'Nieuwe reviews'), value: reviews.count || 0, color: '#f59e0b' },
              { label: t('analytics.report.kpi.chatSessions', 'Chatbot sessies'), value: chatbot.sessions || 0, color: '#8b5cf6' },
            ].map((kpi, idx) => (
              <Grid item xs={6} md={2} key={idx}>
                <Card sx={{ p: 2, textAlign: 'center', borderTop: `3px solid ${kpi.color}` }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: kpi.color }}>{kpi.value}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{kpi.label}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* ── Content by Platform ── */}
          {(contentData.byPlatform || []).length > 0 && (
            <Card sx={{ p: 2.5, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', fontSize: 11, color: 'text.secondary', letterSpacing: 0.5 }}>
                {t('analytics.report.byPlatform', 'Content per platform')}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                      <TableCell>Platform</TableCell>
                      <TableCell align="center">{t('analytics.report.total', 'Totaal')}</TableCell>
                      <TableCell align="center">{t('analytics.report.kpi.published', 'Gepubliceerd')}</TableCell>
                      <TableCell align="center">{t('analytics.report.publishRate', 'Publicatie %')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(contentData.byPlatform || []).map((p, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.target_platform}</TableCell>
                        <TableCell align="center">{p.count}</TableCell>
                        <TableCell align="center">{p.published}</TableCell>
                        <TableCell align="center">
                          <Chip label={`${p.count > 0 ? Math.round((p.published / p.count) * 100) : 0}%`}
                            size="small" color={p.count > 0 && (p.published / p.count) >= 0.5 ? 'success' : 'default'}
                            sx={{ fontSize: 11, height: 20 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* ── Content by Pillar ── */}
          {(contentData.byPillar || []).length > 0 && (
            <Card sx={{ p: 2.5, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', fontSize: 11, color: 'text.secondary', letterSpacing: 0.5 }}>
                {t('analytics.report.byPillar', 'Content per pillar')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {(contentData.byPillar || []).map((p, i) => (
                  <Card key={i} variant="outlined" sx={{ p: 2, minWidth: 140, textAlign: 'center', borderTop: `3px solid ${p.pillar_color || '#5E8B7E'}` }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{p.count}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{p.pillar_name}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">{p.published} gepubliceerd</Typography>
                  </Card>
                ))}
              </Box>
            </Card>
          )}

          {/* ── Top Performers ── */}
          {topContent.length > 0 && (
            <Card sx={{ p: 2.5, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', fontSize: 11, color: 'text.secondary', letterSpacing: 0.5 }}>
                {t('analytics.report.topPerformers', 'Top performers')}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                      <TableCell>#</TableCell>
                      <TableCell>{t('analytics.report.contentTitle', 'Titel')}</TableCell>
                      <TableCell>Platform</TableCell>
                      <TableCell>Pillar</TableCell>
                      <TableCell align="center">SEO</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topContent.map((item, i) => (
                      <TableRow key={item.id} hover>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{item.target_platform}</TableCell>
                        <TableCell>{item.pillar_name || '-'}</TableCell>
                        <TableCell align="center">
                          {item.seo_score ? (
                            <Chip label={item.seo_score} size="small" color={item.seo_score >= 70 ? 'success' : item.seo_score >= 40 ? 'warning' : 'default'} sx={{ fontSize: 11, height: 20 }} />
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip label={item.approval_status} size="small" sx={{ fontSize: 10, height: 18 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* ── Commentary Field ── */}
          <Card sx={{ p: 2.5, mb: 3, '@media print': { minHeight: 100 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', fontSize: 11, color: 'text.secondary', letterSpacing: 0.5 }}>
              {t('analytics.report.commentary', 'Opmerkingen')}
            </Typography>
            <TextField
              multiline rows={3} fullWidth variant="outlined" size="small"
              placeholder={t('analytics.report.commentaryPlaceholder', 'Voeg persoonlijke opmerkingen toe aan dit rapport...')}
              value={commentary} onChange={e => setCommentary(e.target.value)}
              sx={{ '@media print': { '& .MuiOutlinedInput-notchedOutline': { border: 'none' } } }}
            />
          </Card>

          {/* ── Footer ── */}
          <Box sx={{ textAlign: 'center', py: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              PubliQio Content Studio · {dest.name || 'HolidaiButler'} · {periodLabel}
            </Typography>
          </Box>
        </Box>
      )}
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
  const [activeTab, setActiveTab] = useState(0);
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
        <Tab icon={<DescriptionIcon sx={{ fontSize: 18 }} />} iconPosition="start"
          label={t('analytics.tab.report', 'Rapport')} sx={{ textTransform: 'none', minHeight: 48 }} />
      </Tabs>

      {activeTab === 0 && <WebsiteTab destination={destParam} t={t} />}
      {activeTab === 1 && <PoiReviewsTab destination={destParam} t={t} isLoading={isLoading} analytics={analytics} snapshot={snapshot} />}
      {activeTab === 2 && <ChatbotTab destination={destParam} t={t} />}
      {activeTab === 3 && <ReportTab destination={destParam} t={t} />}
    </Box>
  );
}
