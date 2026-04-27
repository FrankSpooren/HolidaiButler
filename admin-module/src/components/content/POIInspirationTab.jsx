import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Chip, IconButton, Tooltip, Button, Select, MenuItem, FormControl, InputLabel,
  Alert, Skeleton, TablePagination, Rating, TextField, InputAdornment, TableSortLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, FormGroup, FormControlLabel, Checkbox,
  CircularProgress, Snackbar, Link
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import SearchIcon from '@mui/icons-material/Search';
import HasContentIcon from '@mui/icons-material/CheckCircle';
import AIIcon from '@mui/icons-material/AutoFixHigh';
import OpenIcon from '@mui/icons-material/OpenInNew';
import ViewIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService';

const TIER_LABELS = { 1: 'T1 Premium', 2: 'T2 Belangrijk', 3: 'T3 Standaard', 4: 'T4 Basis' };
const TIER_COLORS = { 1: '#7b1fa2', 2: '#1565c0', 3: '#2e7d32', 4: '#666' };
const PLATFORM_OPTIONS = ['facebook', 'instagram', 'linkedin', 'website'];
const PLATFORM_ETA = { facebook: '35-60 sec', instagram: '35-60 sec', linkedin: '35-60 sec', website: '2-4 min (blog)' };

export default function POIInspirationTab({ destinationId, onNavigateToContent }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState('google_rating');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [minRating, setMinRating] = useState('0');
  const [minReviews, setMinReviews] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [contentFilter, setContentFilter] = useState(''); // '', 'with', 'without'

  // Generate dialog state
  const [generateDialog, setGenerateDialog] = useState(null);
  const [generatePlatforms, setGeneratePlatforms] = useState(['facebook', 'instagram']);
  const [generating, setGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState(''); // progress text
  const [snackbar, setSnackbar] = useState(null);

  // Result preview state
  const [lastGeneratedPoi, setLastGeneratedPoi] = useState(null); // { poi_id, name, count }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: page + 1,
        limit,
        min_rating: minRating,
        min_reviews: minReviews,
        sort: sortField,
        order: sortOrder
      };
      if (categoryFilter) params.category = categoryFilter;
      const res = await contentService.getContentSourcePois(destinationId, params);
      if (res.success) {
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [destinationId, page, limit, categoryFilter, sortField, sortOrder, minRating, minReviews]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' ? 'ASC' : 'DESC');
    }
    setPage(0);
  };

  const estimatedTime = () => {
    const totalSec = generatePlatforms.reduce((sum, p) => {
      if (p === 'website') return sum + 180;
      return sum + 50;
    }, 0);
    if (totalSec >= 120) return Math.round(totalSec / 60) + '-' + Math.round(totalSec * 1.5 / 60) + ' minuten';
    return totalSec + '-' + Math.round(totalSec * 1.5) + ' seconden';
  };

  const handleGenerate = async () => {
    if (!generateDialog) return;
    const poiId = generateDialog.poi_id;
    const poiName = generateDialog.name;
    const count = generatePlatforms.length;
    setGenerating(true);
    setGenerateStatus('Generatie wordt gestart...');
    try {
      await contentService.generateFromPOI(poiId, {
        destination_id: destinationId,
        platforms: generatePlatforms
      });
      // Server returns 202 immediately — generation runs in background
      setGenerateDialog(null);
      setGenerateStatus('');
      setLastGeneratedPoi({ poi_id: poiId, name: poiName, count, ready: false });
      // Optimistic chip update
      setItems(prev => prev.map(item =>
        item.id === poiId ? { ...item, has_content: true, content_count: (item.content_count || 0) + count } : item
      ));
      // Poll for actual content items to appear (every 15s, max 5 min)
      let polls = 0;
      const pollInterval = setInterval(async () => {
        polls++;
        try {
          const check = await contentService.getContentSourcePois(destinationId, {
            page: 1, limit: 1, min_rating: '0', min_reviews: '0', sort: 'name', order: 'ASC'
          });
          // Check if this specific POI now has real content_count > 0
          // We reload the full list to get accurate counts
          loadData();
          // Also check via concepts API if items exist
          const concepts = await contentService.getConcepts(destinationId, { limit: 5, offset: 0 });
          const found = concepts.data?.find(c => c.poi_id === poiId && c.platform_versions?.length > 0);
          if (found) {
            setLastGeneratedPoi(prev => prev && prev.poi_id === poiId ? { ...prev, ready: true } : prev);
            clearInterval(pollInterval);
          }
        } catch (e) { /* ignore poll errors */ }
        if (polls >= 20) clearInterval(pollInterval);
      }, 15000);
    } catch (err) {
      setGenerateStatus('');
      setSnackbar({ message: 'Generatie mislukt: ' + err.message, severity: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const togglePlatform = (p) => {
    setGeneratePlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  let filteredItems = items;
  if (searchQuery) filteredItems = filteredItems.filter(i => (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  if (contentFilter === 'with') filteredItems = filteredItems.filter(i => i.has_content);
  if (contentFilter === 'without') filteredItems = filteredItems.filter(i => !i.has_content);

  const withContent = items.filter(i => i.has_content).length;
  const withoutContent = items.length - withContent;

  const SortHeader = ({ field, children, align }) => (
    <TableCell align={align || 'left'} sortDirection={sortField === field ? sortOrder.toLowerCase() : false}>
      <TableSortLabel active={sortField === field} direction={sortField === field ? sortOrder.toLowerCase() : 'asc'}
        onClick={() => handleSort(field)} sx={{ '& .MuiTableSortLabel-icon': { fontSize: 16 } }}>
        {children}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Box>
      {/* Generation status banner — stays until content is ready */}
      {lastGeneratedPoi && !lastGeneratedPoi.ready && (
        <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>
          Content wordt gegenereerd voor <strong>{lastGeneratedPoi.name}</strong> ({lastGeneratedPoi.count} platform{lastGeneratedPoi.count > 1 ? 's' : ''}).
          Dit duurt 1-4 minuten. Items verschijnen automatisch.
        </Alert>
      )}
      {lastGeneratedPoi && lastGeneratedPoi.ready && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setLastGeneratedPoi(null)}
          action={
            <Button size="small" color="inherit" startIcon={<OpenIcon sx={{ fontSize: 14 }} />}
              onClick={() => { if (onNavigateToContent) onNavigateToContent(2); setLastGeneratedPoi(null); }}>
              Bekijk in Content Items
            </Button>
          }>
          <strong>{lastGeneratedPoi.count} content item(s)</strong> gereed voor <strong>{lastGeneratedPoi.name}</strong>.
          Ga naar Content Items om te reviewen, bewerken en publiceren.
        </Alert>
      )}

      {/* Stats bar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip label={'Totaal: ' + total} size="small" clickable onClick={() => { setContentFilter(''); setSortField('google_rating'); setSortOrder('DESC'); setPage(0); }}
          sx={{ fontWeight: 600, fontSize: 12, bgcolor: contentFilter === '' ? 'action.selected' : undefined }} />
        <Chip label={'Met content: ' + withContent} size="small" color="success" clickable
          variant={contentFilter === 'with' ? 'filled' : 'outlined'}
          onClick={() => { setContentFilter(contentFilter === 'with' ? '' : 'with'); setSortField('content_count'); setSortOrder('DESC'); setPage(0); }}
          sx={{ fontSize: 12, cursor: 'pointer' }} />
        <Chip label={'Zonder content: ' + withoutContent} size="small" color="warning" clickable
          variant={contentFilter === 'without' ? 'filled' : 'outlined'}
          onClick={() => { setContentFilter(contentFilter === 'without' ? '' : 'without'); setSortField('content_count'); setSortOrder('ASC'); setPage(0); }}
          sx={{ fontSize: 12, cursor: 'pointer' }} />
        {(minRating !== '0' || minReviews !== '0') && (
          <Chip label={'Filter: rating\u2265' + minRating + ', reviews\u2265' + minReviews} size="small" color="info" variant="outlined" sx={{ fontSize: 11 }} onDelete={() => { setMinRating('0'); setMinReviews('0'); setPage(0); }} />
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Zoek POI..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 180 }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Categorie</InputLabel>
          <Select value={categoryFilter} label="Categorie" onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">Alle</MenuItem>
            <MenuItem value="Food & Drinks">Food & Drinks</MenuItem>
            <MenuItem value="Shopping">Shopping</MenuItem>
            <MenuItem value="Health & Wellbeing">Health & Wellbeing</MenuItem>
            <MenuItem value="Tourism & Leisure">Tourism & Leisure</MenuItem>
            <MenuItem value="Nature & Parks">Nature & Parks</MenuItem>
            <MenuItem value="Culture & History">Culture & History</MenuItem>
            <MenuItem value="Sports & Activities">Sports & Activities</MenuItem>
            <MenuItem value="Accommodation">Accommodation</MenuItem>
            <MenuItem value="Services">Services</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Min rating</InputLabel>
          <Select value={minRating} label="Min rating" onChange={e => { setMinRating(e.target.value); setPage(0); }}>
            <MenuItem value="0">Alle</MenuItem>
            <MenuItem value="3.0">3.0+</MenuItem>
            <MenuItem value="3.5">3.5+</MenuItem>
            <MenuItem value="4.0">4.0+</MenuItem>
            <MenuItem value="4.5">4.5+</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Min reviews</InputLabel>
          <Select value={minReviews} label="Min reviews" onChange={e => { setMinReviews(e.target.value); setPage(0); }}>
            <MenuItem value="0">Alle</MenuItem>
            <MenuItem value="1">1+</MenuItem>
            <MenuItem value="3">3+</MenuItem>
            <MenuItem value="5">5+</MenuItem>
            <MenuItem value="10">10+</MenuItem>
            <MenuItem value="25">25+</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Vernieuwen"><IconButton size="small" onClick={loadData}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortHeader field="name">POI</SortHeader>
              <TableCell>Categorie</TableCell>
              <SortHeader field="google_rating" align="center">Rating</SortHeader>
              <SortHeader field="google_review_count" align="center">Reviews</SortHeader>
              <TableCell align="center">Images</TableCell>
              <SortHeader field="tier" align="center">Tier</SortHeader>
              <SortHeader field="content_count" align="center">Content</SortHeader>
              <TableCell align="right">Actie</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
            )) : filteredItems.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">Geen POIs gevonden met deze filters.</Typography>
              </TableCell></TableRow>
            ) : filteredItems.map(item => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.name}</Typography>
                    {item.tile_description && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300, display: 'block' }}>
                        {item.tile_description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell><Chip label={item.category || 'Onbekend'} size="small" variant="outlined" sx={{ fontSize: 11 }} /></TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <Rating value={Number(item.google_rating) || 0} precision={0.1} size="small" readOnly />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{Number(item.google_rating).toFixed(1)}</Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">{item.google_review_count || 0}</TableCell>
                <TableCell align="center">
                  <Chip icon={<ImageIcon sx={{ fontSize: 14 }} />} label={item.image_count || 0} size="small" variant="outlined"
                    color={item.image_count >= 3 ? 'success' : 'warning'} sx={{ fontSize: 11 }} />
                </TableCell>
                <TableCell align="center">
                  <Chip label={TIER_LABELS[item.tier] || 'T' + item.tier} size="small"
                    sx={{ fontSize: 10, fontWeight: 600, bgcolor: (TIER_COLORS[item.tier] || '#666') + '15', color: TIER_COLORS[item.tier] || '#666' }} />
                </TableCell>
                <TableCell align="center">
                  {item.has_content ? (
                    <Tooltip title={item.content_count + ' content item(s) — klik om te bekijken'}>
                      <Chip icon={<HasContentIcon sx={{ fontSize: 14 }} />} label={item.content_count} size="small" color="success"
                        sx={{ fontSize: 11, cursor: 'pointer' }}
                        onClick={() => { if (onNavigateToContent) onNavigateToContent(2); }} />
                    </Tooltip>
                  ) : (
                    <Chip label="Geen" size="small" color="warning" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={item.has_content
                    ? 'Genereer aanvullende content (bestaande POI-beschrijving + AI)'
                    : 'Genereer content vanuit POI data (naam, categorie, rating, beschrijving)'}>
                    <Button size="small" variant={item.has_content ? 'outlined' : 'contained'} startIcon={<AIIcon sx={{ fontSize: 14 }} />}
                      onClick={() => setGenerateDialog({ poi_id: item.id, name: item.name, has_content: item.has_content })}
                      sx={{ fontSize: 11, py: 0.3, textTransform: 'none' }}>
                      {item.has_content ? 'Meer content' : 'Content Maken'}
                    </Button>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination component="div" count={total} page={page} rowsPerPage={limit}
        onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={e => { setLimit(parseInt(e.target.value)); setPage(0); }}
        rowsPerPageOptions={[10, 20, 50]} sx={{ mt: 1 }} />

      {/* Generate Content Dialog */}
      <Dialog open={!!generateDialog} onClose={() => !generating ? setGenerateDialog(null) : null} maxWidth="xs" fullWidth>
        {generateDialog && <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon color="primary" /> Content genereren
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>{generateDialog.name}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              De AI gebruikt de POI-gegevens (naam, categorie, locatie, rating, beschrijving en highlights) als basis.
              {generateDialog.has_content ? ' Bestaande content wordt als referentie meegenomen.' : ''}
            </Typography>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>Platforms:</Typography>
            <FormGroup>
              {PLATFORM_OPTIONS.map(p => (
                <FormControlLabel key={p} disabled={generating}
                  control={<Checkbox size="small" checked={generatePlatforms.includes(p)} onChange={() => togglePlatform(p)} />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{p}</Typography>
                      <Typography variant="caption" color="text.secondary">({PLATFORM_ETA[p]})</Typography>
                    </Box>
                  } />
              ))}
            </FormGroup>

            {/* ETA + warning */}
            <Alert severity="info" sx={{ mt: 2, py: 0.5 }} icon={false}>
              <Typography variant="caption">
                <strong>Geschatte tijd:</strong> {estimatedTime()}.
                {' '}De popup sluit automatisch na afronding. Je kunt ondertussen verder werken — de generatie loopt op de achtergrond.
              </Typography>
            </Alert>

            {/* Progress during generation */}
            {generating && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <CircularProgress size={20} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{generateStatus}</Typography>
                  <Typography variant="caption" color="text.secondary">Dit venster mag gesloten worden — generatie gaat door op de server.</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateDialog(null)}>{generating ? 'Sluiten (generatie gaat door)' : 'Annuleren'}</Button>
            {!generating && (
              <Button variant="contained" onClick={handleGenerate} disabled={generatePlatforms.length === 0}
                startIcon={<AIIcon />}>
                Genereer Content
              </Button>
            )}
          </DialogActions>
        </>}
      </Dialog>

      {/* Snackbar feedback */}
      <Snackbar open={!!snackbar} autoHideDuration={8000} onClose={() => setSnackbar(null)}
        message={snackbar?.message} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
