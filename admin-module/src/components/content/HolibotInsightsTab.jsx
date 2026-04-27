import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Chip, IconButton, Tooltip, Button, Select, MenuItem, FormControl, InputLabel, TextField,
  Alert, Skeleton, TableSortLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  FormGroup, FormControlLabel, Checkbox, CircularProgress, Snackbar, LinearProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AIIcon from '@mui/icons-material/AutoFixHigh';
import OpenIcon from '@mui/icons-material/OpenInNew';
import ChatIcon from '@mui/icons-material/QuestionAnswer';
import TrendIcon from '@mui/icons-material/TrendingUp';
import POIIcon from '@mui/icons-material/Place';
import ActivityIcon from '@mui/icons-material/DirectionsRun';
import QuestionIcon from '@mui/icons-material/HelpOutline';
import HasContentIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService';

const TYPE_CONFIG = {
  top_theme: { icon: TrendIcon, label: 'Thema', color: '#1976d2' },
  top_poi: { icon: POIIcon, label: 'POI', color: '#2e7d32' },
  top_activity: { icon: ActivityIcon, label: 'Activiteit', color: '#ed6c02' },
  top_question: { icon: QuestionIcon, label: 'Vraag', color: '#9c27b0' }
};

const PLATFORM_OPTIONS = ['facebook', 'instagram', 'linkedin'];
const PLATFORM_ETA = { facebook: '35-60 sec', instagram: '35-60 sec', linkedin: '35-60 sec' };

