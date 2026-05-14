import { useState, useMemo } from 'react';
import {
  Box, Typography, Card, Grid, Skeleton, Chip, ToggleButton, ToggleButtonGroup,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Alert,
  Tooltip, IconButton, LinearProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import VerifiedIcon from '@mui/icons-material/Verified';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReplayIcon from '@mui/icons-material/Replay';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { aiQualityService } from '../api/aiQualityService.js';
import useDestinationStore from '../stores/destinationStore.js';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 dagen' },
  { value: 30, label: '30 dagen' },
  { value: 90, label: '90 dagen' },
];

function formatPct(v) {
  if (v === null || v === undefined) return '—';
  return `${Math.round(Number(v) * 1000) / 10}%`;
}

function formatNumber(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('nl-NL');
}

export default function AIQualityPage() {
  const queryClient = useQueryClient();
  const destinationId = useDestinationStore((s) => s.activeDestination?.id);
  const [days, setDays] = useState(30);

  const summaryQ = useQuery({
    queryKey: ['ai-quality', destinationId, 'summary', days],
    queryFn: () => aiQualityService.getSummary(destinationId, days),
    enabled: !!destinationId,
  });
  const trendQ = useQuery({
    queryKey: ['ai-quality', destinationId, 'trend', days],
    queryFn: () => aiQualityService.getTrend(destinationId, days),
    enabled: !!destinationId,
  });
  const topEntitiesQ = useQuery({
    queryKey: ['ai-quality', destinationId, 'top-entities', days],
    queryFn: () => aiQualityService.getTopEntities(destinationId, days, 10),
    enabled: !!destinationId,
  });
  const retryQ = useQuery({
    queryKey: ['ai-quality', destinationId, 'retry', days],
    queryFn: () => aiQualityService.getRetryStats(destinationId, days),
    enabled: !!destinationId,
  });

  const summary = summaryQ.data?.data?.summary;
  const trendSeries = trendQ.data?.data?.series || [];
  const topEntities = topEntitiesQ.data?.data?.top_entities || [];
  const retryStats = retryQ.data?.data;

  const trendForChart = useMemo(
    () => trendSeries.map((d) => ({
      date: typeof d.date === 'string' ? d.date.slice(5) : d.date,
      pass_rate: d.pass_rate !== null ? Math.round(d.pass_rate * 1000) / 10 : null,
      hallucination_rate: d.hallucination_rate !== null ? Math.round(d.hallucination_rate * 1000) / 10 : null,
      total: d.total,
    })),
    [trendSeries]
  );

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-quality', destinationId] });
  };

  const downloadCsv = async () => {
    try {
      // Gebruik client.get met responseType blob, bypass URL builder zodat auth-headers meegaan
      const client = (await import('../api/client.js')).default;
      const res = await client.get(`/brand-sources/ai-quality/export.csv`, {
        params: { destinationId, days },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-quality-dest${destinationId}-${days}d.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed', err);
    }
  };

  if (!destinationId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Selecteer een destination om AI-kwaliteit te bekijken.</Alert>
      </Box>
    );
  }

  const loading = summaryQ.isLoading || trendQ.isLoading;
  const passRate = summary?.pass_rate;
  const hallucinationRate = summary?.total > 0 && summary?.passed + summary?.failed > 0
    ? 1 - summary.pass_rate
    : null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <VerifiedIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>AI Quality Dashboard</Typography>
        <ToggleButtonGroup
          value={days}
          exclusive
          size="small"
          onChange={(_, v) => v && setDays(v)}
        >
          {PERIOD_OPTIONS.map((p) => (
            <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Tooltip title="Verversen">
          <IconButton onClick={refreshAll} size="small"><RefreshIcon /></IconButton>
        </Tooltip>
        <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={downloadCsv}>
          Export CSV
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        EU AI Act Article 50 transparantie — boven minimum-compliance. Audit-trail voor reviewer, kwaliteitsbeheerder en regulator.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Totaal generaties</Typography>
            {loading ? <Skeleton width={80} height={32} /> : (
              <Typography variant="h5">{formatNumber(summary?.total)}</Typography>
            )}
            <Typography variant="caption" color="text.secondary">laatste {days} dagen</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Pass-rate</Typography>
            {loading ? <Skeleton width={80} height={32} /> : (
              <Typography variant="h5" sx={{ color: passRate >= 0.9 ? 'success.main' : passRate >= 0.7 ? 'warning.main' : 'error.main' }}>
                {formatPct(passRate)}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">{summary?.passed || 0} ok / {summary?.failed || 0} faal</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Hallucinatie-rate</Typography>
            {loading ? <Skeleton width={80} height={32} /> : (
              <Typography variant="h5" sx={{ color: hallucinationRate <= 0.1 ? 'success.main' : 'error.main' }}>
                {formatPct(hallucinationRate)}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">streefwaarde &lt; 10%</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Retry-rate</Typography>
            {retryQ.isLoading ? <Skeleton width={80} height={32} /> : (
              <Typography variant="h5">{formatPct(retryStats?.retry_rate)}</Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              succes na retry: {formatPct(retryStats?.retry_success_rate)}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingDownIcon sx={{ mr: 1 }} color="action" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>Trend pass-rate &amp; hallucinatie-rate</Typography>
              <Chip size="small" label={`${trendSeries.length} dagen data`} />
            </Box>
            {trendQ.isLoading ? <Skeleton variant="rectangular" height={280} /> : trendForChart.length === 0 ? (
              <Alert severity="info">Nog geen AI-generaties in deze periode.</Alert>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendForChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <ReTooltip formatter={(v) => v !== null && v !== undefined ? `${v}%` : '—'} />
                  <Legend />
                  <Line type="monotone" dataKey="pass_rate" stroke="#2e7d32" name="Pass-rate" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="hallucination_rate" stroke="#c62828" name="Hallucinatie-rate" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ErrorOutlineIcon sx={{ mr: 1 }} color="error" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Top-10 ungrounded entities</Typography>
            </Box>
            {topEntitiesQ.isLoading ? <Skeleton variant="rectangular" height={280} /> : topEntities.length === 0 ? (
              <Alert severity="success">Geen ungrounded entities — clean run.</Alert>
            ) : (
              <Box>
                {topEntities.map((e, idx) => (
                  <Box key={e.entity} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ width: 24, color: 'text.secondary' }}>#{idx + 1}</Typography>
                    <Typography variant="body2" sx={{ flex: 1, mr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.entity}>
                      {e.entity}
                    </Typography>
                    <Chip label={e.count} size="small" color="error" variant="outlined" />
                  </Box>
                ))}
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ReplayIcon sx={{ mr: 1 }} color="action" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Retry-distributie</Typography>
            </Box>
            {retryQ.isLoading ? <Skeleton variant="rectangular" height={220} /> : retryStats ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={Object.entries(retryStats.retry_distribution || {}).map(([k, v]) => ({ retries: `${k}x`, count: v }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="retries" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip />
                  <Bar dataKey="count" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            ) : <Alert severity="info">Geen retry-data</Alert>}
            <Typography variant="caption" color="text.secondary">
              Gemiddeld {retryStats?.avg_retries ?? '—'} retries per generatie
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Recent gefaalde generaties</Typography>
            {summaryQ.isLoading ? <Skeleton variant="rectangular" height={220} /> : (
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 240 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Operatie</TableCell>
                      <TableCell>Platform</TableCell>
                      <TableCell>Wanneer</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(summaryQ.data?.data?.recent_failures || []).map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>#{f.content_item_id || '—'}</TableCell>
                        <TableCell><Chip label={f.operation || '—'} size="small" /></TableCell>
                        <TableCell>{f.platform || '—'}</TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(f.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!summaryQ.data?.data?.recent_failures || summaryQ.data.data.recent_failures.length === 0) && (
                      <TableRow><TableCell colSpan={4}><Alert severity="success" sx={{ py: 0 }}>Geen recente failures</Alert></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Data uit <code>ai_generation_log</code> tabel. Refresh elke 30s via TanStack Query SWR + Socket.IO invalidation bij content events.
        </Typography>
      </Box>
    </Box>
  );
}
