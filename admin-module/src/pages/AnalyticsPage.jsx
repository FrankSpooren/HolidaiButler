import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Grid, Skeleton, Button, ButtonGroup, Tooltip, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, ToggleButton, ToggleButtonGroup,
  IconButton
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PlaceIcon from '@mui/icons-material/Place';
import StarIcon from '@mui/icons-material/Star';
import ArticleIcon from '@mui/icons-material/Article';
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
import {
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, Area, AreaChart
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAnalyticsOverview, useChatbotAnalytics, useAnalyticsTrend, useAnalyticsSnapshot, usePageviewAnalytics } from '../hooks/useAnalytics.js';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { analyticsService } from '../api/analyticsService.js';
import useDestinationStore from '../stores/destinationStore.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { formatNumber } from '../utils/formatters.js';

const PIE_COLORS = ['#1976d2', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
const LANG_LABELS = { nl: 'Nederlands', en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français' };

function DeltaBadge({ value, suffix = '' }) {
  if (value === null || value === undefined || value === 0) {
    return (
      <Chip
        icon={<RemoveIcon sx={{ fontSize: 14 }} />}
        label={`0${suffix}`}
        size="small"
        sx={{ height: 20, fontSize: 11, bgcolor: '#f1f5f9', color: '#64748b', '& .MuiChip-icon': { color: '#64748b' } }}
      />
    );
  }
  const isPositive = value > 0;
  return (
    <Chip
      icon={isPositive ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardIcon sx={{ fontSize: 14 }} />}
      label={`${isPositive ? '+' : ''}${value}${suffix}`}
      size="small"
      sx={{
        height: 20, fontSize: 11,
        bgcolor: isPositive ? '#dcfce7' : '#fee2e2',
        color: isPositive ? '#166534' : '#991b1b',
        '& .MuiChip-icon': { color: isPositive ? '#166534' : '#991b1b' }
      }}
    />
  );
}

function TrendDialog({ open, onClose, metric, destination, t }) {
  const [period, setPeriod] = useState(30);
  const { data, isLoading } = useAnalyticsTrend(metric, destination, period, open);
  const points = data?.data?.points || [];

  const metricLabels = {
    sessions: t('analytics.chatbot.sessions'),
    reviews: t('analytics.kpi.totalReviews'),
    messages: t('analytics.chatbot.messages'),
    pois: t('analytics.kpi.totalPois')
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('analytics.trend.title')}: {metricLabels[metric] || metric}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small">
            <ToggleButton value={7}>7d</ToggleButton>
            <ToggleButton value={30}>30d</ToggleButton>
            <ToggleButton value={90}>90d</ToggleButton>
            <ToggleButton value={365}>1y</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {isLoading ? <Skeleton variant="rounded" height={300} /> : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={points}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} />
              <ReTooltip />
              <Area type="monotone" dataKey="value" stroke="#1976d2" fill="#1976d218" strokeWidth={2} />
              {metric === 'messages' && (
                <>
                  <Area type="monotone" dataKey="userMessages" stroke="#22c55e" fill="#22c55e18" strokeWidth={1} />
                  <Area type="monotone" dataKey="botMessages" stroke="#f59e0b" fill="#f59e0b18" strokeWidth={1} />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
        {!isLoading && points.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {t('analytics.trend.noData')}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PageviewSection({ destination, t }) {
  const { data, isLoading } = usePageviewAnalytics(destination);
  const pv = data?.data || {};
  const trend = pv.trend || [];
  const byType = pv.by_page_type || [];
  const topPois = pv.top_pois || [];

  return (
    <Card sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <VisibilityIcon /> {t('analytics.pageviews.title')}
      </Typography>
      {pv.first_date && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          {t('analytics.pageviews.dataAvailableSince')} {new Date(pv.first_date).toLocaleDateString('nl-NL')}
        </Typography>
      )}
      {isLoading ? <Skeleton variant="rounded" height={200} /> : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={700}>{formatNumber(pv.total || 0)}</Typography>
                <Typography variant="caption" color="text.secondary">{t('analytics.pageviews.totalViews')}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={700}>{formatNumber(pv.today || 0)}</Typography>
                <Typography variant="caption" color="text.secondary">{t('analytics.pageviews.today')}</Typography>
              </Box>
            </Grid>
          </Grid>
          {trend.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('analytics.pageviews.trend')}</Typography>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip />
                  <Bar dataKey="views" fill="#1976d2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
          {byType.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('analytics.pageviews.byType')}</Typography>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={70} label={({ type, count }) => `${type} (${count})`}>
                      {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              {topPois.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('analytics.pageviews.topPois')}</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>POI</TableCell>
                        <TableCell align="right">{t('analytics.pageviews.views')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topPois.map((poi, i) => (
                        <TableRow key={poi.poi_id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{poi.name || `POI #${poi.poi_id}`}</TableCell>
                          <TableCell align="right">{poi.views}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Grid>
              )}
            </Grid>
          )}
          {!pv.total && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {t('analytics.pageviews.noData')}
            </Typography>
          )}
        </>
      )}
    </Card>
  );
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const globalDestination = useDestinationStore(s => s.selectedDestination);
  const [destination, setDestination] = useState(globalDestination);
  const destParam = destination !== 'all' ? destination : undefined;

  const { data, isLoading, error, refetch } = useAnalyticsOverview(destParam);
  const { data: chatbotData, isLoading: chatbotLoading } = useChatbotAnalytics(destParam, 30);
  const { data: snapshotData } = useAnalyticsSnapshot(destParam);
  const [exporting, setExporting] = useState(null);
  const [trendDialog, setTrendDialog] = useState({ open: false, metric: 'sessions' });

  useEffect(() => {
    setDestination(globalDestination);
  }, [globalDestination]);

  const analytics = data?.data || {};
  const overview = analytics.overview || {};
  const contentCoverage = analytics.contentCoverage || {};
  const reviewTrends = analytics.reviewTrends || [];
  const topPois = analytics.topPois || analytics.topPOIs || [];
  const categoryDistribution = analytics.categoryDistribution || [];

  const chatbot = chatbotData?.data || {};
  const chatTotals = chatbot.totals || {};
  const sessionsPerDay = chatbot.sessionsPerDay || [];
  const chatLanguages = chatbot.languages || [];

  const snapshot = snapshotData?.data || {};
  const deltas = snapshot.deltas || {};

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

  const openTrend = (metric) => setTrendDialog({ open: true, metric });

  const kpiCards = [
    {
      icon: PlaceIcon,
      label: t('analytics.kpi.totalPois'),
      value: overview.totalPOIs ?? overview.totalPois,
      color: '#1976d2',
      clickable: true,
      metric: 'pois'
    },
    {
      icon: StarIcon,
      label: t('analytics.kpi.totalReviews'),
      value: overview.totalReviews,
      color: '#f59e0b',
      delta: deltas.reviews?.weeklyChange,
      deltaLabel: t('analytics.delta.vs7d'),
      clickable: true,
      metric: 'reviews'
    },
    {
      icon: ChatIcon,
      label: t('analytics.chatbot.sessions'),
      value: chatTotals.sessions,
      color: '#8b5cf6',
      delta: deltas.sessions?.weeklyChange,
      deltaLabel: t('analytics.delta.vs7d'),
      clickable: true,
      metric: 'sessions'
    },
    {
      icon: TrendingUpIcon,
      label: t('analytics.kpi.avgRating'),
      value: overview.avgRating ? Number(overview.avgRating).toFixed(1) : '—',
      color: '#22c55e'
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('analytics.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('analytics.subtitle')}
          </Typography>
        </Box>
        <ButtonGroup size="small" variant="outlined">
          <Button startIcon={<DownloadIcon />} onClick={() => handleExport('summary')} disabled={!!exporting}>
            {t('analytics.export.summary')}
          </Button>
          <Button onClick={() => handleExport('pois')} disabled={!!exporting}>
            {t('analytics.export.pois')}
          </Button>
          <Button onClick={() => handleExport('reviews')} disabled={!!exporting}>
            {t('analytics.export.reviews')}
          </Button>
        </ButtonGroup>
      </Box>

      {error && <ErrorBanner onRetry={refetch} />}

      {/* KPI Cards with Delta Badges */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiCards.map((kpi, i) => (
          <Grid item xs={6} md={3} key={i}>
            {(isLoading || chatbotLoading) ? <Skeleton variant="rounded" height={90} /> : (
              <Card
                sx={{
                  p: 2, display: 'flex', alignItems: 'center', gap: 2,
                  ...(kpi.clickable && { cursor: 'pointer', '&:hover': { boxShadow: 3 } })
                }}
                onClick={() => kpi.clickable && openTrend(kpi.metric)}
              >
                <Box sx={{ p: 1, borderRadius: 1, bgcolor: kpi.color + '18' }}>
                  <kpi.icon sx={{ color: kpi.color }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {typeof kpi.value === 'number' ? formatNumber(kpi.value) : (kpi.value ?? '—')}
                    </Typography>
                    {kpi.delta !== undefined && <DeltaBadge value={kpi.delta} />}
                  </Box>
                </Box>
                {kpi.clickable && <OpenInNewIcon sx={{ fontSize: 14, color: '#94a3b8' }} />}
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      {/* Chatbot Analytics Section */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {t('analytics.chatbot.title')}
      </Typography>

      {/* Chatbot KPI Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { icon: MessageIcon, label: t('analytics.chatbot.messages'), value: chatTotals.messages, color: '#1976d2' },
          { icon: SpeedIcon, label: t('analytics.chatbot.avgMessages'), value: chatTotals.avgMessagesPerSession, color: '#22c55e' },
          { icon: TimerIcon, label: t('analytics.chatbot.avgResponse'), value: chatTotals.avgResponseMs ? `${chatTotals.avgResponseMs}ms` : '—', color: '#f59e0b' },
          { icon: WarningAmberIcon, label: t('analytics.chatbot.fallbackRate'), value: chatTotals.fallbackRate !== undefined ? `${chatTotals.fallbackRate}%` : '—', color: chatTotals.fallbackRate > 30 ? '#ef4444' : '#8b5cf6' }
        ].map((item, i) => (
          <Grid item xs={6} md={3} key={i}>
            {chatbotLoading ? <Skeleton variant="rounded" height={72} /> : (
              <Card sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: item.color + '18' }}>
                  <item.icon sx={{ color: item.color, fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{item.label}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                    {typeof item.value === 'number' ? formatNumber(item.value) : (item.value ?? '—')}
                  </Typography>
                </Box>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Sessions per Day (Area Chart) */}
        <Grid item xs={12} md={8}>
          {chatbotLoading ? <Skeleton variant="rounded" height={280} /> : (
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                {t('analytics.chatbot.sessionsPerDay')}
              </Typography>
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

        {/* Language Distribution (Pie) */}
        <Grid item xs={12} md={4}>
          {chatbotLoading ? <Skeleton variant="rounded" height={280} /> : (
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LanguageIcon sx={{ fontSize: 18, color: '#64748b' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('analytics.chatbot.languages')}
                </Typography>
              </Box>
              {chatLanguages.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chatLanguages}
                      dataKey="count"
                      nameKey="language"
                      cx="50%" cy="50%"
                      outerRadius={70}
                      label={({ language, pct }) => `${LANG_LABELS[language] || language} ${pct}%`}
                      labelLine={false}
                    >
                      {chatLanguages.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  {t('analytics.chatbot.noData')}
                </Typography>
              )}
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Original Analytics Section */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {t('analytics.contentTitle')}
      </Typography>

      {/* Charts Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Review Trends (Line Chart) */}
        <Grid item xs={12} md={8}>
          {isLoading ? <Skeleton variant="rounded" height={300} /> : (
            <Card sx={{ p: 2 }}>
              <Tooltip title={t('analytics.charts.reviewTrendsTooltip')} arrow>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  {t('analytics.charts.reviewTrends')}
                </Typography>
              </Tooltip>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={reviewTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip />
                  <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </Grid>

        {/* Category Distribution (Pie Chart) */}
        <Grid item xs={12} md={4}>
          {isLoading ? <Skeleton variant="rounded" height={300} /> : (
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                {t('analytics.charts.categoryDistribution')}
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryDistribution.slice(0, 8)}
                    dataKey="count"
                    nameKey="category"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryDistribution.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Content Coverage per Destination */}
      {!isLoading && contentCoverage.en && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Object.entries(contentCoverage).map(([lang, info]) => {
            if (!info?.pct && info?.pct !== 0) return null;
            const pct = info.pct;
            return (
              <Grid item xs={6} md={3} key={lang}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase' }}>
                    {lang} — {t('analytics.contentCoverage')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flexGrow: 1, bgcolor: '#e2e8f0', borderRadius: 1, height: 10 }}>
                      <Box sx={{ width: `${pct}%`, bgcolor: pct > 90 ? '#22c55e' : pct > 70 ? '#f59e0b' : '#ef4444', borderRadius: 1, height: '100%' }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 42 }}>{pct}%</Typography>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Top 10 POIs */}
      {!isLoading && topPois.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
            {t('analytics.topPois')}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8fafc' } }}>
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
                    <TableCell>{poi.destination_id === 2 ? '🇳🇱 Texel' : '🇪🇸 Calpe'}</TableCell>
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

      {/* Pageview Analytics (Fase 9B) */}
      <PageviewSection destination={destParam} t={t} />

      {/* Trend Drill-down Dialog */}
      <TrendDialog
        open={trendDialog.open}
        onClose={() => setTrendDialog({ ...trendDialog, open: false })}
        metric={trendDialog.metric}
        destination={destParam}
        t={t}
      />
    </Box>
  );
}
