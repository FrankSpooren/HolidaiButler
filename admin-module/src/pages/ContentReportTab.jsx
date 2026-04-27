import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Select, MenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, LinearProgress, Button
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DownloadIcon from '@mui/icons-material/Download';
import { useTranslation } from 'react-i18next';
import client from '../api/client.js';

const PLATFORM_COLORS = {
  instagram: '#E4405F', facebook: '#1877F2', linkedin: '#0A66C2',
  x: '#000', tiktok: '#000', youtube: '#FF0000', pinterest: '#BD081C', website: '#5E8B7E'
};

export default function ContentReportTab({ destinationId }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('last_month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!destinationId) return;
    setLoading(true);
    setError(null);
    client.get('/content/report', { params: { destination_id: destinationId, period } })
      .then(r => setData(r.data?.data || r.data))
      .catch(e => setError(e.response?.data?.error?.message || e.message))
      .finally(() => setLoading(false));
  }, [destinationId, period]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  if (!data) return <Alert severity="info" sx={{ mt: 2 }}>{t('contentReport.noData', 'Geen data beschikbaar')}</Alert>;

  const { content, topContent, destination: dest, period: per } = data;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChartIcon /> Content Rapport
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dest?.name} &mdash; {per?.start} t/m {per?.end}
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t('contentReport.period', 'Periode')}</InputLabel>
          <Select value={period} label={t('contentReport.period', 'Periode')} onChange={e => setPeriod(e.target.value)}>
            <MenuItem value="last_week">Afgelopen week</MenuItem>
            <MenuItem value="last_month">Afgelopen maand</MenuItem>
            <MenuItem value="last_30">Laatste 30 dagen</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Totaal', value: content.total, color: 'primary.main' },
          { label: 'Gepubliceerd', value: content.published, color: 'success.main' },
          { label: 'Ingepland', value: content.scheduled, color: 'warning.main' },
          { label: 'Concepten', value: content.drafts, color: 'text.secondary' },
          { label: 'Publicatie %', value: `${content.publishRate}%`, color: content.publishRate >= 70 ? 'success.main' : 'warning.main' },
        ].map(kpi => (
          <Grid item xs={6} sm={4} md={2.4} key={kpi.label}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: kpi.color }}>{kpi.value}</Typography>
              <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Platform breakdown */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Per Platform</Typography>
            {(content.byPlatform || []).map(p => (
              <Box key={p.target_platform} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {p.target_platform}
                  </Typography>
                  <Typography variant="body2">{p.published}/{p.count}</Typography>
                </Box>
                <LinearProgress variant="determinate"
                  value={p.count > 0 ? (p.published / p.count) * 100 : 0}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: PLATFORM_COLORS[p.target_platform] || '#666' } }} />
              </Box>
            ))}
            {(!content.byPlatform || content.byPlatform.length === 0) && (
              <Typography variant="body2" color="text.secondary">Geen platform data</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Per Content Pillar</Typography>
            {(content.byPillar || []).map(p => (
              <Box key={p.pillar_name} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.pillar_color || '#666' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.pillar_name}</Typography>
                  </Box>
                  <Typography variant="body2">{p.published}/{p.count}</Typography>
                </Box>
                <LinearProgress variant="determinate"
                  value={p.count > 0 ? (p.published / p.count) * 100 : 0}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: p.pillar_color || '#666' } }} />
              </Box>
            ))}
            {(!content.byPillar || content.byPillar.length === 0) && (
              <Typography variant="body2" color="text.secondary">Geen pillar data</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Top Content */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon fontSize="small" /> Top Content
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Titel</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Pillar</TableCell>
                <TableCell align="center">SEO Score</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(topContent || []).map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title || `Item #${item.id}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.target_platform} size="small"
                      sx={{ bgcolor: PLATFORM_COLORS[item.target_platform] || '#666', color: '#fff', fontSize: 10, height: 20 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{item.pillar_name || '—'}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 600,
                      color: (item.seo_score || 0) >= 80 ? 'success.main' : (item.seo_score || 0) >= 60 ? 'warning.main' : 'error.main' }}>
                      {item.seo_score || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.approval_status} size="small" color={item.approval_status === 'published' ? 'success' : 'warning'} sx={{ height: 20, fontSize: 10 }} />
                  </TableCell>
                </TableRow>
              ))}
              {(!topContent || topContent.length === 0) && (
                <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center' }}>Geen content in deze periode</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
