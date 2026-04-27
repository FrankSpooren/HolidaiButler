import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Snackbar, TextField, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BalanceIcon from '@mui/icons-material/Balance';
import UpdateIcon from '@mui/icons-material/Update';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  try {
    const stored = localStorage.getItem('hb-admin-auth');
    const { accessToken } = JSON.parse(stored || '{}');
    return accessToken ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  } catch { return { 'Content-Type': 'application/json' }; }
}

const api = {
  getStats: (city) => axios.get(`${API_BASE}/api/v1/poi-classification/stats`, { params: city ? { city } : {}, headers: getAuthHeaders() }).then(r => r.data),
  getBudget: () => axios.get(`${API_BASE}/api/v1/poi-classification/budget`, { headers: getAuthHeaders() }).then(r => r.data),
  getDueForUpdate: (tier, limit = 50) => axios.get(`${API_BASE}/api/v1/poi-classification/due-for-update`, { params: { tier, limit }, headers: getAuthHeaders() }).then(r => r.data),
  classify: (poiId) => axios.post(`${API_BASE}/api/v1/poi-classification/classify/${poiId}`, {}, { headers: getAuthHeaders() }).then(r => r.data),
  batchClassify: (poiIds) => axios.post(`${API_BASE}/api/v1/poi-classification/batch-classify`, { poiIds }, { headers: getAuthHeaders() }).then(r => r.data),
  balanceTiers: (tier, city) => axios.post(`${API_BASE}/api/v1/poi-classification/balance-tiers`, { tier, city }, { headers: getAuthHeaders() }).then(r => r.data),
};

const TIER_COLORS = { 1: '#4caf50', 2: '#2196f3', 3: '#ff9800', 4: '#9e9e9e' };
const TIER_LABELS = { 1: 'Premium', 2: 'Featured', 3: 'Standard', 4: 'Basic' };

