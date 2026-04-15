import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Chip, IconButton, Tooltip, Button, ToggleButtonGroup, ToggleButton, Select, MenuItem,
  FormControl, InputLabel, Alert, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, CardMedia, Card, CardContent, CardActions, TablePagination, Checkbox, Snackbar, CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon, Visibility as ViewIcon, Delete as DismissIcon,
  SaveAlt as SaveIcon, AutoFixHigh as AnalyzeIcon, YouTube as YouTubeIcon,
  Image as ImageIcon, ViewModule as GridIcon, TableChart as TableIcon,
  FilterList as FilterIcon, CheckCircle as CheckIcon, CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService';

const PLATFORM_ICONS = {
  youtube: { icon: '▶', color: '#FF0000', label: 'YouTube' },
  pexels: { icon: '📷', color: '#05A081', label: 'Pexels' },
  reddit: { icon: '🔴', color: '#FF4500', label: 'Reddit' },
  google_images: { icon: '🖼', color: '#4285F4', label: 'Google' },
  instagram: { icon: '📸', color: '#E4405F', label: 'Instagram' },
  tiktok: { icon: '🎵', color: '#000000', label: 'TikTok' },
  pinterest: { icon: '📌', color: '#E60023', label: 'Pinterest' },
  facebook: { icon: '📘', color: '#1877F2', label: 'Facebook' },
  manual: { icon: '✋', color: '#666', label: 'Manual' },
  google_trends: { icon: '📈', color: '#4285F4', label: 'Trends' }
};

const STATUS_COLORS = {
  discovered: 'default',
  analyzed: 'info',
  saved: 'success',
  used: 'primary',
  dismissed: 'error'
};

