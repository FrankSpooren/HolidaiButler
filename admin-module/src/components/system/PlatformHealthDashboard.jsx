import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Button, Chip,
  LinearProgress, Snackbar, Tooltip, IconButton
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import CachedIcon from '@mui/icons-material/Cached';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  try {
    const stored = localStorage.getItem('hb-admin-auth');
    const { accessToken } = JSON.parse(stored || '{}');
    return accessToken ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } : {};
  } catch { return {}; }
}

const api = {
  health: () => axios.get(`${API_BASE}/api/v1/monitoring/health`).then(r => r.data),
  metrics: () => axios.get(`${API_BASE}/api/v1/monitoring/metrics`, { headers: getAuthHeaders() }).then(r => r.data),
  circuitBreakers: () => axios.get(`${API_BASE}/api/v1/monitoring/circuit-breakers`, { headers: getAuthHeaders() }).then(r => r.data),
  resetBreaker: (name) => axios.post(`${API_BASE}/api/v1/monitoring/circuit-breakers/${name}/reset`, {}, { headers: getAuthHeaders() }).then(r => r.data),
  cacheStats: () => axios.get(`${API_BASE}/api/v1/monitoring/cache/stats`, { headers: getAuthHeaders() }).then(r => r.data),
  cacheFlush: () => axios.post(`${API_BASE}/api/v1/monitoring/cache/flush`, {}, { headers: getAuthHeaders() }).then(r => r.data),
};

const STATUS_ICON = {
  up: <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 20 }} />,
  down: <ErrorIcon sx={{ color: '#d32f2f', fontSize: 20 }} />,
  degraded: <WarningIcon sx={{ color: '#ed6c02', fontSize: 20 }} />,
};

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

