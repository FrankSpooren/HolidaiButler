import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, TextField, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
  Card, CardContent, Grid, CircularProgress, Alert, TablePagination, LinearProgress,
  ToggleButton, ToggleButtonGroup, Checkbox,
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
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import CloudIcon from '@mui/icons-material/Cloud';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PublishIcon from '@mui/icons-material/Publish';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ShareIcon from '@mui/icons-material/Share';
import ReplayIcon from '@mui/icons-material/Replay';
import RestoreIcon from '@mui/icons-material/Restore';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import VisibilityIcon from '@mui/icons-material/Visibility';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import useAuthStore from '../stores/authStore.js';
import contentService from '../api/contentService.js';
import ContentCalendarTab from './ContentCalendarTab.jsx';
import SeasonalConfigTab from './SeasonalConfigTab.jsx';
import SocialAccountsCards from '../components/content/SocialAccountsCards.jsx';
import ContentAnalyseTab from './ContentAnalyseTab.jsx';
import PlatformPreview from '../components/content/PlatformPreview.jsx';

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
  pending: 'warning',       // oranje
  approved: 'success',      // groen
  rejected: 'error',        // rood
  generated: 'primary',     // paars/blauw
  draft: 'warning',         // geel/oranje
  pending_review: 'secondary', // paars
  scheduled: 'info',        // blauw
  publishing: 'primary',    // blauw donker
  published: 'success',     // groen
  failed: 'error',          // rood
};

