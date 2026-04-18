import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Chip, IconButton, Tooltip, Button, Alert, Skeleton,
  Grid, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon, Search as SearchIcon, Image as ImageIcon,
  Place as POIIcon, Event as EventIcon, QuestionAnswer as ChatIcon,
  TrendingUp as TrendIcon, AutoFixHigh as AIIcon, OpenInNew as OpenIcon,
  ChevronRight as ChevronRightIcon, Add as AddIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService';

const SECTION_CONFIG = {
  zoektermen: { icon: SearchIcon, color: '#1976d2', label: 'Zoektermen', tabIndex: 1 },
  visuele_trends: { icon: ImageIcon, color: '#9c27b0', label: 'Visuele Trends', tabIndex: 2 },
  poi_inspiratie: { icon: POIIcon, color: '#2e7d32', label: 'POI Inspiratie', tabIndex: 3 },
  agenda_inspiratie: { icon: EventIcon, color: '#ed6c02', label: 'Agenda Inspiratie', tabIndex: 4 },
  holibot_insights: { icon: ChatIcon, color: '#0288d1', label: 'HoliBot Insights', tabIndex: 5 },
  zoekintentie_gsc: { icon: TrendIcon, color: '#428554', label: 'Zoekintentie (GSC)', tabIndex: 6 }
};

function SectionCard({ sectionKey, section, config, onNavigate, onEditConcept }) {
  const Icon = config.icon;
  const items = section?.items || [];
  if (items.length === 0) return null;

  const itemSx = (idx) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, px: 0.5,
    borderBottom: idx < items.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
    cursor: 'pointer', borderRadius: 0.5, transition: 'background 150ms',
    '&:hover': { bgcolor: 'action.hover' }
  });

  const handleItemClick = (item) => {
    if (item.concept_id && onEditConcept) {
      onEditConcept(item.concept_id);
    } else {
      onNavigate(config.tabIndex);
    }
  };

  const renderItem = (item, idx) => {
    if (sectionKey === 'zoektermen') {
      return (
        <Box key={idx} sx={itemSx(idx)} onClick={() => handleItemClick(item)}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.keyword}</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {item.source && <Chip label={item.source === 'google_trends' ? 'Google' : item.source === 'website_analytics' ? 'Analytics' : item.source} size="small" variant="outlined" sx={{ fontSize: 9, height: 18 }} />}
            {item.search_volume > 0 && <Typography variant="caption" color="text.secondary">{item.search_volume}</Typography>}
          </Box>
        </Box>
      );
    }
    if (sectionKey === 'visuele_trends') {
      return (
        <Box key={idx} sx={{ ...itemSx(idx), gap: 1 }} onClick={() => handleItemClick(item)}>
          {item.thumbnail_url && <img src={item.thumbnail_url} alt="" style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 4 }} onError={e => { e.target.style.display = 'none'; }} />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{item.title || 'Visual'}</Typography>
            <Typography variant="caption" color="text.secondary">{item.source_platform}</Typography>
          </Box>
          {item.trend_score > 0 && <Chip label={Number(item.trend_score).toFixed(1)} size="small" sx={{ fontSize: 10, height: 18 }} />}
        </Box>
      );
    }
    if (sectionKey === 'poi_inspiratie') {
      return (
        <Box key={idx} sx={itemSx(idx)} onClick={() => handleItemClick(item)}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{item.name}</Typography>
            <Typography variant="caption" color="text.secondary">{item.category}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{Number(item.google_rating).toFixed(1)}</Typography>
            {item.has_content === false && <Chip label="Geen content" size="small" color="warning" variant="outlined" sx={{ fontSize: 9, height: 18 }} />}
          </Box>
        </Box>
      );
    }
    if (sectionKey === 'agenda_inspiratie') {
      const title = item.title_en || item.title || 'Event';
      const date = item.date ? new Date(item.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '';
      return (
        <Box key={idx} sx={{ ...itemSx(idx), gap: 1 }} onClick={() => handleItemClick(item)}>
          <Chip label={date} size="small" sx={{ fontSize: 10, height: 22, minWidth: 50, bgcolor: config.color + '15', color: config.color, fontWeight: 600 }} />
          <Typography variant="body2" noWrap sx={{ fontWeight: 500, flex: 1 }}>{title}</Typography>
        </Box>
      );
    }
    if (sectionKey === 'holibot_insights') {
      return (
        <Box key={idx} sx={itemSx(idx)} onClick={() => handleItemClick(item)}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.keyword}</Typography>
          <Chip label={item.mention_count + 'x'} size="small" sx={{ fontSize: 10, height: 18 }} />
        </Box>
      );
    }
    if (sectionKey === 'zoekintentie_gsc') {
      return (
        <Box key={idx} sx={itemSx(idx)} onClick={() => handleItemClick(item)}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.keyword}</Typography>
          <Typography variant="caption" color="text.secondary">{item.impressions} imp.</Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ fontSize: 20, color: config.color }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{config.label}</Typography>
          <Chip label={items.length} size="small" sx={{ fontSize: 11, height: 20, bgcolor: config.color + '15', color: config.color, fontWeight: 600 }} />
        </Box>
        <Tooltip title={'Bekijk alle ' + config.label}>
          <IconButton size="small" onClick={() => onNavigate(config.tabIndex)}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1 }}>
        {items.slice(0, 7).map((item, idx) => renderItem(item, idx))}
      </Box>
      {items.length > 7 && (
        <Button size="small" onClick={() => onNavigate(config.tabIndex)} sx={{ mt: 1, textTransform: 'none', fontSize: 12 }}>
          Toon alle {items.length} →
        </Button>
      )}
    </Paper>
  );
}