export default function POIClassificationDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [budget, setBudget] = useState(null);
  const [dueList, setDueList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [balanceDialog, setBalanceDialog] = useState(null);
  const [batchDialog, setBatchDialog] = useState(false);
  const [batchIds, setBatchIds] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsR, budgetR, dueR] = await Promise.allSettled([
        api.getStats(),
        api.getBudget(),
        api.getDueForUpdate(null, 20),
      ]);
      if (statsR.status === 'fulfilled') setStats(statsR.value.stats || statsR.value);
      if (budgetR.status === 'fulfilled') setBudget(budgetR.value.usage || budgetR.value);
      if (dueR.status === 'fulfilled') setDueList(dueR.value.pois || dueR.value.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleClassify = async (poiId) => {
    setActionLoading(poiId);
    try {
      const r = await api.classify(poiId);
      setSnack(`POI ${poiId} geclassificeerd: Tier ${r.tier} (score: ${r.score})`);
      loadAll();
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.response?.data?.message || e.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchClassify = async () => {
    const ids = batchIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (ids.length === 0) return;
    setActionLoading('batch');
    try {
      await api.batchClassify(ids);
      setSnack(`${ids.length} POIs geclassificeerd`);
      setBatchDialog(false);
      setBatchIds('');
      loadAll();
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.response?.data?.message || e.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleBalance = async (tier) => {
    setActionLoading('balance');
    try {
      const r = await api.balanceTiers(tier);
      setSnack(`Tier ${tier} gebalanceerd`);
      setBalanceDialog(null);
      loadAll();
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.response?.data?.message || e.message));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon /> POI Classification
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />} onClick={() => setBatchDialog(true)}>
            Batch Classify
          </Button>
          <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll}>
            Vernieuwen
          </Button>
        </Box>
      </Box>

      {/* Stats + Budget */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Tier distribution */}
        {stats && typeof stats === 'object' && (
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Tier Distributie</Typography>
              {[1, 2, 3, 4].map(tier => {
                const tierStats = stats.byTier?.[tier] || stats[`tier${tier}`] || {};
                const count = tierStats.count || tierStats.total || 0;
                const totalPois = stats.totalPOIs || stats.total || 1;
                const pct = totalPois > 0 ? (count / totalPois) * 100 : 0;
                return (
                  <Box key={tier} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={`T${tier}`} size="small" sx={{ bgcolor: TIER_COLORS[tier], color: '#fff', fontWeight: 700, minWidth: 36 }} />
                        <Typography variant="body2">{TIER_LABELS[tier]}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{count}</Typography>
                        <Button size="small" sx={{ minWidth: 24, p: 0 }} onClick={() => setBalanceDialog(tier)}>
                          <BalanceIcon sx={{ fontSize: 14 }} />
                        </Button>
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': { bgcolor: TIER_COLORS[tier] } }} />
                  </Box>
                );
              })}
            </Paper>
          </Grid>
        )}

        {/* Budget */}
        {budget && (
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>API Budget (deze maand)</Typography>
              {typeof budget === 'object' ? (
                <Box>
                  {Object.entries(budget).map(([key, val]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{typeof val === 'number' ? val.toLocaleString() : String(val)}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Geen budget data beschikbaar</Typography>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Tier Update Planning */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <UpdateIcon fontSize="small" /> Tier Update Planning
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          POI data wordt automatisch geactualiseerd via Apify op basis van tier-prioriteit.
        </Typography>
        <Grid container spacing={2}>
          {[
            { tier: 1, label: 'Premium', schedule: 'Dagelijks om 06:00', color: '#4caf50', desc: 'Hoogste prioriteit — data altijd actueel' },
            { tier: 2, label: 'Featured', schedule: 'Wekelijks (maandag)', color: '#2196f3', desc: 'Wekelijkse refresh via Apify' },
            { tier: 3, label: 'Standard', schedule: 'Maandelijks (1e van de maand)', color: '#ff9800', desc: 'Maandelijkse data-update' },
            { tier: 4, label: 'Basic', schedule: 'Per kwartaal', color: '#9e9e9e', desc: 'Lage prioriteit — kwartaalupdate' },
          ].map(item => (
            <Grid item xs={12} sm={6} key={item.tier}>
              <Paper variant="outlined" sx={{ p: 1.5, borderLeft: 4, borderColor: item.color }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip label={'T' + item.tier} size="small" sx={{ bgcolor: item.color, color: '#fff', fontWeight: 700, minWidth: 36 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>{item.schedule}</Typography>
                <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        <Alert severity="info" sx={{ mt: 2 }}>
          Image discovery draait ook op tier-basis: T1+T2 dagelijks (02:00), T3 wekelijks (ma 03:00), T4 maandelijks (1e 04:00). Queue wordt elke 5 min verwerkt.
        </Alert>
      </Paper>

      {/* Due for update */}
      {dueList.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <UpdateIcon fontSize="small" /> POIs die update nodig hebben
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Naam</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell align="center">Actie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dueList.slice(0, 20).map(poi => (
                  <TableRow key={poi.id}>
                    <TableCell>{poi.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {poi.name || `POI #${poi.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={`T${poi.tier || '?'}`} size="small"
                        sx={{ bgcolor: TIER_COLORS[poi.tier] || '#999', color: '#fff', fontWeight: 700, height: 20, minWidth: 36 }} />
                    </TableCell>
                    <TableCell>{poi.tier_score || poi.poi_score || '—'}</TableCell>
                    <TableCell align="center">
                      <Button size="small" variant="outlined" onClick={() => handleClassify(poi.id)}
                        disabled={actionLoading === poi.id}
                        startIcon={actionLoading === poi.id ? <CircularProgress size={14} /> : <PlayArrowIcon />}>
                        Classify
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Batch Classify Dialog */}
      <Dialog open={batchDialog} onClose={() => setBatchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Batch Classification</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Voer POI IDs in, gescheiden door komma's.
          </Typography>
          <TextField fullWidth label="POI IDs" value={batchIds} onChange={e => setBatchIds(e.target.value)}
            placeholder="123, 456, 789" sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDialog(false)}>Annuleer</Button>
          <Button variant="contained" onClick={handleBatchClassify} disabled={actionLoading === 'batch' || !batchIds.trim()}>
            {actionLoading === 'batch' ? 'Bezig...' : 'Classify'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={!!balanceDialog} onClose={() => setBalanceDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Tier {balanceDialog} Balanceren</DialogTitle>
        <DialogContent>
          <Typography>Weet je zeker dat je Tier {balanceDialog} wilt herbalanceren?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBalanceDialog(null)}>Annuleer</Button>
          <Button variant="contained" onClick={() => handleBalance(balanceDialog)} disabled={actionLoading === 'balance'}>
            {actionLoading === 'balance' ? 'Bezig...' : 'Balanceer'}
          </Button>
        </DialogActions>
      </Dialog>

      {snack && (
        <Snackbar open autoHideDuration={4000} onClose={() => setSnack(null)}>
          <Alert severity="info" onClose={() => setSnack(null)}>{snack}</Alert>
        </Snackbar>
      )}
    </Box>
  );
}