export default function HolibotInsightsTab({ destinationId, onNavigateToContent }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState('mention_count');
  const [sortOrder, setSortOrder] = useState('DESC');

  const [generateDialog, setGenerateDialog] = useState(null);
  const [generatePlatforms, setGeneratePlatforms] = useState(['facebook', 'instagram']);
  const [generating, setGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (typeFilter) params.insight_type = typeFilter;
      if (selectedWeek) {
        const [y, w] = selectedWeek.split('-');
        params.year = y;
        params.week = w;
      }
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await contentService.getHolibotInsights(destinationId, params);
      if (res.success) {
        setItems(res.data.items || []);
        setWeeks(res.data.available_weeks || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [destinationId, typeFilter, selectedWeek, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortOrder(field === 'keyword' ? 'ASC' : 'DESC');
    }
  };

  // Client-side sort (insights are a small set, max ~15)
  const sortedItems = [...items].sort((a, b) => {
    const dir = sortOrder === 'ASC' ? 1 : -1;
    if (sortField === 'keyword') return dir * (a.keyword || '').localeCompare(b.keyword || '');
    if (sortField === 'mention_count') return dir * ((a.mention_count || 0) - (b.mention_count || 0));
    if (sortField === 'insight_type') return dir * (a.insight_type || '').localeCompare(b.insight_type || '');
    if (sortField === 'has_content') return dir * ((a.has_content ? 1 : 0) - (b.has_content ? 1 : 0));
    return 0;
  });

  const maxMentions = Math.max(...items.map(i => i.mention_count || 0), 1);

  const handleGenerate = async () => {
    if (!generateDialog) return;
    const keyword = generateDialog.keyword;
    const count = generatePlatforms.length;
    setGenerating(true);
    try {
      const samples = generateDialog.sample_messages || [];
      const sugRes = await contentService.createSuggestion({
        destination_id: destinationId,
        title: keyword,
        summary: 'Chatbot thema: ' + keyword + '. Toeristen vragen hier vaak naar (' + generateDialog.mention_count + ' keer). Voorbeelden: ' + samples.slice(0, 3).join('; '),
        content_type: 'social_post',
        keyword_cluster: [keyword],
        engagement_score: Math.min(10, Math.round((generateDialog.mention_count / maxMentions) * 10))
      });
      const suggestionId = sugRes.data?.id;
      if (!suggestionId) throw new Error('Suggestie aanmaken mislukt');

      await contentService.generateConcept({
        suggestion_id: suggestionId,
        destination_id: destinationId,
        content_type: 'social_post',
        platforms: generatePlatforms
      });

      setGenerateDialog(null);
      setLastGenerated({ keyword, count, ready: false });

      let polls = 0;
      const pollInterval = setInterval(async () => {
        polls++;
        try {
          const concepts = await contentService.getConcepts(destinationId, { limit: 5, offset: 0 });
          const found = concepts.data?.find(c => c.suggestion_id === suggestionId && c.approval_status === 'draft' && c.platform_versions?.filter(v => v.status !== 'generating').length >= count);
          if (found) {
            setLastGenerated(prev => prev && prev.keyword === keyword ? { ...prev, ready: true } : prev);
            clearInterval(pollInterval);
          }
        } catch (e) { /* ignore */ }
        if (polls >= 20) clearInterval(pollInterval);
      }, 15000);
    } catch (err) {
      setSnackbar({ message: 'Generatie mislukt: ' + err.message, severity: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const togglePlatform = (p) => {
    setGeneratePlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const parseSamples = (raw) => {
    if (!raw) return [];
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
  };

  const estimatedTime = () => {
    const totalSec = generatePlatforms.reduce((sum) => sum + 50, 0);
    return totalSec + '-' + Math.round(totalSec * 1.5) + ' seconden';
  };

  // Type counts for chips
  const typeCounts = {};
  for (const item of items) {
    typeCounts[item.insight_type] = (typeCounts[item.insight_type] || 0) + 1;
  }

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
      {/* Generation banners */}
      {lastGenerated && !lastGenerated.ready && (
        <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>
          Content wordt gegenereerd voor thema <strong>{lastGenerated.keyword}</strong> ({lastGenerated.count} platform{lastGenerated.count > 1 ? 's' : ''}).
        </Alert>
      )}
      {lastGenerated && lastGenerated.ready && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setLastGenerated(null)}
          action={<Button size="small" color="inherit" startIcon={<OpenIcon sx={{ fontSize: 14 }} />}
            onClick={() => { if (onNavigateToContent) onNavigateToContent(2); setLastGenerated(null); }}>
            Bekijk in Content Items
          </Button>}>
          Content gereed voor thema <strong>{lastGenerated.keyword}</strong>.
        </Alert>
      )}

      {/* Stats chips — same layout as Visuele Trends */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip icon={<ChatIcon sx={{ fontSize: 16 }} />} label={'Totaal: ' + items.length} size="small" clickable
          onClick={() => setTypeFilter('')}
          sx={{ fontWeight: 600, fontSize: 12, bgcolor: typeFilter === '' ? 'action.selected' : undefined }} />
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const count = typeCounts[type] || 0;
          const Icon = cfg.icon;
          const isActive = typeFilter === type;
          return (
            <Chip key={type} icon={<Icon sx={{ fontSize: 14 }} />} label={cfg.label + ': ' + count} size="small" clickable
              onClick={() => setTypeFilter(isActive ? '' : type)}
              sx={{ fontSize: 12, fontWeight: isActive ? 700 : 400,
                bgcolor: isActive ? cfg.color + '25' : cfg.color + '10',
                color: cfg.color, borderColor: isActive ? cfg.color : 'transparent',
                border: isActive ? '1.5px solid' : '1.5px solid transparent' }} />
          );
        })}
      </Box>

      {/* Date range filter + week selector + refresh */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small" type="date" label="Van" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
        <TextField size="small" type="date" label="Tot" value={dateTo} onChange={e => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
        {(dateFrom || dateTo) && (
          <Chip label="Reset datums" size="small" variant="outlined" onDelete={() => { setDateFrom(''); setDateTo(''); }} sx={{ fontSize: 11 }} />
        )}
        {weeks.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Week</InputLabel>
            <Select value={selectedWeek} label="Week" onChange={e => setSelectedWeek(e.target.value)}>
              <MenuItem value="">Laatste</MenuItem>
              {weeks.map(w => <MenuItem key={w.year + '-' + w.week_number} value={w.year + '-' + w.week_number}>Week {w.week_number}, {w.year}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Vernieuwen"><IconButton size="small" onClick={loadData}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {items.length === 0 && !loading ? (
        <Alert severity="info">
          Geen chatbot insights beschikbaar. De analyse draait wekelijks op zondag 06:00. Er zijn minimaal chatbot-gesprekken nodig in de afgelopen 7 dagen.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <SortHeader field="insight_type">Type</SortHeader>
                <SortHeader field="keyword">Thema / Keyword</SortHeader>
                <SortHeader field="mention_count" align="center">Vermeldingen</SortHeader>
                <TableCell>Voorbeeldvragen</TableCell>
                <SortHeader field="has_content" align="center">Content</SortHeader>
                <TableCell align="right">Actie</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              )) : sortedItems.map(item => {
                const cfg = TYPE_CONFIG[item.insight_type] || TYPE_CONFIG.top_theme;
                const Icon = cfg.icon;
                const samples = parseSamples(item.sample_messages);
                const barWidth = Math.round((item.mention_count / maxMentions) * 100);
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Chip icon={<Icon sx={{ fontSize: 14 }} />} label={cfg.label} size="small"
                        sx={{ fontSize: 10, bgcolor: cfg.color + '15', color: cfg.color, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.keyword}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={barWidth} sx={{ flex: 1, height: 6, borderRadius: 3,
                          bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: cfg.color } }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 24, textAlign: 'right' }}>{item.mention_count}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                        {samples.slice(0, 2).map((s, i) => (
                          <Typography key={i} variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 250, display: 'block', fontStyle: 'italic' }}>
                            "{s}"
                          </Typography>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {item.has_content ? (
                        <Tooltip title="Heeft al content"><HasContentIcon fontSize="small" color="success" /></Tooltip>
                      ) : (
                        <Chip label="Geen" size="small" color="warning" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Genereer content over dit thema gebaseerd op chatbot-vragen">
                        <Button size="small" variant={item.has_content ? 'outlined' : 'contained'} startIcon={<AIIcon sx={{ fontSize: 14 }} />}
                          onClick={() => setGenerateDialog({ keyword: item.keyword, insight_type: item.insight_type, mention_count: item.mention_count, sample_messages: samples })}
                          sx={{ fontSize: 11, py: 0.3, textTransform: 'none' }}>
                          Content Maken
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Generate Dialog */}
      <Dialog open={!!generateDialog} onClose={() => !generating ? setGenerateDialog(null) : null} maxWidth="xs" fullWidth>
        {generateDialog && <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon color="primary" /> Content genereren
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 0.5 }}><strong>{generateDialog.keyword}</strong></Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {generateDialog.mention_count} keer gevraagd door toeristen via de chatbot
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              De AI gebruikt de chatbot-vragen als inspiratie en genereert content die antwoord geeft op wat toeristen willen weten.
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
              <Typography variant="caption"><strong>Geschatte tijd:</strong> {estimatedTime()}.</Typography>
            </Alert>
            {generating && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Generatie wordt gestart...</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateDialog(null)}>{generating ? 'Sluiten' : 'Annuleren'}</Button>
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