// Custom status styling with distinct colors for each status
const STATUS_SX = {
  draft: { bgcolor: '#FFF3E0', color: '#E65100', border: '1px solid #FFB74D' },
  pending: { bgcolor: '#FFF8E1', color: '#F57F17', border: '1px solid #FFD54F' },
  pending_review: { bgcolor: '#F3E5F5', color: '#7B1FA2', border: '1px solid #CE93D8' },
  approved: { bgcolor: '#E8F5E9', color: '#2E7D32', border: '1px solid #81C784' },
  scheduled: { bgcolor: '#E3F2FD', color: '#1565C0', border: '1px solid #64B5F6' },
  publishing: { bgcolor: '#E8EAF6', color: '#283593', border: '1px solid #7986CB' },
  published: { bgcolor: '#C8E6C9', color: '#1B5E20', border: '1px solid #4CAF50' },
  rejected: { bgcolor: '#FFEBEE', color: '#C62828', border: '1px solid #EF9A9A' },
  failed: { bgcolor: '#FFCDD2', color: '#B71C1C', border: '1px solid #E57373' },
  generated: { bgcolor: '#E0F7FA', color: '#00838F', border: '1px solid #4DD0E1' },
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

const STATUS_LABELS = {
  draft: 'Concept', pending: 'In Afwachting', pending_review: 'Ter Review',
  approved: 'Goedgekeurd', scheduled: 'Ingepland', publishing: 'Publiceren...',
  published: 'Gepubliceerd', rejected: 'Afgekeurd', failed: 'Mislukt',
  generated: 'Gegenereerd', deleted: 'Verwijderd',
};

function StatusChip({ status, size = 'small', sx: extraSx = {} }) {
  const customSx = STATUS_SX[status] || {};
  return (
    <Chip
      label={STATUS_LABELS[status] || status}
      size={size}
      sx={{ fontWeight: 600, fontSize: 11, ...customSx, ...extraSx }}
    />
  );
}

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

const TREND_COLORS = ['#7FA594', '#5E8B7E', '#3572de', '#ecde3c', '#e65100', '#8e24aa', '#00838f', '#c62828'];
const MARKET_OPTIONS = ['ALL', 'NL', 'DE', 'UK', 'ES', 'FR', 'BE'];
const LANG_OPTIONS = ['ALL', 'en', 'nl', 'de', 'es', 'fr'];

function TrendChart({ trends }) {
  const chartData = useMemo(() => {
    if (!trends || trends.length === 0) return { data: [], keywords: [] };
    // Group by week, show top 5 keywords by relevance_score
    const keywordScores = {};
    trends.forEach(t => {
      const kw = t.keyword;
      keywordScores[kw] = (keywordScores[kw] || 0) + (t.relevance_score || 0);
    });
    const topKeywords = Object.entries(keywordScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw]) => kw);

    // Group by week
    const weekMap = {};
    trends.filter(t => topKeywords.includes(t.keyword)).forEach(t => {
      const week = t.week_number ? `W${t.week_number}` : t.created_at?.substring(0, 10) || 'W?';
      if (!weekMap[week]) weekMap[week] = { week };
      weekMap[week][t.keyword] = t.relevance_score || 0;
    });

    return {
      data: Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week)),
      keywords: topKeywords,
    };
  }, [trends]);

  if (chartData.data.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Top 5 Keywords — Relevantie Score over Tijd
      </Typography>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" fontSize={12} />
          <YAxis domain={[0, 10]} fontSize={12} />
          <RTooltip />
          <Legend />
          {chartData.keywords.map((kw, i) => (
            <Line key={kw} type="monotone" dataKey={kw} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}

function WordCloud({ trends }) {
  const words = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    const keywordScores = {};
    trends.forEach(t => {
      const kw = t.keyword;
      if (!keywordScores[kw]) keywordScores[kw] = { keyword: kw, score: 0, direction: t.trend_direction, count: 0 };
      keywordScores[kw].score += (t.relevance_score || 0);
      keywordScores[kw].count++;
    });
    return Object.values(keywordScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }, [trends]);

  if (words.length === 0) return null;

  const maxScore = Math.max(...words.map(w => w.score), 1);
  const dirColors = { breakout: '#d32f2f', rising: '#2e7d32', stable: '#1565c0', declining: '#ef6c00' };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Keyword Cloud — grootte op relevantie, kleur op trend-richting
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
        {words.map((w) => {
          const ratio = w.score / maxScore;
          const fontSize = 12 + ratio * 26;
          const color = dirColors[w.direction] || '#666';
          return (
            <Tooltip key={w.keyword} title={`Score: ${Number(w.score || 0).toFixed(1)} | ${w.direction} | ${w.count}x`}>
              <Typography
                component="span"
                sx={{
                  fontSize, fontWeight: ratio > 0.6 ? 700 : ratio > 0.3 ? 500 : 400,
                  color, cursor: 'default', px: 0.5, lineHeight: 1.3,
                  '&:hover': { opacity: 0.7 },
                }}
              >
                {w.keyword}
              </Typography>
            </Tooltip>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
        {Object.entries(dirColors).map(([dir, col]) => (
          <Box key={dir} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col }} />
            <Typography variant="caption">{dir}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
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

function GenerateContentDialog({ open, onClose, suggestion, onGenerate, destinationId }) {
  const [contentType, setContentType] = useState(suggestion?.content_type || 'blog');
  const [platform, setPlatform] = useState('website');
  const [pillarId, setPillarId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Load pillars + templates when dialog opens
  useEffect(() => {
    if (!open || !destinationId) return;
    setLoadingMeta(true);
    Promise.all([
      contentService.getPillars(destinationId).catch(() => ({ data: [] })),
      contentService.getTemplates(destinationId).catch(() => ({ data: [] })),
    ]).then(([pillarsRes, templatesRes]) => {
      setPillars(pillarsRes.data || []);
      setTemplates(templatesRes.data || []);
    }).finally(() => setLoadingMeta(false));
  }, [open, destinationId]);

  // Reset state when suggestion changes
  useEffect(() => {
    if (suggestion) {
      setContentType(suggestion.content_type || 'blog');
      setPillarId('');
      setTemplateId('');
    }
  }, [suggestion]);

  // Filter templates by selected content type
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => !t.content_type || t.content_type === contentType);
  }, [templates, contentType]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = {
        suggestion_id: suggestion.id,
        content_type: contentType,
        platform,
      };
      if (pillarId) data.pillar_id = pillarId;
      if (templateId) data.template_id = templateId;
      await onGenerate(data);
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

        {/* 9.3: Content Pillar selector */}
        <FormControl fullWidth>
          <InputLabel>Content Pillar</InputLabel>
          <Select value={pillarId} onChange={e => setPillarId(e.target.value)} label="Content Pillar" displayEmpty>
            <MenuItem value="">— Geen pillar —</MenuItem>
            {loadingMeta ? <MenuItem disabled>Laden...</MenuItem> : pillars.map(p => (
              <MenuItem key={p.id} value={p.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {p.color && <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.color, flexShrink: 0 }} />}
                  {p.name}
                  {p.target_percentage && <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>({p.target_percentage}%)</Typography>}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 9.9: Template selector */}
        <FormControl fullWidth>
          <InputLabel>Template</InputLabel>
          <Select value={templateId} onChange={e => setTemplateId(e.target.value)} label="Template" displayEmpty>
            <MenuItem value="">— Geen template —</MenuItem>
            {loadingMeta ? <MenuItem disabled>Laden...</MenuItem> : filteredTemplates.map(t => (
              <MenuItem key={t.id} value={t.id}>
                <Box>
                  <Typography variant="body2">{t.name}</Typography>
                  {t.description && <Typography variant="caption" color="text.secondary">{t.description}</Typography>}
                </Box>
              </MenuItem>
            ))}
          </Select>
          {filteredTemplates.length === 0 && templates.length > 0 && !loadingMeta && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Geen templates beschikbaar voor {CONTENT_TYPE_LABELS[contentType] || contentType}
            </Typography>
          )}
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

// ============================================================
// SUGGESTION DETAIL DIALOG (TO DO 3a)
// ============================================================
function SuggestionDetailDialog({ open, onClose, suggestion, onAction, onGenerate }) {
  if (!open || !suggestion) return null;

  const keywords = Array.isArray(suggestion.keyword_cluster) ? suggestion.keyword_cluster : [];
  const channels = Array.isArray(suggestion.suggested_channels) ? suggestion.suggested_channels : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ flex: 1, mr: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{suggestion.title}</Typography>
          <Chip label={STATUS_LABELS[suggestion.status] || suggestion.status} color={STATUS_COLORS[suggestion.status] || 'default'} size="small" sx={{ mt: 0.5 }} />
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>{suggestion.summary}</Typography>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Content Type</Typography>
            <Typography variant="body2" fontWeight={500}>{CONTENT_TYPE_LABELS[suggestion.content_type] || suggestion.content_type}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Engagement Score</Typography>
            <Typography variant="body2" fontWeight={500}>
              <Chip label={Number(suggestion.engagement_score || 0).toFixed(1)} size="small" color={suggestion.engagement_score >= 7 ? 'success' : suggestion.engagement_score >= 4 ? 'info' : 'default'} />
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Keywords</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {keywords.map((kw, i) => <Chip key={i} label={kw} size="small" variant="outlined" />)}
              {keywords.length === 0 && <Typography variant="body2" color="text.secondary">Geen keywords</Typography>}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Aanbevolen Kanalen</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {channels.map((ch, i) => <Chip key={i} label={PLATFORM_LABELS[ch] || ch} size="small" variant="outlined" />)}
            </Box>
          </Grid>
          {suggestion.created_at && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Aangemaakt</Typography>
              <Typography variant="body2">{new Date(suggestion.created_at).toLocaleString('nl-NL')}</Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Box>
          {suggestion.status === 'rejected' && (
            <>
              <Tooltip title="Herstel naar pending">
                <Button size="small" startIcon={<RestoreIcon />} onClick={() => { onAction(suggestion.id, 'pending'); onClose(); }}>
                  Herstel
                </Button>
              </Tooltip>
              <Tooltip title="Definitief verwijderen">
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => { onAction(suggestion.id, 'deleted'); onClose(); }}>
                  Verwijder
                </Button>
              </Tooltip>
            </>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {suggestion.status === 'pending' && (
            <>
              <Button variant="outlined" color="error" onClick={() => { onAction(suggestion.id, 'rejected'); onClose(); }} startIcon={<CloseIcon />}>
                Afwijzen
              </Button>
              <Button variant="contained" color="success" onClick={() => { onAction(suggestion.id, 'approved'); onClose(); }} startIcon={<CheckIcon />}>
                Goedkeuren
              </Button>
            </>
          )}
          {suggestion.status === 'approved' && (
            <Button variant="contained" onClick={() => { onGenerate(suggestion); onClose(); }} startIcon={<AutoAwesomeIcon />}>
              Content Genereren
            </Button>
          )}
          <Button onClick={onClose}>Sluiten</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// MANUAL CONTENT ITEM DIALOG (TO DO 4g)
// ============================================================
function ManualContentDialog({ open, onClose, destinationId, onCreated }) {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('blog');
  const [platform, setPlatform] = useState('website');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await contentService.generateItem({
        destination_id: destinationId,
        content_type: contentType,
        platform,
        title: title.trim(),
        body_en: body,
        manual: true,
      });
      setTitle('');
      setBody('');
      onClose();
      if (onCreated) onCreated();
    } catch (err) {
      alert(err.message || 'Aanmaken mislukt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nieuw Content Item Aanmaken</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <Alert severity="info" sx={{ py: 0 }}>
          Maak handmatig een content item aan zonder AI-generatie. Je kunt het later bewerken, verbeteren met AI, en publiceren.
        </Alert>
        <TextField label="Titel" value={title} onChange={e => setTitle(e.target.value)} required fullWidth />
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
        <TextField
          label="Inhoud (optioneel — kan later worden ingevuld)"
          multiline
          rows={8}
          value={body}
          onChange={e => setBody(e.target.value)}
          fullWidth
          placeholder="Schrijf je content hier, of laat leeg en gebruik later de AI Verbeter functie..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuleren</Button>
        <Button onClick={handleCreate} variant="contained" disabled={!title.trim() || saving} startIcon={saving ? <CircularProgress size={16} /> : <NoteAddIcon />}>
          {saving ? 'Aanmaken...' : 'Aanmaken'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// SOCIAL ACCOUNTS TAB (BLOK 5)
// ============================================================
function SocialAccountsTab({ destinationId }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Gekoppelde Social Media Accounts</Typography>
      <SocialAccountsCards destinationId={destinationId} />
      <Alert severity="info" sx={{ mt: 2 }}>
        Om een nieuw platform te koppelen, heb je een developer app nodig voor dat platform.
        Neem contact op met je admin voor LinkedIn, X (Twitter), Pinterest of TikTok koppelingen.
      </Alert>
    </Box>
  );
}

// ============================================================
// BEST TIME TO POST (BLOK 6)
// ============================================================
const BEST_TIME_DEFAULTS = {
  instagram: { best: 'Dinsdag 11:00', alt: ['Donderdag 14:00', 'Zaterdag 10:00'] },
  facebook:  { best: 'Woensdag 11:00', alt: ['Vrijdag 13:00', 'Zaterdag 12:00'] },
  linkedin:  { best: 'Dinsdag 10:00', alt: ['Woensdag 12:00', 'Donderdag 09:00'] },
  x:         { best: 'Maandag 09:00', alt: ['Woensdag 12:00', 'Vrijdag 15:00'] },
  tiktok:    { best: 'Dinsdag 19:00', alt: ['Donderdag 20:00', 'Zaterdag 11:00'] },
  youtube:   { best: 'Zaterdag 10:00', alt: ['Woensdag 17:00', 'Vrijdag 14:00'] },
  pinterest: { best: 'Zaterdag 14:00', alt: ['Zondag 11:00', 'Vrijdag 15:00'] },
};

function BestTimeToPost({ platform, destinationId, onSelect, selected }) {
  const [bestTimes, setBestTimes] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!platform || platform === 'website') return;
    setLoading(true);
    contentService.getBestTimes(destinationId, platform)
      .then(r => setBestTimes(r.data))
      .catch(() => setBestTimes(null))
      .finally(() => setLoading(false));
  }, [platform, destinationId]);

  if (!platform || platform === 'website') return null;

  const defaults = BEST_TIME_DEFAULTS[platform] || BEST_TIME_DEFAULTS.instagram;
  const displayBest = bestTimes?.best_time || defaults.best;
  const displayAlt = bestTimes?.alt_times || defaults.alt;
  const allTimes = [displayBest, ...displayAlt];

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Beste moment om te posten</Typography>
      {loading ? <CircularProgress size={16} /> : (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {allTimes.map((t, i) => (
            <Chip
              key={i}
              label={t}
              color={i === 0 ? 'success' : (selected === t ? 'primary' : 'default')}
              size="small"
              variant={selected === t ? 'filled' : (i === 0 ? 'filled' : 'outlined')}
              onClick={onSelect ? () => onSelect(t) : undefined}
              sx={onSelect ? { cursor: 'pointer' } : {}}
            />
          ))}
        </Box>
      )}
      {!bestTimes && !loading && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Op basis van algemene aanbevelingen (nog geen eigen data)
        </Typography>
      )}
    </Paper>
  );
}

// ============================================================
// APPROVAL TIMELINE (BLOK 7)
// ============================================================
const APPROVAL_STEPS = ['draft', 'in_review', 'reviewed', 'approved', 'scheduled', 'published'];
const APPROVAL_LABELS = {
  draft: 'Concept', in_review: 'Ter Review', reviewed: 'Beoordeeld',
  approved: 'Goedgekeurd', scheduled: 'Ingepland', published: 'Gepubliceerd',
  rejected: 'Afgekeurd', failed: 'Mislukt', publishing: 'Bezig...',
};

function ApprovalTimeline({ itemId, currentStatus }) {
  const [log, setLog] = useState([]);

  useEffect(() => {
    if (!itemId) return;
    contentService.getApprovalLog(itemId)
      .then(r => setLog(r.data || []))
      .catch(() => setLog([]));
  }, [itemId, currentStatus]);

  const currentIdx = APPROVAL_STEPS.indexOf(currentStatus);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Workflow Status</Typography>
      {/* Step indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
        {APPROVAL_STEPS.slice(0, 4).map((step, idx) => {
          const isActive = currentStatus === step;
          const isPast = currentIdx > idx || (currentStatus === 'published' || currentStatus === 'scheduled');
          return (
            <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <Box sx={{
                width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: isPast ? 'success.main' : isActive ? 'primary.main' : 'action.disabledBackground',
                color: (isPast || isActive) ? 'white' : 'text.disabled', fontSize: 11,
              }}>
                {isPast ? <CheckIcon sx={{ fontSize: 14 }} /> : idx + 1}
              </Box>
              <Typography variant="caption" sx={{ fontWeight: isActive ? 700 : 400, color: isActive ? 'primary.main' : 'text.secondary' }}>
                {APPROVAL_LABELS[step]}
              </Typography>
              {idx < 3 && <Box sx={{ width: 16, height: 2, bgcolor: isPast ? 'success.main' : 'divider' }} />}
            </Box>
          );
        })}
      </Box>

      {/* Log entries */}
      {log.length > 0 && (
        <Box sx={{ maxHeight: 100, overflowY: 'auto' }}>
          {log.slice(0, 5).map((entry, i) => (
            <Typography key={i} variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.3 }}>
              {APPROVAL_LABELS[entry.new_status] || entry.new_status} — {entry.first_name || 'Systeem'} — {new Date(entry.created_at).toLocaleString('nl-NL')}
              {entry.comment ? ` — "${entry.comment}"` : ''}
            </Typography>
          ))}
        </Box>
      )}
    </Paper>
  );
}

// ============================================================
// CONTENT IMAGE SECTION (BLOK 2)
// ============================================================
function ContentImageSection({ itemId, item, onUpdate }) {
  const [images, setImages] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [suggestTab, setSuggestTab] = useState(0); // 0=suggestions, 1=media, 2=unsplash

  useEffect(() => {
    if (!item) return;
    try {
      const mediaIds = item.media_ids
        ? (typeof item.media_ids === 'string' ? JSON.parse(item.media_ids) : item.media_ids)
        : [];
      setImages(mediaIds);
    } catch { setImages([]); }
  }, [item?.media_ids]);

  const handleRemoveImage = async (mediaId) => {
    try {
      await contentService.detachImage(itemId, mediaId);
      setImages(prev => prev.filter(m => String(m) !== String(mediaId)));
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Image detach failed:', err);
    }
  };

  const handleAttachImage = async (mediaId) => {
    try {
      const r = await contentService.attachImages(itemId, [mediaId]);
      setImages(r.data?.media_ids || [...images, mediaId]);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Image attach failed:', err);
    }
  };

  const loadSuggestions = async () => {
    setSuggestLoading(true);
    try {
      const r = await contentService.suggestImages({ content_item_id: itemId });
      setSuggestions(r.data || []);
    } catch (err) {
      console.error('Image suggest failed:', err);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleUnsplashSearch = async () => {
    if (!unsplashQuery.trim()) return;
    setUnsplashLoading(true);
    try {
      const r = await contentService.searchUnsplash(unsplashQuery);
      setUnsplashResults(r.data || []);
    } catch (err) {
      console.error('Unsplash search failed:', err);
    } finally {
      setUnsplashLoading(false);
    }
  };

  const handleOpenSuggest = () => {
    setSuggestOpen(true);
    loadSuggestions();
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">Afbeeldingen</Typography>
        <Button size="small" variant="outlined" onClick={handleOpenSuggest} startIcon={<AddIcon />}>
          Voeg afbeelding toe
        </Button>
      </Box>

      {images.length > 0 ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {images.map((imgId, idx) => (
            <Box key={idx} sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
              <Box component="img" src={typeof imgId === 'object' ? (imgId.url || imgId.thumbnail) : `${import.meta.env.VITE_API_URL || ''}/api/v1/img/media/${imgId}?w=80`}
                alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.src = ''; e.target.alt = 'Afbeelding'; e.target.style.background = '#e0e0e0'; }}
              />
              <IconButton size="small" onClick={() => handleRemoveImage(typeof imgId === 'object' ? imgId.id : imgId)}
                sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, p: 0.3 }}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">Geen afbeeldingen gekoppeld</Typography>
      )}

      {/* Image Suggestion Dialog */}
      <Dialog open={suggestOpen} onClose={() => setSuggestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Afbeelding toevoegen</DialogTitle>
        <DialogContent>
          <Tabs value={suggestTab} onChange={(_, v) => setSuggestTab(v)} sx={{ mb: 2 }}>
            <Tab label="Suggesties" />
            <Tab label="Unsplash" />
          </Tabs>

          {suggestTab === 0 && (
            <>
              {suggestLoading ? (
                <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
              ) : suggestions.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {suggestions.map((img, idx) => (
                    <Box key={idx} sx={{ cursor: 'pointer', width: 120, textAlign: 'center' }}
                      onClick={() => { handleAttachImage(img.id || img.url); setSuggestOpen(false); }}>
                      <Box component="img" src={img.url || img.thumbnail}
                        alt={img.poi_name || img.alt_text || ''} sx={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 1, border: '2px solid transparent', '&:hover': { borderColor: 'primary.main' } }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                      <Typography variant="caption" noWrap>{img.poi_name || img.source || '—'}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Geen suggesties gevonden</Typography>
              )}
              <Button size="small" onClick={loadSuggestions} sx={{ mt: 1 }} startIcon={<RefreshIcon />}>Opnieuw laden</Button>
            </>
          )}

          {suggestTab === 1 && (
            <>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField size="small" fullWidth placeholder="Zoek stock foto's..." value={unsplashQuery}
                  onChange={e => setUnsplashQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnsplashSearch()} />
                <Button variant="contained" onClick={handleUnsplashSearch} disabled={unsplashLoading}>
                  {unsplashLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                </Button>
              </Box>
              {unsplashResults.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {unsplashResults.map((img, idx) => (
                    <Box key={idx} sx={{ cursor: 'pointer', width: 120, textAlign: 'center' }}
                      onClick={() => { handleAttachImage(img.urls?.regular || img.id); setSuggestOpen(false); }}>
                      <Box component="img" src={img.urls?.thumb || img.urls?.small}
                        alt={img.alt_description || ''} sx={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 1, border: '2px solid transparent', '&:hover': { borderColor: 'primary.main' } }} />
                      <Typography variant="caption" noWrap>{img.user?.name || 'Unsplash'}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuggestOpen(false)}>Sluiten</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function ContentItemDialog({ open, onClose, itemId, onUpdate, onTranslate }) {
  const { t } = useTranslation();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seoData, setSeoData] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improveResult, setImproveResult] = useState(null);
  const [langTab, setLangTab] = useState('en');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [rightPanel, setRightPanel] = useState('seo'); // 'seo' | 'preview' | 'comments' | 'history'
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [revisionLoading, setRevisionLoading] = useState(false);
  // Repurpose state
  const [repurposeOpen, setRepurposeOpen] = useState(false);
  const [repurposePlatforms, setRepurposePlatforms] = useState(['instagram', 'facebook', 'linkedin']);
  const [repurposing, setRepurposing] = useState(false);
  const [repurposeResult, setRepurposeResult] = useState(null);
  // Publish workflow state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduleDatetime, setScheduleDatetime] = useState('');
  // Brand score state (9.10)
  const [brandScore, setBrandScore] = useState(null);
  const [brandScoreLoading, setBrandScoreLoading] = useState(false);
  // Share to destination state (9.12)
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDestId, setShareDestId] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState(null);
  // Retry publish state (9.13)
  const [retrying, setRetrying] = useState(false);
  // Emoji picker state (9.11)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

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

  const handleImprove = async () => {
    if (!itemId) return;
    setImproving(true);
    setImproveResult(null);
    try {
      const r = await contentService.improveItem(itemId);
      const data = r.data;
      setImproveResult(data);
      if (data.improved) {
        // Reload item with improved content
        const refreshed = await contentService.getItem(itemId);
        setItem(refreshed.data);
        setEditBody(refreshed.data[`body_${langTab}`] || refreshed.data.body_en || '');
        await loadSeo();
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      setImproveResult({ improved: false, reason: err.message });
    } finally {
      setImproving(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    await contentService.updateItem(itemId, { approval_status: status });
    if (item) setItem({ ...item, approval_status: status });
    if (onUpdate) onUpdate();
  };

  const handleRepurpose = async () => {
    if (repurposePlatforms.length === 0) return;
    setRepurposing(true);
    setRepurposeResult(null);
    try {
      const r = await contentService.repurposeItem(itemId, repurposePlatforms);
      setRepurposeResult(r.data || r);
      setRepurposeOpen(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      setRepurposeResult({ error: err.message || 'Repurpose failed' });
    } finally {
      setRepurposing(false);
    }
  };

  const toggleRepurposePlatform = (platform) => {
    setRepurposePlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handlePublishNow = async () => {
    setPublishing(true);
    try {
      await contentService.publishNow(itemId, { platform: item?.target_platform });
      if (item) setItem({ ...item, approval_status: 'publishing' });
      setPublishDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDatetime) return;
    setPublishing(true);
    try {
      await contentService.scheduleItem(itemId, { scheduled_at: scheduleDatetime, platform: item?.target_platform });
      if (item) setItem({ ...item, approval_status: 'scheduled', scheduled_at: scheduleDatetime });
      setPublishDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message || 'Schedule failed');
    } finally {
      setPublishing(false);
    }
  };

  const loadComments = async () => {
    if (!itemId) return;
    setCommentLoading(true);
    try {
      const r = await contentService.getComments(itemId);
      setComments(r.data || []);
    } finally { setCommentLoading(false); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !itemId) return;
    try {
      await contentService.addComment(itemId, newComment.trim());
      setNewComment('');
      await loadComments();
    } catch { /* ignore */ }
  };

  const loadRevisions = async () => {
    if (!itemId) return;
    setRevisionLoading(true);
    try {
      const r = await contentService.getRevisions(itemId);
      setRevisions(r.data || []);
    } finally { setRevisionLoading(false); }
  };

  const handleRestore = async (revId) => {
    try {
      await contentService.restoreRevision(itemId, revId);
      const refreshed = await contentService.getItem(itemId);
      setItem(refreshed.data);
      setEditBody(refreshed.data[`body_${langTab}`] || '');
      await loadRevisions();
      if (onUpdate) onUpdate();
    } catch { /* ignore */ }
  };

  // Brand score loader (9.10)
  const loadBrandScore = async () => {
    if (!itemId) return;
    setBrandScoreLoading(true);
    try {
      const r = await contentService.getBrandScore(itemId);
      setBrandScore(r.data);
    } catch {
      setBrandScore(null);
    } finally {
      setBrandScoreLoading(false);
    }
  };

  // Retry publish handler (9.13)
  const handleRetryPublish = async () => {
    if (!itemId) return;
    setRetrying(true);
    try {
      await contentService.retryPublish(itemId);
      const refreshed = await contentService.getItem(itemId);
      setItem(refreshed.data);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message || 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  // Share to destination handler (9.12)
  const handleShare = async () => {
    if (!shareDestId || !itemId) return;
    setSharing(true);
    setShareResult(null);
    try {
      const r = await contentService.shareToDestination(itemId, Number(shareDestId));
      setShareResult({ success: true, data: r.data });
      setShareDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      setShareResult({ success: false, error: err.message || 'Delen mislukt' });
    } finally {
      setSharing(false);
    }
  };

  // Emoji insert helper (9.11)
  const COMMON_EMOJIS = [
    '😀', '😍', '🔥', '✨', '🎉', '💪', '👍', '❤️', '🌊', '🏖️',
    '☀️', '🌅', '🍽️', '🏔️', '🚴', '🎭', '📸', '🗺️', '🎶', '💡',
    '⭐', '🏆', '🎯', '📍', '🌿', '🍷', '🛥️', '🏛️', '🎨', '🐚',
  ];
  const insertEmoji = (emoji) => {
    setEditBody(prev => prev + emoji);
    setEmojiPickerOpen(false);
  };

  if (!open) return null;

  const LANGS = ['en', 'nl', 'de', 'es', 'fr'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          {item?.title || 'Content Item'}
          {item && <StatusChip status={item.approval_status} sx={{ ml: 1 }} />}
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
              {/* Image Section (BLOK 2) */}
              <ContentImageSection itemId={itemId} item={item} onUpdate={onUpdate} />

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
                sx={{ fontFamily: 'monospace', mb: 0.5 }}
              />
              {/* Character counter with platform limit */}
              {(() => {
                const platformLimits = { facebook: 500, instagram: 2200, linkedin: 3000, x: 280, tiktok: 150, youtube: 5000, pinterest: 500, website: 50000 };
                const limit = platformLimits[item?.target_platform] || 50000;
                const count = editBody.length;
                const pct = (count / limit) * 100;
                const color = pct > 95 ? 'error' : pct > 80 ? 'warning' : 'success';
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LinearProgress variant="determinate" value={Math.min(100, pct)} color={color} sx={{ flex: 1, height: 4, borderRadius: 2 }} />
                    <Typography variant="caption" color={`${color}.main`} fontWeight={600}>{count}/{limit}</Typography>
                  </Box>
                );
              })()}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button size="small" variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? <CircularProgress size={16} /> : t('common.save', 'Opslaan')}
                </Button>
                {/* 9.11: Emoji Picker */}
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Tooltip title="Emoji invoegen">
                    <IconButton size="small" onClick={() => setEmojiPickerOpen(p => !p)} color={emojiPickerOpen ? 'primary' : 'default'}>
                      <InsertEmoticonIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {emojiPickerOpen && (
                    <Paper elevation={4} sx={{ position: 'absolute', bottom: '100%', left: 0, mb: 0.5, p: 1, zIndex: 10, width: 260, display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                      {COMMON_EMOJIS.map((emoji, i) => (
                        <Box key={i} onClick={() => insertEmoji(emoji)} sx={{ cursor: 'pointer', fontSize: 20, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                          {emoji}
                        </Box>
                      ))}
                    </Paper>
                  )}
                </Box>
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

            {/* Right: Panel switcher */}
            <Grid item xs={12} md={4}>
              <Tabs value={rightPanel} onChange={(_, v) => {
                setRightPanel(v);
                if (v === 'comments' && comments.length === 0) loadComments();
                if (v === 'history' && revisions.length === 0) loadRevisions();
                if (v === 'brand' && !brandScore) loadBrandScore();
              }} sx={{ mb: 1, minHeight: 32 }} variant="scrollable" scrollButtons="auto">
                <Tab value="seo" label="SEO" sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
                <Tab value="brand" label="Brand" sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
                <Tab value="preview" label="Preview" sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
                <Tab value="comments" label={`Comments${comments.length ? ` (${comments.length})` : ''}`} sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
                <Tab value="history" label="Versies" sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
              </Tabs>

              {/* SEO Panel */}
              {rightPanel === 'seo' && (
              <>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2">
                    {item?.content_type === 'social_post' ? 'Engagement Score' : item?.content_type === 'video_script' ? 'Script Score' : 'SEO Score'}
                  </Typography>
                  {item?.content_type && item.content_type !== 'blog' && (
                    <Chip label={CONTENT_TYPE_LABELS[item.content_type] || item.content_type} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                  )}
                </Box>
                {item?.content_type === 'social_post' && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Meet hashtags, CTA, emoji, openingshook en leesbaarheid (niet SEO-metrics zoals meta description).
                  </Typography>
                )}
                {seoLoading ? <CircularProgress size={20} /> : seoData ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h4" fontWeight={700} color={seoData.overallScore >= 80 ? 'success.main' : seoData.overallScore >= 60 ? 'warning.main' : 'error.main'}>
                        {seoData.overallScore}
                      </Typography>
                      <Box>
                        <Typography variant="body2" color="text.secondary">/ 100 ({seoData.grade})</Typography>
                        {seoData.overallScore < 80 && (
                          <Typography variant="caption" color="error.main" sx={{ display: 'block', fontWeight: 600 }}>
                            Minimum 80 vereist voor goedkeuring
                          </Typography>
                        )}
                      </Box>
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
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Button size="small" onClick={loadSeo} startIcon={<RefreshIcon />}>Heranalyse</Button>
                      {seoData.overallScore < 80 && (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={handleImprove}
                          disabled={improving}
                          startIcon={improving ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
                        >
                          {improving ? 'Verbeteren...' : 'AI Verbeter'}
                        </Button>
                      )}
                    </Box>
                    {improveResult && (
                      <Alert severity={improveResult.improved ? 'success' : 'info'} sx={{ mt: 1, py: 0 }}>
                        {improveResult.improved
                          ? `Verbeterd: ${improveResult.original_score} → ${improveResult.final_score}/100 (${improveResult.improvement_details?.rounds || 0} rondes)`
                          : (improveResult.reason || 'Geen verbetering mogelijk')}
                      </Alert>
                    )}
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

              {/* Best Time to Post (BLOK 6) */}
              <BestTimeToPost platform={item.target_platform} destinationId={item.destination_id} />

              {/* Approval Timeline (BLOK 7) */}
              <ApprovalTimeline itemId={itemId} currentStatus={item.approval_status} />
              </>
              )}

              {/* 9.10: Brand Score Panel */}
              {rightPanel === 'brand' && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Brand Voice Score</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Meet hoe goed je content aansluit bij de ingestelde brand identity van deze bestemming.
                    De score is gebaseerd op tone-of-voice, woordkeuze, kernwaarden en doelgroep-aansluiting.
                  </Typography>
                  {brandScoreLoading ? <CircularProgress size={20} /> : brandScore ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="h4" fontWeight={700} color={brandScore.score >= 70 ? 'success.main' : brandScore.score >= 50 ? 'warning.main' : 'error.main'}>
                          {brandScore.score || 0}
                        </Typography>
                        <Box>
                          <Typography variant="body2" color="text.secondary">/ 100</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {brandScore.score >= 80 ? 'Uitstekend — past perfect bij je merk' :
                             brandScore.score >= 60 ? 'Goed — kleine aanpassingen mogelijk' :
                             brandScore.score >= 40 ? 'Matig — tone-of-voice wijkt af' :
                             'Onvoldoende — content past niet bij je merkidentiteit'}
                          </Typography>
                        </Box>
                      </Box>
                      {brandScore.tone_match !== undefined && (
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">Tone Match</Typography>
                            <Typography variant="caption" color="text.secondary">{Math.round(brandScore.tone_match)}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={brandScore.tone_match || 0} color={brandScore.tone_match >= 70 ? 'success' : 'warning'} sx={{ height: 6, borderRadius: 3 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            Komt de schrijfstijl overeen met je gedefinieerde personality en audience?
                          </Typography>
                        </Box>
                      )}
                      {brandScore.vocabulary_match !== undefined && (
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">Woordenschat</Typography>
                            <Typography variant="caption" color="text.secondary">{Math.round(brandScore.vocabulary_match)}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={brandScore.vocabulary_match || 0} color={brandScore.vocabulary_match >= 70 ? 'success' : 'warning'} sx={{ height: 6, borderRadius: 3 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            Worden je kernwoorden en gewenste bijvoeglijke naamwoorden gebruikt?
                          </Typography>
                        </Box>
                      )}
                      {brandScore.suggestions && brandScore.suggestions.length > 0 && (
                        <Box sx={{ mt: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="caption" fontWeight={600}>Verbeterpunten:</Typography>
                          {brandScore.suggestions.map((s, i) => (
                            <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>• {s}</Typography>
                          ))}
                        </Box>
                      )}
                      <Button size="small" onClick={loadBrandScore} startIcon={<RefreshIcon />} sx={{ mt: 1 }}>
                        Heranalyse
                      </Button>
                    </>
                  ) : (
                    <Box>
                      <Button size="small" variant="outlined" onClick={loadBrandScore} disabled={brandScoreLoading}>
                        Brand Score Laden
                      </Button>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Preview Panel */}
              {rightPanel === 'preview' && (
                <PlatformPreview content={item} targetPlatform={item?.target_platform} selectedLanguage={langTab} />
              )}

              {/* Comments Panel */}
              {rightPanel === 'comments' && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Team Comments</Typography>
                  {commentLoading ? <CircularProgress size={20} /> : (
                    <>
                      {comments.length === 0 && <Typography variant="body2" color="text.secondary">Geen comments.</Typography>}
                      {comments.map(c => (
                        <Box key={c.id} sx={{ mb: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                            <Typography variant="caption" fontWeight={600}>{c.first_name || c.user_email || 'System'}</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(c.created_at).toLocaleString('nl-NL')}</Typography>
                          </Box>
                          <Typography variant="body2">{c.comment}</Typography>
                        </Box>
                      ))}
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="Schrijf een comment..."
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                        />
                        <Button size="small" variant="contained" onClick={handleAddComment} disabled={!newComment.trim()}>
                          Post
                        </Button>
                      </Box>
                    </>
                  )}
                </Paper>
              )}

              {/* History / Revisions Panel */}
              {rightPanel === 'history' && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Versiegeschiedenis</Typography>
                  {revisionLoading ? <CircularProgress size={20} /> : (
                    <>
                      {revisions.length === 0 && <Typography variant="body2" color="text.secondary">Geen eerdere versies.</Typography>}
                      {revisions.map(rev => (
                        <Box key={rev.id} sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" fontWeight={600}>v{rev.revision_number}</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(rev.created_at).toLocaleString('nl-NL')}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">{rev.change_summary || '—'}</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Button size="small" variant="outlined" onClick={() => handleRestore(rev.id)} sx={{ fontSize: 11 }}>
                              Herstel
                            </Button>
                          </Box>
                        </Box>
                      ))}
                    </>
                  )}
                </Paper>
              )}

              {/* SEO gate warning (TO DO 4a) */}
              {seoData && seoData.overallScore < 80 && item.approval_status !== 'approved' && item.approval_status !== 'scheduled' && item.approval_status !== 'published' && (
                <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
                  <Typography variant="caption">
                    <strong>SEO-score te laag ({seoData.overallScore}/100)</strong> — Minimum is 80. Gebruik "AI Verbeter" om de score te verhogen voordat je kunt goedkeuren.
                  </Typography>
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Tooltip title={seoData && seoData.overallScore < 80 ? `SEO-score ${seoData.overallScore}/100 is onder minimum (80). Verbeter eerst de content.` : ''}>
                  <span>
                    <Button size="small" variant="contained" color="success" onClick={() => handleStatusUpdate('approved')} startIcon={<CheckIcon />}
                      disabled={item.approval_status === 'approved' || (seoData && seoData.overallScore < 80)}>
                      Approve
                    </Button>
                  </span>
                </Tooltip>
                <Button size="small" variant="outlined" color="error" onClick={() => handleStatusUpdate('rejected')} startIcon={<CloseIcon />} disabled={item.approval_status === 'rejected'}>
                  Reject
                </Button>
                <Button size="small" variant="outlined" color="primary" onClick={() => setRepurposeOpen(true)} startIcon={<ContentCopyIcon />} disabled={repurposing}>
                  {repurposing ? 'Repurposing...' : 'Repurpose'}
                </Button>
                {item.approval_status === 'approved' && (
                  <Button size="small" variant="contained" color="primary" onClick={() => setPublishDialogOpen(true)} startIcon={<PublishIcon />}>
                    Publiceren
                  </Button>
                )}
                {/* 9.13: Retry Publish for failed items */}
                {item.approval_status === 'failed' && (
                  <Button size="small" variant="contained" color="warning" onClick={handleRetryPublish} disabled={retrying} startIcon={retrying ? <CircularProgress size={14} /> : <ReplayIcon />}>
                    {retrying ? 'Opnieuw...' : 'Opnieuw Proberen'}
                  </Button>
                )}
                {/* 9.12: Share to other destination */}
                <Button size="small" variant="outlined" onClick={() => setShareDialogOpen(true)} startIcon={<ShareIcon />} disabled={sharing}>
                  Deel
                </Button>
              </Box>

              {/* Failed publish error info */}
              {item.approval_status === 'failed' && item.publish_error && (
                <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                  <Typography variant="caption"><strong>Publicatie mislukt:</strong> {item.publish_error}</Typography>
                </Alert>
              )}

              {repurposeResult && !repurposeResult.error && (
                <Alert severity="success" sx={{ mt: 1 }} onClose={() => setRepurposeResult(null)}>
                  {repurposeResult.repurposed || repurposeResult.items?.length || 0} platform-versie(s) aangemaakt
                </Alert>
              )}
              {repurposeResult?.error && (
                <Alert severity="error" sx={{ mt: 1 }} onClose={() => setRepurposeResult(null)}>
                  {repurposeResult.error}
                </Alert>
              )}
              {shareResult && (
                <Alert severity={shareResult.success ? 'success' : 'error'} sx={{ mt: 1 }} onClose={() => setShareResult(null)}>
                  {shareResult.success ? 'Content succesvol gedeeld naar andere bestemming' : shareResult.error}
                </Alert>
              )}

              {/* Repurpose Dialog */}
              <Dialog open={repurposeOpen} onClose={() => setRepurposeOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Content Repurpose</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Selecteer platformen waarvoor een aangepaste versie gegenereerd wordt. De AI schrijft een NIEUWE versie per platform, geen copy-paste.
                  </Typography>
                  {['instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'youtube', 'pinterest'].map(p => (
                    <Box key={p} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox checked={repurposePlatforms.includes(p)} onChange={() => toggleRepurposePlatform(p)} disabled={p === item?.target_platform} />
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{p}{p === item?.target_platform ? ' (bron)' : ''}</Typography>
                    </Box>
                  ))}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setRepurposeOpen(false)}>Annuleren</Button>
                  <Button variant="contained" onClick={handleRepurpose} disabled={repurposing || repurposePlatforms.length === 0} startIcon={repurposing ? <CircularProgress size={16} /> : <ContentCopyIcon />}>
                    {repurposing ? 'Bezig...' : `Repurpose (${repurposePlatforms.length})`}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Publish Dialog (BLOK 4) */}
              <Dialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Publiceren</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Kies hoe je dit content item wilt publiceren naar {item?.target_platform || 'het platform'}.
                  </Typography>
                  {/* Best Time to Post suggestion in publish dialog — clickable chips */}
                  {item?.target_platform && item.target_platform !== 'website' && (() => {
                    const dayMap = { maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6, zondag: 0 };
                    const selectBestTime = (label) => {
                      const parts = label.toLowerCase().split(' ');
                      if (parts.length < 2) return;
                      const targetDay = dayMap[parts[0]];
                      const [hh, mm] = (parts[1] || '12:00').split(':');
                      if (targetDay === undefined) return;
                      const now = new Date();
                      const currentDay = now.getDay();
                      let daysAhead = targetDay - currentDay;
                      if (daysAhead <= 0) daysAhead += 7;
                      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead, Number(hh), Number(mm || 0));
                      const pad = n => String(n).padStart(2, '0');
                      setScheduleDatetime(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`);
                    };
                    const defaults = BEST_TIME_DEFAULTS[item.target_platform] || BEST_TIME_DEFAULTS.instagram;
                    const allTimes = [defaults.best, ...defaults.alt];
                    return (
                      <Box sx={{ mb: 2, p: 1, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>Klik om in te plannen op aanbevolen tijdstip:</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {allTimes.map((t, i) => (
                            <Chip key={i} label={t} color={i === 0 ? 'success' : 'default'} size="small"
                              variant={i === 0 ? 'filled' : 'outlined'}
                              onClick={() => selectBestTime(t)} sx={{ cursor: 'pointer' }}
                            />
                          ))}
                        </Box>
                      </Box>
                    );
                  })()}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Button variant="contained" color="success" onClick={handlePublishNow} disabled={publishing} startIcon={publishing ? <CircularProgress size={16} /> : <PublishIcon />} fullWidth>
                      Nu Publiceren
                    </Button>
                    <Typography variant="overline" sx={{ textAlign: 'center' }}>OF</Typography>
                    <TextField type="datetime-local" label="Inplannen op" value={scheduleDatetime} onChange={e => setScheduleDatetime(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small" />
                    <Button variant="outlined" onClick={handleSchedule} disabled={publishing || !scheduleDatetime} startIcon={<ScheduleIcon />} fullWidth>
                      Inplannen
                    </Button>
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setPublishDialogOpen(false)}>Later</Button>
                </DialogActions>
              </Dialog>

              {/* 9.12: Share to Destination Dialog */}
              <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Deel naar andere bestemming</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Kopieer dit content item naar een andere bestemming. De content wordt als nieuw concept aangemaakt.
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Bestemming</InputLabel>
                    <Select value={shareDestId} onChange={e => setShareDestId(e.target.value)} label="Bestemming">
                      {[{ id: 1, name: 'Calpe' }, { id: 2, name: 'Texel' }, { id: 4, name: 'WarreWijzer' }]
                        .filter(d => d.id !== item?.destination_id)
                        .map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setShareDialogOpen(false)}>Annuleren</Button>
                  <Button variant="contained" onClick={handleShare} disabled={!shareDestId || sharing} startIcon={sharing ? <CircularProgress size={16} /> : <ShareIcon />}>
                    {sharing ? 'Delen...' : 'Deel'}
                  </Button>
                </DialogActions>
              </Dialog>
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
  const [trendView, setTrendView] = useState('table');
  const [marketFilter, setMarketFilter] = useState('ALL');
  const [langFilter, setLangFilter] = useState('ALL');

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [sugTotal, setSugTotal] = useState(0);
  const [sugLoading, setSugLoading] = useState(false);
  const [sugGenerating, setSugGenerating] = useState(false);
  const [sugError, setSugError] = useState(null);
  const [sugPage, setSugPage] = useState(0);
  const [generateDialogSuggestion, setGenerateDialogSuggestion] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Content Items state
  const [items, setItems] = useState([]);
  const [itemTotal, setItemTotal] = useState(0);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState(null);
  const [itemPage, setItemPage] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  // === Trending loaders ===
  const loadTrends = useCallback(async () => {
    setTrendLoading(true);
    setTrendError(null);
    try {
      const opts = { period, limit: trendRowsPerPage, offset: trendPage * trendRowsPerPage };
      if (marketFilter !== 'ALL') opts.market = marketFilter;
      if (langFilter !== 'ALL') opts.language = langFilter;
      const result = await contentService.getTrending(destinationId, opts);
      setTrends(result.data?.trends || []);
      setTrendTotal(result.data?.total || 0);
    } catch (err) {
      setTrendError(err.message || 'Fout bij laden trends');
    } finally {
      setTrendLoading(false);
    }
  }, [destinationId, period, trendPage, trendRowsPerPage, marketFilter, langFilter]);

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

  // Bulk operations
  const toggleSelectItem = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map(i => i.id));
  };
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      if (action === 'approve') await contentService.bulkApprove(selectedIds);
      else if (action === 'reject') await contentService.bulkReject(selectedIds);
      else if (action === 'delete') {
        if (!window.confirm(`${selectedIds.length} items verwijderen?`)) { setBulkLoading(false); return; }
        await contentService.bulkDelete(selectedIds);
      }
      setSelectedIds([]);
      loadItems();
    } catch (err) {
      setItemError(err.message);
    } finally {
      setBulkLoading(false);
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

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        <Tab label={t('contentStudio.tabs.trending', 'Trending Monitor')} />
        <Tab label={t('contentStudio.tabs.suggestions', 'Suggesties')} />
        <Tab label={t('contentStudio.tabs.content', 'Content Items')} />
        <Tab label={t('contentStudio.tabs.calendar', 'Kalender')} icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={t('contentStudio.tabs.analyse', 'Analyse')} />
        <Tab label={t('contentStudio.tabs.seasons', 'Seizoenen')} />
        <Tab label={t('contentStudio.tabs.socialAccounts', 'Social Accounts')} />
      </Tabs>

      {/* === TAB 0: Trending Monitor === */}
      {tab === 0 && (
        <>
          <SummaryCards summary={summary} loading={summaryLoading} />

          {/* Filters row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Markt:</Typography>
            <ToggleButtonGroup size="small" value={marketFilter} exclusive onChange={(_, v) => { if (v) { setMarketFilter(v); setTrendPage(0); } }}>
              {MARKET_OPTIONS.map(m => <ToggleButton key={m} value={m} sx={{ py: 0.3, px: 1, fontSize: 11 }}>{m}</ToggleButton>)}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mr: 0.5 }}>Taal:</Typography>
            <ToggleButtonGroup size="small" value={langFilter} exclusive onChange={(_, v) => { if (v) { setLangFilter(v); setTrendPage(0); } }}>
              {LANG_OPTIONS.map(l => <ToggleButton key={l} value={l} sx={{ py: 0.3, px: 1, fontSize: 11 }}>{l === 'ALL' ? 'ALL' : l.toUpperCase()}</ToggleButton>)}
            </ToggleButtonGroup>
            <Box sx={{ flex: 1 }} />
            <ToggleButtonGroup size="small" value={trendView} exclusive onChange={(_, v) => { if (v) setTrendView(v); }}>
              <ToggleButton value="table"><Tooltip title="Tabel"><TableChartIcon fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="chart"><Tooltip title="Trendgrafiek"><BarChartIcon fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="cloud"><Tooltip title="Word Cloud"><CloudIcon fontSize="small" /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {trendError && <Alert severity="error" sx={{ mb: 2 }}>{trendError}</Alert>}

          {/* TrendChart view */}
          {trendView === 'chart' && <TrendChart trends={trends} />}

          {/* Word Cloud view */}
          {trendView === 'cloud' && <WordCloud trends={trends} />}

          {/* Table view (always shown, collapsed in other views) */}
          <Paper variant="outlined" sx={{ display: trendView === 'table' ? 'block' : 'none' }}>
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
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell>
                    </TableRow>
                  ) : trends.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">Geen trending keywords gevonden voor deze periode.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : trends.map((trend, idx) => (
                    <TableRow key={trend.id || idx} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{trend.keyword}</TableCell>
                      <TableCell>
                        <Chip label={trend.relevance_score != null ? Number(trend.relevance_score).toFixed(1) : '—'} size="small" color={Number(trend.relevance_score) >= 7 ? 'success' : Number(trend.relevance_score) >= 4 ? 'info' : 'default'} />
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
                    <TableRow key={sug.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedSuggestion(sug)}>
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
                        <StatusChip status={sug.status} />
                      </TableCell>
                      <TableCell align="right" onClick={e => e.stopPropagation()}>
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
                          {sug.status === 'rejected' && (
                            <>
                              <Tooltip title="Herstel naar pending">
                                <IconButton size="small" color="info" onClick={() => handleSuggestionAction(sug.id, 'pending')}>
                                  <RestoreIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Definitief verwijderen">
                                <IconButton size="small" color="error" onClick={() => handleSuggestionAction(sug.id, 'deleted')}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Details bekijken">
                            <IconButton size="small" onClick={() => setSelectedSuggestion(sug)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {selectedIds.length > 0 && (
                  <>
                    <Chip label={`${selectedIds.length} geselecteerd`} size="small" color="primary" />
                    <Button size="small" variant="contained" color="success" onClick={() => handleBulkAction('approve')} disabled={bulkLoading}>Approve</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => handleBulkAction('reject')} disabled={bulkLoading}>Reject</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => handleBulkAction('delete')} disabled={bulkLoading}>Delete</Button>
                  </>
                )}
                <Tooltip title="Vernieuwen">
                  <IconButton size="small" onClick={loadItems}><RefreshIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Button size="small" variant="contained" startIcon={<NoteAddIcon />} onClick={() => setManualDialogOpen(true)}>
                  Nieuw Item
                </Button>
              </Box>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={items.length > 0 && selectedIds.length === items.length} indeterminate={selectedIds.length > 0 && selectedIds.length < items.length} onChange={toggleSelectAll} />
                    </TableCell>
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
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">Geen content items. Genereer content vanuit goedgekeurde suggesties.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : items.map((item) => {
                    const langs = ['en', 'nl', 'de', 'es', 'fr'].filter(l => item[`body_${l}`]);
                    const seoScore = item.seo_data?.overallScore;
                    return (
                      <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedItemId(item.id)}>
                        <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                          <Checkbox size="small" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectItem(item.id)} />
                        </TableCell>
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
                            <Chip label={seoScore} size="small" color={seoScore >= 80 ? 'success' : seoScore >= 60 ? 'warning' : 'error'} />
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusChip status={item.approval_status} />
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

      {/* === TAB 3: Calendar === */}
      {tab === 3 && <ContentCalendarTab destinationId={destinationId} />}

      {/* === TAB 4: Content Analyse === */}
      {tab === 4 && <ContentAnalyseTab destinationId={destinationId} />}

      {/* === TAB 5: Seasonal Config === */}
      {tab === 5 && <SeasonalConfigTab destinationId={destinationId} />}

      {/* === TAB 6: Social Accounts (BLOK 5) === */}
      {tab === 6 && <SocialAccountsTab destinationId={destinationId} />}

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
        destinationId={destinationId}
      />

      <ContentItemDialog
        open={!!selectedItemId}
        onClose={() => setSelectedItemId(null)}
        itemId={selectedItemId}
        onUpdate={loadItems}
        onTranslate={loadItems}
      />

      <SuggestionDetailDialog
        open={!!selectedSuggestion}
        onClose={() => setSelectedSuggestion(null)}
        suggestion={selectedSuggestion}
        onAction={(id, status) => { handleSuggestionAction(id, status); }}
        onGenerate={(sug) => setGenerateDialogSuggestion(sug)}
      />

      <ManualContentDialog
        open={manualDialogOpen}
        onClose={() => setManualDialogOpen(false)}
        destinationId={destinationId}
        onCreated={loadItems}
      />
    </Box>
  );
}
