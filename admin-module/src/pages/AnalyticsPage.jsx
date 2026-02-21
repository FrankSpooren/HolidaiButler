import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Grid, Skeleton, Button, ButtonGroup, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PlaceIcon from '@mui/icons-material/Place';
import StarIcon from '@mui/icons-material/Star';
import ArticleIcon from '@mui/icons-material/Article';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAnalyticsOverview } from '../hooks/useAnalytics.js';
import { analyticsService } from '../api/analyticsService.js';
import useDestinationStore from '../stores/destinationStore.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { formatNumber } from '../utils/formatters.js';

const PIE_COLORS = ['#1976d2', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const globalDestination = useDestinationStore(s => s.selectedDestination);
  const [destination, setDestination] = useState(globalDestination);
  const { data, isLoading, error, refetch } = useAnalyticsOverview(destination !== 'all' ? destination : undefined);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    setDestination(globalDestination);
  }, [globalDestination]);

  const analytics = data?.data || {};
  const overview = analytics.overview || {};
  const contentCoverage = analytics.contentCoverage || {};
  const reviewTrends = analytics.reviewTrends || [];
  const topPois = analytics.topPois || [];
  const categoryDistribution = analytics.categoryDistribution || [];

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const blob = await analyticsService.exportCsv(type, destination !== 'all' ? destination : undefined);
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

  const kpiCards = [
    { icon: PlaceIcon, label: t('analytics.kpi.totalPois'), value: overview.totalPois, color: '#1976d2' },
    { icon: StarIcon, label: t('analytics.kpi.totalReviews'), value: overview.totalReviews, color: '#f59e0b' },
    { icon: ArticleIcon, label: t('analytics.kpi.contentCoverage'), value: contentCoverage.overall ? `${contentCoverage.overall}%` : '—', color: '#8b5cf6' },
    { icon: TrendingUpIcon, label: t('analytics.kpi.avgRating'), value: overview.avgRating ? Number(overview.avgRating).toFixed(1) : '—', color: '#22c55e' }
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

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiCards.map((kpi, i) => (
          <Grid item xs={6} md={3} key={i}>
            {isLoading ? <Skeleton variant="rounded" height={90} /> : (
              <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1, borderRadius: 1, bgcolor: kpi.color + '18' }}>
                  <kpi.icon sx={{ color: kpi.color }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {typeof kpi.value === 'number' ? formatNumber(kpi.value) : kpi.value}
                  </Typography>
                </Box>
              </Card>
            )}
          </Grid>
        ))}
      </Grid>

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
      {!isLoading && contentCoverage.destinations && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Object.entries(contentCoverage.destinations).map(([dest, pct]) => (
            <Grid item xs={12} md={6} key={dest}>
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {dest === 'calpe' ? '\uD83C\uDDEA\uD83C\uDDF8 Calpe' : '\uD83C\uDDF3\uD83C\uDDF1 Texel'} — {t('analytics.contentCoverage')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1, bgcolor: '#e2e8f0', borderRadius: 1, height: 12 }}>
                    <Box sx={{ width: `${pct}%`, bgcolor: pct > 90 ? '#22c55e' : pct > 70 ? '#f59e0b' : '#ef4444', borderRadius: 1, height: '100%' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 60 }}>{pct}%</Typography>
                </Box>
              </Card>
            </Grid>
          ))}
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
                    <TableCell>{poi.destination_id === 2 ? '\uD83C\uDDF3\uD83C\uDDF1 Texel' : '\uD83C\uDDEA\uD83C\uDDF8 Calpe'}</TableCell>
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
    </Box>
  );
}
