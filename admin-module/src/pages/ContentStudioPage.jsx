import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, TextField, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
  Card, CardContent, Grid, CircularProgress, Alert, TablePagination, LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TranslateIcon from '@mui/icons-material/Translate';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../stores/authStore.js';
import contentService from '../api/contentService.js';

const DIRECTION_CONFIG = {
  breakout: { icon: WhatshotIcon, color: 'error', label: 'Breakout' },
  rising: { icon: TrendingUpIcon, color: 'success', label: 'Rising' },
  stable: { icon: TrendingFlatIcon, color: 'info', label: 'Stable' },
  declining: { icon: TrendingDownIcon, color: 'warning', label: 'Declining' },
};

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 dagen' },
  { value: '30d', label: '30 dagen' },
  { value: '90d', label: '90 dagen' },
];

const STATUS_COLORS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  generated: 'info',
  draft: 'default',
  pending_review: 'warning',
  published: 'success',
};

const CONTENT_TYPE_LABELS = {
  blog: 'Blog',
  social_post: 'Social Post',
  video_script: 'Video Script',
};

const PLATFORM_LABELS = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

function DirectionChip({ direction }) {
  const config = DIRECTION_CONFIG[direction] || DIRECTION_CONFIG.stable;
  const Icon = config.icon;
  return (
    <Chip
      icon={<Icon sx={{ fontSize: 16 }} />}
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
    />
  );
}