export default function VisualTrendsTab({ destinationId }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [view, setView] = useState('grid');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [detailDialog, setDetailDialog] = useState(null);
  const [analyzing, setAnalyzing] = useState(null);
  const [saving, setSaving] = useState(null);
  const [selected, setSelected] = useState([]);
  const [generatingContent, setGeneratingContent] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: page + 1, limit };
      if (platformFilter) params.source_platform = platformFilter;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.visual_type = typeFilter;
      const res = await contentService.getVisualTrending(destinationId, params);
      if (res.success) {
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);
        setStats(res.data.stats || {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [destinationId, page, limit, platformFilter, statusFilter, typeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAnalyze = async (id) => {
    setAnalyzing(id);
    try {
      await contentService.analyzeVisual({ trending_id: id }, destinationId);
      loadData();
    } catch (err) {
      setError('Analyse mislukt: ' + err.message);
    } finally {
      setAnalyzing(null);
    }
  };

  const handleSave = async (id) => {
    setSaving(id);
    try {
      await contentService.saveVisualToMedia(id, destinationId);
      loadData();
    } catch (err) {
      setError('Opslaan mislukt: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await contentService.dismissVisualTrending(id, destinationId);
      loadData();
    } catch (err) {
      setError('Dismiss mislukt: ' + err.message);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await contentService.getVisualTrendingDetail(id, destinationId);
      if (res.success) setDetailDialog(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateContent = async (id) => {
    setGeneratingContent(id);
    try {
      await contentService.generateFromVisual(id, destinationId, ['facebook', 'instagram']);
      setSnackbar({ message: 'Content generatie gestart. Items verschijnen binnen 1-3 minuten in Content Items.', severity: 'success' });
      loadData();
    } catch (err) {
      setSnackbar({ message: 'Generatie mislukt: ' + err.message, severity: 'error' });
    } finally {
      setGeneratingContent(null);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await contentService.uploadVisual(file, destinationId, file.name.replace(/\.[^.]+$/, ''));
      if (res.success) {
        setSnackbar({ message: 'Visual geupload. AI analyse loopt op de achtergrond.', severity: 'success' });
        setTimeout(() => loadData(), 3000);
      }
    } catch (err) {
      setSnackbar({ message: 'Upload mislukt: ' + err.message, severity: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDismiss = async () => {
    for (const id of selected) {
      try { await contentService.dismissVisualTrending(id, destinationId); } catch (e) { /* continue */ }
    }
    setSelected([]);
    loadData();
  };

  const handleBulkSave = async () => {
    for (const id of selected) {
      try { await contentService.saveVisualToMedia(id, destinationId); } catch (e) { /* continue */ }
    }
    setSelected([]);
    loadData();
  };

  const getPlatform = (p) => PLATFORM_ICONS[p] || PLATFORM_ICONS.manual;

  // Stats hero bar
  const StatsBar = () => (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
      {[
        { label: 'Totaal', value: stats.total || 0, color: '#666' },
        { label: 'Ontdekt', value: stats.discovered || 0, color: '#1976d2' },
        { label: 'Geanalyseerd', value: stats.analyzed || 0, color: '#0288d1' },
        { label: 'Opgeslagen', value: stats.saved || 0, color: '#2e7d32' },
        { label: 'Gebruikt', value: stats.used || 0, color: '#7b1fa2' },
      ].map(s => (
        <Chip key={s.label} label={s.label + ': ' + s.value} size="small"
          sx={{ bgcolor: s.color + '15', color: s.color, fontWeight: 600, fontSize: 12 }} />
      ))}
    </Box>
  );

  const VisualCard = ({ item }) => {
    const plat = getPlatform(item.source_platform);
    return (
      <Card variant="outlined" sx={{ position: 'relative', transition: 'transform 150ms', '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 } }}>
        <Checkbox size="small" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)}
          sx={{ position: 'absolute', top: 4, left: 4, zIndex: 2, bgcolor: 'rgba(255,255,255,0.8)', borderRadius: 1, p: 0.3 }} />
        <Chip label={plat.icon + ' ' + plat.label} size="small"
          sx={{ position: 'absolute', top: 6, right: 6, zIndex: 2, bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11 }} />
        {item.thumbnail_url ? (
          <CardMedia component="img" height="140" image={item.thumbnail_url} alt={item.title || 'Visual'}
            sx={{ objectFit: 'cover', cursor: 'pointer' }} onClick={() => handleViewDetail(item.id)} />
        ) : (
          <Box sx={{ height: 140, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={() => handleViewDetail(item.id)}>
            <ImageIcon sx={{ fontSize: 48, color: '#ccc' }} />
          </Box>
        )}
        <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500, fontSize: 13 }}>{item.title || 'Untitled'}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <Chip label={item.status} size="small" color={STATUS_COLORS[item.status] || 'default'} sx={{ fontSize: 10, height: 20 }} />
            {item.trend_score > 0 && <Chip label={'⭐ ' + Number(item.trend_score).toFixed(1)} size="small" sx={{ fontSize: 10, height: 20, bgcolor: item.trend_score >= 7 ? '#e8f5e9' : item.trend_score >= 4 ? '#e3f2fd' : '#fff3e0' }} />}
            <Chip label={item.visual_type} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
          </Box>
        </CardContent>
        <CardActions sx={{ px: 1, py: 0.5, justifyContent: 'flex-end' }}>
          {item.status === 'discovered' && (
            <Tooltip title="AI Analyse"><IconButton size="small" onClick={() => handleAnalyze(item.id)} disabled={analyzing === item.id}>
              <AnalyzeIcon fontSize="small" color={analyzing === item.id ? 'disabled' : 'primary'} /></IconButton></Tooltip>
          )}
          {(item.status === 'discovered' || item.status === 'analyzed') && !item.media_id && (
            <Tooltip title="Opslaan in Media Library"><IconButton size="small" onClick={() => handleSave(item.id)} disabled={saving === item.id}>
              <SaveIcon fontSize="small" color={saving === item.id ? 'disabled' : 'success'} /></IconButton></Tooltip>
          )}
          {item.media_id && <Tooltip title="Opgeslagen"><CheckIcon fontSize="small" color="success" /></Tooltip>}
          {item.status === 'analyzed' && (
            <Tooltip title="Content Maken vanuit deze visual"><IconButton size="small" onClick={() => handleGenerateContent(item.id)} disabled={generatingContent === item.id}>
              {generatingContent === item.id ? <CircularProgress size={16} /> : <AnalyzeIcon fontSize="small" color="secondary" />}</IconButton></Tooltip>
          )}
          {item.status !== 'dismissed' && (
            <Tooltip title="Dismiss"><IconButton size="small" onClick={() => handleDismiss(item.id)}>
              <DismissIcon fontSize="small" color="error" /></IconButton></Tooltip>
          )}
        </CardActions>
      </Card>
    );
  };

  return (
    <Box>
      <StatsBar />

      {/* Filters + view toggle */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Platform</InputLabel>
          <Select value={platformFilter} label="Platform" onChange={e => { setPlatformFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">Alle</MenuItem>
            <MenuItem value="youtube">YouTube</MenuItem>
            <MenuItem value="instagram">Instagram</MenuItem>
            <MenuItem value="facebook">Facebook</MenuItem>
            <MenuItem value="pexels">Pexels</MenuItem>
            <MenuItem value="pinterest">Pinterest</MenuItem>
            <MenuItem value="reddit">Reddit</MenuItem>
            <MenuItem value="google_images">Google Images</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">Alle</MenuItem>
            <MenuItem value="discovered">Ontdekt</MenuItem>
            <MenuItem value="analyzed">Geanalyseerd</MenuItem>
            <MenuItem value="saved">Opgeslagen</MenuItem>
            <MenuItem value="used">Gebruikt</MenuItem>
            <MenuItem value="dismissed">Dismissed</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 90 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label="Type" onChange={e => { setTypeFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">Alle</MenuItem>
            <MenuItem value="image">Image</MenuItem>
            <MenuItem value="video">Video</MenuItem>
            <MenuItem value="reel">Reel</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        {selected.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button size="small" variant="outlined" color="success" startIcon={<SaveIcon />} onClick={handleBulkSave}>
              Opslaan ({selected.length})
            </Button>
            <Button size="small" variant="outlined" color="error" startIcon={<DismissIcon />} onClick={handleBulkDismiss}>
              Dismiss ({selected.length})
            </Button>
          </Box>
        )}
        <Tooltip title="Upload afbeelding of video">
          <Button size="small" variant="outlined" component="label" startIcon={uploading ? <CircularProgress size={14} /> : <UploadIcon />} disabled={uploading} sx={{ textTransform: 'none', fontSize: 12 }}>
            Upload
            <input type="file" hidden accept="image/*,video/*" onChange={handleUpload} />
          </Button>
        </Tooltip>
        <Tooltip title="Vernieuwen"><IconButton size="small" onClick={loadData}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
        <ToggleButtonGroup size="small" value={view} exclusive onChange={(_, v) => { if (v) setView(v); }}>
          <ToggleButton value="grid"><GridIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="table"><TableIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Grid view */}
      {view === 'grid' && (
        <Grid container spacing={1.5}>
          {loading ? Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={6} sm={4} md={3} key={i}><Skeleton variant="rounded" height={220} /></Grid>
          )) : items.length === 0 ? (
            <Grid item xs={12}><Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              Geen visuele trends gevonden. Start een discovery scan of pas filters aan.
            </Typography></Grid>
          ) : items.map(item => (
            <Grid item xs={6} sm={4} md={3} key={item.id}><VisualCard item={item} /></Grid>
          ))}
        </Grid>
      )}

      {/* Table view */}
      {view === 'table' && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"><Checkbox size="small" checked={selected.length === items.length && items.length > 0}
                  onChange={() => setSelected(selected.length === items.length ? [] : items.map(i => i.id))} /></TableCell>
                <TableCell>Thumbnail</TableCell>
                <TableCell>Titel</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Acties</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              )) : items.map(item => {
                const plat = getPlatform(item.source_platform);
                return (
                  <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleViewDetail(item.id)}>
                    <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                      <Checkbox size="small" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                    </TableCell>
                    <TableCell sx={{ width: 60 }}>
                      {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" style={{ width: 50, height: 36, objectFit: 'cover', borderRadius: 4 }} /> : <ImageIcon color="disabled" />}
                    </TableCell>
                    <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>{item.title || 'Untitled'}</Typography></TableCell>
                    <TableCell><Chip label={plat.icon + ' ' + plat.label} size="small" sx={{ fontSize: 11 }} /></TableCell>
                    <TableCell><Chip label={item.visual_type} size="small" variant="outlined" sx={{ fontSize: 11 }} /></TableCell>
                    <TableCell>{item.trend_score > 0 ? Number(item.trend_score).toFixed(1) : '-'}</TableCell>
                    <TableCell><Chip label={item.status} size="small" color={STATUS_COLORS[item.status] || 'default'} sx={{ fontSize: 11 }} /></TableCell>
                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'flex-end' }}>
                        {item.status === 'discovered' && (
                          <Tooltip title="AI Analyse"><IconButton size="small" onClick={() => handleAnalyze(item.id)} disabled={analyzing === item.id}>
                            <AnalyzeIcon fontSize="small" /></IconButton></Tooltip>
                        )}
                        {!item.media_id && item.status !== 'dismissed' && (
                          <Tooltip title="Opslaan"><IconButton size="small" onClick={() => handleSave(item.id)} disabled={saving === item.id}>
                            <SaveIcon fontSize="small" /></IconButton></Tooltip>
                        )}
                        {item.media_id && <CheckIcon fontSize="small" color="success" />}
                        {item.status !== 'dismissed' && (
                          <Tooltip title="Dismiss"><IconButton size="small" onClick={() => handleDismiss(item.id)}>
                            <DismissIcon fontSize="small" /></IconButton></Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TablePagination component="div" count={total} page={page} rowsPerPage={limit}
        onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setLimit(parseInt(e.target.value)); setPage(0); }}
        rowsPerPageOptions={[10, 20, 50]} sx={{ mt: 1 }} />

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="md" fullWidth>
        {detailDialog && <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getPlatform(detailDialog.source_platform).icon} {detailDialog.title || 'Visual Detail'}
            <Chip label={detailDialog.status} size="small" color={STATUS_COLORS[detailDialog.status] || 'default'} sx={{ ml: 'auto' }} />
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                {detailDialog.thumbnail_url && <img src={detailDialog.thumbnail_url} alt="" style={{ width: '100%', borderRadius: 8 }} />}
                {detailDialog.source_url && (
                  <Button size="small" href={detailDialog.source_url} target="_blank" sx={{ mt: 1 }}>Bron openen</Button>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>AI Analyse</Typography>
                {detailDialog.ai_description ? (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>{detailDialog.ai_description}</Typography>
                    {detailDialog.ai_mood && <Chip label={'Mood: ' + detailDialog.ai_mood} size="small" sx={{ mr: 0.5, mb: 0.5 }} />}
                    {detailDialog.trend_score > 0 && <Chip label={'Score: ' + Number(detailDialog.trend_score).toFixed(1)} size="small" color={Number(detailDialog.trend_score) >= 7 ? 'success' : 'default'} sx={{ mr: 0.5, mb: 0.5 }} />}
                    {detailDialog.ai_themes && (() => {
                      try { const themes = JSON.parse(detailDialog.ai_themes); return themes.map((t, i) => <Chip key={i} label={t} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5, fontSize: 11 }} />); }
                      catch { return null; }
                    })()}
                    {detailDialog.ai_setting && <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>Setting: {detailDialog.ai_setting}</Typography>}
                  </Box>
                ) : (
                  <Typography color="text.secondary" variant="body2">Nog niet geanalyseerd. Klik op "AI Analyse" om te starten.</Typography>
                )}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Details</Typography>
                  <Typography variant="caption" display="block">Platform: {getPlatform(detailDialog.source_platform).label}</Typography>
                  <Typography variant="caption" display="block">Type: {detailDialog.visual_type}</Typography>
                  <Typography variant="caption" display="block">Relevantie: {detailDialog.relevance_category}</Typography>
                  <Typography variant="caption" display="block">Ontdekt: {new Date(detailDialog.discovered_at).toLocaleString()}</Typography>
                  {detailDialog.analyzed_at && <Typography variant="caption" display="block">Geanalyseerd: {new Date(detailDialog.analyzed_at).toLocaleString()}</Typography>}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            {detailDialog.status === 'discovered' && (
              <Button startIcon={<AnalyzeIcon />} onClick={() => { handleAnalyze(detailDialog.id); setDetailDialog(null); }}>AI Analyse</Button>
            )}
            {!detailDialog.media_id && detailDialog.status !== 'dismissed' && (
              <Button startIcon={<SaveIcon />} color="success" onClick={() => { handleSave(detailDialog.id); setDetailDialog(null); }}>Opslaan in Media</Button>
            )}
            {detailDialog.status === 'analyzed' && (
              <Button startIcon={<AnalyzeIcon />} color="secondary" onClick={() => { handleGenerateContent(detailDialog.id); setDetailDialog(null); }}>Content Maken</Button>
            )}
            <Button onClick={() => setDetailDialog(null)}>Sluiten</Button>
          </DialogActions>
        </>}
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={8000} onClose={() => setSnackbar(null)}
        message={snackbar?.message} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