export default function ContentSourcesOverviewTab({ destinationId, onNavigateToTab, onEditConcept }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keywordDialog, setKeywordDialog] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [keywordTarget, setKeywordTarget] = useState('both');
  const [keywordSaving, setKeywordSaving] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;
    setKeywordSaving(true);
    try {
      await contentService.addKeyword(destinationId, newKeyword.trim(), keywordTarget);
      setSnackbar({ message: 'Keyword "' + newKeyword.trim() + '" toegevoegd', severity: 'success' });
      setNewKeyword('');
      setKeywordDialog(false);
      loadData(true);
    } catch (err) {
      setSnackbar({ message: err.response?.data?.error?.message || err.message, severity: 'error' });
    } finally {
      setKeywordSaving(false);
    }
  };

  const loadData = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await contentService.getTop25(destinationId, { refresh });
      if (res.success) setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Content Top 25</Typography>
          <Typography variant="caption" color="text.secondary">
            {data ? data.total_count + ' aanbevelingen uit ' + Object.values(data.sections || {}).filter(s => s.items?.length > 0).length + ' bronnen' : 'Laden...'}
            {data?.generated_at && ' · Bijgewerkt ' + new Date(data.generated_at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
        <Tooltip title="Vernieuwen (herberekent alle bronnen)">
          <IconButton onClick={() => loadData(true)} disabled={loading}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} md={6} lg={4} key={i}><Skeleton variant="rounded" height={250} /></Grid>
          ))}
        </Grid>
      ) : data ? (
        <Grid container spacing={2}>
          {Object.entries(SECTION_CONFIG).map(([key, config]) => {
            const section = data.sections?.[key];
            if (!section || section.items?.length === 0) return null;
            return (
              <Grid item xs={12} md={6} lg={4} key={key}>
                <SectionCard sectionKey={key} section={section} config={config} onNavigate={onNavigateToTab} onEditConcept={onEditConcept} />
              </Grid>
            );
          })}
        </Grid>
      ) : null}

      {/* Warnings from source validation */}
      {data?.sections?.zoektermen?.warnings?.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }} action={<Button size="small" color="inherit" startIcon={<AddIcon />} onClick={() => setKeywordDialog(true)}>Toevoegen</Button>}>
          {data.sections.zoektermen.warnings.map((w, i) => (
            <Typography key={i} variant="body2">{w.message || ('Onvoldoende ' + w.source + ' data (' + w.available + '/' + w.required + ')')}</Typography>
          ))}
        </Alert>
      )}

      {data?.errors?.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {data.errors.length} bron(nen) konden niet geladen worden. De overige bronnen zijn aangevuld.
        </Alert>
      )}

      {/* Keyword toevoegen dialog */}
      <Dialog open={keywordDialog} onClose={() => !keywordSaving && setKeywordDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Keyword toevoegen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Keyword" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} fullWidth size="small" autoFocus
            placeholder="bijv. sunset calpe, beste restaurants" />
          <FormControl size="small" fullWidth>
            <InputLabel>Doel</InputLabel>
            <Select value={keywordTarget} label="Doel" onChange={e => setKeywordTarget(e.target.value)}>
              <MenuItem value="seo">SEO (website content)</MenuItem>
              <MenuItem value="social">Social Media</MenuItem>
              <MenuItem value="both">Beide</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKeywordDialog(false)} disabled={keywordSaving}>Annuleren</Button>
          <Button variant="contained" onClick={handleAddKeyword} disabled={!newKeyword.trim() || keywordSaving}>
            {keywordSaving ? 'Toevoegen...' : 'Toevoegen'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={5000} onClose={() => setSnackbar(null)}
        message={snackbar?.message} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