function SummaryCards({ summary, loading }) {
  if (loading) return <CircularProgress size={24} />;
  if (!summary) return null;

  const cards = [
    { label: 'Unieke Keywords', value: summary.totalKeywords || 0 },
    { label: 'Top Keyword', value: summary.topKeywords?.[0]?.keyword || '—' },
    { label: 'Gem. Score', value: summary.topKeywords?.[0]?.avg_score ? Number(summary.topKeywords[0].avg_score).toFixed(1) : '—' },
  ];

  const dirDist = summary.directionDistribution || [];
  const breakoutCount = dirDist.find(d => d.trend_direction === 'breakout')?.count || 0;
  const risingCount = dirDist.find(d => d.trend_direction === 'rising')?.count || 0;
  cards.push({ label: 'Breakout + Rising', value: `${breakoutCount} + ${risingCount}` });

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((c, i) => (
        <Grid item xs={6} md={3} key={i}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{c.value}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function AddKeywordDialog({ open, onClose, onSubmit, destinationId }) {
  const [keyword, setKeyword] = useState('');
  const [language, setLanguage] = useState('en');
  const [direction, setDirection] = useState('stable');
  const [volume, setVolume] = useState('');
  const [market, setMarket] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!keyword.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        destination_id: destinationId,
        keyword: keyword.trim(),
        language,
        trend_direction: direction,
        search_volume: volume ? Number(volume) : null,
        market: market || null,
        source: 'manual',
      });
      setKeyword('');
      setVolume('');
      setMarket('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Keyword Toevoegen</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Keyword" value={keyword} onChange={e => setKeyword(e.target.value)} required fullWidth />
        <FormControl fullWidth>
          <InputLabel>Taal</InputLabel>
          <Select value={language} onChange={e => setLanguage(e.target.value)} label="Taal">
            <MenuItem value="en">Engels</MenuItem>
            <MenuItem value="nl">Nederlands</MenuItem>
            <MenuItem value="de">Duits</MenuItem>
            <MenuItem value="es">Spaans</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Richting</InputLabel>
          <Select value={direction} onChange={e => setDirection(e.target.value)} label="Richting">
            <MenuItem value="breakout">Breakout</MenuItem>
            <MenuItem value="rising">Rising</MenuItem>
            <MenuItem value="stable">Stable</MenuItem>
            <MenuItem value="declining">Declining</MenuItem>
          </Select>
        </FormControl>
        <TextField label="Zoekvolume" type="number" value={volume} onChange={e => setVolume(e.target.value)} fullWidth />
        <TextField label="Markt (bijv. NL, DE, ES)" value={market} onChange={e => setMarket(e.target.value)} fullWidth />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuleren</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!keyword.trim() || submitting}>
          {submitting ? <CircularProgress size={20} /> : 'Toevoegen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function GenerateContentDialog({ open, onClose, suggestion, onGenerate }) {
  const [contentType, setContentType] = useState(suggestion?.content_type || 'blog');
  const [platform, setPlatform] = useState('website');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate({
        suggestion_id: suggestion.id,
        content_type: contentType,
        platform,
      });
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  if (!suggestion) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Content Genereren</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <Alert severity="info" sx={{ mb: 1 }}>
          <strong>{suggestion.title}</strong>
          <br />{suggestion.summary}
        </Alert>
        <FormControl fullWidth>
          <InputLabel>Content Type</InputLabel>
          <Select value={contentType} onChange={e => setContentType(e.target.value)} label="Content Type">
            <MenuItem value="blog">Blog Post</MenuItem>
            <MenuItem value="social_post">Social Post</MenuItem>
            <MenuItem value="video_script">Video Script</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Platform</InputLabel>
          <Select value={platform} onChange={e => setPlatform(e.target.value)} label="Platform">
            {Object.entries(PLATFORM_LABELS).map(([val, lbl]) => (
              <MenuItem key={val} value={val}>{lbl}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuleren</Button>
        <Button onClick={handleGenerate} variant="contained" disabled={generating} startIcon={generating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}>
          {generating ? 'Genereren...' : 'Genereer Content'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ContentItemDialog({ open, onClose, itemId, onUpdate, onTranslate }) {
  const { t } = useTranslation();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seoData, setSeoData] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [langTab, setLangTab] = useState('en');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!itemId || !open) return;
    setLoading(true);
    contentService.getItem(itemId).then(r => {
      const data = r.data;
      setItem(data);
      setEditBody(data.body_en || '');
      setLangTab('en');
    }).finally(() => setLoading(false));
  }, [itemId, open]);

  const loadSeo = async () => {
    if (!itemId) return;
    setSeoLoading(true);
    try {
      const r = await contentService.getItemSeo(itemId);
      setSeoData(r.data);
    } finally {
      setSeoLoading(false);
    }
  };

  useEffect(() => {
    if (open && itemId) loadSeo();
  }, [open, itemId]);

  const handleLangChange = (lang) => {
    setLangTab(lang);
    if (item) setEditBody(item[`body_${lang}`] || '');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await contentService.updateItem(itemId, { [`body_${langTab}`]: editBody });
      if (item) setItem({ ...item, [`body_${langTab}`]: editBody });
      if (onUpdate) onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const handleTranslate = async (targetLang) => {
    setTranslating(true);
    try {
      await contentService.translateItem(itemId, targetLang);
      // Reload item
      const r = await contentService.getItem(itemId);
      setItem(r.data);
      setLangTab(targetLang);
      setEditBody(r.data[`body_${targetLang}`] || '');
      if (onTranslate) onTranslate();
    } finally {
      setTranslating(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    await contentService.updateItem(itemId, { approval_status: status });
    if (item) setItem({ ...item, approval_status: status });
    if (onUpdate) onUpdate();
  };

  if (!open) return null;

  const LANGS = ['en', 'nl', 'de', 'es', 'fr'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          {item?.title || 'Content Item'}
          {item && <Chip label={item.approval_status} color={STATUS_COLORS[item.approval_status] || 'default'} size="small" sx={{ ml: 1 }} />}
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : item ? (
          <Grid container spacing={2}>
            {/* Left: Editor */}
            <Grid item xs={12} md={8}>
              <Tabs value={langTab} onChange={(_, v) => handleLangChange(v)} sx={{ mb: 1 }}>
                {LANGS.map(lang => (
                  <Tab key={lang} value={lang} label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {lang.toUpperCase()}
                      {item[`body_${lang}`] ? <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} /> : null}
                    </Box>
                  } />
                ))}
              </Tabs>

              <TextField
                multiline
                rows={16}
                fullWidth
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                variant="outlined"
                sx={{ fontFamily: 'monospace', mb: 1 }}
              />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? <CircularProgress size={16} /> : t('common.save', 'Opslaan')}
                </Button>
                {langTab !== 'en' && !item[`body_${langTab}`] && (
                  <Button size="small" variant="outlined" startIcon={translating ? <CircularProgress size={14} /> : <TranslateIcon />} onClick={() => handleTranslate(langTab)} disabled={translating}>
                    Vertaal naar {langTab.toUpperCase()}
                  </Button>
                )}
                {LANGS.filter(l => l !== 'en' && !item[`body_${l}`]).map(l => (
                  <Tooltip key={l} title={`Vertaal naar ${l.toUpperCase()}`}>
                    <Chip
                      label={l.toUpperCase()}
                      icon={<TranslateIcon sx={{ fontSize: 14 }} />}
                      size="small"
                      variant="outlined"
                      onClick={() => handleTranslate(l)}
                      disabled={translating}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Grid>

            {/* Right: SEO + Meta */}
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>SEO Score</Typography>
                {seoLoading ? <CircularProgress size={20} /> : seoData ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h4" fontWeight={700} color={seoData.overallScore >= 70 ? 'success.main' : seoData.overallScore >= 50 ? 'warning.main' : 'error.main'}>
                        {seoData.overallScore}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">/ 100 ({seoData.grade})</Typography>
                    </Box>
                    {(seoData.checks || []).map((check, i) => (
                      <Box key={i} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                          <Typography variant="caption">{check.name}</Typography>
                          <Chip label={check.status} size="small" color={check.status === 'pass' ? 'success' : check.status === 'warning' ? 'warning' : 'error'} sx={{ height: 18, fontSize: 10 }} />
                        </Box>
                        <LinearProgress variant="determinate" value={(check.score / check.maxScore) * 100} sx={{ height: 4, borderRadius: 2 }} />
                      </Box>
                    ))}
                    <Button size="small" onClick={loadSeo} startIcon={<RefreshIcon />} sx={{ mt: 1 }}>Heranalyse</Button>
                  </>
                ) : <Typography variant="body2" color="text.secondary">Laden...</Typography>}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Info</Typography>
                <Typography variant="body2"><strong>Type:</strong> {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}</Typography>
                <Typography variant="body2"><strong>Platform:</strong> {PLATFORM_LABELS[item.target_platform] || item.target_platform}</Typography>
                <Typography variant="body2"><strong>AI Model:</strong> {item.ai_model || '—'}</Typography>
                <Typography variant="body2"><strong>Aangemaakt:</strong> {new Date(item.created_at).toLocaleDateString('nl-NL')}</Typography>
                {item.keyword_cluster && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(Array.isArray(item.keyword_cluster) ? item.keyword_cluster : []).map((kw, i) => (
                      <Chip key={i} label={kw} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
              </Paper>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="contained" color="success" onClick={() => handleStatusUpdate('approved')} startIcon={<CheckIcon />} disabled={item.approval_status === 'approved'}>
                  Approve
                </Button>
                <Button size="small" variant="outlined" color="error" onClick={() => handleStatusUpdate('rejected')} startIcon={<CloseIcon />} disabled={item.approval_status === 'rejected'}>
                  Reject
                </Button>
              </Box>
            </Grid>
          </Grid>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function ContentStudioPage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [tab, setTab] = useState(0);
  const [destinationId, setDestinationId] = useState(user?.destination_id || 1);
  const [period, setPeriod] = useState('30d');

  // Trending state
  const [trends, setTrends] = useState([]);
  const [trendTotal, setTrendTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [trendError, setTrendError] = useState(null);
  const [trendPage, setTrendPage] = useState(0);
  const [trendRowsPerPage, setTrendRowsPerPage] = useState(25);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [sugTotal, setSugTotal] = useState(0);
  const [sugLoading, setSugLoading] = useState(false);
  const [sugGenerating, setSugGenerating] = useState(false);
  const [sugError, setSugError] = useState(null);
  const [sugPage, setSugPage] = useState(0);
  const [generateDialogSuggestion, setGenerateDialogSuggestion] = useState(null);

  // Content Items state
  const [items, setItems] = useState([]);
  const [itemTotal, setItemTotal] = useState(0);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState(null);
  const [itemPage, setItemPage] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState(null);

  // === Trending loaders ===
  const loadTrends = useCallback(async () => {
    setTrendLoading(true);
    setTrendError(null);
    try {
      const result = await contentService.getTrending(destinationId, {
        period, limit: trendRowsPerPage, offset: trendPage * trendRowsPerPage,
      });
      setTrends(result.data?.trends || []);
      setTrendTotal(result.data?.total || 0);
    } catch (err) {
      setTrendError(err.message || 'Fout bij laden trends');
    } finally {
      setTrendLoading(false);
    }
  }, [destinationId, period, trendPage, trendRowsPerPage]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const result = await contentService.getTrendingSummary(destinationId, { period });
      setSummary(result.data || null);
    } catch {
      // Non-critical
    } finally {
      setSummaryLoading(false);
    }
  }, [destinationId, period]);

  // === Suggestions loaders ===
  const loadSuggestions = useCallback(async () => {
    setSugLoading(true);
    setSugError(null);
    try {
      const result = await contentService.getSuggestions(destinationId, { limit: 25, offset: sugPage * 25 });
      setSuggestions(result.data?.suggestions || []);
      setSugTotal(result.data?.total || 0);
    } catch (err) {
      setSugError(err.message || 'Fout bij laden suggesties');
    } finally {
      setSugLoading(false);
    }
  }, [destinationId, sugPage]);

  // === Content Items loaders ===
  const loadItems = useCallback(async () => {
    setItemLoading(true);
    setItemError(null);
    try {
      const result = await contentService.getItems(destinationId, { limit: 25, offset: itemPage * 25 });
      setItems(result.data?.items || []);
      setItemTotal(result.data?.total || 0);
    } catch (err) {
      setItemError(err.message || 'Fout bij laden content items');
    } finally {
      setItemLoading(false);
    }
  }, [destinationId, itemPage]);

  // Load data based on active tab
  useEffect(() => {
    if (tab === 0) { loadTrends(); loadSummary(); }
    else if (tab === 1) { loadSuggestions(); }
    else if (tab === 2) { loadItems(); }
  }, [tab, loadTrends, loadSummary, loadSuggestions, loadItems]);

  // === Handlers ===
  const handleAddKeyword = async (data) => {
    await contentService.addManualTrend(data);
    loadTrends();
    loadSummary();
  };

  const handleGenerateSuggestions = async () => {
    setSugGenerating(true);
    setSugError(null);
    try {
      await contentService.generateSuggestions(destinationId);
      loadSuggestions();
    } catch (err) {
      setSugError(err.message || 'Fout bij genereren suggesties');
    } finally {
      setSugGenerating(false);
    }
  };

  const handleSuggestionAction = async (id, status) => {
    try {
      await contentService.updateSuggestion(id, { status });
      loadSuggestions();
    } catch (err) {
      setSugError(err.message);
    }
  };

  const handleGenerateContent = async (data) => {
    try {
      await contentService.generateItem(data);
      loadSuggestions();
      loadItems();
    } catch (err) {
      setSugError(err.message || 'Fout bij genereren content');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Weet je zeker dat je dit item wilt verwijderen?')) return;
    try {
      await contentService.deleteItem(id);
      loadItems();
    } catch (err) {
      setItemError(err.message);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          {t('contentStudio.title', 'Content Studio')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={destinationId} onChange={e => { setDestinationId(e.target.value); setTrendPage(0); setSugPage(0); setItemPage(0); }}>
              <MenuItem value={1}>Calpe</MenuItem>
              <MenuItem value={2}>Texel</MenuItem>
              <MenuItem value={4}>WarreWijzer</MenuItem>
            </Select>
          </FormControl>
          {tab === 0 && (
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <Select value={period} onChange={e => { setPeriod(e.target.value); setTrendPage(0); }}>
                {PERIOD_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('contentStudio.tabs.trending', 'Trending Monitor')} />
        <Tab label={t('contentStudio.tabs.suggestions', 'Suggesties')} />
        <Tab label={t('contentStudio.tabs.content', 'Content Items')} />
        <Tab label={t('contentStudio.tabs.performance', 'Performance')} disabled />
      </Tabs>

      {/* === TAB 0: Trending Monitor === */}
      {tab === 0 && (
        <>
          <SummaryCards summary={summary} loading={summaryLoading} />
          {trendError && <Alert severity="error" sx={{ mb: 2 }}>{trendError}</Alert>}
          <Paper variant="outlined">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {trendTotal} keywords gevonden
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Vernieuwen">
                  <IconButton size="small" onClick={() => { loadTrends(); loadSummary(); }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
                  Keyword
                </Button>
              </Box>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Keyword</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Richting</TableCell>
                    <TableCell>Volume</TableCell>
                    <TableCell>Taal</TableCell>
                    <TableCell>Markt</TableCell>
                    <TableCell>Bron</TableCell>
                    <TableCell>Week</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trendLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell>
                    </TableRow>
                  ) : trends.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">Geen trending keywords gevonden voor deze periode.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : trends.map((trend, idx) => (
                    <TableRow key={trend.id || idx} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{trend.keyword}</TableCell>
                      <TableCell>
                        <Chip label={trend.relevance_score?.toFixed(1) || '—'} size="small" color={trend.relevance_score >= 7 ? 'success' : trend.relevance_score >= 4 ? 'info' : 'default'} />
                      </TableCell>
                      <TableCell><DirectionChip direction={trend.trend_direction} /></TableCell>
                      <TableCell>{trend.search_volume?.toLocaleString() || '—'}</TableCell>
                      <TableCell>{trend.language?.toUpperCase() || '—'}</TableCell>
                      <TableCell>{trend.market || '—'}</TableCell>
                      <TableCell><Chip label={trend.source || '—'} size="small" variant="outlined" /></TableCell>
                      <TableCell>{trend.week_number ? `W${trend.week_number}` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={trendTotal}
              page={trendPage}
              onPageChange={(_, p) => setTrendPage(p)}
              rowsPerPage={trendRowsPerPage}
              onRowsPerPageChange={e => { setTrendRowsPerPage(Number(e.target.value)); setTrendPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Rijen per pagina"
            />
          </Paper>
        </>
      )}

      {/* === TAB 1: Suggesties === */}
      {tab === 1 && (
        <>
          {sugError && <Alert severity="error" sx={{ mb: 2 }}>{sugError}</Alert>}
          <Paper variant="outlined">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {sugTotal} {t('contentStudio.suggestionsFound', 'suggesties')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Vernieuwen">
                  <IconButton size="small" onClick={loadSuggestions}><RefreshIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={sugGenerating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                  onClick={handleGenerateSuggestions}
                  disabled={sugGenerating}
                >
                  {sugGenerating ? 'Genereren...' : t('contentStudio.generateSuggestions', 'Genereer Suggesties')}
                </Button>
              </Box>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Titel</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Keywords</TableCell>
                    <TableCell>Kanalen</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Acties</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sugLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell>
                    </TableRow>
                  ) : suggestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">Geen suggesties. Klik op "Genereer Suggesties" om AI suggesties te maken.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : suggestions.map((sug) => (
                    <TableRow key={sug.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sug.title}
                        </Typography>
                        {sug.summary && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sug.summary}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell><Chip label={CONTENT_TYPE_LABELS[sug.content_type] || sug.content_type} size="small" /></TableCell>
                      <TableCell>
                        <Chip label={Number(sug.engagement_score || 0).toFixed(1)} size="small" color={sug.engagement_score >= 7 ? 'success' : sug.engagement_score >= 4 ? 'info' : 'default'} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 180 }}>
                          {(Array.isArray(sug.keyword_cluster) ? sug.keyword_cluster : []).slice(0, 3).map((kw, i) => (
                            <Chip key={i} label={kw} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {(Array.isArray(sug.suggested_channels) ? sug.suggested_channels : []).map((ch, i) => (
                            <Chip key={i} label={ch} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={sug.status} color={STATUS_COLORS[sug.status] || 'default'} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          {sug.status === 'pending' && (
                            <>
                              <Tooltip title="Goedkeuren">
                                <IconButton size="small" color="success" onClick={() => handleSuggestionAction(sug.id, 'approved')}>
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Afwijzen">
                                <IconButton size="small" color="error" onClick={() => handleSuggestionAction(sug.id, 'rejected')}>
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {sug.status === 'approved' && (
                            <Tooltip title="Content Genereren">
                              <IconButton size="small" color="primary" onClick={() => setGenerateDialogSuggestion(sug)}>
                                <AutoAwesomeIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={sugTotal}
              page={sugPage}
              onPageChange={(_, p) => setSugPage(p)}
              rowsPerPage={25}
              rowsPerPageOptions={[25]}
              labelRowsPerPage="Rijen per pagina"
            />
          </Paper>
        </>
      )}

      {/* === TAB 2: Content Items === */}
      {tab === 2 && (
        <>
          {itemError && <Alert severity="error" sx={{ mb: 2 }}>{itemError}</Alert>}
          <Paper variant="outlined">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {itemTotal} {t('contentStudio.itemsFound', 'content items')}
              </Typography>
              <Tooltip title="Vernieuwen">
                <IconButton size="small" onClick={loadItems}><RefreshIcon fontSize="small" /></IconButton>
              </Tooltip>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Titel</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Platform</TableCell>
                    <TableCell>Talen</TableCell>
                    <TableCell>SEO</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Datum</TableCell>
                    <TableCell align="right">Acties</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">Geen content items. Genereer content vanuit goedgekeurde suggesties.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : items.map((item) => {
                    const langs = ['en', 'nl', 'de', 'es', 'fr'].filter(l => item[`body_${l}`]);
                    const seoScore = item.seo_data?.overallScore;
                    return (
                      <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedItemId(item.id)}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </Typography>
                        </TableCell>
                        <TableCell><Chip label={CONTENT_TYPE_LABELS[item.content_type] || item.content_type} size="small" /></TableCell>
                        <TableCell><Chip label={PLATFORM_LABELS[item.target_platform] || item.target_platform} size="small" variant="outlined" /></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.3 }}>
                            {langs.map(l => <Chip key={l} label={l.toUpperCase()} size="small" sx={{ height: 18, fontSize: 10 }} />)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {seoScore !== undefined ? (
                            <Chip label={seoScore} size="small" color={seoScore >= 70 ? 'success' : seoScore >= 50 ? 'warning' : 'error'} />
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip label={item.approval_status} color={STATUS_COLORS[item.approval_status] || 'default'} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{new Date(item.created_at).toLocaleDateString('nl-NL')}</Typography>
                        </TableCell>
                        <TableCell align="right" onClick={e => e.stopPropagation()}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Bewerken">
                              <IconButton size="small" onClick={() => setSelectedItemId(item.id)}><EditIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Verwijderen">
                              <IconButton size="small" color="error" onClick={() => handleDeleteItem(item.id)}><DeleteIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={itemTotal}
              page={itemPage}
              onPageChange={(_, p) => setItemPage(p)}
              rowsPerPage={25}
              rowsPerPageOptions={[25]}
              labelRowsPerPage="Rijen per pagina"
            />
          </Paper>
        </>
      )}

      {/* === Dialogs === */}
      <AddKeywordDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={handleAddKeyword}
        destinationId={destinationId}
      />

      <GenerateContentDialog
        open={!!generateDialogSuggestion}
        onClose={() => setGenerateDialogSuggestion(null)}
        suggestion={generateDialogSuggestion}
        onGenerate={handleGenerateContent}
      />

      <ContentItemDialog
        open={!!selectedItemId}
        onClose={() => setSelectedItemId(null)}
        itemId={selectedItemId}
        onUpdate={loadItems}
        onTranslate={loadItems}
      />
    </Box>
  );
}
