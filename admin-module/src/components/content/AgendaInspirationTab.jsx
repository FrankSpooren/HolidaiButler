import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Chip, IconButton, Tooltip, Button, Select, MenuItem, FormControl, InputLabel,
  Alert, Skeleton, TablePagination, TextField, InputAdornment, TableSortLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, FormGroup, FormControlLabel, Checkbox,
  CircularProgress, Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon, Image as ImageIcon, Search as SearchIcon,
  CheckCircle as HasContentIcon, AutoFixHigh as AIIcon, OpenInNew as OpenIcon,
  Event as EventIcon, LocationOn as LocationIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService';

const PLATFORM_OPTIONS = ['facebook', 'instagram', 'linkedin', 'website'];
const PLATFORM_ETA = { facebook: '35-60 sec', instagram: '35-60 sec', linkedin: '35-60 sec', website: '2-4 min (blog)' };

export default function AgendaInspirationTab({ destinationId, onNavigateToContent }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [daysHorizon, setDaysHorizon] = useState('60');
  const [searchQuery, setSearchQuery] = useState('');
  const [contentFilter, setContentFilter] = useState('');

  const [generateDialog, setGenerateDialog] = useState(null);
  const [generatePlatforms, setGeneratePlatforms] = useState(['facebook', 'instagram']);
  const [generating, setGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState('');
  const [snackbar, setSnackbar] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: page + 1, limit, days: daysHorizon, sort: sortField, order: sortOrder };
      const res = await contentService.getContentSourceEvents(destinationId, params);
      if (res.success) {
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [destinationId, page, limit, sortField, sortOrder, daysHorizon]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortOrder(field === 'date' ? 'ASC' : 'DESC');
    }
    setPage(0);
  };

  const estimatedTime = () => {
    const totalSec = generatePlatforms.reduce((sum, p) => p === 'website' ? sum + 180 : sum + 50, 0);
    return totalSec >= 120 ? Math.round(totalSec / 60) + '-' + Math.round(totalSec * 1.5 / 60) + ' minuten' : totalSec + '-' + Math.round(totalSec * 1.5) + ' seconden';
  };

  const handleGenerate = async () => {
    if (!generateDialog) return;
    const eventId = generateDialog.event_id;
    const eventName = generateDialog.name;
    const count = generatePlatforms.length;
    setGenerating(true);
    setGenerateStatus('Generatie wordt gestart...');
    try {
      // Step 1: Create a suggestion from event data
      const eventSummary = 'Event: ' + eventName +
        (generateDialog.date ? '. Datum: ' + generateDialog.date : '') +
        (generateDialog.location ? '. Locatie: ' + generateDialog.location : '') +
        (generateDialog.description ? '. ' + generateDialog.description : '');
      const sugRes = await contentService.createSuggestion({
        destination_id: destinationId,
        title: eventName,
        summary: eventSummary,
        content_type: generatePlatforms.includes('website') ? 'blog' : 'social_post',
        keyword_cluster: [eventName, generateDialog.location].filter(Boolean),
        engagement_score: 7,
        event_source_id: eventId,
        image_url: generateDialog.image || null
      });
      const suggestionId = sugRes.data?.id;
      if (!suggestionId) throw new Error('Suggestie aanmaken mislukt');

      // Step 2: Generate concept from that suggestion (async, returns 202)
      await contentService.generateConcept({
        suggestion_id: suggestionId,
        destination_id: destinationId,
        content_type: generatePlatforms.includes('website') ? 'blog' : 'social_post',
        platforms: generatePlatforms
      });
      setGenerateDialog(null);
      setGenerateStatus('');
      setLastGenerated({ event_id: eventId, name: eventName, count, ready: false });
      // Poll for completion — check if ALL platform items are generated (not just concept exists)
      let polls = 0;
      const pollInterval = setInterval(async () => {
        polls++;
        try {
          const concepts = await contentService.getConcepts(destinationId, { limit: 5, offset: 0 });
          const found = concepts.data?.find(c => c.suggestion_id === suggestionId);
          if (found && found.approval_status === 'draft' && found.platform_versions) {
            // Check that ALL requested platforms have items (not still generating)
            const readyPlatforms = found.platform_versions.filter(v => v.status !== 'generating');
            if (readyPlatforms.length >= count) {
              setLastGenerated(prev => prev && prev.event_id === eventId ? { ...prev, ready: true, count: readyPlatforms.length } : prev);
              // NOW reload the table to get accurate content_count from server
              loadData();
              clearInterval(pollInterval);
            }
          }
        } catch (e) { /* ignore poll errors */ }
        if (polls >= 20) {
          loadData();
          clearInterval(pollInterval);
        }
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
  if (searchQuery) filteredItems = filteredItems.filter(i => ((i.title_en || i.title || '') + ' ' + (i.location_name || '')).toLowerCase().includes(searchQuery.toLowerCase()));
  if (contentFilter === 'with') filteredItems = filteredItems.filter(i => i.has_content);
  if (contentFilter === 'without') filteredItems = filteredItems.filter(i => !i.has_content);

  const withContent = items.filter(i => i.has_content).length;
  const withoutContent = items.length - withContent;

  const formatDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
  };

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
      {/* Generation status banners */}
      {lastGenerated && !lastGenerated.ready && (
        <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>
          Content wordt gegenereerd voor <strong>{lastGenerated.name}</strong> ({lastGenerated.count} platform{lastGenerated.count > 1 ? 's' : ''}).
          Dit duurt 1-4 minuten. Items verschijnen automatisch.
        </Alert>
      )}
      {lastGenerated && lastGenerated.ready && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setLastGenerated(null)}
          action={
            <Button size="small" color="inherit" startIcon={<OpenIcon sx={{ fontSize: 14 }} />}
              onClick={() => { if (onNavigateToContent) onNavigateToContent(2); setLastGenerated(null); }}>
              Bekijk in Content Items
            </Button>
          }>
          <strong>{lastGenerated.count} content item(s)</strong> gereed voor <strong>{lastGenerated.name}</strong>.
        </Alert>
      )}

      {/* Stats bar */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip label={'Totaal: ' + total} size="small" clickable onClick={() => { setContentFilter(''); setSortField('date'); setSortOrder('ASC'); setPage(0); }}
          sx={{ fontWeight: 600, fontSize: 12, bgcolor: contentFilter === '' ? 'action.selected' : undefined }} />
        <Chip label={'Met content: ' + withContent} size="small" color="success" clickable
          variant={contentFilter === 'with' ? 'filled' : 'outlined'}
          onClick={() => { setContentFilter(contentFilter === 'with' ? '' : 'with'); setSortField('content_count'); setSortOrder('DESC'); setPage(0); }}
          sx={{ fontSize: 12 }} />
        <Chip label={'Zonder content: ' + withoutContent} size="small" color="warning" clickable
          variant={contentFilter === 'without' ? 'filled' : 'outlined'}
          onClick={() => { setContentFilter(contentFilter === 'without' ? '' : 'without'); setSortField('content_count'); setSortOrder('ASC'); setPage(0); }}
          sx={{ fontSize: 12 }} />
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Zoek event..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 180 }} />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Horizon</InputLabel>
          <Select value={daysHorizon} label="Horizon" onChange={e => { setDaysHorizon(e.target.value); setPage(0); }}>
            <MenuItem value="7">7 dagen</MenuItem>
            <MenuItem value="14">14 dagen</MenuItem>
            <MenuItem value="30">30 dagen</MenuItem>
            <MenuItem value="60">60 dagen</MenuItem>
            <MenuItem value="90">90 dagen</MenuItem>
            <MenuItem value="180">180 dagen</MenuItem>
            <MenuItem value="365">1 jaar</MenuItem>
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
              <SortHeader field="date">Datum</SortHeader>
              <SortHeader field="title">Event</SortHeader>
              <TableCell>Locatie</TableCell>
              <TableCell>Afbeelding</TableCell>
              <SortHeader field="content_count" align="center">Content</SortHeader>
              <TableCell align="right">Actie</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
            )) : filteredItems.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">Geen events gevonden in deze periode.</Typography>
              </TableCell></TableRow>
            ) : filteredItems.map(item => {
              const title = item.title_en || item.title || 'Untitled';
              return (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <EventIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(item.date)}</Typography>
                        {item.time && item.time !== '00:00:00' && <Typography variant="caption" color="text.secondary">{item.time.substring(0, 5)}</Typography>}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{title}</Typography>
                    {item.short_description_en && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 350, display: 'block' }}>
                        {item.short_description_en}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.location_name && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>{item.location_name}</Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.image ? (
                      <img src={item.image} alt="" style={{ width: 50, height: 36, objectFit: 'cover', borderRadius: 4 }}
                        onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <ImageIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {item.has_content ? (
                      <Tooltip title={item.content_count + ' content item(s) — klik om te bekijken'}>
                        <Chip icon={<HasContentIcon sx={{ fontSize: 14 }} />} label={item.content_count} size="small" color="success"
                          sx={{ fontSize: 11, cursor: 'pointer' }} onClick={() => { if (onNavigateToContent) onNavigateToContent(2); }} />
                      </Tooltip>
                    ) : (
                      <Chip label="Geen" size="small" color="warning" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={item.has_content ? 'Genereer aanvullende content voor dit event' : 'Genereer content vanuit event (titel, datum, locatie, beschrijving)'}>
                      <Button size="small" variant={item.has_content ? 'outlined' : 'contained'} startIcon={<AIIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setGenerateDialog({ event_id: item.id, name: title, date: item.date, location: item.location_name, description: item.short_description_en || item.short_description || '', image: item.image || null, has_content: item.has_content })}
                        sx={{ fontSize: 11, py: 0.3, textTransform: 'none' }}>
                        {item.has_content ? 'Meer content' : 'Content Maken'}
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
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
            <Typography variant="body2" sx={{ mb: 0.5 }}><strong>{generateDialog.name}</strong></Typography>
            {generateDialog.date && <Typography variant="caption" color="text.secondary" display="block">{formatDate(generateDialog.date)}{generateDialog.location ? ' — ' + generateDialog.location : ''}</Typography>}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, mb: 2 }}>
              De AI gebruikt de event-gegevens (titel, datum, locatie, beschrijving) als basis voor de content.
            </Typography>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Platforms:</Typography>
            <FormGroup>
              {PLATFORM_OPTIONS.map(p => (
                <FormControlLabel key={p} disabled={generating}
                  control={<Checkbox size="small" checked={generatePlatforms.includes(p)} onChange={() => togglePlatform(p)} />}
                  label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{p}</Typography>
                    <Typography variant="caption" color="text.secondary">({PLATFORM_ETA[p]})</Typography>
                  </Box>} />
              ))}
            </FormGroup>
            <Alert severity="info" sx={{ mt: 2, py: 0.5 }} icon={false}>
              <Typography variant="caption">
                <strong>Geschatte tijd:</strong> {estimatedTime()}.
                De popup sluit automatisch na het starten. Generatie loopt op de achtergrond.
              </Typography>
            </Alert>
            {generating && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{generateStatus}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateDialog(null)}>{generating ? 'Sluiten (generatie gaat door)' : 'Annuleren'}</Button>
            {!generating && (
              <Button variant="contained" onClick={handleGenerate} disabled={generatePlatforms.length === 0} startIcon={<AIIcon />}>
                Genereer Content
              </Button>
            )}
          </DialogActions>
        </>}
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={8000} onClose={() => setSnackbar(null)}
        message={snackbar?.message} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
