import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import StarIcon from '@mui/icons-material/Star';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';
const IMAGE_BASE = 'https://test.holidaibutler.com';

function getAuthHeaders() {
  try {
    const stored = localStorage.getItem('hb-admin-auth');
    const { accessToken } = JSON.parse(stored || '{}');
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  } catch { return {}; }
}

const api = {
  getPending: (limit = 50, offset = 0) =>
    axios.get(`${API_BASE}/api/v1/poi-images/pending`, { params: { limit, offset }, headers: getAuthHeaders() }).then(r => r.data),
  approve: (id, setPrimary = false) =>
    axios.post(`${API_BASE}/api/v1/poi-images/${id}/approve`, { setPrimary }, { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }).then(r => r.data),
  reject: (id, reason) =>
    axios.post(`${API_BASE}/api/v1/poi-images/${id}/reject`, { reason }, { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }).then(r => r.data),
  setPrimary: (id) =>
    axios.post(`${API_BASE}/api/v1/poi-images/${id}/set-primary`, {}, { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }).then(r => r.data),
};

export default function POIImageReviewQueue() {
  const { t } = useTranslation();
  const [images, setImages] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getPending();
      setImages(r.data || []);
      setTotal(r.pagination?.total || 0);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadImages(); }, [loadImages]);

  const handleApprove = async (id, setPrimary = false) => {
    setActionLoading(id);
    try {
      await api.approve(id, setPrimary);
      setSnack(`Image ${setPrimary ? 'goedgekeurd + primary' : 'goedgekeurd'}`);
      setImages(prev => prev.filter(img => img.id !== id));
      setTotal(prev => prev - 1);
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setActionLoading(rejectDialog);
    try {
      await api.reject(rejectDialog, rejectReason);
      setSnack('Image afgewezen');
      setImages(prev => prev.filter(img => img.id !== rejectDialog));
      setTotal(prev => prev - 1);
      setRejectDialog(null);
      setRejectReason('');
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetPrimary = async (id) => {
    setActionLoading(id);
    try {
      await api.setPrimary(id);
      setSnack('Image ingesteld als primary');
      loadImages();
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImageIcon /> Image Review Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {total} afbeeldingen wachten op review
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={loadImages} disabled={loading}>
          Vernieuwen
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : images.length === 0 ? (
        <Alert severity="success">Geen afbeeldingen wachten op review</Alert>
      ) : (
        <Grid container spacing={2}>
          {images.map(img => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={img.id}>
              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Box sx={{ position: 'relative', aspectRatio: '4/3', bgcolor: 'action.hover' }}>
                  <img
                    src={img.local_path ? `${IMAGE_BASE}${img.local_path}` : img.image_url || ''}
                    alt={img.alt_text || img.filename || 'POI Image'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  {img.quality_score > 0 && (
                    <Chip label={`Q: ${Math.round(img.quality_score)}`} size="small"
                      sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10 }} />
                  )}
                </Box>
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {img.poi_name || `POI #${img.poi_id}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {img.poi_category || '—'} &bull; {img.source || 'unknown'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Goedkeuren">
                      <IconButton size="small" color="success" onClick={() => handleApprove(img.id)}
                        disabled={actionLoading === img.id}>
                        {actionLoading === img.id ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Goedkeuren + Primary">
                      <IconButton size="small" color="warning" onClick={() => handleApprove(img.id, true)}
                        disabled={actionLoading === img.id}>
                        <StarIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Afwijzen">
                      <IconButton size="small" color="error" onClick={() => setRejectDialog(img.id)}
                        disabled={actionLoading === img.id}>
                        <CancelIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onClose={() => setRejectDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Afbeelding afwijzen</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Reden" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            multiline rows={2} sx={{ mt: 1 }} placeholder="Waarom wordt deze afbeelding afgewezen?" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(null)}>Annuleer</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={actionLoading === rejectDialog}>
            Afwijzen
          </Button>
        </DialogActions>
      </Dialog>

      {snack && (
        <Snackbar open autoHideDuration={3000} onClose={() => setSnack(null)}>
          <Alert severity="info" onClose={() => setSnack(null)}>{snack}</Alert>
        </Snackbar>
      )}
    </Box>
  );
}