export default function PlatformHealthDashboard() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [breakers, setBreakers] = useState(null);
  const [cache, setCache] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.health(), api.metrics(), api.circuitBreakers(), api.cacheStats()
    ]);
    if (results[0].status === 'fulfilled') setHealth(results[0].value);
    if (results[1].status === 'fulfilled') setMetrics(results[1].value.metrics || results[1].value);
    if (results[2].status === 'fulfilled') setBreakers(results[2].value);
    if (results[3].status === 'fulfilled') setCache(results[3].value.cache || results[3].value);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleResetBreaker = async (name) => {
    setActionLoading(name);
    try {
      await api.resetBreaker(name);
      setSnack(`Circuit breaker "${name}" gereset`);
      loadAll();
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.message));
    } finally { setActionLoading(null); }
  };

  const handleFlushCache = async () => {
    setActionLoading('cache');
    try {
      await api.cacheFlush();
      setSnack('Cache geflusht');
      loadAll();
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.message));
    } finally { setActionLoading(null); }
  };

  if (loading && !health) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;

  const statusColor = health?.status === 'healthy' ? '#2e7d32' : health?.status === 'degraded' ? '#ed6c02' : '#d32f2f';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FavoriteIcon sx={{ color: statusColor }} /> Platform Health
          {health && (
            <Chip label={health.status || 'unknown'} size="small"
              sx={{ bgcolor: statusColor, color: '#fff', fontWeight: 700, ml: 1 }} />
          )}
        </Typography>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll}>
          Vernieuwen
        </Button>
      </Box>

      {/* System Overview */}
      {health && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Tooltip title="Hoe lang de API ononderbroken draait sinds laatste herstart" arrow>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', cursor: 'help' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{formatUptime(health.uptime || 0)}</Typography>
                <Typography variant="caption" color="text.secondary">Uptime</Typography>
              </Paper>
            </Tooltip>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Tooltip title="Actief JavaScript geheugengebruik door Node.js (objecten, closures, buffers)" arrow>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', cursor: 'help' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{formatBytes(health.memory?.heapUsed)}</Typography>
                <Typography variant="caption" color="text.secondary">Heap Used</Typography>
              </Paper>
            </Tooltip>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Tooltip title="Totaal fysiek geheugen toegewezen aan het proces, inclusief native libraries en stack" arrow>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', cursor: 'help' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{formatBytes(health.memory?.rss)}</Typography>
                <Typography variant="caption" color="text.secondary">RSS Memory</Typography>
              </Paper>
            </Tooltip>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Tooltip title="Percentage van het gealloceerde heap-geheugen dat in gebruik is. Boven 85% is aandacht nodig." arrow>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', cursor: 'help' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: health.memory?.heapLimit && (health.memory.heapUsed / health.memory.heapLimit) > 0.85 ? 'error.main' : 'text.primary' }}>
                  {health.memory?.heapLimit ? Math.round((health.memory.heapUsed / health.memory.heapLimit) * 100) : 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">Heap Usage</Typography>
              </Paper>
            </Tooltip>
          </Grid>
        </Grid>
      )}

      {/* Dependencies */}
      {health?.dependencies && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorageIcon fontSize="small" /> Dependencies
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(health.dependencies).map(([name, dep]) => {
              if (name === 'circuitBreakers') return null;
              const isUp = dep.status === 'up';
              return (
                <Grid item xs={6} sm={4} md={3} key={name}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: isUp ? 'success.50' : 'error.50' }}>
                    {STATUS_ICON[dep.status] || STATUS_ICON.down}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{name}</Typography>
                      <Typography variant="caption" color="text.secondary">{dep.status}{dep.responseTime ? ` (${dep.responseTime})` : ''}</Typography>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}

      <Grid container spacing={2}>
        {/* Circuit Breakers */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MemoryIcon fontSize="small" /> Circuit Breakers
              {breakers?.health && (
                <Chip label={breakers.health.healthy ? 'Healthy' : 'Degraded'} size="small"
                  sx={{ bgcolor: breakers.health.healthy ? '#2e7d32' : '#ed6c02', color: '#fff', fontSize: 10, height: 20 }} />
              )}
            </Typography>
            {breakers?.breakers && Object.keys(breakers.breakers).length > 0 ? (
              Object.entries(breakers.breakers).map(([name, stats]) => (
                <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      State: {stats.state || '?'} | Failures: {stats.failures || 0} | Successes: {stats.successes || 0}
                    </Typography>
                  </Box>
                  <Tooltip title="Reset breaker">
                    <IconButton size="small" onClick={() => handleResetBreaker(name)}
                      disabled={actionLoading === name}>
                      {actionLoading === name ? <CircularProgress size={16} /> : <RestartAltIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">Geen actieve circuit breakers</Typography>
            )}
          </Paper>
        </Grid>

        {/* Cache */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CachedIcon fontSize="small" /> Cache
              </Typography>
              <Button size="small" variant="outlined" color="warning" startIcon={actionLoading === 'cache' ? <CircularProgress size={14} /> : <DeleteSweepIcon />}
                onClick={handleFlushCache} disabled={actionLoading === 'cache'}>
                Flush Cache
              </Button>
            </Box>
            {cache && typeof cache === 'object' ? (
              <Box>
                {Object.entries(cache).map(([key, val]) => (
                  <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {typeof val === 'number' ? val.toLocaleString() : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">Geen cache data beschikbaar</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Metrics */}
      {metrics && typeof metrics === 'object' && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>API Metrics</Typography>
          <Grid container spacing={2}>
            {Object.entries(metrics).slice(0, 12).map(([key, val]) => (
              <Grid item xs={6} sm={4} md={3} key={key}>
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>
                    {key.replace(/_/g, ' ')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {typeof val === 'number' ? val.toLocaleString() : typeof val === 'object' ? JSON.stringify(val).slice(0, 50) : String(val)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {snack && (
        <Snackbar open autoHideDuration={3000} onClose={() => setSnack(null)}>
          <Alert severity="info" onClose={() => setSnack(null)}>{snack}</Alert>
        </Snackbar>
      )}
    </Box>
  );
}
