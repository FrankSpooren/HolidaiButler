/**
 * Chatbot Admin Panels — ChromaDB status, Fallback analyse, Sync triggers
 * Integrates holibot admin endpoints into existing ChatbotTab
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Snackbar, Tooltip, LinearProgress
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import SyncIcon from '@mui/icons-material/Sync';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = {
  stats: () => axios.get(`${API_BASE}/api/v1/holibot/admin/stats`).then(r => r.data),
  fallbackStats: () => axios.get(`${API_BASE}/api/v1/holibot/admin/fallback-stats`).then(r => r.data),
  conversationAnalytics: () => axios.get(`${API_BASE}/api/v1/holibot/admin/conversation-analytics`).then(r => r.data),
  sync: (type) => axios.post(`${API_BASE}/api/v1/holibot/admin/sync`, { type }).then(r => r.data),
  resync: () => axios.post(`${API_BASE}/api/v1/holibot/admin/resync`).then(r => r.data),
  syncSingle: (poiId) => axios.post(`${API_BASE}/api/v1/holibot/admin/sync-single/${poiId}`).then(r => r.data),
};

/**
 * ChromaDB Status Panel
 */
export function ChromaDBStatusPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats().then(r => setStats(r.data || r)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ py: 2 }}><CircularProgress size={20} /></Box>;
  if (!stats) return null;

  const chroma = stats.chromaDb || {};
  const sync = stats.sync || {};

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon fontSize="small" /> ChromaDB Status
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            {chroma.isConnected
              ? <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
              : <ErrorIcon sx={{ color: '#d32f2f', fontSize: 28 }} />}
            <Typography variant="caption" display="block" color="text.secondary">
              {chroma.isConnected ? 'Connected' : 'Disconnected'}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {(chroma.documentCount || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">Documenten</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.version || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">HoliBot versie</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center' }}>
            <Chip label={sync.isSyncing ? 'Syncing...' : 'Idle'} size="small"
              color={sync.isSyncing ? 'primary' : 'default'} />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              {sync.lastSyncTime ? new Date(sync.lastSyncTime).toLocaleString('nl-NL') : 'Nog niet gesynchroniseerd'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
      <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {stats.antiHallucination && <Chip label="Anti-hallucination" size="small" color="success" variant="outlined" sx={{ fontSize: 10, height: 20 }} />}
        {stats.bookingFlow && <Chip label="Booking flow" size="small" color="info" variant="outlined" sx={{ fontSize: 10, height: 20 }} />}
        {(sync.supportedLanguages || []).map(l => (
          <Chip key={l} label={l.toUpperCase()} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
        ))}
      </Box>
    </Paper>
  );
}

/**
 * Fallback Analysis Panel
 */
export function FallbackAnalysisPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fallbackStats().then(r => setData(r.data || r)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ py: 2 }}><CircularProgress size={20} /></Box>;
  if (!data) return null;

  const summary = data.summary || {};
  const topQueries = data.topQueries || [];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon fontSize="small" sx={{ color: '#f59e0b' }} /> Fallback Analyse
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({data.period || '7 days'})</Typography>
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: summary.total_fallbacks > 0 ? '#f59e0b' : '#2e7d32' }}>
              {summary.total_fallbacks || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">Fallbacks</Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{summary.days_active || 0}</Typography>
            <Typography variant="caption" color="text.secondary">Actieve dagen</Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{summary.total_spell_corrected || 0}</Typography>
            <Typography variant="caption" color="text.secondary">Spelcorrecties</Typography>
          </Box>
        </Grid>
      </Grid>

      {topQueries.length > 0 ? (
        <>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
            Top vragen zonder antwoord:
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vraag</TableCell>
                  <TableCell align="center">Aantal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topQueries.slice(0, 10).map((q, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.query || q.message || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{q.count || 1}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Alert severity="success" sx={{ mt: 1 }}>Geen fallbacks in de afgelopen periode</Alert>
      )}
    </Paper>
  );
}

/**
 * Sync Triggers Panel
 */
export function SyncTriggersPanel() {
  const [actionLoading, setActionLoading] = useState(null);
  const [snack, setSnack] = useState(null);
  const [singlePoiId, setSinglePoiId] = useState('');

  const handleSync = async (type) => {
    setActionLoading(type);
    try {
      if (type === 'resync') {
        await api.resync();
        setSnack('Full resync gestart (multi-language + Q&A)');
      } else {
        await api.sync(type);
        setSnack(`${type === 'full' ? 'Volledige' : 'Incrementele'} sync gestart`);
      }
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncSingle = async () => {
    const id = parseInt(singlePoiId);
    if (!id) return;
    setActionLoading('single');
    try {
      await api.syncSingle(id);
      setSnack(`POI ${id} gesynchroniseerd naar ChromaDB`);
      setSinglePoiId('');
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SyncIcon fontSize="small" /> ChromaDB Sync
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Synchroniseer POI data naar ChromaDB voor de chatbot. Incrementeel synct alleen gewijzigde POIs, Full Resync herlaadt alles inclusief vertalingen en Q&A.
      </Typography>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <Button fullWidth variant="outlined" size="small"
            startIcon={actionLoading === 'incremental' ? <CircularProgress size={14} /> : <PlayArrowIcon />}
            onClick={() => handleSync('incremental')} disabled={!!actionLoading}>
            Incrementele Sync
          </Button>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button fullWidth variant="outlined" size="small" color="warning"
            startIcon={actionLoading === 'full' ? <CircularProgress size={14} /> : <RefreshIcon />}
            onClick={() => handleSync('full')} disabled={!!actionLoading}>
            Volledige Sync
          </Button>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button fullWidth variant="contained" size="small" color="warning"
            startIcon={actionLoading === 'resync' ? <CircularProgress size={14} /> : <SyncIcon />}
            onClick={() => handleSync('resync')} disabled={!!actionLoading}>
            Full Resync (Multi-lang)
          </Button>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField size="small" label="POI ID" value={singlePoiId} onChange={e => setSinglePoiId(e.target.value)}
          type="number" sx={{ width: 140 }} placeholder="bijv. 123" />
        <Button variant="outlined" size="small" onClick={handleSyncSingle}
          disabled={!!actionLoading || !singlePoiId}
          startIcon={actionLoading === 'single' ? <CircularProgress size={14} /> : <SyncIcon />}>
          Sync POI
        </Button>
      </Box>

      {snack && (
        <Snackbar open autoHideDuration={4000} onClose={() => setSnack(null)}>
          <Alert severity="info" onClose={() => setSnack(null)}>{snack}</Alert>
        </Snackbar>
      )}
    </Paper>
  );
}
