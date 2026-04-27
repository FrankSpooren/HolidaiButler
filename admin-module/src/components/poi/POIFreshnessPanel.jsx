import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useTranslation } from 'react-i18next';
import client from '../../api/client.js';

const STATUS_CONFIG = {
  fresh: { label: 'Fresh', color: 'success', icon: CheckCircleIcon, hex: '#2e7d32' },
  aging: { label: 'Aging', color: 'warning', icon: WarningIcon, hex: '#ed6c02' },
  stale: { label: 'Stale', color: 'error', icon: ErrorIcon, hex: '#d32f2f' },
  unverified: { label: 'Unverified', color: 'inherit', icon: HelpOutlineIcon, hex: '#757575' },
};

export default function POIFreshnessPanel({ destinationId }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadData = () => {
    if (!destinationId) return;
    setLoading(true);
    setError(null);
    client.get('/pois/freshness', { params: { destination: destinationId } })
      .then(r => setData(r.data?.data || r.data))
      .catch(e => setError(e.response?.data?.error?.message || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [destinationId]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    setSuccess(null);
    setError(null);
    try {
      const r = await client.post('/pois/freshness/recalculate');
      setSuccess(r.data?.data?.message || 'Freshness scores herberekend');
      loadData();
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  if (!data) return null;

  const { byDestination = {}, stalePois = [] } = data;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Content Freshness
        </Typography>
        <Button variant="outlined" size="small" startIcon={recalculating ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={handleRecalculate} disabled={recalculating}>
          {recalculating ? 'Herberekenen...' : 'Herbereken alles'}
        </Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Destination cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(byDestination).map(([dest, stats]) => (
          <Grid item xs={12} md={6} key={dest}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, textTransform: 'capitalize' }}>
                {dest}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {stats.total} POIs &mdash; Gem. score: {stats.avgScore || 0}/100
              </Typography>

              {/* Status bars */}
              {['fresh', 'aging', 'stale', 'unverified'].map(status => {
                const cfg = STATUS_CONFIG[status];
                const count = stats[status] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <Box key={status} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <cfg.icon sx={{ fontSize: 14, color: cfg.hex }} />
                        <Typography variant="caption">{cfg.label}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{count} ({Math.round(pct)}%)</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': { bgcolor: cfg.hex } }} />
                  </Box>
                );
              })}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Stale POIs table */}
      {stalePois.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" fontSize="small" /> Verouderde POIs (actie vereist)
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Naam</TableCell>
                  <TableCell>Destination</TableCell>
                  <TableCell>Categorie</TableCell>
                  <TableCell align="center">Score</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stalePois.map(poi => {
                  const cfg = STATUS_CONFIG[poi.status] || STATUS_CONFIG.unverified;
                  return (
                    <TableRow key={poi.id}>
                      <TableCell>{poi.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {poi.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{poi.destination}</TableCell>
                      <TableCell><Chip label={poi.category || '—'} size="small" sx={{ height: 20, fontSize: 10 }} /></TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: cfg.hex }}>
                          {poi.score ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={cfg.label} size="small" sx={{ height: 20, fontSize: 10, bgcolor: cfg.hex, color: '#fff' }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
