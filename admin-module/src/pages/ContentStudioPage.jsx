import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, TextField, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
  Card, CardContent, Grid, CircularProgress, Alert, TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../stores/authStore.js';
import contentService from '../api/contentService.js';

const DIRECTION_CONFIG = {
  breakout: { icon: WhatshotIcon, color: 'error', label: 'Breakout' },
  rising: { icon: TrendingUpIcon, color: 'success', label: 'Rising' },
  stable: { icon: TrendingFlatIcon, color: 'info', label: 'Stable' },
  declining: { icon: TrendingDownIcon, color: 'warning', label: 'Declining' },
};

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 dagen' },
  { value: '30d', label: '30 dagen' },
  { value: '90d', label: '90 dagen' },
];

function DirectionChip({ direction }) {
  const config = DIRECTION_CONFIG[direction] || DIRECTION_CONFIG.stable;
  const Icon = config.icon;
  return (
    <Chip
      icon={<Icon sx={{ fontSize: 16 }} />}
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
    />
  );
}

function SummaryCards({ summary, loading }) {
  if (loading) return <CircularProgress size={24} />;
  if (!summary) return null;

  const cards = [
    { label: 'Unieke Keywords', value: summary.totalKeywords || 0 },
    { label: 'Top Keyword', value: summary.topKeywords?.[0]?.keyword || '—' },
    { label: 'Gem. Score', value: summary.topKeywords?.[0]?.avg_score ? Number(summary.topKeywords[0].avg_score).toFixed(1) : '—' },
  ];

  // Direction distribution
  const dirDist = summary.directionDistribution || [];
  const breakoutCount = dirDist.find(d => d.trend_direction === 'breakout')?.count || 0;
  const risingCount = dirDist.find(d => d.trend_direction === 'rising')?.count || 0;
  cards.push({ label: 'Breakout + Rising', value: `${breakoutCount} + ${risingCount}` });

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((c, i) => (
        <Grid item xs={6} md={3} key={i}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{c.value}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function AddKeywordDialog({ open, onClose, onSubmit, destinationId }) {
  const [keyword, setKeyword] = useState('');
  const [language, setLanguage] = useState('en');
  const [direction, setDirection] = useState('stable');
  const [volume, setVolume] = useState('');
  const [market, setMarket] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!keyword.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        destination_id: destinationId,
        keyword: keyword.trim(),
        language,
        trend_direction: direction,
        search_volume: volume ? Number(volume) : null,
        market: market || null,
        source: 'manual',
      });
      setKeyword('');
      setVolume('');
      setMarket('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Keyword Toevoegen</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Keyword" value={keyword} onChange={e => setKeyword(e.target.value)} required fullWidth />
        <FormControl fullWidth>
          <InputLabel>Taal</InputLabel>
          <Select value={language} onChange={e => setLanguage(e.target.value)} label="Taal">
            <MenuItem value="en">Engels</MenuItem>
            <MenuItem value="nl">Nederlands</MenuItem>
            <MenuItem value="de">Duits</MenuItem>
            <MenuItem value="es">Spaans</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Richting</InputLabel>
          <Select value={direction} onChange={e => setDirection(e.target.value)} label="Richting">
            <MenuItem value="breakout">Breakout</MenuItem>
            <MenuItem value="rising">Rising</MenuItem>
            <MenuItem value="stable">Stable</MenuItem>
            <MenuItem value="declining">Declining</MenuItem>
          </Select>
        </FormControl>
        <TextField label="Zoekvolume" type="number" value={volume} onChange={e => setVolume(e.target.value)} fullWidth />
        <TextField label="Markt (bijv. NL, DE, ES)" value={market} onChange={e => setMarket(e.target.value)} fullWidth />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuleren</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!keyword.trim() || submitting}>
          {submitting ? <CircularProgress size={20} /> : 'Toevoegen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ContentStudioPage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [tab, setTab] = useState(0);
  const [destinationId, setDestinationId] = useState(user?.destination_id || 1);
  const [period, setPeriod] = useState('30d');
  const [trends, setTrends] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await contentService.getTrending(destinationId, {
        period, limit: rowsPerPage, offset: page * rowsPerPage,
      });
      setTrends(result.data?.trends || []);
      setTotal(result.data?.total || 0);
    } catch (err) {
      setError(err.message || 'Fout bij laden trends');
    } finally {
      setLoading(false);
    }
  }, [destinationId, period, page, rowsPerPage]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const result = await contentService.getTrendingSummary(destinationId, { period });
      setSummary(result.data || null);
    } catch {
      // Non-critical
    } finally {
      setSummaryLoading(false);
    }
  }, [destinationId, period]);

  useEffect(() => {
    loadTrends();
    loadSummary();
  }, [loadTrends, loadSummary]);

  const handleAddKeyword = async (data) => {
    await contentService.addManualTrend(data);
    loadTrends();
    loadSummary();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          {t('contentStudio.title', 'Content Studio')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={destinationId} onChange={e => { setDestinationId(e.target.value); setPage(0); }}>
              <MenuItem value={1}>Calpe</MenuItem>
              <MenuItem value={2}>Texel</MenuItem>
              <MenuItem value={4}>WarreWijzer</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select value={period} onChange={e => { setPeriod(e.target.value); setPage(0); }}>
              {PERIOD_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('contentStudio.tabs.trending', 'Trending Monitor')} />
        <Tab label={t('contentStudio.tabs.suggestions', 'Suggesties')} disabled />
        <Tab label={t('contentStudio.tabs.content', 'Content Items')} disabled />
        <Tab label={t('contentStudio.tabs.performance', 'Performance')} disabled />
      </Tabs>

      {tab === 0 && (
        <>
          <SummaryCards summary={summary} loading={summaryLoading} />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Paper variant="outlined">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {total} keywords gevonden
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Vernieuwen">
                  <IconButton size="small" onClick={() => { loadTrends(); loadSummary(); }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
                  Keyword
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Keyword</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Richting</TableCell>
                    <TableCell>Volume</TableCell>
                    <TableCell>Taal</TableCell>
                    <TableCell>Markt</TableCell>
                    <TableCell>Bron</TableCell>
                    <TableCell>Week</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : trends.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          Geen trending keywords gevonden voor deze periode.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : trends.map((trend, idx) => (
                    <TableRow key={trend.id || idx} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{trend.keyword}</TableCell>
                      <TableCell>
                        <Chip
                          label={trend.relevance_score?.toFixed(1) || '—'}
                          size="small"
                          color={trend.relevance_score >= 7 ? 'success' : trend.relevance_score >= 4 ? 'info' : 'default'}
                        />
                      </TableCell>
                      <TableCell><DirectionChip direction={trend.trend_direction} /></TableCell>
                      <TableCell>{trend.search_volume?.toLocaleString() || '—'}</TableCell>
                      <TableCell>{trend.language?.toUpperCase() || '—'}</TableCell>
                      <TableCell>{trend.market || '—'}</TableCell>
                      <TableCell>
                        <Chip label={trend.source || '—'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{trend.week_number ? `W${trend.week_number}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Rijen per pagina"
            />
          </Paper>
        </>
      )}

      <AddKeywordDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={handleAddKeyword}
        destinationId={destinationId}
      />
    </Box>
  );
}
