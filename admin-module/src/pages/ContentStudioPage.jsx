import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, TextField, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip,
  Card, CardContent, Grid, CircularProgress, Skeleton, Alert, TablePagination, LinearProgress,
  ToggleButton, ToggleButtonGroup, Checkbox, Accordion, AccordionSummary, AccordionDetails, Divider, Snackbar, Popover, FormControlLabel, Switch,
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
import DashboardIcon from '@mui/icons-material/Dashboard';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PublishIcon from '@mui/icons-material/Publish';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DownloadIcon from '@mui/icons-material/Download';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PersonIcon from '@mui/icons-material/Person';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LanguageIcon from '@mui/icons-material/Language';
import ShareIcon from '@mui/icons-material/Share';
import ReplayIcon from '@mui/icons-material/Replay';
import RestoreIcon from '@mui/icons-material/Restore';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import VisibilityIcon from '@mui/icons-material/Visibility';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import LinkIcon from '@mui/icons-material/Link';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DraftsIcon from '@mui/icons-material/Drafts';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import useAuthStore from '../stores/authStore.js';
import useDestinationStore from '../stores/destinationStore.js';
import VisualTrendsTab from "../components/content/VisualTrendsTab";
import POIInspirationTab from "../components/content/POIInspirationTab";
import AgendaInspirationTab from "../components/content/AgendaInspirationTab";
import HolibotInsightsTab from "../components/content/HolibotInsightsTab";
import SearchIntentTab from "../components/content/SearchIntentTab";
import ContentSourcesOverviewTab from "../components/content/ContentSourcesOverviewTab";
import contentService from '../api/contentService.js';
import client from '../api/client.js';
import ConceptDialog from '../components/content/ConceptDialog.jsx';
import ContentImageSection from '../components/content/ContentImageSection.jsx';
import ContentCalendarTab from './ContentCalendarTab.jsx';
import { lazy, Suspense } from 'react';
const MediaSidebarPanel = lazy(() => import('../components/contentStudio/MediaSidebarPanel.jsx'));
import SeasonalConfigTab from './SeasonalConfigTab.jsx';
import SocialAccountsCards from '../components/content/SocialAccountsCards.jsx';
import ContentAnalyseTab from './ContentAnalyseTab.jsx';
import ContentStudioOverview from '../components/content/ContentStudioOverview.jsx';
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
  draft: { bgcolor: 'rgba(255,183,77,0.12)', color: '#FFB74D', border: '1px solid', borderColor: 'rgba(255,183,77,0.3)' },
  pending: { bgcolor: 'rgba(255,183,77,0.12)', color: '#FFB74D', border: '1px solid', borderColor: 'rgba(255,183,77,0.3)' },
  pending_review: { bgcolor: 'rgba(206,147,216,0.12)', color: '#CE93D8', border: '1px solid', borderColor: 'rgba(206,147,216,0.3)' },
  approved: { bgcolor: 'rgba(129,199,132,0.12)', color: '#81C784', border: '1px solid', borderColor: 'rgba(129,199,132,0.3)' },
  scheduled: { bgcolor: 'rgba(100,181,246,0.12)', color: '#64B5F6', border: '1px solid', borderColor: 'rgba(100,181,246,0.3)' },
  publishing: { bgcolor: 'rgba(121,134,203,0.12)', color: '#7986CB', border: '1px solid', borderColor: 'rgba(121,134,203,0.3)' },
  published: { bgcolor: 'rgba(129,199,132,0.12)', color: '#81C784', border: '1px solid', borderColor: 'rgba(129,199,132,0.3)' },
  rejected: { bgcolor: 'rgba(229,115,115,0.12)', color: '#E57373', border: '1px solid', borderColor: 'rgba(229,115,115,0.3)' },
  failed: { bgcolor: 'rgba(229,115,115,0.12)', color: '#E57373', border: '1px solid', borderColor: 'rgba(229,115,115,0.3)' },
  generated: { bgcolor: 'rgba(176,190,197,0.12)', color: '#B0BEC5', border: '1px solid', borderColor: 'rgba(176,190,197,0.3)' },
};

const CONTENT_TYPE_LABELS = {
  blog: 'Blog',
  social_post: 'Social Post',
  video_script: 'Video Script',
};

const CONTENT_TYPE_COLORS = {
  blog: { bg: '#1565c015', color: '#1565c0' },
  social_post: { bg: '#2e7d3215', color: '#2e7d32' },
  video_script: { bg: '#ed6c0215', color: '#ed6c02' },
};

const PLATFORM_LABELS = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
};

// Brand colors per platform (Opdracht 6)
const PLATFORM_COLORS = {
  website: '#5E8B7E',
  facebook: '#1877F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  x: '#000000',
  tiktok: '#000000',
  youtube: '#FF0000',
  pinterest: '#BD081C',
};

// Status icon per platform-version status (Opdracht 6)
const PLATFORM_STATUS_ICON = {
  published: '✓',
  scheduled: '⏱',
  draft: '✎',
  pending_review: '✎',
  approved: '✎',
  failed: '!',
  rejected: '✕',
};

// Trending source metadata (Opdracht 7-A)
// Maps known source values to a friendly label + Material icon
function getSourceMeta(source) {
  if (!source) return { label: 'Onbekend', Icon: LanguageIcon, color: '#9E9E9E' };
  const s = String(source).toLowerCase();
  if (s.includes('google') || s.includes('trends')) return { label: 'Google Trends', Icon: SearchIcon, color: '#4285F4' };
  if (s.includes('manual') || s.includes('handmatig')) return { label: 'Handmatig', Icon: PersonIcon, color: '#9C27B0' };
  if (s.includes('traffic') || s.includes('analytics') || s.includes('website')) return { label: 'Website Traffic', Icon: AnalyticsIcon, color: '#00BFA5' };
  if (s.includes('sistrix')) return { label: 'SISTRIX', Icon: AnalyticsIcon, color: '#FF6F00' };
  return { label: source, Icon: LanguageIcon, color: '#607D8B' };
}

// Score color helper (Opdracht 7-3): 4-staps schaal
// 8.5-10 → groen, 6-8.5 → blauw, 3.5-6 → oranje, 0-3.5 → rood
function getScoreColor(score) {
  const s = Number(score) || 0;
  if (s >= 8.5) return { mui: 'success', hex: '#2e7d32' };
  if (s >= 6) return { mui: 'info', hex: '#0288d1' };
  if (s >= 3.5) return { mui: 'warning', hex: '#ed6c02' };
  return { mui: 'error', hex: '#d32f2f' };
}

// Sparkline mini-chart component (Opdracht 7-C, herontwerp v2)
// Toont weeknummers onder de bars + score-label boven, zodat de viz
// betekenisvol is. Bij 1 datapunt: single bar met label. Bij 0: tekst.
// Bars zijn gekleurd op basis van hun eigen score (4-staps schaal) en
// gebruiken vaste 0-10 schaal voor visuele consistentie tussen rijen.
function Sparkline({ data, weeks, width = 100, height = 38 }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Box component="span" sx={{ display: 'inline-block', color: 'text.disabled', fontSize: 10, fontStyle: 'italic' }}>
        Geen historie
      </Box>
    );
  }
  const values = data.map(v => Number(v) || 0);
  const labels = Array.isArray(weeks) && weeks.length === values.length
    ? weeks.map(w => `W${w}`)
    : values.map((_, i) => `t${i + 1}`);
  const max = 10;
  const barCount = values.length;
  const gap = 4;
  const labelHeight = 10;
  const valueHeight = 10;
  const barAreaH = height - labelHeight - valueHeight - 2;
  const barWidth = Math.max(8, (width - gap * (barCount - 1)) / barCount);
  return (
    <svg width={width} height={height} role="img" aria-label="Sparkline 4-week trend">
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * barAreaH);
        const x = i * (barWidth + gap);
        const y = valueHeight + (barAreaH - h);
        const c = getScoreColor(v).hex;
        return (
          <g key={i}>
            <text x={x + barWidth / 2} y={valueHeight - 2} textAnchor="middle" fontSize="9" fontWeight="600" fill={c}>
              {v.toFixed(1)}
            </text>
            <rect x={x} y={y} width={barWidth} height={h} fill={c} rx={1} />
            <text x={x + barWidth / 2} y={height - 1} textAnchor="middle" fontSize="8" fill="#666">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Helper: laatste geschiedenis-waarde voor sortering op Trend kolom
function latestHistoryValue(historyArr) {
  if (!Array.isArray(historyArr) || historyArr.length === 0) return -1;
  return Number(historyArr[historyArr.length - 1]) || 0;
}

// Opdracht 7-F (v2): Platform-aware suggestion preview
// Toont een passende mini-preview op basis van content_type + primair kanaal
function SuggestionPreview({ suggestion: sug }) {
  if (!sug) return null;
  const ct = sug.content_type;
  const channels = Array.isArray(sug.suggested_channels) ? sug.suggested_channels : [];
  const primary = channels[0] || (ct === 'blog' ? 'website' : 'instagram');
  const keywords = Array.isArray(sug.keyword_cluster) ? sug.keyword_cluster : [];
  const hashtags = keywords.slice(0, 3).map(k => `#${String(k).replace(/[^a-zA-Z0-9]/g, '')}`).filter(h => h.length > 1).join(' ');
  const summary = sug.summary || '';

  // BLOG: hero met titel + lead
  if (ct === 'blog') {
    return (
      <Box sx={{ width: 280, color: 'common.white' }}>
        <Box sx={{ fontSize: 10, opacity: 0.7, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Preview · Blog artikel</Box>
        <Box sx={{ borderRadius: 1, overflow: 'hidden', bgcolor: '#fff', color: '#222' }}>
          <Box sx={{ height: 90, background: 'linear-gradient(135deg, #5E8B7E 0%, #2C3E50 100%)', display: 'flex', alignItems: 'flex-end', p: 1.2 }}>
            <Box sx={{ fontSize: 9, color: '#fff', bgcolor: 'rgba(0,0,0,0.4)', px: 0.6, borderRadius: 0.4 }}>BLOG</Box>
          </Box>
          <Box sx={{ p: 1.2 }}>
            <Box sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25, mb: 0.5 }}>{sug.title}</Box>
            {summary && <Box sx={{ fontSize: 10, color: '#555', lineHeight: 1.35 }}>{summary.length > 140 ? summary.slice(0, 140) + '…' : summary}</Box>}
            <Box sx={{ fontSize: 9, color: '#888', mt: 0.8 }}>calpetrip.com/blog</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // VIDEO SCRIPT: video frame mock
  if (ct === 'video_script') {
    return (
      <Box sx={{ width: 240, color: 'common.white' }}>
        <Box sx={{ fontSize: 10, opacity: 0.7, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Preview · Video</Box>
        <Box sx={{ aspectRatio: '16/9', bgcolor: '#000', borderRadius: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ width: 0, height: 0, borderTop: '14px solid transparent', borderBottom: '14px solid transparent', borderLeft: '20px solid rgba(255,255,255,0.85)', ml: 0.5 }} />
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1, bgcolor: 'rgba(0,0,0,0.6)' }}>
            <Box sx={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{sug.title}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // SOCIAL POST: kies layout op basis van primair kanaal
  const platformLabel = (PLATFORM_LABELS[primary] || primary || 'social').toString();

  if (primary === 'instagram') {
    return (
      <Box sx={{ width: 220, color: 'common.white' }}>
        <Box sx={{ fontSize: 10, opacity: 0.7, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Preview · Instagram</Box>
        <Box sx={{ bgcolor: '#fff', color: '#222', borderRadius: 1, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, px: 1, py: 0.6, borderBottom: '1px solid #eee' }}>
            <Box sx={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)' }} />
            <Box sx={{ fontSize: 10, fontWeight: 600 }}>calpetrip</Box>
          </Box>
          <Box sx={{ width: '100%', aspectRatio: '1 / 1', background: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)', display: 'flex', alignItems: 'flex-end', p: 1 }}>
            <Box sx={{ fontSize: 11, color: '#fff', fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{sug.title}</Box>
          </Box>
          <Box sx={{ p: 0.8 }}>
            {summary && <Box sx={{ fontSize: 9.5, color: '#222', lineHeight: 1.3 }}>{summary.length > 110 ? summary.slice(0, 110) + '…' : summary}</Box>}
            {hashtags && <Box sx={{ fontSize: 9, color: '#00376b', mt: 0.4 }}>{hashtags}</Box>}
          </Box>
        </Box>
      </Box>
    );
  }

  if (primary === 'facebook') {
    return (
      <Box sx={{ width: 240, color: 'common.white' }}>
        <Box sx={{ fontSize: 10, opacity: 0.7, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Preview · Facebook</Box>
        <Box sx={{ bgcolor: '#fff', color: '#222', borderRadius: 1, overflow: 'hidden', border: '1px solid #ddd' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, p: 1, borderBottom: '1px solid #eee' }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>C</Box>
            <Box>
              <Box sx={{ fontSize: 10, fontWeight: 700 }}>CalpeTrip</Box>
              <Box sx={{ fontSize: 8, color: '#666' }}>Sponsored · 🌐</Box>
            </Box>
          </Box>
          <Box sx={{ p: 1 }}>
            <Box sx={{ fontSize: 11, fontWeight: 600, mb: 0.5 }}>{sug.title}</Box>
            {summary && <Box sx={{ fontSize: 9.5, color: '#444', lineHeight: 1.35 }}>{summary.length > 130 ? summary.slice(0, 130) + '…' : summary}</Box>}
          </Box>
          <Box sx={{ height: 80, background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)' }} />
          <Box sx={{ display: 'flex', gap: 1, p: 0.6, borderTop: '1px solid #eee', fontSize: 9, color: '#666' }}>
            <span>👍 Vind ik leuk</span><span>💬 Reageer</span><span>↗ Deel</span>
          </Box>
        </Box>
      </Box>
    );
  }

  if (primary === 'linkedin') {
    return (
      <Box sx={{ width: 240, color: 'common.white' }}>
        <Box sx={{ fontSize: 10, opacity: 0.7, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Preview · LinkedIn</Box>
        <Box sx={{ bgcolor: '#fff', color: '#222', borderRadius: 1, overflow: 'hidden', border: '1px solid #ddd' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, p: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>C</Box>
            <Box>
              <Box sx={{ fontSize: 10, fontWeight: 700 }}>CalpeTrip</Box>
              <Box sx={{ fontSize: 8, color: '#666' }}>Travel · 1.2k volgers</Box>
            </Box>
          </Box>
          <Box sx={{ px: 1, pb: 1 }}>
            <Box sx={{ fontSize: 11, fontWeight: 600, mb: 0.5 }}>{sug.title}</Box>
            {summary && <Box sx={{ fontSize: 9.5, color: '#444', lineHeight: 1.35 }}>{summary.length > 130 ? summary.slice(0, 130) + '…' : summary}</Box>}
            {hashtags && <Box sx={{ fontSize: 9, color: '#0A66C2', mt: 0.4 }}>{hashtags}</Box>}
          </Box>
        </Box>
      </Box>
    );
  }

  // Generieke fallback (X, TikTok, etc.)
  return (
    <Box sx={{ width: 220, color: 'common.white' }}>
      <Box sx={{ fontSize: 10, opacity: 0.7, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Preview · {platformLabel}</Box>
      <Box sx={{ bgcolor: '#fff', color: '#222', borderRadius: 1, p: 1, border: '1px solid #ddd' }}>
        <Box sx={{ fontSize: 11, fontWeight: 700, mb: 0.5 }}>{sug.title}</Box>
        {summary && <Box sx={{ fontSize: 10, color: '#444' }}>{summary.length > 140 ? summary.slice(0, 140) + '…' : summary}</Box>}
        {hashtags && <Box sx={{ fontSize: 9, color: '#0288d1', mt: 0.4 }}>{hashtags}</Box>}
      </Box>
    </Box>
  );
}

// Pillar matching helper (Opdracht 7-B)
// Returns the matching pillar object if any pillar name appears in the keyword
function findMatchingPillar(keyword, pillars) {
  if (!keyword || !Array.isArray(pillars) || pillars.length === 0) return null;
  const kw = keyword.toLowerCase();
  return pillars.find(p => {
    if (!p?.name) return false;
    const tokens = String(p.name).toLowerCase().split(/[\s&/,]+/).filter(Boolean);
    return tokens.some(tok => tok.length >= 3 && kw.includes(tok));
  }) || null;
}

// STATUS_LABELS: dynamically resolved via t() in StatusChip
const STATUS_KEYS = ['draft', 'pending', 'pending_review', 'approved', 'scheduled', 'publishing', 'published', 'rejected', 'failed', 'generated', 'deleted'];

// Translate raw check names (keyword_density → i18n key)
function formatCheckName(name, t) {
  return t(`contentStudio.checkNames.${name}`, name.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()));
}

function StatusChip({ status, size = 'small', sx: extraSx = {} }) {
  const { t } = useTranslation();
  const customSx = STATUS_SX[status] || {};
  return (
    <Chip
      label={t(`contentStudio.status.${status}`, status)}
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
  const { t } = useTranslation();
  if (loading) return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {[1, 2, 3, 4].map(i => (
        <Grid item xs={6} md={3} key={i}>
          <Skeleton variant="rounded" height={80} />
        </Grid>
      ))}
    </Grid>
  );
  if (!summary) return null;

  const cards = [
    { label: t('contentStudio.cards.uniqueKeywords', 'Unieke Keywords'), value: summary.totalKeywords || 0 },
    { label: t('contentStudio.cards.topKeyword', 'Top Keyword'), value: summary.topKeywords?.[0]?.keyword || '—' },
    { label: t('contentStudio.cards.avgScore', 'Gem. Score'), value: summary.topKeywords?.length > 0 ? (summary.topKeywords.reduce((s, k) => s + Number(k.avg_score || 0), 0) / summary.topKeywords.length).toFixed(1) : '—' },
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
  const [sourceUrl, setSourceUrl] = useState('');
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
        source: sourceUrl ? 'external_url' : 'manual',
        source_url: sourceUrl || null,
      });
      setKeyword('');
      setVolume('');
      setMarket('');
      setSourceUrl('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('contentStudio.dialogs.addKeyword', 'Keyword Toevoegen')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label={t('contentStudio.form.keyword', 'Keyword')} value={keyword} onChange={e => setKeyword(e.target.value)} required fullWidth />
        <FormControl fullWidth>
          <InputLabel>{t('contentStudio.form.language', 'Taal')}</InputLabel>
          <Select value={language} onChange={e => setLanguage(e.target.value)} label={t('contentStudio.form.language', 'Taal')}>
            <MenuItem value="en">{t('contentStudio.languages.en', 'Engels')}</MenuItem>
            <MenuItem value="nl">{t('contentStudio.languages.nl', 'Nederlands')}</MenuItem>
            <MenuItem value="de">{t('contentStudio.languages.de', 'Duits')}</MenuItem>
            <MenuItem value="es">{t('contentStudio.languages.es', 'Spaans')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>{t('contentStudio.form.direction', 'Richting')}</InputLabel>
          <Select value={direction} onChange={e => setDirection(e.target.value)} label={t('contentStudio.form.direction', 'Richting')}>
            <MenuItem value="breakout">Breakout</MenuItem>
            <MenuItem value="rising">Rising</MenuItem>
            <MenuItem value="stable">Stable</MenuItem>
            <MenuItem value="declining">Declining</MenuItem>
          </Select>
        </FormControl>
        <TextField label={t('contentStudio.form.searchVolume', 'Zoekvolume')} type="number" value={volume} onChange={e => setVolume(e.target.value)} fullWidth />
        <TextField label={t('contentStudio.form.marketHint', 'Markt (bijv. NL, DE, ES)')} value={market} onChange={e => setMarket(e.target.value)} fullWidth />
        <TextField label={t('contentStudio.form.sourceUrl', 'Bron URL (optioneel)')} placeholder="https://texelinformatie.nl/wadlopen-seizoen-2026" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} fullWidth helperText={t('contentStudio.form.sourceUrlHelp', 'Link naar nieuwsbericht, DMO-pagina of andere bron voor dit keyword')} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('contentStudio.actions.cancel', 'Annuleren')}</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!keyword.trim() || submitting}>
          {submitting ? <CircularProgress size={20} /> : t('contentStudio.actions.add', 'Toevoegen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function GenerateContentDialog({ open, onClose, suggestion, onGenerate, destinationId }) {
  const [contentType, setContentType] = useState(suggestion?.content_type || 'blog');
  const [platforms, setPlatforms] = useState(['facebook']);
  const [pillarId, setPillarId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [personaId, setPersonaId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pillars, setPillars] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Load pillars + templates + personas when dialog opens
  useEffect(() => {
    if (!open || !destinationId) return;
    setLoadingMeta(true);
    Promise.all([
      contentService.getPillars(destinationId).catch(() => ({ data: [] })),
      contentService.getTemplates(destinationId).catch(() => ({ data: [] })),
      import('../api/brandProfileService.js').then(m => m.default.getPersonas(destinationId)).catch(() => ({ data: [] })),
    ]).then(([pillarsRes, templatesRes, personasRes]) => {
      setPillars(pillarsRes.data || []);
      setTemplates(templatesRes.data || []);
      setPersonas(personasRes.data || []);
    }).finally(() => setLoadingMeta(false));
  }, [open, destinationId]);

  // Reset state when suggestion changes
  useEffect(() => {
    if (suggestion) {
      setContentType(suggestion.content_type || 'blog');
      setPlatforms(['facebook']);
      setPillarId('');
      setTemplateId('');
    }
  }, [suggestion]);

  // Filter templates by selected content type
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => !t.content_type || t.content_type === contentType);
  }, [templates, contentType]);

  const [genProgress, setGenProgress] = useState('');
  const [genElapsed, setGenElapsed] = useState(0);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenProgress('AI schrijft content...');
    setGenElapsed(0);
    const timer = setInterval(() => setGenElapsed(prev => prev + 1), 1000);
    try {
      const result = await contentService.generateConcept({
        suggestion_id: suggestion.id,
        destination_id: destinationId,
        content_type: contentType,
        platforms,
        pillar_id: pillarId || undefined,
        template_id: templateId || undefined,
        persona_id: personaId || undefined,
      });

      const conceptId = result?.data?.concept_id;

      if (conceptId) {
        // Async generation started — poll until concept has items
        setGenProgress('Content wordt gegenereerd op de achtergrond...');
        let attempts = 0;
        const maxAttempts = 60; // 60 × 5s = 5 minutes max
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const concept = await contentService.getConcept(conceptId);
            const cData = concept?.data || concept;
            const items = (cData?.items || []).filter(i => i.approval_status !== 'deleted');
            const status = cData?.approval_status;

            if (items.length > 0 || (status && status !== 'generating') || attempts >= maxAttempts) {
              clearInterval(pollInterval);
              clearInterval(timer);
              setGenerating(false);
              setGenProgress('');
              setGenElapsed(0);
              if (onGenerate) await onGenerate({});
              onClose();
            } else {
              const phase = attempts < 4 ? 'AI analyseert je onderwerp en schrijft content...'
                : attempts < 8 ? 'SEO-analyse en optimalisatie van tekst...'
                : attempts < 14 ? 'Vertalen naar alle beschikbare talen (NL/DE/ES/FR)...'
                : attempts < 20 ? 'Afbeeldingen selecteren en kwaliteitscontrole...'
                : attempts < 30 ? 'Bijna klaar — laatste afrondingen...'
                : 'Dit duurt langer dan verwacht — je kunt dit dialoog sluiten, het concept verschijnt automatisch in de lijst.';
              setGenProgress(phase);
            }
          } catch {
            // Poll error — keep trying
          }
        }, 5000);
      } else {
        // Fallback: old sync behavior (shouldn't happen)
        if (onGenerate) await onGenerate({});
        onClose();
      }
    } catch (err) {
      clearInterval(timer);
      setGenerating(false);
      setGenProgress('');
      setGenElapsed(0);
      throw err;
    }
  };

  const { t } = useTranslation();

  if (!suggestion) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('contentStudio.dialogs.generateContent', 'Content Genereren')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <Alert severity="info" sx={{ mb: 1 }}>
          <strong>{suggestion.title}</strong>
          <br />{suggestion.summary}
        </Alert>
        <FormControl fullWidth>
          <InputLabel>{t('contentStudio.form.contentType', 'Content Type')}</InputLabel>
          <Select value={contentType} onChange={e => setContentType(e.target.value)} label={t('contentStudio.form.contentType', 'Content Type')}>
            <MenuItem value="blog">Blog Post</MenuItem>
            <MenuItem value="social_post">Social Post</MenuItem>
            <MenuItem value="video_script">Video Script</MenuItem>
          </Select>
        </FormControl>
        {/* Platform multi-select */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('contentStudio.form.platforms', 'Platformen')}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(PLATFORM_LABELS).map(([val, lbl]) => (
              <Chip
                key={val}
                label={lbl}
                onClick={() => setPlatforms(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val])}
                color={platforms.includes(val) ? 'primary' : 'default'}
                variant={platforms.includes(val) ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        {/* Content Pillar selector */}
        <TextField
          select fullWidth size="small"
          label={t('contentStudio.form.contentPillar', 'Content Pillar')}
          value={pillarId}
          onChange={e => setPillarId(e.target.value)}
        >
          <MenuItem value="">{t('contentStudio.form.noPillar', '— Geen pillar —')}</MenuItem>
          {loadingMeta ? <MenuItem disabled>{t('contentStudio.form.loading', 'Laden...')}</MenuItem> : pillars.map(p => (
            <MenuItem key={p.id} value={p.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {p.color && <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.color, flexShrink: 0 }} />}
                {p.name}
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {/* Template selector — deduped by name */}
        <TextField
          select fullWidth size="small"
          label={t('contentStudio.form.template', 'Template')}
          value={templateId}
          onChange={e => setTemplateId(e.target.value)}
        >
          <MenuItem value="">{t('contentStudio.form.noTemplate', '— Geen template —')}</MenuItem>
          {loadingMeta ? <MenuItem disabled>{t('contentStudio.form.loading', 'Laden...')}</MenuItem> :
            // Dedup templates by name to prevent duplicates
            filteredTemplates.filter((tpl, idx, arr) => arr.findIndex(t2 => t2.name === tpl.name) === idx).map(tpl => (
              <MenuItem key={tpl.id} value={tpl.id}>{tpl.name}</MenuItem>
            ))
          }
        </TextField>

        {/* Doelgroep / Audience Persona selector */}
        {personas.length > 0 && (
          <TextField
            select fullWidth size="small"
            label={t('contentStudio.form.persona', 'Specifieke doelgroep')}
            value={personaId}
            onChange={e => setPersonaId(e.target.value)}
          >
            <MenuItem value="">{t('contentStudio.form.noPersona', '— Geen specifieke doelgroep —')}</MenuItem>
            {personas.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.is_primary ? '★ ' : ''}{p.name}{p.age_range ? ` (${p.age_range})` : ''}
              </MenuItem>
            ))}
          </TextField>
        )}
        {personas.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
              {t('contentStudio.form.personaHelper', 'Optioneel — beïnvloedt toon en inhoud van de gegenereerde content')}
            </Typography>
        )}
      </DialogContent>
      {/* Progress indicator during generation */}
      {generating && (() => {
        // Realistic ETA per content type. Blogs: multilingual (5x) + SEO scoring + improve loops + image picker.
        // Social posts: single language, short, no improve loop.
        const secPerPlatform = contentType === 'blog' ? 240 : contentType === 'video_script' ? 90 : 35;
        const etaTotal = platforms.length * secPerPlatform;
        const etaMin = Math.ceil(etaTotal / 60);
        const etaMax = Math.ceil((etaTotal * 1.5) / 60);
        const etaLabel = contentType === 'blog'
          ? `${etaMin}-${etaMax} min`
          : `${etaTotal}-${Math.round(etaTotal * 1.5)} sec`;
        const blogPhase =
          genElapsed < 30 ? 'AI schrijft de hoofdtekst...' :
          genElapsed < 90 ? 'SEO-analyse en optimalisatie...' :
          genElapsed < 180 ? 'Vertalen naar NL/DE/ES/FR...' :
          genElapsed < 270 ? 'Kwaliteitscontrole en verbetering...' :
          'Afronden — duurt wat langer dan verwacht...';
        const shortPhase =
          genElapsed < 10 ? 'AI schrijft content...' :
          genElapsed < 25 ? 'SEO-analyse en optimalisatie...' :
          genElapsed < 50 ? 'Kwaliteitscontrole en verbetering...' :
          'Afronden — duurt wat langer dan verwacht...';
        const fmt = s => s >= 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`;
        return (
          <Box sx={{ px: 3, pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <CircularProgress size={18} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {contentType === 'blog' ? blogPhase : shortPhase}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {platforms.length} {platforms.length === 1 ? 'platform' : 'platformen'} — verwacht {etaLabel}
                  {genElapsed > 0 ? ` (verstreken: ${fmt(genElapsed)})` : ''}
                </Typography>
              </Box>
            </Box>
            <LinearProgress variant="determinate"
              value={Math.min(95, (genElapsed / etaTotal) * 100)}
              sx={{ height: 4, borderRadius: 2 }} />
            {contentType === 'blog' && genElapsed > etaTotal && (
              <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                Generatie loopt door op de achtergrond — je kunt dit dialoog sluiten en later het concept openen.
              </Typography>
            )}
          </Box>
        );
      })()}
      <DialogActions>
        <Button onClick={onClose} disabled={generating}>{t('contentStudio.actions.cancel', 'Annuleren')}</Button>
        <Button onClick={handleGenerate} variant="contained" disabled={generating || platforms.length === 0} startIcon={generating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}>
          {generating ? t('contentStudio.actions.generating', 'Genereren...') : t('contentStudio.generateContent', 'Genereer Content')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// SUGGESTION DETAIL DIALOG (TO DO 3a)
// ============================================================
function SuggestionDetailDialog({ open, onClose, suggestion, onAction, onGenerate }) {
  const { t } = useTranslation();
  if (!open || !suggestion) return null;

  const keywords = Array.isArray(suggestion.keyword_cluster) ? suggestion.keyword_cluster : [];
  const channels = Array.isArray(suggestion.suggested_channels) ? suggestion.suggested_channels : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ flex: 1, mr: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{suggestion.title}</Typography>
          <StatusChip status={suggestion.status} sx={{ mt: 0.5 }} />
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Sluiten"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>{suggestion.summary}</Typography>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Content Type</Typography>
            <Typography variant="body2" fontWeight={500}>{CONTENT_TYPE_LABELS[suggestion.content_type] || suggestion.content_type}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">{t('contentStudio.engagementScore', 'Engagement Score')}</Typography>
            <Typography variant="body2" fontWeight={500}>
              <Chip label={Number(suggestion.engagement_score || 0).toFixed(1)} size="small" color={suggestion.engagement_score >= 7 ? 'success' : suggestion.engagement_score >= 4 ? 'info' : 'default'} />
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">{t('contentStudio.table.keywords', 'Keywords')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {keywords.map((kw, i) => <Chip key={i} label={kw} size="small" variant="outlined" />)}
              {keywords.length === 0 && <Typography variant="body2" color="text.secondary">{t('contentStudio.noKeywords', 'Geen keywords')}</Typography>}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">{t('contentStudio.channels', 'Aanbevolen Kanalen')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {channels.map((ch, i) => <Chip key={i} label={PLATFORM_LABELS[ch] || ch} size="small" variant="outlined" />)}
            </Box>
          </Grid>
          {suggestion.created_at && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">{t('contentStudio.info.created', 'Aangemaakt')}</Typography>
              <Typography variant="body2">{new Date(suggestion.created_at).toLocaleString('nl-NL')}</Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Box>
          {suggestion.status === 'rejected' && (
            <>
              <Tooltip title={t('contentStudio.tooltips.restorePending', 'Herstel naar pending')}>
                <Button size="small" startIcon={<RestoreIcon />} onClick={() => { onAction(suggestion.id, 'pending'); onClose(); }}>
                  {t('contentStudio.actions.restore', 'Herstel')}
                </Button>
              </Tooltip>
              <Tooltip title={t('contentStudio.tooltips.deleteForever', 'Definitief verwijderen')}>
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => { onAction(suggestion.id, 'deleted'); onClose(); }}>
                  {t('contentStudio.actions.delete', 'Verwijder')}
                </Button>
              </Tooltip>
            </>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {suggestion.status === 'pending' && (
            <>
              <Button variant="outlined" color="error" onClick={() => { onAction(suggestion.id, 'rejected'); onClose(); }} startIcon={<CloseIcon />}>
                {t('contentStudio.reject', 'Afwijzen')}
              </Button>
              <Button variant="contained" color="success" onClick={() => { onAction(suggestion.id, 'approved'); onClose(); }} startIcon={<CheckIcon />}>
                {t('contentStudio.approve', 'Goedkeuren')}
              </Button>
            </>
          )}
          {suggestion.status === 'approved' && (
            <Button variant="contained" onClick={() => { onGenerate(suggestion); onClose(); }} startIcon={<AutoAwesomeIcon />}>
              {t('contentStudio.generateContent', 'Content Genereren')}
            </Button>
          )}
          <Button onClick={onClose}>{t('contentStudio.actions.close', 'Sluiten')}</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// MANUAL CONTENT ITEM DIALOG (TO DO 4g)
// ============================================================
function ManualContentDialog({ open, onClose, destinationId, onCreated }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('blog');
  const [platforms, setPlatforms] = useState(['facebook', 'instagram']);
  const toggleManualPlatform = (p) => setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const [detectedLang, setDetectedLang] = useState(null);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setSaveProgress(t('contentStudio.manual.detectingLanguage', 'Taal detecteren...'));
    try {
      setSaveProgress(platforms.length > 1
        ? t('contentStudio.manual.creatingMulti', `${platforms.length} platform-versies aanmaken...`)
        : t('contentStudio.manual.creating', 'Content item aanmaken...'));
      const result = await contentService.generateItem({
        destination_id: destinationId,
        content_type: contentType,
        platforms,
        title: title.trim(),
        body_en: body,
        manual: true,
      });
      const lang = result?.data?.detected_language;
      if (lang && lang !== 'en') {
        setDetectedLang(lang);
        setSaveProgress(t('contentStudio.manual.languageDetected', `Taal gedetecteerd: ${lang.toUpperCase()}`));
        await new Promise(r => setTimeout(r, 800));
      }
      setTitle('');
      setBody('');
      setDetectedLang(null);
      onClose();
      if (onCreated) onCreated();
    } catch (err) {
      alert(err.message || t('contentStudio.actions.createFailed', 'Aanmaken mislukt'));
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('contentStudio.dialogs.newContentItem', 'Nieuw Content Item Aanmaken')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <Alert severity="info" sx={{ py: 0 }}>
          {t('contentStudio.manualInfo', 'Maak handmatig een content item aan zonder AI-generatie. Je kunt het later bewerken, verbeteren met AI, en publiceren.')}
        </Alert>
        <TextField label={t('contentStudio.form.title', 'Titel')} value={title} onChange={e => setTitle(e.target.value)} required fullWidth />
        <FormControl fullWidth>
          <InputLabel>{t('contentStudio.form.contentType', 'Content Type')}</InputLabel>
          <Select value={contentType} onChange={e => setContentType(e.target.value)} label={t('contentStudio.form.contentType', 'Content Type')}>
            <MenuItem value="blog">Blog Post</MenuItem>
            <MenuItem value="social_post">Social Post</MenuItem>
            <MenuItem value="video_script">Video Script</MenuItem>
          </Select>
        </FormControl>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Platforms</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Object.entries(PLATFORM_LABELS).map(([val, lbl]) => (
              <Chip key={val} label={lbl} clickable size="small"
                color={platforms.includes(val) ? 'primary' : 'default'}
                variant={platforms.includes(val) ? 'filled' : 'outlined'}
                onClick={() => toggleManualPlatform(val)}
                sx={{ fontWeight: platforms.includes(val) ? 600 : 400 }} />
            ))}
          </Box>
        </Box>
        <TextField
          label={t('contentStudio.form.bodyLabel', 'Inhoud (optioneel — kan later worden ingevuld)')}
          multiline
          rows={8}
          value={body}
          onChange={e => setBody(e.target.value)}
          fullWidth
          placeholder={t('contentStudio.form.bodyPlaceholder', 'Schrijf je content hier, of laat leeg en gebruik later de AI Verbeter functie...')}
        />
      </DialogContent>
      {saving && saveProgress && (
        <Box sx={{ px: 3, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{saveProgress}</Typography>
          </Box>
          <LinearProgress sx={{ height: 3, borderRadius: 2 }} />
        </Box>
      )}
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{t('contentStudio.actions.cancel', 'Annuleren')}</Button>
        <Button onClick={handleCreate} variant="contained" disabled={!title.trim() || platforms.length === 0 || saving} startIcon={saving ? <CircularProgress size={16} /> : <NoteAddIcon />}>
          {saving ? t('contentStudio.actions.creating', 'Aanmaken...') : t('contentStudio.actions.create', 'Aanmaken')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// SOCIAL ACCOUNTS TAB (BLOK 5)
// ============================================================
function SocialAccountsTab({ destinationId }) {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>{t('contentStudio.social.linkedAccounts', 'Gekoppelde Social Media Accounts')}</Typography>
      <SocialAccountsCards destinationId={destinationId} />
      <Alert severity="info" sx={{ mt: 2 }}>
        {t('contentStudio.social.connectInfo', 'Om een nieuw platform te koppelen, heb je een developer app nodig voor dat platform. Neem contact op met je admin voor LinkedIn, X (Twitter), Pinterest of TikTok koppelingen.')}
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
  const { t } = useTranslation();
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
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t('contentStudio.bestTime.title', 'Beste moment om te posten')}</Typography>
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
          {t('contentStudio.bestTime.noData', 'Op basis van algemene aanbevelingen (nog geen eigen data)')}
        </Typography>
      )}
    </Paper>
  );
}

// ============================================================
// APPROVAL TIMELINE (BLOK 7)
// ============================================================
const APPROVAL_STEPS = ['draft', 'in_review', 'reviewed', 'approved', 'scheduled', 'published'];
// APPROVAL_LABELS: resolved via t() in ApprovalTimeline

function ApprovalTimeline({ itemId, currentStatus }) {
  const { t } = useTranslation();
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
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('contentStudio.workflow.title', 'Workflow Status')}</Typography>
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
                {t(`contentStudio.status.${step}`, step)}
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
              {t(`contentStudio.status.${entry.new_status}`, entry.new_status)} — {entry.first_name || 'System'} — {new Date(entry.created_at).toLocaleString()}
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
// ContentImageSection is now imported from ../components/content/ContentImageSection.jsx
// Legacy embedded version removed — see import at top of file

function ContentImageSection_REMOVED({ itemId, item, onUpdate, isContentOnlyDest = false }) {
  // This function is no longer used — kept as dead code marker
  // The actual ContentImageSection is imported from components/content/ContentImageSection.jsx
  const { t } = useTranslation();
  const [images, setImages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [suggestTab, setSuggestTab] = useState(0);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaTab, setMediaTab] = useState(0);
  const [mediaSearch, setMediaSearch] = useState('');

  // Load images from all sources based on active tab + search
  useEffect(() => {
    if (!mediaPickerOpen) return;
    const apiBase = import.meta.env.VITE_API_URL || '';
    const destCode = item?.destination_id === 2 ? 'texel' : item?.destination_id === 4 ? 'warrewijzer' : 'calpe';
    const destId = item?.destination_id || 1;

    if (mediaTab === 0) {
      // Media library
      setMediaLoading(true);
      client.get('/media', { params: { limit: 50 }, headers: { 'X-Destination-ID': destCode } })
        .then(res => {
          const files = res.data?.data?.files || res.data?.data || [];
          setMediaItems(files.map(f => ({ ...f, source: 'media', url: `${apiBase}/media-files/${f.destination_id || destId}/${f.filename}`, thumbnail: `${apiBase}/media-files/${f.destination_id || destId}/${f.filename}` })));
        })
        .catch(() => setMediaItems([]))
        .finally(() => setMediaLoading(false));
    } else if (mediaTab === 1) {
      // POI images
      setMediaLoading(true);
      const searchParam = mediaSearch ? `&search=${encodeURIComponent(mediaSearch)}` : '';
      client.get(`/content/images/browse?destination_id=${destId}&limit=30${searchParam}`)
        .then(res => setMediaItems((res.data?.data || []).map(img => ({ id: img.id, source: 'poi', url: img.url, thumbnail: img.url, poi_name: img.poi_name }))))
        .catch(() => setMediaItems([]))
        .finally(() => setMediaLoading(false));
    } else if (mediaTab === 2 && mediaSearch.trim().length > 1) {
      // Pexels stock photos
      setMediaLoading(true);
      contentService.searchPexels(mediaSearch.trim())
        .then(res => {
          const photos = res.data || [];
          setMediaItems(photos.map(p => ({ id: p.id, source: 'pexels', url: p.urls?.regular || p.urls?.small, thumbnail: p.urls?.thumb || p.urls?.small, photographer: p.photographer || p.user?.name, source_link: p.url || p.links?.html })));
        })
        .catch(() => setMediaItems([]))
        .finally(() => setMediaLoading(false));
    }
  }, [mediaPickerOpen, mediaTab, mediaSearch, itemId, item?.destination_id]);

  // Load current images — resolve raw IDs to URLs
  useEffect(() => {
    if (!item) return;
    try {
      if (item.resolved_images && item.resolved_images.length > 0) {
        setImages(item.resolved_images);
      } else {
        const mediaIds = item.media_ids
          ? (typeof item.media_ids === 'string' ? JSON.parse(item.media_ids) : item.media_ids)
          : [];
        // Resolve IDs to image objects with URLs
        if (mediaIds.length > 0 && typeof mediaIds[0] !== 'object') {
          Promise.all(mediaIds.map(async (rawId) => {
            // Already a full URL (Pexels, Unsplash, etc.)
            if (typeof rawId === 'string' && rawId.startsWith('http')) {
              return { id: rawId, url: rawId, thumbnail: rawId };
            }
            // Numeric ID or poi:ID — resolve via backend
            const numId = typeof rawId === 'string' && rawId.startsWith('poi:') ? Number(rawId.replace('poi:', '')) : Number(rawId);
            if (isNaN(numId)) return { id: rawId, url: rawId, thumbnail: rawId };
            try {
              const res = await client.get(`/content/images/resolve/${numId}`);
              return res.data?.data || { id: numId, url: null };
            } catch {
              return { id: numId, url: null };
            }
          })).then(resolved => setImages(resolved)).catch(() => setImages(mediaIds));
        } else {
          setImages(mediaIds);
        }
      }
    } catch { setImages([]); }
  }, [item?.media_ids, item?.resolved_images]);

  // Auto-load suggestions when component mounts (so user always sees alternatives)
  useEffect(() => {
    if (!itemId) return;
    loadSuggestions();
  }, [itemId]);

  const currentImageIds = new Set(images.map(img => typeof img === 'object' ? img.id : img));

  const handleRemoveImage = async (mediaId) => {
    try {
      // For URL-based images (Pexels, etc.) or numeric IDs: update media_ids directly
      const updatedImages = images.filter(m => {
        const mId = typeof m === 'object' ? m.id : m;
        return mId !== mediaId;
      });
      const updatedIds = updatedImages.map(m => {
        if (typeof m === 'object' && typeof m.id === 'string' && m.id.startsWith('http')) return m.id;
        return typeof m === 'object' ? m.id : m;
      });
      await client.patch(`/content/items/${itemId}`, { media_ids: updatedIds });
      setImages(updatedImages);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Image remove failed:', err);
    }
  };

  const handleSelectImage = async (mediaId) => {
    // Replace current image (for social posts) or add (for blogs)
    const isSocial = item?.content_type === 'social_post' || item?.content_type === 'video_script';
    try {
      if (isSocial) {
        // Replace: detach all, then attach selected
        for (const img of images) {
          const id = typeof img === 'object' ? img.id : img;
          await contentService.detachImage(itemId, id);
        }
        await contentService.attachImages(itemId, [mediaId]);
      } else {
        await contentService.attachImages(itemId, [mediaId]);
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Image select failed:', err);
    }
  };

  const handleAttachImage = async (mediaId) => {
    try {
      await contentService.attachImages(itemId, [mediaId]);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Image attach failed:', err);
    }
  };

  const loadSuggestions = async (refresh = false) => {
    setSuggestLoading(true);
    try {
      // On refresh: exclude currently shown suggestion IDs to get different images
      const exclude_ids = refresh ? suggestions.map(s => s.id).filter(Boolean) : [];
      const r = await contentService.suggestImages({ content_item_id: itemId, exclude_ids });
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

  // Alternatives = suggestions not already selected
  const alternatives = suggestions.filter(img => !currentImageIds.has(img.id));

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
      {/* Selected image(s) */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">
          {t('contentStudio.images.selected', 'Geselecteerde afbeelding')}
          {images.length > 0 && <Chip label={images.length} size="small" sx={{ ml: 1, height: 18, fontSize: 11 }} />}
        </Typography>
        <Button size="small" variant="outlined" onClick={() => setMediaPickerOpen(true)} startIcon={<AddIcon />}>
          {t('contentStudio.images.addImage', 'Afbeelding zoeken')}
        </Button>
      </Box>

      {images.length > 0 ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          {images.map((imgId, idx) => {
            const src = typeof imgId === 'object' ? (imgId.url || imgId.thumbnail) : null;
            const id = typeof imgId === 'object' ? imgId.id : imgId;
            return (
              <Box key={idx} sx={{ position: 'relative', width: 140, height: 105, borderRadius: 1, overflow: 'hidden', border: '2px solid', borderColor: 'success.main' }}>
                {src && <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.background = '#e0e0e0'; e.target.style.display = 'none'; }} />}
                <Chip label={t('contentStudio.images.active', 'Actief')} size="small" color="success"
                  sx={{ position: 'absolute', bottom: 4, left: 4, height: 18, fontSize: 10 }} />
                <IconButton size="small" onClick={() => handleRemoveImage(id)}
                  sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, p: 0.3 }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {t('contentStudio.images.noImages', 'Geen afbeelding geselecteerd. Kies hieronder een image.')}
        </Alert>
      )}

      {/* Alternative images — always visible, min 3 */}
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t('contentStudio.images.alternatives', 'Kies een alternatief')}
        {suggestLoading && <CircularProgress size={14} sx={{ ml: 1 }} />}
      </Typography>

      {alternatives.length > 0 ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {alternatives.slice(0, 6).map((img, idx) => (
            <Box key={idx} sx={{ cursor: 'pointer', width: 140, textAlign: 'center' }}
              onClick={() => handleSelectImage(img.id)}>
              <Box component="img" src={img.url || img.thumbnail}
                alt={img.poi_name || img.alt_text || ''}
                sx={{ width: 140, height: 105, objectFit: 'cover', borderRadius: 1,
                  border: '2px solid transparent', transition: 'border-color 0.2s, transform 0.2s',
                  '&:hover': { borderColor: 'primary.main', transform: 'scale(1.03)' } }}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <Typography variant="caption" noWrap sx={{ display: 'block', mt: 0.3 }}>
                {img.poi_name || img.source || '—'}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : !suggestLoading ? (
        <Typography variant="caption" color="text.secondary">
          {t('contentStudio.images.noAlternatives', 'Geen alternatieven beschikbaar')}
        </Typography>
      ) : null}

      <Button size="small" onClick={() => loadSuggestions(true)} sx={{ mt: 1 }} startIcon={<RefreshIcon />} disabled={suggestLoading}>
        {t('contentStudio.images.refreshSuggestions', 'Nieuwe suggesties laden')}
      </Button>

      {/* Extended Image Dialog — Unsplash search */}
      <Dialog open={suggestOpen} onClose={() => setSuggestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('contentStudio.dialogs.addImage', 'Meer afbeeldingen zoeken')}</DialogTitle>
        <DialogContent>
          <Tabs value={suggestTab} onChange={(_, v) => setSuggestTab(v)} sx={{ mb: 2 }}>
            <Tab label={isContentOnlyDest ? t('contentStudio.images.mediaSuggestions', 'Media Suggesties') : t('contentStudio.images.suggestions', 'POI Suggesties')} />
            <Tab label={t('contentStudio.images.unsplash', 'Unsplash')} />
          </Tabs>

          {suggestTab === 0 && (
            <>
              {suggestLoading ? (
                <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
              ) : suggestions.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {suggestions.map((img, idx) => {
                    const isSelected = currentImageIds.has(img.id);
                    return (
                      <Box key={idx} sx={{ cursor: isSelected ? 'default' : 'pointer', width: 140, textAlign: 'center', opacity: isSelected ? 0.5 : 1 }}
                        onClick={() => { if (!isSelected) { handleAttachImage(img.id || img.url); setSuggestOpen(false); } }}>
                        <Box component="img" src={img.url || img.thumbnail}
                          alt={img.poi_name || img.alt_text || ''} sx={{ width: 140, height: 105, objectFit: 'cover', borderRadius: 1, border: isSelected ? '2px solid' : '2px solid transparent', borderColor: isSelected ? 'success.main' : 'transparent', '&:hover': { borderColor: isSelected ? 'success.main' : 'primary.main' } }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <Typography variant="caption" noWrap>{img.poi_name || img.source || '—'}</Typography>
                        {isSelected && <Chip label={t('contentStudio.images.active', 'Actief')} size="small" color="success" sx={{ height: 16, fontSize: 10 }} />}
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">{t('contentStudio.images.noSuggestions', 'Geen suggesties gevonden')}</Typography>
              )}
              <Button size="small" onClick={loadSuggestions} sx={{ mt: 1 }} startIcon={<RefreshIcon />}>{t('contentStudio.actions.reload', 'Opnieuw laden')}</Button>
            </>
          )}

          {suggestTab === 1 && (
            <>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField size="small" fullWidth placeholder={t('contentStudio.images.searchPlaceholder', 'Zoek stock foto\'s...')} value={unsplashQuery}
                  onChange={e => setUnsplashQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnsplashSearch()} />
                <Button variant="contained" onClick={handleUnsplashSearch} disabled={unsplashLoading}>
                  {unsplashLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                </Button>
              </Box>
              {unsplashResults.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {unsplashResults.map((img, idx) => (
                    <Box key={idx} sx={{ cursor: 'pointer', width: 140, textAlign: 'center' }}
                      onClick={() => { handleAttachImage(img.urls?.regular || img.id); setSuggestOpen(false); }}>
                      <Box component="img" src={img.urls?.thumb || img.urls?.small}
                        alt={img.alt_description || ''} sx={{ width: 140, height: 105, objectFit: 'cover', borderRadius: 1, border: '2px solid transparent', '&:hover': { borderColor: 'primary.main' } }} />
                      <Typography variant="caption" noWrap>{img.user?.name || 'Unsplash'}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuggestOpen(false)}>{t('contentStudio.actions.close', 'Sluiten')}</Button>
        </DialogActions>
      </Dialog>

      {/* Unified Image Picker Dialog — All Sources */}
      <Dialog open={mediaPickerOpen} onClose={() => setMediaPickerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('contentStudio.images.selectFromLibrary', 'Selecteer afbeelding')}</DialogTitle>
        <DialogContent>
          <Tabs value={mediaTab} onChange={(_, v) => { setMediaTab(v); setMediaSearch(''); setMediaItems([]); }} sx={{ mb: 2 }}>
            <Tab label="Media" />
            <Tab label="POI" />
            <Tab label="Pexels" />
          </Tabs>

          <TextField size="small" fullWidth
            placeholder={mediaTab === 1 ? 'Zoek POI naam...' : mediaTab === 2 ? 'Zoek stock foto\'s (Engels)...' : 'Zoek...'}
            value={mediaSearch}
            onChange={e => setMediaSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (mediaTab === 2 || mediaTab === 3)) { /* trigger external search */ setMediaItems([]); }}}
            sx={{ mb: 2 }} />

          {mediaLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : mediaItems.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', maxHeight: 400, overflowY: 'auto' }}>
              {mediaItems.map((m, idx) => (
                <Box key={m.id || idx} sx={{ cursor: 'pointer', width: 150, textAlign: 'center' }}
                  onClick={async () => {
                    if (m.source === 'unsplash' || m.source === 'pexels') {
                      // External: download to media library first, then attach
                      try {
                        const res = await client.post('/content/images/download-external', {
                          url: m.url, source: m.source, destination_id: item?.destination_id || 1,
                          photographer: m.photographer || '', source_link: m.source_link || '',
                        });
                        const savedId = res.data?.data?.id;
                        if (savedId) await handleAttachImage(savedId);
                      } catch { await handleAttachImage(m.url); }
                    } else {
                      const attachId = m.source === 'poi' ? `poi:${m.id}` : m.id;
                      await handleAttachImage(attachId);
                    }
                    setMediaPickerOpen(false);
                  }}>
                  <Box component="img" src={m.thumbnail || m.url} alt={m.alt_text || m.poi_name || ''}
                    sx={{ width: 150, height: 112, objectFit: 'cover', borderRadius: 1,
                      border: '2px solid transparent', '&:hover': { borderColor: 'primary.main', transform: 'scale(1.03)' },
                      transition: 'all 0.2s' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                  <Typography variant="caption" noWrap sx={{ display: 'block', mt: 0.3 }}>
                    {m.poi_name || m.original_name || m.photographer || m.filename || '—'}
                  </Typography>
                  {(m.source === 'unsplash' || m.source === 'pexels') && (
                    <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>{m.source}</Typography>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              {mediaTab === 2 && !mediaSearch ? 'Typ een zoekterm en druk Enter voor Pexels stock foto\'s.' : 'Geen resultaten gevonden.'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMediaPickerOpen(false)}>{t('common.close', 'Sluiten')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function ContentItemDialog({ open, onClose, itemId, onUpdate, onTranslate, isContentOnlyDest = false, defaultLanguage = 'en', supportedLanguages = [] }) {
  const { t } = useTranslation();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seoData, setSeoData] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState(null);
  const [improving, setImproving] = useState(false);
  const [improveResult, setImproveResult] = useState(null);
  const [langTab, setLangTab] = useState(defaultLanguage);
  const [editBody, setEditBody] = useState('');
  const [editTitle, setEditTitle] = useState('');
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
  // Brand score state (9.10) — live real-time check
  const [brandScore, setBrandScore] = useState(null);
  const [brandScoreLoading, setBrandScoreLoading] = useState(false);
  const brandCheckTimer = useRef(null);
  // Share to destination state (9.12)
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDestId, setShareDestId] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState(null);
  // Retry publish state (9.13)
  const [retrying, setRetrying] = useState(false);
  // Emoji picker state (9.11)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const bodyTextareaRef = useRef(null);
  const [cursorPos, setCursorPos] = useState(0);

  useEffect(() => {
    if (!itemId || !open) return;
    setLoading(true);
    contentService.getItem(itemId).then(r => {
      const data = r.data;
      setItem(data);
      setEditBody(data[`body_${defaultLanguage}`] || data.body_en || data.body_nl || '');
      setEditTitle(data.title || '');
      setLangTab(defaultLanguage);
    }).finally(() => setLoading(false));
  }, [itemId, open]);

  // Live brand voice check — debounced 1500ms after body edit
  useEffect(() => {
    if (!editBody || editBody.length < 20 || !item?.destination_id) return;
    if (brandCheckTimer.current) clearTimeout(brandCheckTimer.current);
    brandCheckTimer.current = setTimeout(async () => {
      setBrandScoreLoading(true);
      try {
        const r = await contentService.brandCheck({ text: editBody, destination_id: item.destination_id });
        setBrandScore(r.data || null);
      } catch { /* silent */ }
      finally { setBrandScoreLoading(false); }
    }, 1500);
    return () => { if (brandCheckTimer.current) clearTimeout(brandCheckTimer.current); };
  }, [editBody, item?.destination_id]);

  const loadSeo = async (platformOverride) => {
    if (!itemId) return;
    setSeoLoading(true);
    try {
      const platform = item?.content_type === 'social_post' ? (platformOverride || previewPlatform || item?.target_platform || 'instagram') : undefined;
      const r = await contentService.getItemSeo(itemId, platform);
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
    if (item) setEditBody(item[`body_${lang}`] || item.body_en || item.body_nl || '');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = { [`body_${langTab}`]: editBody };
      if (editTitle !== item?.title) updates.title = editTitle;
      await contentService.updateItem(itemId, updates);
      if (item) setItem({ ...item, [`body_${langTab}`]: editBody, ...(updates.title ? { title: editTitle } : {}) });
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
    const pos = cursorPos;
    setEditBody(prev => prev.substring(0, pos) + emoji + prev.substring(pos));
    const newPos = pos + emoji.length;
    setCursorPos(newPos);
    setEmojiPickerOpen(false);
    // Restore cursor position after React re-render
    setTimeout(() => {
      const el = bodyTextareaRef.current?.querySelector('textarea');
      if (el) {
        el.selectionStart = newPos;
        el.selectionEnd = newPos;
        el.focus();
      }
    }, 0);
  };

  if (!open) return null;

  const ALL_LANGS = ['en', 'nl', 'de', 'es', 'fr'];
  // Filter languages based on destination supportedLanguages prop
  const LANGS = (Array.isArray(supportedLanguages) && supportedLanguages.length > 0) ? ALL_LANGS.filter(l => supportedLanguages.includes(l)) : ALL_LANGS;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            variant="standard"
            fullWidth
            InputProps={{ style: { fontSize: '1.25rem', fontWeight: 600 }, disableUnderline: editTitle === item?.title }}
            placeholder="Content Item"
          />
          {item && <StatusChip status={item.approval_status} />}
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Sluiten"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : item ? (
          <Grid container spacing={2}>
            {/* Left: Editor */}
            <Grid item xs={12} md={8}>
              {/* Image Section (BLOK 2) */}
              <ContentImageSection itemId={itemId} item={item} onUpdate={onUpdate} isContentOnlyDest={isContentOnlyDest} />

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
                onChange={e => { setEditBody(e.target.value); setCursorPos(e.target.selectionStart); }}
                onSelect={e => setCursorPos(e.target.selectionStart)}
                onBlur={e => setCursorPos(e.target.selectionStart)}
                ref={bodyTextareaRef}
                variant="outlined"
                sx={{ fontFamily: 'monospace', mb: 0.5 }}
              />
              {/* Brand Voice Score — live indicator */}
              {brandScore && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Tooltip title={brandScore.feedback?.join(' | ') || brandScore.grade}>
                    <Chip
                      label={`Brand ${brandScore.brand_score}`}
                      size="small"
                      color={brandScore.brand_score >= 80 ? 'success' : brandScore.brand_score >= 60 ? 'warning' : 'error'}
                      sx={{ fontWeight: 600, fontSize: 11 }}
                    />
                  </Tooltip>
                  {brandScoreLoading && <CircularProgress size={14} />}
                  <Typography variant="caption" color="text.secondary">{brandScore.grade}</Typography>
                </Box>
              )}
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
                <Tab value="seo" label={t('contentStudio.editor.seo', 'SEO')} sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
                <Tab value="brand" label={t('contentStudio.editor.brand', 'Brand')} sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
                <Tab value="preview" label={t('contentStudio.editor.preview', 'Preview')} sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
                <Tab value="comments" label={`${t('contentStudio.editor.comments', 'Comments')}${comments.length ? ` (${comments.length})` : ''}`} sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
                <Tab value="history" label={t('contentStudio.editor.versions', 'Versies')} sx={{ minHeight: 32, py: 0, fontSize: 12 }} />
              </Tabs>

              {/* SEO Panel */}
              {rightPanel === 'seo' && (
              <>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2">
                    {item?.content_type === 'social_post' ? t('contentStudio.seoPanel.socialScore', 'Social Score') : item?.content_type === 'video_script' ? t('contentStudio.seoPanel.scriptScore', 'Script Score') : t('contentStudio.seoPanel.seoScore', 'SEO Score')}
                  </Typography>
                  {item?.content_type && item.content_type !== 'blog' && (
                    <Chip label={CONTENT_TYPE_LABELS[item.content_type] || item.content_type} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                  )}
                </Box>
                {item?.content_type === 'social_post' && (
                  <Box sx={{ mb: 0.5 }}>
                    {seoData?.platform && <Chip label={seoData.platform} size="small" color="primary" sx={{ fontSize: 10, mr: 0.5 }} />}
                    <Typography variant="caption" color="text.secondary">
                      {t('contentStudio.seoPanel.socialScoreInfo', 'Meet hashtags, CTA, emoji, openingshook en leesbaarheid (niet SEO-metrics zoals meta description).')}
                    </Typography>
                  </Box>
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
                            {t('contentStudio.seoPanel.minRequired', 'Minimum 80 vereist voor goedkeuring')}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {(seoData.checks || []).map((check, i) => (
                      <Box key={i} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                          <Typography variant="caption">{formatCheckName(check.name, t)}</Typography>
                          <Chip label={t(`contentStudio.checkStatus.${check.status}`, check.status)} size="small" color={check.status === 'pass' ? 'success' : check.status === 'warning' ? 'warning' : 'error'} sx={{ height: 18, fontSize: 10 }} />
                        </Box>
                        <LinearProgress variant="determinate" value={(check.score / check.maxScore) * 100} sx={{ height: 4, borderRadius: 2 }} />
                      </Box>
                    ))}
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Button size="small" onClick={loadSeo} startIcon={<RefreshIcon />}>{t('contentStudio.reanalyze', 'Heranalyse')}</Button>
                      {seoData.overallScore < 80 && (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={handleImprove}
                          disabled={improving}
                          startIcon={improving ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
                        >
                          {improving ? t('contentStudio.actions.improving', 'Verbeteren...') : t('contentStudio.actions.aiImprove', 'AI Verbeter')}
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
                ) : <Typography variant="body2" color="text.secondary">{t('contentStudio.form.loading', 'Laden...')}</Typography>}
              </Paper>

              {/* SEO Metadata Panel — blogs only, collapsible */}
              {item?.content_type === 'blog' && seoData?.seoSuggestions && (
              <Accordion variant="outlined" sx={{ mb: 2 }} defaultExpanded={false}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">{t('contentStudio.seoPanel.seoMetadata', 'SEO Metadata')}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">{t('contentStudio.seoPanel.metaTitle', 'Metatitel')} ({(item.seo_meta_title || seoData.seoSuggestions.meta_title || '').length}/70)</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'action.hover', p: 0.75, borderRadius: 1, fontSize: 12, wordBreak: 'break-word', userSelect: 'all', cursor: 'text' }}>
                      {item.seo_meta_title || seoData.seoSuggestions.meta_title || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">{t('contentStudio.seoPanel.metaDescription', 'Metabeschrijving')} ({(item.seo_meta_description || seoData.seoSuggestions.meta_description || '').length}/170)</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'action.hover', p: 0.75, borderRadius: 1, fontSize: 12, wordBreak: 'break-word', userSelect: 'all', cursor: 'text' }}>
                      {item.seo_meta_description || seoData.seoSuggestions.meta_description || '—'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">{t('contentStudio.seoPanel.slug', 'SEO-slug')}</Typography>
                    <Typography variant="body2" sx={{ bgcolor: 'action.hover', p: 0.75, borderRadius: 1, fontSize: 12, userSelect: 'all', cursor: 'text' }}>
                      /{item.seo_slug || seoData.seoSuggestions.slug || '—'}
                    </Typography>
                  </Box>
                  {seoData.seoSuggestions.internal_links?.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" gutterBottom>{isContentOnlyDest ? t('contentStudio.seoPanel.relatedContent', 'Gerelateerde content') : t('contentStudio.seoPanel.internalLinks', 'Interne linksuggesties')}</Typography>
                      {seoData.seoSuggestions.internal_links.map((link, i) => (
                        <Box key={i} sx={{ mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>{link.poiName || link.matchedTerm || link.text || (link.poiId ? `POI ${link.poiId}` : link.description || '—')}</Typography>
                          <Typography variant="caption" sx={{ color: 'primary.main', userSelect: 'all', cursor: 'text', wordBreak: 'break-all' }}>{link.url}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
              )}

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Info</Typography>
                <Typography variant="body2"><strong>{t('contentStudio.info.type', 'Type')}:</strong> {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}</Typography>
                <Typography variant="body2"><strong>{t('contentStudio.info.platform', 'Platform')}:</strong> {PLATFORM_LABELS[item.target_platform] || item.target_platform}</Typography>
                <Typography variant="body2"><strong>{t('contentStudio.info.aiModel', 'AI Model')}:</strong> {item.ai_model || '—'}</Typography>
                <Typography variant="body2"><strong>{t('contentStudio.info.created', 'Aangemaakt')}:</strong> {new Date(item.created_at).toLocaleDateString()}</Typography>
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
                  <Typography variant="subtitle2" gutterBottom>{t('contentStudio.brand.title', 'Brand Voice Score')}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {t('contentStudio.brand.description', 'Meet hoe goed je content aansluit bij de ingestelde brand identity van deze bestemming.')}
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
                            {brandScore.score >= 80 ? t('contentStudio.brand.excellent', 'Uitstekend — past perfect bij je merk') :
                             brandScore.score >= 60 ? t('contentStudio.brand.good', 'Goed — kleine aanpassingen mogelijk') :
                             brandScore.score >= 40 ? t('contentStudio.brand.moderate', 'Matig — tone-of-voice wijkt af') :
                             t('contentStudio.brand.poor', 'Onvoldoende — content past niet bij je merkidentiteit')}
                          </Typography>
                        </Box>
                      </Box>
                      {brandScore.tone_match !== undefined && (
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">{t('contentStudio.brand.toneMatch', 'Tone Match')}</Typography>
                            <Typography variant="caption" color="text.secondary">{Math.round(brandScore.tone_match)}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={brandScore.tone_match || 0} color={brandScore.tone_match >= 70 ? 'success' : 'warning'} sx={{ height: 6, borderRadius: 3 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            {t('contentStudio.brand.toneMatchInfo', 'Komt de schrijfstijl overeen met je gedefinieerde personality en audience?')}
                          </Typography>
                        </Box>
                      )}
                      {brandScore.vocabulary_match !== undefined && (
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">{t('contentStudio.brand.vocabulary', 'Woordenschat')}</Typography>
                            <Typography variant="caption" color="text.secondary">{Math.round(brandScore.vocabulary_match)}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={brandScore.vocabulary_match || 0} color={brandScore.vocabulary_match >= 70 ? 'success' : 'warning'} sx={{ height: 6, borderRadius: 3 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            {t('contentStudio.brand.vocabularyInfo', 'Worden je kernwoorden en gewenste bijvoeglijke naamwoorden gebruikt?')}
                          </Typography>
                        </Box>
                      )}
                      {brandScore.suggestions && brandScore.suggestions.length > 0 && (
                        <Box sx={{ mt: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="caption" fontWeight={600}>{t('contentStudio.brand.improvements', 'Verbeterpunten:')}</Typography>
                          {brandScore.suggestions.map((s, i) => (
                            <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>• {s}</Typography>
                          ))}
                        </Box>
                      )}
                      <Button size="small" onClick={loadBrandScore} startIcon={<RefreshIcon />} sx={{ mt: 1 }}>
                        {t('contentStudio.reanalyze', 'Heranalyse')}
                      </Button>
                    </>
                  ) : (
                    <Box>
                      <Button size="small" variant="outlined" onClick={loadBrandScore} disabled={brandScoreLoading}>
                        {t('contentStudio.actions.loadBrandScore', 'Brand Score Laden')}
                      </Button>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Preview Panel */}
              {rightPanel === 'preview' && (
                <PlatformPreview content={item} targetPlatform={item?.target_platform} selectedLanguage={langTab} onPlatformChange={(p) => { setPreviewPlatform(p); if (item?.content_type === 'social_post') loadSeo(p); }} />
              )}

              {/* Comments Panel */}
              {rightPanel === 'comments' && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>{t('contentStudio.comments.title', 'Team Comments')}</Typography>
                  {commentLoading ? <CircularProgress size={20} /> : (
                    <>
                      {comments.length === 0 && <Typography variant="body2" color="text.secondary">{t('contentStudio.comments.noComments', 'Geen comments.')}</Typography>}
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
                          placeholder={t('contentStudio.comments.placeholder', 'Schrijf een comment...')}
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
                  <Typography variant="subtitle2" gutterBottom>{t('contentStudio.history.title', 'Versiegeschiedenis')}</Typography>
                  {revisionLoading ? <CircularProgress size={20} /> : (
                    <>
                      {revisions.length === 0 && <Typography variant="body2" color="text.secondary">{t('contentStudio.history.noVersions', 'Geen eerdere versies.')}</Typography>}
                      {revisions.map(rev => (
                        <Box key={rev.id} sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" fontWeight={600}>v{rev.revision_number}</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(rev.created_at).toLocaleString('nl-NL')}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">{rev.change_summary || '—'}</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Button size="small" variant="outlined" onClick={() => handleRestore(rev.id)} sx={{ fontSize: 11 }}>
                              {t('contentStudio.actions.restore', 'Herstel')}
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
                    <strong>{t('contentStudio.seoPanel.seoGateWarning', {score: seoData.overallScore, defaultValue: `SEO-score te laag (${seoData.overallScore}/100) — Minimum is 80.`})}</strong>
                  </Typography>
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Tooltip title={seoData && seoData.overallScore < 80 ? t('contentStudio.tooltips.seoTooLow', {score: seoData.overallScore, defaultValue: `SEO-score ${seoData.overallScore}/100 is onder minimum (80).`}) : ''}>
                  <span>
                    <Button size="small" variant="contained" color="success" onClick={() => handleStatusUpdate('approved')} startIcon={<CheckIcon />}
                      disabled={item.approval_status === 'approved' || (seoData && seoData.overallScore < 80)}>
                      Approve
                    </Button>
                  </span>
                </Tooltip>
                <Button size="small" variant="outlined" color="error" onClick={() => handleStatusUpdate('rejected')} startIcon={<CloseIcon />} disabled={item.approval_status === 'rejected'}>
                  {t('contentStudio.reject', 'Reject')}
                </Button>
                <Button size="small" variant="outlined" color="primary" onClick={() => setRepurposeOpen(true)} startIcon={<ContentCopyIcon />} disabled={repurposing}>
                  {repurposing ? t('contentStudio.actions.repurposing', 'Bezig...') : 'Repurpose'}
                </Button>
                {['approved', 'draft', 'pending_review', 'scheduled'].includes(item.approval_status) && (
                  <Button size="small" variant="contained" color="primary" onClick={() => setPublishDialogOpen(true)} startIcon={<PublishIcon />}>
                    {t('contentStudio.actions.publishNow', 'Publiceren')}
                  </Button>
                )}
                {/* 9.13: Retry Publish for failed items */}
                {item.approval_status === 'failed' && (
                  <Button size="small" variant="contained" color="warning" onClick={handleRetryPublish} disabled={retrying} startIcon={retrying ? <CircularProgress size={14} /> : <ReplayIcon />}>
                    {retrying ? t('contentStudio.actions.retrying', 'Opnieuw...') : t('contentStudio.actions.retryPublish', 'Opnieuw Proberen')}
                  </Button>
                )}
                {/* 9.12: Share to other destination */}
                <Button size="small" variant="outlined" onClick={() => setShareDialogOpen(true)} startIcon={<ShareIcon />} disabled={sharing}>
                  {t('contentStudio.actions.share', 'Deel')}
                </Button>
              </Box>

              {/* Failed publish error info */}
              {item.approval_status === 'failed' && item.publish_error && (
                <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                  <Typography variant="caption"><strong>{t('contentStudio.publishFailed', 'Publicatie mislukt:')}</strong> {item.publish_error}</Typography>
                </Alert>
              )}

              {repurposeResult && !repurposeResult.error && (
                <Alert severity="success" sx={{ mt: 1 }} onClose={() => setRepurposeResult(null)}>
                  {repurposeResult.repurposed || repurposeResult.items?.length || 0} {t('contentStudio.repurposeCreated', 'platform-versie(s) aangemaakt')}
                </Alert>
              )}
              {repurposeResult?.error && (
                <Alert severity="error" sx={{ mt: 1 }} onClose={() => setRepurposeResult(null)}>
                  {repurposeResult.error}
                </Alert>
              )}
              {shareResult && (
                <Alert severity={shareResult.success ? 'success' : 'error'} sx={{ mt: 1 }} onClose={() => setShareResult(null)}>
                  {shareResult.success ? t('contentStudio.shareSuccess', 'Content succesvol gedeeld naar andere bestemming') : shareResult.error}
                </Alert>
              )}

              {/* Repurpose Dialog */}
              <Dialog open={repurposeOpen} onClose={() => setRepurposeOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('contentStudio.dialogs.repurpose', 'Content Repurpose')}</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {t('contentStudio.repurposeInfo', 'Selecteer platformen waarvoor een aangepaste versie gegenereerd wordt. De AI schrijft een NIEUWE versie per platform, geen copy-paste.')}
                  </Typography>
                  {['instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'youtube', 'pinterest'].map(p => (
                    <Box key={p} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox checked={repurposePlatforms.includes(p)} onChange={() => toggleRepurposePlatform(p)} disabled={p === item?.target_platform} />
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{p}{p === item?.target_platform ? ` ${t('contentStudio.repurposeSource', '(bron)')}` : ''}</Typography>
                    </Box>
                  ))}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setRepurposeOpen(false)}>{t('contentStudio.actions.cancel', 'Annuleren')}</Button>
                  <Button variant="contained" onClick={handleRepurpose} disabled={repurposing || repurposePlatforms.length === 0} startIcon={repurposing ? <CircularProgress size={16} /> : <ContentCopyIcon />}>
                    {repurposing ? t('contentStudio.actions.repurposing', 'Bezig...') : `Repurpose (${repurposePlatforms.length})`}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Publish Dialog (BLOK 4) */}
              <Dialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('contentStudio.dialogs.publish', 'Publiceren')}</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {t('contentStudio.publishInfo', 'Kies hoe je dit content item wilt publiceren naar {{platform}}.', { platform: item?.target_platform || 'het platform' })}
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
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>{t('contentStudio.publishBestTimeHint', 'Klik om in te plannen op aanbevolen tijdstip:')}</Typography>
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
                      {t('contentStudio.actions.publishNow', 'Nu Publiceren')}
                    </Button>
                    <Typography variant="overline" sx={{ textAlign: 'center' }}>{t('contentStudio.or', 'OF')}</Typography>
                    <TextField type="datetime-local" label={t('contentStudio.form.scheduleAt', 'Inplannen op')} value={scheduleDatetime} onChange={e => setScheduleDatetime(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small" />
                    <Button variant="outlined" onClick={handleSchedule} disabled={publishing || !scheduleDatetime} startIcon={<ScheduleIcon />} fullWidth>
                      {t('contentStudio.actions.schedule', 'Inplannen')}
                    </Button>
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setPublishDialogOpen(false)}>{t('contentStudio.actions.later', 'Later')}</Button>
                </DialogActions>
              </Dialog>

              {/* 9.12: Share to Destination Dialog */}
              <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('contentStudio.dialogs.shareToDestination', 'Deel naar andere bestemming')}</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {t('contentStudio.shareInfo', 'Kopieer dit content item naar een andere bestemming. De content wordt als nieuw concept aangemaakt.')}
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>{t('contentStudio.form.destination', 'Bestemming')}</InputLabel>
                    <Select value={shareDestId} onChange={e => setShareDestId(e.target.value)} label={t('contentStudio.form.destination', 'Bestemming')}>
                      {[{ id: 1, name: 'Calpe' }, { id: 2, name: 'Texel' }, { id: 4, name: 'WarreWijzer' }]
                        .filter(d => d.id !== item?.destination_id)
                        .map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setShareDialogOpen(false)}>{t('contentStudio.actions.cancel', 'Annuleren')}</Button>
                  <Button variant="contained" onClick={handleShare} disabled={!shareDestId || sharing} startIcon={sharing ? <CircularProgress size={16} /> : <ShareIcon />}>
                    {sharing ? t('contentStudio.actions.sharing', 'Delen...') : t('contentStudio.actions.share', 'Deel')}
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


const TAB_NAMES = ['overview', 'bronnen', 'suggesties', 'items', 'kalender', 'analyse', 'seizoenen', 'social'];
const TAB_INDEX = Object.fromEntries(TAB_NAMES.map((name, i) => [name, i]));

export default function ContentStudioPage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = TAB_INDEX[searchParams.get('tab')] ?? 0;
  const [tab, setTabState] = useState(tabFromUrl);
  const setTab = (newTab) => {
    setTabState(newTab);
    const name = TAB_NAMES[newTab] || 'overview';
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (name === 'overview') next.delete('tab');
      else next.set('tab', name);
      return next;
    }, { replace: false });
  };
  // Sync tab state from URL on browser back/forward
  useEffect(() => {
    const urlTab = TAB_INDEX[searchParams.get('tab')] ?? 0;
    if (urlTab !== tab) setTabState(urlTab);
  }, [searchParams]);

  const [sourceTab, setSourceTabRaw] = useState(() => {
    const hash = window.location.hash.replace('#source-', '');
    const parsed = parseInt(hash);
    return !isNaN(parsed) && parsed >= 0 && parsed <= 6 ? parsed : 0;
  });
  const setSourceTab = (v) => {
    setSourceTabRaw(v);
    const newHash = v > 0 ? '#source-' + v : '';
    if (window.location.hash !== newHash) {
      window.history.pushState({ sourceTab: v }, '', window.location.pathname + newHash);
    }
  };
  useEffect(() => {
    const onPopState = () => {
      const hash = window.location.hash.replace('#source-', '');
      const parsed = parseInt(hash);
      setSourceTabRaw(!isNaN(parsed) && parsed >= 0 && parsed <= 6 ? parsed : 0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Listen for keyboard shortcut tab navigation events
  useEffect(() => {
    const onTabNav = (e) => {
      if (typeof e.detail === 'number' && e.detail >= 0 && e.detail <= 7) {
        setTab(e.detail + 1);
      }
    };
    window.addEventListener('hb:content-studio-tab', onTabNav);
    return () => window.removeEventListener('hb:content-studio-tab', onTabNav);
  }, []);
  const [campaignGenerating, setCampaignGenerating] = useState(false);
  const [undoCampaignIds, setUndoCampaignIds] = useState(null);
  const [snackMsg, setSnackMsg] = useState(null);
  const [viewedItems, setViewedItems] = useState(new Set());
  const storeDestinations = useDestinationStore(s => s.destinations);
  const userDestId = (() => {
    if (user?.destination_id) return user.destination_id;
    const allowed = user?.allowed_destinations || [];
    if (allowed.length > 0) {
      const match = storeDestinations.find(d => allowed.includes(d.code));
      if (match) return match.id;
    }
    return 1;
  })();
  const [destinationId, setDestinationId] = useState(userDestId);

  // Destination type awareness — load from store, scoped by user role
  const allDestinations = useDestinationStore(s => s.destinations);
  const isPlatformAdmin = user?.role === 'platform_admin';
  const userAllowed = user?.allowed_destinations || [];
  const visibleDestinations = isPlatformAdmin
    ? allDestinations.filter(d => d.status === 'active')
    : allDestinations.filter(d => d.status === 'active' && userAllowed.includes(d.code));
  const currentDest = allDestinations.find(d => d.id === destinationId);
  const isContentOnlyDest = currentDest?.destinationType === 'content_only';
  const [period, setPeriod] = useState('30d');
  const [mediaSidebarOpen, setMediaSidebarOpen] = useState(false);

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
  const [trendSort, setTrendSort] = useState('score_desc');
  const [sourceFilter, setSourceFilter] = useState('');
  // Suggestions sort/filter
  const [sugSort, setSugSort] = useState('score_desc');
  const [sugTypeFilter, setSugTypeFilter] = useState('');
  const [sugStatusFilter, setSugStatusFilter] = useState('');
  // Content Items sort/filter
  const [itemSort, setItemSort] = useState('date_desc');
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [itemPlatformFilter, setItemPlatformFilter] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('');
  const [itemPillarFilter, setItemPillarFilter] = useState('');
  const [itemMinScore, setItemMinScore] = useState('');
  const [itemSourceFilter, setItemSourceFilter] = useState('');
  const [pagePillars, setPagePillars] = useState([]);
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
  const [concepts, setConcepts] = useState([]);
  const [conceptTotal, setConceptTotal] = useState(0);
  const [conceptDialogId, setConceptDialogId] = useState(null);
  const [itemError, setItemError] = useState(null);
  const [itemPage, setItemPage] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  // === Opdracht 9: Enterprise Density state ===
  const [densityMode, setDensityMode] = useState(() => localStorage.getItem('hb-table-density') || 'comfortable');
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try { const stored = localStorage.getItem('hb-table-columns'); return stored ? JSON.parse(stored) : null; } catch { return null; }
  });
  const [focusedRow, setFocusedRow] = useState(-1);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [kbdAnchor, setKbdAnchor] = useState(null);
  const tableRef = useRef(null);

  // Density config
  const DENSITY_HEIGHTS = { comfortable: 52, compact: 40, dense: 32 };
  const rowHeight = DENSITY_HEIGHTS[densityMode] || 52;

  // Column visibility
  const ALL_COLUMNS = ['title', 'source', 'platforms', 'pillar', 'seo', 'status', 'updated', 'actions'];
  const COLUMN_LABELS = { title: 'Titel', source: 'Bron', platforms: 'Platforms', pillar: 'Pillar', seo: 'SEO', status: 'Status', updated: 'Bijgewerkt', actions: 'Acties' };
  const activeColumns = visibleColumns || ALL_COLUMNS;

  // Persist density
  useEffect(() => { localStorage.setItem('hb-table-density', densityMode); }, [densityMode]);
  useEffect(() => { if (visibleColumns) localStorage.setItem('hb-table-columns', JSON.stringify(visibleColumns)); }, [visibleColumns]);

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
      setTrendError(err.message || t('contentStudio.errorLoadingTrends', 'Fout bij laden trends'));
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
      setSugError(err.message || t('contentStudio.errorLoadingSuggestions', 'Fout bij laden suggesties'));
    } finally {
      setSugLoading(false);
    }
  }, [destinationId, sugPage]);

  // === Content Items loaders ===
  const loadItems = useCallback(async () => {
    setItemLoading(true);
    setItemError(null);
    try {
      // Load concepts (grouped view) instead of flat items
      const result = await contentService.getConcepts(destinationId, { limit: 25, offset: itemPage * 25 });
      setConcepts(result.data || []);
      setConceptTotal(result.meta?.total || 0);
      // Also load flat items for backward compat (filters, etc.)
      const itemResult = await contentService.getItems(destinationId, { limit: 100, offset: 0 });
      setItems(itemResult.data?.items || []);
      setItemTotal(itemResult.data?.total || 0);
    } catch (err) {
      setItemError(err.message || t('contentStudio.errorLoadingItems', 'Fout bij laden content items'));
    } finally {
      setItemLoading(false);
    }
  }, [destinationId, itemPage]);

  // Load data based on active tab
  useEffect(() => {
    if (tab === 1) { loadTrends(); loadSummary(); }
    else if (tab === 2) { loadSuggestions(); }
    else if (tab === 3) { loadItems(); }
  }, [tab, loadTrends, loadSummary, loadSuggestions, loadItems]);


  // === Opdracht 9: Keyboard navigation for Content Items ===
  useEffect(() => {
    if (tab !== 3) return;
    const filteredConcepts = concepts
      .filter(c => c.approval_status !== 'deleted')
      .filter(c => !itemTypeFilter || c.content_type === itemTypeFilter)
      .filter(c => !itemPlatformFilter || c.platforms?.includes(itemPlatformFilter))
      .filter(c => !itemStatusFilter || c.approval_status === itemStatusFilter)
      .filter(c => !itemPillarFilter || c.pillar_id === itemPillarFilter)
      .filter(c => !itemMinScore || (c.avg_seo_score != null && Number(c.avg_seo_score) >= Number(itemMinScore)))
      .filter(c => !itemSourceFilter || (c.content_source_type || 'manual') === itemSourceFilter);

    const handleKeyDown = (e) => {
      // Skip if user is typing in an input/textarea or inline editing
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable || inlineEditId) return;

      const maxIdx = filteredConcepts.length - 1;
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setFocusedRow(prev => prev < 0 ? 0 : Math.min(prev + 1, maxIdx));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setFocusedRow(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (focusedRow >= 0 && focusedRow <= maxIdx) {
            setConceptDialogId(filteredConcepts[focusedRow].id);
          }
          break;
        case 'x':
          if (focusedRow >= 0 && focusedRow <= maxIdx) {
            const c = filteredConcepts[focusedRow];
            const firstItemId = (c.platform_versions || []).filter(v => v.status !== 'deleted')[0]?.id;
            if (firstItemId) toggleSelectItem(firstItemId);
          }
          break;
        case 'A':
          if (e.shiftKey) {
            e.preventDefault();
            const allIds = filteredConcepts.map(c => (c.platform_versions || []).filter(v => v.status !== 'deleted')[0]?.id).filter(Boolean);
            setSelectedIds(allIds);
          }
          break;
        case 'X':
          if (e.shiftKey) {
            e.preventDefault();
            setSelectedIds([]);
          }
          break;
        case 'a':
          if (!e.ctrlKey && !e.metaKey && selectedIds.length > 0) {
            e.preventDefault();
            handleBulkAction('approve');
          }
          break;
        case 'p':
          if (!e.ctrlKey && !e.metaKey && selectedIds.length > 0) {
            e.preventDefault();
            handleBulkPublish();
          }
          break;
        case 'd':
          if (!e.ctrlKey && !e.metaKey && selectedIds.length > 0) {
            e.preventDefault();
            handleBulkAction('draft');
          }
          break;
        case 'Delete':
          if (selectedIds.length > 0) {
            e.preventDefault();
            handleBulkAction('delete');
          }
          break;
        case '/':
          e.preventDefault();
          // Focus search — future: focus the search field if one is added
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            // Focus filter — future: focus the filter bar
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tab, concepts, focusedRow, selectedIds, inlineEditId, itemTypeFilter, itemPlatformFilter, itemStatusFilter, itemPillarFilter, itemMinScore, itemSourceFilter]);

  // Inline edit save handler
  const handleInlineEditSave = useCallback(async (conceptId) => {
    if (!inlineEditValue.trim()) { setInlineEditId(null); return; }
    try {
      await contentService.updateConcept(conceptId, { title: inlineEditValue.trim() });
      loadItems();
    } catch (err) {
      console.error('Inline edit failed:', err);
    }
    setInlineEditId(null);
  }, [inlineEditValue, loadItems]);

  // Load pillars for filter (Opdracht 6)
  useEffect(() => {
    if (!destinationId) return;
    contentService.getPillars(destinationId)
      .then(r => setPagePillars(r.data || []))
      .catch(() => setPagePillars([]));
  }, [destinationId]);

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
      setSugError(err.message || t('contentStudio.errorGeneratingSuggestions', 'Fout bij genereren suggesties'));
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

  // Opdracht 7-D: batch approve voor suggesties
  const [selectedSugIds, setSelectedSugIds] = useState([]);
  const [sugBulkLoading, setSugBulkLoading] = useState(false);
  const toggleSugSelect = (id) => {
    setSelectedSugIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSugSelectAll = (filteredIds) => {
    if (selectedSugIds.length === filteredIds.length && filteredIds.every(id => selectedSugIds.includes(id))) {
      setSelectedSugIds([]);
    } else {
      setSelectedSugIds(filteredIds);
    }
  };
  const handleSugBulkStatus = async (newStatus) => {
    if (selectedSugIds.length === 0) return;
    if (newStatus === 'rejected' && !window.confirm(t('contentStudio.confirmBulkReject', '{{count}} suggesties afwijzen?', { count: selectedSugIds.length }))) return;
    setSugBulkLoading(true);
    let ok = 0, fail = 0;
    for (const id of selectedSugIds) {
      try { await contentService.updateSuggestion(id, { status: newStatus }); ok++; } catch { fail++; }
    }
    setSnackMsg(t('contentStudio.bulkResultGeneric', '{{ok}} verwerkt, {{fail}} mislukt', { ok, fail }));
    setSelectedSugIds([]);
    setSugBulkLoading(false);
    loadSuggestions();
  };

  // Opdracht 7-E: enrich a single suggestion
  const [enrichingSugId, setEnrichingSugId] = useState(null);
  const handleEnrichSuggestion = async (id) => {
    setEnrichingSugId(id);
    try {
      await contentService.enrichSuggestion(id);
      setSnackMsg(t('contentStudio.enriched', 'Suggestie verrijkt met merk- en trending context'));
      loadSuggestions();
    } catch (err) {
      setSnackMsg(t('contentStudio.enrichFailed', 'Verrijken mislukt: {{msg}}', { msg: err?.response?.data?.error?.message || err.message }));
    } finally {
      setEnrichingSugId(null);
    }
  };

  const handleGenerateContent = async (data) => {
    try {
      await contentService.generateItem(data);
      loadSuggestions();
      loadItems();
    } catch (err) {
      setSugError(err.message || t('contentStudio.errorGeneratingContent', 'Fout bij genereren content'));
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm(t('contentStudio.confirmDelete', 'Weet je zeker dat je dit item wilt verwijderen?'))) return;
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
        if (!window.confirm(t('contentStudio.confirmBulkDelete', '{{count}} items verwijderen?', { count: selectedIds.length }))) { setBulkLoading(false); return; }
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

  // Opdracht 6: Bulk publish — publishes all platform versions for selected concepts
  const handleBulkPublish = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(t('contentStudio.confirmBulkPublish', '{{count}} concepten direct publiceren?', { count: selectedIds.length }))) return;
    setBulkLoading(true);
    let success = 0, failed = 0;
    try {
      // selectedIds bevat firstItemId per concept; haal het concept op om alle platform versies te publiceren
      const conceptIds = concepts.filter(c => c.platform_versions?.some(v => selectedIds.includes(v.id))).map(c => c.id);
      for (const cid of conceptIds) {
        const concept = concepts.find(c => c.id === cid);
        const versions = (concept?.platform_versions || []).filter(v => v.status !== 'published' && v.status !== 'deleted');
        for (const v of versions) {
          try { await contentService.publishNow(v.id, { platform: v.platform }); success++; }
          catch { failed++; }
        }
      }
      setSnackMsg(t('contentStudio.bulkPublishResult', '{{ok}} gepubliceerd, {{fail}} mislukt', { ok: success, fail: failed }));
      setSelectedIds([]);
      loadItems();
    } catch (err) {
      setItemError(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Opdracht 6: Bulk schedule
  const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);
  const [bulkScheduleAt, setBulkScheduleAt] = useState('');
  const handleBulkScheduleOpen = () => { setBulkScheduleAt(''); setBulkScheduleOpen(true); };
  const handleBulkScheduleConfirm = async () => {
    if (!bulkScheduleAt || selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      // Verzamel alle item IDs van geselecteerde concepten (niet gepubliceerd)
      const itemIds = [];
      const conceptIds = concepts.filter(c => c.platform_versions?.some(v => selectedIds.includes(v.id))).map(c => c.id);
      for (const cid of conceptIds) {
        const concept = concepts.find(c => c.id === cid);
        (concept?.platform_versions || [])
          .filter(v => v.status !== 'published' && v.status !== 'deleted')
          .forEach(v => itemIds.push(v.id));
      }
      await contentService.bulkSchedule(itemIds, bulkScheduleAt);
      setSnackMsg(t('contentStudio.bulkScheduleDone', '{{count}} items ingepland', { count: itemIds.length }));
      setBulkScheduleOpen(false);
      setSelectedIds([]);
      loadItems();
    } catch (err) {
      setItemError(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Opdracht 6: Bulk export naar CSV
  const handleBulkExport = () => {
    const conceptIds = concepts.filter(c => c.platform_versions?.some(v => selectedIds.includes(v.id))).map(c => c.id);
    const rows = concepts.filter(c => conceptIds.includes(c.id));
    const header = ['ID', 'Titel', 'Type', 'Platforms', 'Score', 'Pillar', 'Status', 'Created'];
    const csv = [
      header.join(','),
      ...rows.map(c => [
        c.id,
        `"${(c.title || '').replace(/"/g, '""')}"`,
        c.content_type || '',
        (c.platforms || []).join(';'),
        c.avg_seo_score != null ? Math.round(Number(c.avg_seo_score)) : '',
        c.pillar_name || '',
        c.approval_status || '',
        c.created_at || '',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-concepts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          {t('contentStudio.title', 'Content Studio')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {visibleDestinations.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select value={destinationId} onChange={e => { setDestinationId(e.target.value); setTrendPage(0); setSugPage(0); setItemPage(0); }}>
                {visibleDestinations.map(d => (
                  <MenuItem key={d.id} value={d.id}>{d.name}{d.destinationType === 'content_only' ? ' (CS)' : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {tab === 1 && (
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <Select value={period} onChange={e => { setPeriod(e.target.value); setTrendPage(0); }}>
                {PERIOD_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          )}

        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        <Tab label={t('contentStudio.tabs.overview', 'Overview')} icon={<DashboardIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={t('contentStudio.tabs.trending', 'Bronnen')} />
        <Tab label={t('contentStudio.tabs.suggestions', 'Ideeën')} />
        <Tab label={t('contentStudio.tabs.content', 'Items')} />
        <Tab label={t('contentStudio.tabs.calendar', 'Kalender')} icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={t('contentStudio.tabs.analyse', 'Analyse')} sx={{ display: 'none' }} />
        <Tab label={t('contentStudio.tabs.seasons', 'Seizoenen')} />
        <Tab label={t('contentStudio.tabs.socialAccounts', 'Social Accounts')} />
      </Tabs>


      {/* === TAB 1: Overview === */}
      {tab === 0 && (
        <ContentStudioOverview destinationId={destinationId} onNavigateTab={(tabIdx, subTab) => { setTab(tabIdx + 1); if (subTab !== undefined) { setTimeout(() => setSourceTab(subTab), 100); } }} />
      )}

      {/* === TAB 2: Content Bronnen (sub-tabs) === */}
      {tab === 1 && (
        <>
          {/* Sub-tab navigation */}
          <Tabs value={sourceTab} onChange={(_, v) => setSourceTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }} variant="scrollable" scrollButtons="auto">
            <Tab label={t('contentStudio.sources.overview', 'Overzicht')} sx={{ minHeight: 36, py: 0.5, fontSize: 13 }} />
            <Tab label={t('contentStudio.sources.keywords', 'Zoektermen')} sx={{ minHeight: 36, py: 0.5, fontSize: 13 }} />
            <Tab label={t('contentStudio.sources.visuals', 'Visuele Trends')} sx={{ minHeight: 36, py: 0.5, fontSize: 13 }} />
            <Tab label={t('contentStudio.sources.pois', 'POI Inspiratie')} sx={{ minHeight: 36, py: 0.5, fontSize: 13 }} />
            <Tab label={t('contentStudio.sources.events', 'Agenda Inspiratie')} sx={{ minHeight: 36, py: 0.5, fontSize: 13 }} />
            <Tab label={t('contentStudio.sources.holibot', 'HoliBot Insights')} sx={{ minHeight: 36, py: 0.5, fontSize: 13 }} />
            <Tab label={t('contentStudio.sources.gsc', 'Zoekintentie')} sx={{ minHeight: 36, py: 0.5, fontSize: 13 }} />
          </Tabs>

          {/* Sub-tab 0: Overzicht */}
          {sourceTab === 0 && <ContentSourcesOverviewTab destinationId={destinationId} onNavigateToTab={(tabIdx) => setSourceTab(tabIdx)} onEditConcept={(conceptId) => setConceptDialogId(conceptId)} />}

          {/* Sub-tab 1: Zoektermen (was 0) */}
          {sourceTab === 1 && <>
          <SummaryCards summary={summary} loading={summaryLoading} />

          {/* Filters row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>{t('contentStudio.filter.market', 'Markt:')}</Typography>
            <ToggleButtonGroup size="small" value={marketFilter} exclusive onChange={(_, v) => { if (v) { setMarketFilter(v); setTrendPage(0); } }}>
              {MARKET_OPTIONS.map(m => <ToggleButton key={m} value={m} sx={{ py: 0.3, px: 1, fontSize: 11 }}>{m}</ToggleButton>)}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mr: 0.5 }}>{t('contentStudio.filter.language', 'Taal:')}</Typography>
            <ToggleButtonGroup size="small" value={langFilter} exclusive onChange={(_, v) => { if (v) { setLangFilter(v); setTrendPage(0); } }}>
              {LANG_OPTIONS.map(l => <ToggleButton key={l} value={l} sx={{ py: 0.3, px: 1, fontSize: 11 }}>{l === 'ALL' ? 'ALL' : l.toUpperCase()}</ToggleButton>)}
            </ToggleButtonGroup>
            <Box sx={{ flex: 1 }} />
            <ToggleButtonGroup size="small" value={trendView} exclusive onChange={(_, v) => { if (v) setTrendView(v); }}>
              <ToggleButton value="table"><Tooltip title={t('contentStudio.tooltips.table', 'Tabel')}><TableChartIcon fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="chart"><Tooltip title={t('contentStudio.tooltips.trendChart', 'Trendgrafiek')}><BarChartIcon fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="cloud"><Tooltip title={t('contentStudio.tooltips.wordCloud', 'Word Cloud')}><CloudIcon fontSize="small" /></Tooltip></ToggleButton>
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
                {trendTotal} {t('contentStudio.keywordsFound', 'keywords gevonden')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title={t('contentStudio.tooltips.refresh', 'Vernieuwen')}>
                  <IconButton size="small" onClick={() => { loadTrends(); loadSummary(); }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('contentStudio.tooltips.addKeyword', 'Voeg handmatig een trending keyword toe aan de monitor. Gebruik dit voor branche-specifieke termen die niet automatisch worden opgepikt.')} arrow>
                  <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
                    {t('contentStudio.actions.addKeyword', 'Keyword')}
                  </Button>
                </Tooltip>
              </Box>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ cursor: 'pointer' }} onClick={() => setTrendSort(s => s === 'keyword_asc' ? 'keyword_desc' : 'keyword_asc')}>{t('contentStudio.table.keyword', 'Keyword')} {trendSort.startsWith('keyword') ? (trendSort === 'keyword_asc' ? '↑' : '↓') : ''}</TableCell>
                    <TableCell sx={{ cursor: 'pointer' }} onClick={() => setTrendSort(s => s === 'score_desc' ? 'score_asc' : 'score_desc')}>{t('contentStudio.table.score', 'Score')} {trendSort.startsWith('score') ? (trendSort === 'score_asc' ? '↑' : '↓') : ''}</TableCell>
                    <TableCell sx={{ cursor: 'pointer' }} onClick={() => setTrendSort(s => s === 'trend_desc' ? 'trend_asc' : 'trend_desc')}>
                      <Tooltip title={t('contentStudio.table.trendTooltip', 'Sparkline met de relevance score per week (laatste 4 weken). Klik om te sorteren op de meest recente week.')}>
                        <span>{t('contentStudio.table.trend', 'Trend')} {trendSort.startsWith('trend') ? (trendSort === 'trend_asc' ? '↑' : '↓') : ''}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{t('contentStudio.table.direction', 'Richting')}</TableCell>
                    <TableCell sx={{ cursor: 'pointer' }} onClick={() => setTrendSort(s => s === 'volume_desc' ? 'volume_asc' : 'volume_desc')}>{t('contentStudio.table.volume', 'Volume')} {trendSort.startsWith('volume') ? (trendSort === 'volume_asc' ? '↑' : '↓') : ''}</TableCell>
                    <TableCell>{t('contentStudio.table.language', 'Taal')}</TableCell>
                    <TableCell>{t('contentStudio.table.market', 'Markt')}</TableCell>
                    <TableCell>
                      <Select size="small" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} displayEmpty variant="standard" sx={{ fontSize: 12, minWidth: 60 }}>
                        <MenuItem value="">{t('contentStudio.table.source', 'Bron')}</MenuItem>
                        {[...new Set(trends.map(t => t.source).filter(Boolean))].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ cursor: 'pointer' }} onClick={() => setTrendSort(s => s === 'week_desc' ? 'week_asc' : 'week_desc')}>{t('contentStudio.table.week', 'Week')} {trendSort.startsWith('week') ? (trendSort === 'week_asc' ? '↑' : '↓') : ''}</TableCell>
                    <TableCell width={40}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trendLoading ? (
                    [1, 2, 3].map(i => (
                      <TableRow key={i}>
                        <TableCell colSpan={11}><Skeleton variant="text" /></TableCell>
                      </TableRow>
                    ))
                  ) : trends.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary" sx={{ mb: 0.5 }}>{t('contentStudio.noTrending', 'Geen trending keywords gevonden voor deze periode.')}</Typography>
                        <Typography variant="caption" color="text.disabled">{t('contentStudio.noTrendingHint', 'Voeg trending keywords toe of wacht op de wekelijkse automatische scan')}</Typography>
                      </TableCell>
                    </TableRow>
                  ) : [...trends]
                    .filter(t => !sourceFilter || t.source === sourceFilter)
                    .sort((a, b) => {
                      if (trendSort === 'keyword_asc') return (a.keyword || '').localeCompare(b.keyword || '');
                      if (trendSort === 'keyword_desc') return (b.keyword || '').localeCompare(a.keyword || '');
                      if (trendSort === 'score_asc') return (Number(a.relevance_score) || 0) - (Number(b.relevance_score) || 0);
                      if (trendSort === 'score_desc') return (Number(b.relevance_score) || 0) - (Number(a.relevance_score) || 0);
                      if (trendSort === 'volume_asc') return (Number(a.search_volume) || 0) - (Number(b.search_volume) || 0);
                      if (trendSort === 'volume_desc') return (Number(b.search_volume) || 0) - (Number(a.search_volume) || 0);
                      if (trendSort === 'week_asc') return (Number(a.week_number) || 0) - (Number(b.week_number) || 0);
                      if (trendSort === 'week_desc') return (Number(b.week_number) || 0) - (Number(a.week_number) || 0);
                      if (trendSort === 'trend_asc') return latestHistoryValue(a.history) - latestHistoryValue(b.history);
                      if (trendSort === 'trend_desc') return latestHistoryValue(b.history) - latestHistoryValue(a.history);
                      return 0;
                    })
                    .map((trend, idx) => (
                    <TableRow key={trend.id || idx} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <span>{trend.keyword}</span>
                          {(() => {
                            const matched = findMatchingPillar(trend.keyword, pagePillars);
                            return matched ? (
                              <Tooltip title={t('contentStudio.matchesPillar', 'Past bij pillar: {{name}}', { name: matched.name })}>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 0.6, py: 0.1, borderRadius: 1, bgcolor: `${matched.color || '#999'}1A`, border: `1px solid ${matched.color || '#999'}` }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: matched.color || '#999' }} />
                                  <Typography variant="caption" sx={{ fontSize: 9, fontWeight: 600, color: matched.color || '#666' }}>{matched.name}</Typography>
                                </Box>
                              </Tooltip>
                            ) : null;
                          })()}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={trend.relevance_score != null ? Number(trend.relevance_score).toFixed(1) : '—'}
                          size="small"
                          color={getScoreColor(trend.relevance_score).mui}
                          sx={{ fontWeight: 600, minWidth: 38 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={Array.isArray(trend.history) && trend.history.length > 0
                          ? `Laatste ${trend.history.length} ${trend.history.length === 1 ? 'week' : 'weken'}: ${trend.history.map((v, i) => `${(trend.history_weeks?.[i] != null ? 'W' + trend.history_weeks[i] + ' ' : '')}${Number(v).toFixed(1)}`).join(' → ')}`
                          : t('contentStudio.noHistory', 'Geen historische data — er is maar 1 datapunt of nog geen wekelijkse scan uitgevoerd')}>
                          <Box sx={{ display: 'inline-flex' }}>
                            <Sparkline data={trend.history} weeks={trend.history_weeks} />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell><DirectionChip direction={trend.trend_direction} /></TableCell>
                      <TableCell>{trend.search_volume?.toLocaleString() || '—'}</TableCell>
                      <TableCell>{trend.language?.toUpperCase() || '—'}</TableCell>
                      <TableCell>{trend.market || '—'}</TableCell>
                      <TableCell>
                        {(() => {
                          const meta = getSourceMeta(trend.source);
                          const Icon = meta.Icon;
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Tooltip title={meta.label}>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 0.6, py: 0.2, borderRadius: 1, border: `1px solid ${meta.color}`, bgcolor: `${meta.color}14` }}>
                                  <Icon sx={{ fontSize: 13, color: meta.color }} />
                                  <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: meta.color }}>{meta.label}</Typography>
                                </Box>
                              </Tooltip>
                              {trend.source_url && (
                                <Tooltip title={trend.source_url}>
                                  <IconButton size="small" component="a" href={trend.source_url} target="_blank" rel="noopener noreferrer" sx={{ p: 0.3 }}>
                                    <LinkIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          );
                        })()}
                      </TableCell>
                      <TableCell>{trend.week_number ? `W${trend.week_number}` : '—'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={t('contentStudio.actions.generateFromTrend', 'Genereer content')}>
                            <IconButton size="small" color="primary" onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                // Create a suggestion from this trend, then open generate dialog
                                const sugRes = await contentService.createSuggestion({
                                  destination_id: destinationId,
                                  title: trend.keyword,
                                  summary: `Content gebaseerd op trending keyword "${trend.keyword}" (score: ${trend.relevance_score}, bron: ${trend.source})`,
                                  content_type: 'social_post',
                                  keyword_cluster: [trend.keyword],
                                  engagement_score: trend.relevance_score || 5,
                                });
                                const newSugId = sugRes?.data?.id;
                                if (newSugId) {
                                  setGenerateDialogSuggestion({ id: newSugId, title: trend.keyword, keyword_cluster: [trend.keyword], content_type: 'social_post' });
                                }
                              } catch (err) { console.error('Generate from trend failed:', err); }
                            }}>
                              <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <IconButton size="small" color="error" aria-label="Verwijderen" onClick={async (e) => { e.stopPropagation(); try { await contentService.deleteTrending(trend.id); loadTrends(); } catch {} }}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      </TableCell>
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
              labelRowsPerPage={t('contentStudio.rowsPerPage', 'Rijen per pagina')}
            />
          </Paper>
          </>}

          {/* Sub-tab 2: Visuele Trends */}
          {sourceTab === 2 && <VisualTrendsTab destinationId={destinationId} />}

          {/* Sub-tab 3: POI Inspiratie */}
          {sourceTab === 3 && <POIInspirationTab destinationId={destinationId} onNavigateToContent={(tabIdx) => { setSourceTab(0); setTab(tabIdx); }} />}

          {/* Sub-tab 4: Agenda Inspiratie */}
          {sourceTab === 4 && <AgendaInspirationTab destinationId={destinationId} onNavigateToContent={(tabIdx) => { setSourceTab(0); setTab(tabIdx); }} />}

          {/* Sub-tab 5: HoliBot Insights */}
          {sourceTab === 5 && <HolibotInsightsTab destinationId={destinationId} onNavigateToContent={(tabIdx) => { setSourceTab(0); setTab(tabIdx); }} />}

          {/* Sub-tab 6: Zoekintentie (GSC) */}
          {sourceTab === 6 && <SearchIntentTab destinationId={destinationId} />}
        </>
      )}

      {/* === TAB 2: Content Ideeën === */}
      {tab === 2 && (
        <>
          {sugError && <Alert severity="error" sx={{ mb: 2 }}>{sugError}</Alert>}
          <Paper variant="outlined">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {sugTotal} {t('contentStudio.suggestionsFound', 'suggesties')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title={t('contentStudio.tooltips.refresh', 'Vernieuwen')}>
                  <IconButton size="small" onClick={loadSuggestions}><RefreshIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title={t('contentStudio.tooltips.generateSuggestions', 'AI analyseert trending topics, merkprofiel en seizoensconfiguratie, en genereert content suggesties. Goedgekeurde suggesties kun je omzetten naar content items.')} arrow>
                  <span>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={sugGenerating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                    onClick={handleGenerateSuggestions}
                    disabled={sugGenerating}
                  >
                    {sugGenerating ? t('contentStudio.actions.generating', 'Genereren...') : t('contentStudio.generateSuggestions', 'Genereer Suggesties')}
                  </Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>
            {/* Opdracht 7-D: Bulk toolbar voor suggesties */}
            {selectedSugIds.length > 0 && (
              <Box sx={{
                position: 'sticky', top: 0, zIndex: 5,
                display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center',
                px: 2, py: 1.5, mb: 1,
                bgcolor: 'primary.50', borderTop: 2, borderBottom: 2, borderColor: 'primary.main',
                // Opdracht 5 micro-interactie #5: slide-in van boven
                animation: 'hbSlideDown 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                '@keyframes hbSlideDown': {
                  from: { transform: 'translateY(-100%)', opacity: 0 },
                  to: { transform: 'translateY(0)', opacity: 1 },
                },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}>
                <Chip label={`${selectedSugIds.length} ${t('contentStudio.selected', 'geselecteerd')}`} color="primary" sx={{ fontWeight: 600 }} />
                <Box sx={{ flex: 1 }} />
                <Button size="small" variant="contained" color="success" startIcon={<CheckIcon />} onClick={() => handleSugBulkStatus('approved')} disabled={sugBulkLoading}>{t('contentStudio.bulkApprove', 'Goedkeuren')}</Button>
                <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />} onClick={() => handleSugBulkStatus('rejected')} disabled={sugBulkLoading}>{t('contentStudio.reject', 'Afwijzen')}</Button>
                <Button size="small" onClick={() => setSelectedSugIds([])}>{t('contentStudio.clearSelection', 'Wis selectie')}</Button>
              </Box>
            )}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      {(() => {
                        const filtered = suggestions
                          .filter(s => !sugTypeFilter || s.content_type === sugTypeFilter)
                          .filter(s => !sugStatusFilter || s.status === sugStatusFilter)
                          .map(s => s.id);
                        const allChecked = filtered.length > 0 && filtered.every(id => selectedSugIds.includes(id));
                        const someChecked = filtered.some(id => selectedSugIds.includes(id));
                        return (
                          <Checkbox size="small" checked={allChecked} indeterminate={!allChecked && someChecked} onChange={() => toggleSugSelectAll(filtered)} />
                        );
                      })()}
                    </TableCell>
                    <TableCell sx={{ cursor: 'pointer' }} onClick={() => setSugSort(s => s === 'title_asc' ? 'title_desc' : 'title_asc')}>{t('contentStudio.table.title', 'Titel')} {sugSort.startsWith('title') ? (sugSort === 'title_asc' ? '↑' : '↓') : ''}</TableCell>
                    <TableCell>
                      <Select size="small" value={itemSourceFilter} onChange={e => setItemSourceFilter(e.target.value)} displayEmpty variant="standard" sx={{ fontSize: 12, minWidth: 60 }}>
                        <MenuItem value="">Bron</MenuItem>
                        <MenuItem value="poi">📍 POI</MenuItem>
                        <MenuItem value="event">📅 Event</MenuItem>
                        <MenuItem value="visual">📷 Visual</MenuItem>
                        <MenuItem value="holibot">💬 HoliBot</MenuItem>
                        <MenuItem value="keyword">🔍 Keyword</MenuItem>
                        <MenuItem value="recycle">♻️ Recycle</MenuItem>
                        <MenuItem value="manual">✏️ Handmatig</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select size="small" value={sugTypeFilter} onChange={e => setSugTypeFilter(e.target.value)} displayEmpty variant="standard" sx={{ fontSize: 12, minWidth: 60 }}>
                        <MenuItem value="">{t('contentStudio.table.type', 'Type')}</MenuItem>
                        <MenuItem value="blog">Blog</MenuItem>
                        <MenuItem value="social_post">Social</MenuItem>
                        <MenuItem value="video_script">Video</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell sx={{ cursor: 'pointer' }} onClick={() => setSugSort(s => s === 'score_desc' ? 'score_asc' : 'score_desc')}>{t('contentStudio.table.score', 'Score')} {sugSort.startsWith('score') ? (sugSort === 'score_asc' ? '↑' : '↓') : ''}</TableCell>
                    <TableCell>{t('contentStudio.table.keywords', 'Keywords')}</TableCell>
                    <TableCell>{t('contentStudio.table.channels', 'Kanalen')}</TableCell>
                    <TableCell>
                      <Select size="small" value={sugStatusFilter} onChange={e => setSugStatusFilter(e.target.value)} displayEmpty variant="standard" sx={{ fontSize: 12, minWidth: 70 }}>
                        <MenuItem value="">{t('contentStudio.table.status', 'Status')}</MenuItem>
                        <MenuItem value="pending">In afwachting</MenuItem>
                        <MenuItem value="approved">Goedgekeurd</MenuItem>
                        <MenuItem value="rejected">Afgewezen</MenuItem>
                        <MenuItem value="generated">Gegenereerd</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell align="right">{t('contentStudio.table.actions', 'Acties')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sugLoading ? (
                    [1, 2, 3].map(i => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}><Skeleton variant="text" /></TableCell>
                      </TableRow>
                    ))
                  ) : suggestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary" sx={{ mb: 1 }}>{t('contentStudio.noSuggestions', 'Geen suggesties. Klik op "Genereer Suggesties" om AI suggesties te maken.')}</Typography>
                        <Button variant="outlined" size="small" startIcon={<AutoAwesomeIcon />} onClick={handleGenerateSuggestions}>{t('contentStudio.generateSuggestions', 'Genereer Suggesties')}</Button>
                      </TableCell>
                    </TableRow>
                  ) : [...suggestions]
                    .filter(s => !sugTypeFilter || s.content_type === sugTypeFilter)
                    .filter(s => !sugStatusFilter || s.status === sugStatusFilter)
                    .sort((a, b) => {
                      if (sugSort === 'title_asc') return (a.title || '').localeCompare(b.title || '');
                      if (sugSort === 'title_desc') return (b.title || '').localeCompare(a.title || '');
                      if (sugSort === 'score_asc') return (Number(a.engagement_score) || 0) - (Number(b.engagement_score) || 0);
                      if (sugSort === 'score_desc') return (Number(b.engagement_score) || 0) - (Number(a.engagement_score) || 0);
                      return 0;
                    })
                    .map((sug) => (
                    <TableRow key={sug.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedSuggestion(sug)}>
                      <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                        <Checkbox size="small" checked={selectedSugIds.includes(sug.id)} onChange={() => toggleSugSelect(sug.id)} />
                      </TableCell>
                      <TableCell>
                        {/* Opdracht 7-F (v2): platform-aware preview tooltip
                            - blog → blog article hero mock
                            - social_post → preview van het primaire kanaal (eerste suggested_channel)
                            - video_script → video frame mock
                        */}
                        <Tooltip
                          placement="right"
                          arrow
                          componentsProps={{ tooltip: { sx: { bgcolor: 'rgba(33,33,33,0.97)', maxWidth: 'none', p: 1.5 } } }}
                          title={<SuggestionPreview suggestion={sug} />}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sug.title}
                          </Typography>
                        </Tooltip>
                        {sug.summary && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sug.summary}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {sug.event_source_id ? <Chip label="📅 Event" size="small" sx={{ fontSize: 10, bgcolor: '#ed6c0215', color: '#ed6c02' }} />
                        : sug.visual_source_id ? <Chip label="📷 Visual" size="small" sx={{ fontSize: 10, bgcolor: '#1976d215', color: '#1976d2' }} />
                        : sug.poi_source_id ? <Chip label="📍 POI" size="small" sx={{ fontSize: 10, bgcolor: '#2e7d3215', color: '#2e7d32' }} />
                        : sug.source === 'recycle' ? <Chip label="♻️ Recycle" size="small" sx={{ fontSize: 10, bgcolor: '#7b1fa215', color: '#7b1fa2' }} />
                        : (sug.summary || '').startsWith('Chatbot thema:') ? <Chip label="💬 HoliBot" size="small" sx={{ fontSize: 10, bgcolor: '#0288d115', color: '#0288d1' }} />
                        : <Chip label="🔍 Trending" size="small" sx={{ fontSize: 10, bgcolor: '#66666615', color: '#666' }} />}
                      </TableCell>
                      <TableCell><Chip label={CONTENT_TYPE_LABELS[sug.content_type] || sug.content_type} size="small" sx={{ ...(CONTENT_TYPE_COLORS[sug.content_type] || {}), fontWeight: 500, fontSize: 11 }} /></TableCell>
                      <TableCell>
                        <Chip
                          label={Number(sug.engagement_score || 0).toFixed(1)}
                          size="small"
                          color={getScoreColor(sug.engagement_score).mui}
                          sx={{ fontWeight: 600, minWidth: 38 }}
                        />
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
                            <Chip key={i} label={ch} size="small" sx={{ fontSize: 10, fontWeight: 500, color: '#fff', bgcolor: PLATFORM_COLORS[ch] || '#666' }} />
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
                              <Tooltip title={t('contentStudio.approve', 'Goedkeuren')}>
                                <IconButton size="small" color="success" onClick={() => handleSuggestionAction(sug.id, 'approved')}>
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('contentStudio.reject', 'Afwijzen')}>
                                <IconButton size="small" color="error" aria-label="Verwijderen" onClick={() => handleSuggestionAction(sug.id, 'rejected')}>
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {sug.status === 'approved' && (
                            <Tooltip title={t('contentStudio.generateContent', 'Content Genereren')}>
                              <IconButton size="small" color="primary" onClick={() => setGenerateDialogSuggestion(sug)}>
                                <AutoAwesomeIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {sug.status === 'rejected' && (
                            <Tooltip title={t('contentStudio.tooltips.restorePending', 'Herstel naar pending')}>
                              <IconButton size="small" color="info" onClick={() => handleSuggestionAction(sug.id, 'pending')}>
                                <RestoreIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {/* Opdracht 7-E: Verrijk-knop (alleen voor pending of approved suggesties) */}
                          {(sug.status === 'pending' || sug.status === 'approved') && (
                            <Tooltip title={t('contentStudio.tooltips.enrich', 'Verrijk met merk- en trending context (AI)')}>
                              <span>
                                <IconButton size="small" sx={{ color: '#9C27B0' }}
                                  onClick={() => handleEnrichSuggestion(sug.id)}
                                  disabled={enrichingSugId === sug.id}>
                                  {enrichingSugId === sug.id ? <CircularProgress size={14} /> : <AutoFixHighIcon fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          <Tooltip title={t('contentStudio.tooltips.viewDetails', 'Details bekijken')}>
                            <IconButton size="small" onClick={() => setSelectedSuggestion(sug)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {/* Opdracht 7-fix-5: prullenbak voor ALLE statussen (sluit niet meer alleen rejected in) */}
                          {sug.status !== 'deleted' && (
                            <Tooltip title={t('contentStudio.tooltips.deleteSuggestion', 'Verwijderen (naar prullenbak)')}>
                              <IconButton size="small" color="error"
                                onClick={() => {
                                  if (window.confirm(t('contentStudio.confirmDeleteSuggestion', 'Deze suggestie verwijderen?'))) {
                                    handleSuggestionAction(sug.id, 'deleted');
                                  }
                                }}>
                                <DeleteIcon fontSize="small" />
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
              labelRowsPerPage={t('contentStudio.rowsPerPage', 'Rijen per pagina')}
            />
          </Paper>
        </>
      )}

      {/* === TAB 3: Content Items === */}
      {tab === 3 && (
        <>
          {itemError && <Alert severity="error" sx={{ mb: 2 }}>{itemError}</Alert>}
          <Paper variant="outlined" ref={tableRef} tabIndex={0} onKeyDown={() => {}} sx={{ outline: "none", "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" } }}>
            {/* Opdracht 9: Header bar met acties + density toggle + column visibility */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" color="text.secondary">
                {conceptTotal} {t('contentStudio.conceptsFound', 'content concepten')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {/* Density toggle */}
                <ToggleButtonGroup
                  value={densityMode}
                  exclusive
                  onChange={(_, v) => { if (v) setDensityMode(v); }}
                  size="small"
                  sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.5, fontSize: 11 } }}
                >
                  <ToggleButton value="comfortable">
                    <Tooltip title="Comfortable"><span style={{ fontSize: 11 }}>▤</span></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="compact">
                    <Tooltip title="Compact"><span style={{ fontSize: 11 }}>▥</span></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="dense">
                    <Tooltip title="Dense"><DensitySmallIcon sx={{ fontSize: 16 }} /></Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
                {/* Column visibility */}
                <Tooltip title={t('contentStudio.columnVisibility', 'Kolommen')}>
                  <IconButton size="small" onClick={(e) => setColumnMenuAnchor(e.currentTarget)}>
                    <ViewColumnIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Popover
                  open={Boolean(columnMenuAnchor)}
                  anchorEl={columnMenuAnchor}
                  onClose={() => setColumnMenuAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <Box sx={{ p: 2, minWidth: 180 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('contentStudio.visibleColumns', 'Zichtbare kolommen')}</Typography>
                    {ALL_COLUMNS.map(col => (
                      <FormControlLabel
                        key={col}
                        control={
                          <Switch
                            size="small"
                            checked={activeColumns.includes(col)}
                            onChange={() => {
                              const newCols = activeColumns.includes(col)
                                ? activeColumns.filter(c => c !== col)
                                : [...activeColumns, col];
                              setVisibleColumns(newCols.length === ALL_COLUMNS.length ? null : newCols);
                            }}
                            disabled={col === 'title'}
                          />
                        }
                        label={<Typography variant="body2">{COLUMN_LABELS[col]}</Typography>}
                        sx={{ display: 'block', mx: 0 }}
                      />
                    ))}
                    <Button size="small" onClick={() => setVisibleColumns(null)} sx={{ mt: 1 }}>{t('contentStudio.resetColumns', 'Herstel')}</Button>
                  </Box>
                </Popover>
                {/* Keyboard shortcuts */}
                <Tooltip title="Sneltoetsen">
                  <IconButton size="small" onClick={(e) => setKbdAnchor(e.currentTarget)} color={kbdAnchor ? 'primary' : 'default'}><KeyboardIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Popover
                  open={Boolean(kbdAnchor)}
                  anchorEl={kbdAnchor}
                  onClose={() => setKbdAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <Box sx={{ p: 2, minWidth: 240 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>Sneltoetsen</Typography>
                    {[
                      ['j / \u2193', 'Volgende rij'],
                      ['k / \u2191', 'Vorige rij'],
                      ['Enter', 'Open geselecteerd'],
                      ['x', 'Selecteer/deselecteer'],
                      ['Shift+A', 'Alles selecteren'],
                      ['Shift+X', 'Selectie wissen'],
                      ['a', 'Goedkeuren (bij selectie)'],
                      ['p', 'Publiceren (bij selectie)'],
                      ['Delete', 'Verwijderen (bij selectie)'],
                    ].map(([key, desc]) => (
                      <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>{desc}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {key.split(' / ').map(k => (
                            <Box key={k} component="kbd" sx={{
                              px: 0.75, py: 0.25, fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
                              bgcolor: 'action.hover', borderRadius: 0.5,
                              border: '1px solid', borderColor: 'divider',
                              lineHeight: 1.4,
                            }}>{k}</Box>
                          ))}
                        </Box>
                      </Box>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500, color: 'primary.main' }}>Command Palette</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Box component="kbd" sx={{ px: 0.75, py: 0.25, fontSize: 11, fontFamily: 'monospace', fontWeight: 600, bgcolor: 'action.hover', borderRadius: 0.5, border: '1px solid', borderColor: 'divider', lineHeight: 1.4 }}>Ctrl</Box>
                        <Box component="kbd" sx={{ px: 0.75, py: 0.25, fontSize: 11, fontFamily: 'monospace', fontWeight: 600, bgcolor: 'action.hover', borderRadius: 0.5, border: '1px solid', borderColor: 'divider', lineHeight: 1.4 }}>K</Box>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, mt: 0.5, display: 'block' }}>Alle sneltoetsen &amp; acties</Typography>
                  </Box>
                </Popover>
                <Tooltip title={t('contentStudio.tooltips.refresh', 'Vernieuwen')}>
                  <IconButton size="small" onClick={loadItems}><RefreshIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title={t('contentStudio.tooltips.newItem', 'Maak handmatig een nieuw content item aan (zonder AI). Je kunt het later bewerken, verbeteren met AI, en publiceren.')} arrow>
                  <Button size="small" variant="contained" startIcon={<NoteAddIcon />} onClick={() => setManualDialogOpen(true)}>
                    {t('contentStudio.actions.newItem', 'Nieuw Item')}
                  </Button>
                </Tooltip>
                <Tooltip title={t('contentStudio.tooltips.campaign', 'Genereer een complete multi-platform campagne rond een onderwerp. AI maakt meerdere content items aan voor verschillende kanalen (Facebook, Instagram, etc.).')} arrow>
                  <span>
                    <Button size="small" variant="outlined" color="secondary" startIcon={campaignGenerating ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
                      disabled={campaignGenerating}
                      onClick={async () => {
                        const topic = prompt(t('contentStudio.campaign.topicPrompt', 'Voer het campagne-onderwerp in:'));
                        if (!topic) return;
                        setCampaignGenerating(true);
                        try {
                          const result = await contentService.generateCampaign({ destination_id: destinationId, topic, language: currentDest?.defaultLanguage || 'nl' });
                          loadItems();
                          const count = result?.data?.total || result?.total || result?.data?.items?.length || 0;
                          const campConceptIds = (result?.data?.items || result?.data?.concepts || []).map(i => i.concept_id).filter(Boolean);
                          setSnackMsg(`${count} items gegenereerd voor campagne "${topic}"`);
                          if (campConceptIds.length > 0) setUndoCampaignIds(campConceptIds);
                        } catch (err) { setSnackMsg(err.response?.data?.error?.message || err.message || 'Campagne generatie mislukt'); }
                        finally { setCampaignGenerating(false); }
                      }}>
                      {t('contentStudio.actions.campaign', 'Campagne')}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            {/* Opdracht 6: Bulk toolbar — verschijnt prominent zodra rijen geselecteerd zijn */}
            {selectedIds.length > 0 && (
              <Box sx={{
                position: 'sticky', top: 0, zIndex: 5,
                display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center',
                px: 2, py: 1.5, mb: 0,
                bgcolor: 'primary.50', borderTop: 2, borderBottom: 2, borderColor: 'primary.main',
                animation: 'hbSlideDown 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                '@keyframes hbSlideDown': {
                  from: { transform: 'translateY(-100%)', opacity: 0 },
                  to: { transform: 'translateY(0)', opacity: 1 },
                },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}>
                <Chip label={`${selectedIds.length} ${t('contentStudio.selected', 'geselecteerd')}`} color="primary" sx={{ fontWeight: 600 }} />
                <Box sx={{ flex: 1 }} />
                <Button size="small" variant="contained" color="success" onClick={() => handleBulkAction('approve')} disabled={bulkLoading}>{t('contentStudio.approve', 'Approve')}</Button>
                <Button size="small" variant="contained" color="primary" startIcon={<PublishIcon />} onClick={() => handleBulkPublish()} disabled={bulkLoading}>{t('contentStudio.bulkPublish', 'Publiceer')}</Button>
                <Button size="small" variant="outlined" startIcon={<ScheduleIcon />} onClick={() => handleBulkScheduleOpen()} disabled={bulkLoading}>{t('contentStudio.bulkSchedule', 'Plan in')}</Button>
                <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleBulkExport()} disabled={bulkLoading}>{t('contentStudio.bulkExport', 'Exporteer')}</Button>
                <Button size="small" variant="outlined" color="error" onClick={() => handleBulkAction('reject')} disabled={bulkLoading}>{t('contentStudio.reject', 'Reject')}</Button>
                <Button size="small" variant="outlined" color="error" onClick={() => handleBulkAction('delete')} disabled={bulkLoading}>{t('contentStudio.actions.delete', 'Delete')}</Button>
                <Button size="small" onClick={() => setSelectedIds([])}>{t('contentStudio.clearSelection', 'Wis selectie')}</Button>
              </Box>
            )}

            {/* Opdracht 6: Extra filterbalk (Pillar + Score≥) */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 0, px: 1, py: 0.5 }}>
              <Select size="small" value={itemPillarFilter} onChange={e => setItemPillarFilter(e.target.value)} displayEmpty
                sx={{ fontSize: 12, minWidth: 140 }}>
                <MenuItem value="">{t('contentStudio.filter.allPillars', 'Alle pillars')}</MenuItem>
                {pagePillars.map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color || '#999' }} />
                      {p.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              <Select size="small" value={itemMinScore} onChange={e => setItemMinScore(e.target.value)} displayEmpty
                sx={{ fontSize: 12, minWidth: 120 }}>
                <MenuItem value="">{t('contentStudio.filter.allScores', 'Alle scores')}</MenuItem>
                <MenuItem value="50">SEO ≥ 50</MenuItem>
                <MenuItem value="60">SEO ≥ 60</MenuItem>
                <MenuItem value="70">SEO ≥ 70</MenuItem>
                <MenuItem value="80">SEO ≥ 80</MenuItem>
                <MenuItem value="90">SEO ≥ 90</MenuItem>
              </Select>
              {(itemPillarFilter || itemMinScore) && (
                <Button size="small" onClick={() => { setItemPillarFilter(''); setItemMinScore(''); }}>
                  {t('contentStudio.filter.clear', 'Wissen')}
                </Button>
              )}
            </Box>

            {/* Opdracht 9: Enterprise density table */}
            <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)', overflow: 'auto' }}>
              <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', '& .MuiTableCell-root': { py: densityMode === 'dense' ? 0.25 : densityMode === 'compact' ? 0.5 : 1 } }}>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: 'background.paper', fontWeight: 600, fontSize: 12, borderBottom: 2, borderColor: 'divider' } }}>
                    <TableCell padding="checkbox" sx={{ width: 40 }}>
                      <Checkbox size="small" checked={items.length > 0 && selectedIds.length === items.length} indeterminate={selectedIds.length > 0 && selectedIds.length < items.length} onChange={toggleSelectAll} />
                    </TableCell>
                    {activeColumns.includes('title') && (
                      <TableCell sx={{ cursor: 'pointer' }} onClick={() => setItemSort(s => s === 'title_asc' ? 'title_desc' : 'title_asc')}>
                        {t('contentStudio.table.title', 'Titel')} {itemSort.startsWith('title') ? (itemSort === 'title_asc' ? '↑' : '↓') : ''}
                      </TableCell>
                    )}
                    {activeColumns.includes('source') && (
                      <TableCell sx={{ width: 110 }}>
                        <Select size="small" value={itemTypeFilter} onChange={e => setItemTypeFilter(e.target.value)} displayEmpty variant="standard" sx={{ fontSize: 12, minWidth: 55 }}>
                          <MenuItem value="">{t('contentStudio.table.type', 'Type')}</MenuItem>
                          <MenuItem value="blog">Blog</MenuItem>
                          <MenuItem value="social_post">Social</MenuItem>
                          <MenuItem value="video_script">Video</MenuItem>
                        </Select>
                      </TableCell>
                    )}
                    {activeColumns.includes('platforms') && (
                      <TableCell sx={{ width: 180 }}>
                        <Select size="small" value={itemPlatformFilter} onChange={e => setItemPlatformFilter(e.target.value)} displayEmpty variant="standard" sx={{ fontSize: 12, minWidth: 70 }}>
                          <MenuItem value="">{t('contentStudio.table.platform', 'Platforms')}</MenuItem>
                          {Object.entries(PLATFORM_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                        </Select>
                      </TableCell>
                    )}
                    {activeColumns.includes('pillar') && (
                      <TableCell sx={{ minWidth: 130 }}>Pillar</TableCell>
                    )}
                    {activeColumns.includes('seo') && (
                      <TableCell sx={{ width: 55 }}>
                        <Tooltip title={t('contentStudio.table.seoScoreTooltip', 'Hoogste SEO-score over alle platform-versies van dit concept.')}>
                          <span>SEO</span>
                        </Tooltip>
                      </TableCell>
                    )}
                    {activeColumns.includes('status') && (
                      <TableCell sx={{ width: 110 }}>
                        <Select size="small" value={itemStatusFilter} onChange={e => setItemStatusFilter(e.target.value)} displayEmpty variant="standard" sx={{ fontSize: 12, minWidth: 70 }}>
                          <MenuItem value="">{t('contentStudio.table.status', 'Status')}</MenuItem>
                          <MenuItem value="draft">{t('contentStudio.status.draft', 'Concept')}</MenuItem>
                          <MenuItem value="approved">{t('contentStudio.status.approved', 'Goedgekeurd')}</MenuItem>
                          <MenuItem value="scheduled">{t('contentStudio.status.scheduled', 'Ingepland')}</MenuItem>
                          <MenuItem value="published">{t('contentStudio.status.published', 'Gepubliceerd')}</MenuItem>
                          <MenuItem value="failed">{t('contentStudio.status.failed', 'Mislukt')}</MenuItem>
                        </Select>
                      </TableCell>
                    )}
                    {activeColumns.includes('updated') && (
                      <TableCell sx={{ cursor: 'pointer', width: 110 }} onClick={() => setItemSort(s => s === 'date_desc' ? 'date_asc' : 'date_desc')}>
                        {t('contentStudio.table.date', 'Bijgewerkt')} {itemSort.startsWith('date') ? (itemSort === 'date_asc' ? '↑' : '↓') : ''}
                      </TableCell>
                    )}
                    {activeColumns.includes('actions') && (
                      <TableCell align="right" sx={{ width: 70 }}>{t('contentStudio.table.actions', 'Acties')}</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemLoading ? (
                    Array.from({ length: 15 }).map((_, i) => (
                      <TableRow key={`skel-${i}`} sx={{ height: rowHeight }}>
                        <TableCell padding="checkbox"><Skeleton variant="rectangular" width={18} height={18} sx={{ borderRadius: 0.5 }} /></TableCell>
                        {activeColumns.includes('title') && <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Skeleton variant="rectangular" width={28} height={28} sx={{ borderRadius: 1, flexShrink: 0 }} /><Skeleton variant="text" width={`${60 + Math.random() * 30}%`} /></Box></TableCell>}
                        {activeColumns.includes('source') && <TableCell><Skeleton variant="rounded" width={60} height={20} /></TableCell>}
                        {activeColumns.includes('platforms') && <TableCell><Box sx={{ display: 'flex', gap: 0.5 }}><Skeleton variant="rounded" width={55} height={20} /><Skeleton variant="rounded" width={55} height={20} /></Box></TableCell>}
                        {activeColumns.includes('pillar') && <TableCell><Skeleton variant="text" width={70} /></TableCell>}
                        {activeColumns.includes('seo') && <TableCell><Skeleton variant="rounded" width={36} height={20} /></TableCell>}
                        {activeColumns.includes('status') && <TableCell><Skeleton variant="rounded" width={70} height={22} /></TableCell>}
                        {activeColumns.includes('updated') && <TableCell><Skeleton variant="text" width={65} /></TableCell>}
                        {activeColumns.includes('actions') && <TableCell><Skeleton variant="circular" width={24} height={24} /></TableCell>}
                      </TableRow>
                    ))
                  ) : concepts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeColumns.length + 1} align="center" sx={{ py: 6 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <NoteAddIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                          <Typography variant="h6" color="text.secondary">{t('contentStudio.emptyState.title', 'Nog geen content')}</Typography>
                          <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 400 }}>
                            {t('contentStudio.emptyState.description', 'Genereer content vanuit goedgekeurde suggesties of maak handmatig een nieuw item aan.')}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => setTab(2)}>
                              {t('contentStudio.emptyState.goToSuggestions', 'Genereer suggesties')}
                            </Button>
                            <Button variant="outlined" startIcon={<NoteAddIcon />} onClick={() => setManualDialogOpen(true)}>
                              {t('contentStudio.emptyState.newItem', 'Nieuw concept')}
                            </Button>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : concepts
                    .filter(c => c.approval_status !== 'deleted')
                    .filter(c => !itemTypeFilter || c.content_type === itemTypeFilter)
                    .filter(c => !itemPlatformFilter || c.platforms?.includes(itemPlatformFilter))
                    .filter(c => !itemStatusFilter || c.approval_status === itemStatusFilter)
                    .filter(c => !itemPillarFilter || c.pillar_id === itemPillarFilter)
                    .filter(c => !itemMinScore || (c.avg_seo_score != null && Number(c.avg_seo_score) >= Number(itemMinScore)))
                    .filter(c => !itemSourceFilter || (c.content_source_type || 'manual') === itemSourceFilter)
                    .sort((a, b) => {
                      if (itemSort === 'title_asc') return (a.title || '').localeCompare(b.title || '');
                      if (itemSort === 'title_desc') return (b.title || '').localeCompare(a.title || '');
                      if (itemSort === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
                      if (itemSort === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
                      return 0;
                    })
                    .map((concept, rowIdx) => {
                      const activeVersions = (concept.platform_versions || []).filter(v => v.status !== 'deleted');
                      const firstItemId = activeVersions[0]?.id;
                      const isFocused = rowIdx === focusedRow;
                      return (
                      <TableRow key={concept.id} hover
                        selected={isFocused}
                        sx={{
                          height: rowHeight,
                          cursor: 'pointer',
                          transition: 'background-color 150ms ease',
                          ...(isFocused ? { bgcolor: 'action.selected', outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } : {}),
                          '& .row-actions': { opacity: 0, transition: 'opacity 150ms ease' },
                          '&:hover .row-actions': { opacity: 1 },
                          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                        }}
                        onClick={() => { setFocusedRow(rowIdx); setConceptDialogId(concept.id); }}>
                        <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                          <Checkbox size="small" checked={selectedIds.includes(firstItemId)} onChange={() => firstItemId && toggleSelectItem(firstItemId)} />
                        </TableCell>
                        {activeColumns.includes('title') && (
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {/* Thumbnail 28x28 */}
                              <Box sx={{
                                width: 28, height: 28, borderRadius: 1, flexShrink: 0,
                                bgcolor: concept.content_source_type === 'poi' ? '#2e7d3220' : concept.content_source_type === 'visual' ? '#1976d220' : '#66666620',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14,
                              }}>
                                {concept.content_source_type === 'poi' ? '📍' : concept.content_source_type === 'event' ? '📅' : concept.content_source_type === 'visual' ? '📷' : concept.content_source_type === 'holibot' ? '💬' : '✏️'}
                              </Box>
                              {inlineEditId === concept.id ? (
                                <TextField
                                  size="small"
                                  value={inlineEditValue}
                                  onChange={e => setInlineEditValue(e.target.value)}
                                  onBlur={() => handleInlineEditSave(concept.id)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') { e.preventDefault(); handleInlineEditSave(concept.id); }
                                    if (e.key === 'Escape') { setInlineEditId(null); }
                                    e.stopPropagation();
                                  }}
                                  onClick={e => e.stopPropagation()}
                                  autoFocus
                                  sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: 13 } }}
                                />
                              ) : (
                                <Typography
                                  variant="body2"
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEditId(concept.id);
                                    setInlineEditValue(concept.title || '');
                                  }}
                                  sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                                  title={concept.title}
                                >
                                  {concept.title}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                        )}
                        {activeColumns.includes('source') && (
                          <TableCell>
                            <Chip
                              label={CONTENT_TYPE_LABELS[concept.content_type] || concept.content_type || '—'}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: 10, height: 20, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'visible',
                                borderColor: concept.content_type === 'blog' ? '#1565c0' : concept.content_type === 'social_post' ? '#2e7d32' : concept.content_type === 'video_script' ? '#ed6c02' : 'divider',
                                color: concept.content_type === 'blog' ? '#64B5F6' : concept.content_type === 'social_post' ? '#81C784' : concept.content_type === 'video_script' ? '#FFB74D' : 'text.secondary',
                              }}
                            />
                          </TableCell>
                        )}
                        {activeColumns.includes('platforms') && (
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap' }}>
                              {activeVersions.map(v => {
                                const brand = PLATFORM_COLORS[v.platform] || '#666';
                                const icon = PLATFORM_STATUS_ICON[v.status] || '—';
                                return (
                                  <Chip key={v.id}
                                    label={`${PLATFORM_LABELS[v.platform] || v.platform} ${icon}`}
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); setConceptDialogId(concept.id); }}
                                    sx={{
                                      cursor: 'pointer', height: 20, fontSize: 10, fontWeight: 500,
                                      color: '#fff', bgcolor: brand,
                                      border: `1px solid ${brand}`,
                                      opacity: v.status === 'published' ? 1 : v.status === 'scheduled' ? 0.85 : 0.7,
                                      '&:hover': { bgcolor: brand, filter: 'brightness(1.1)' },
                                    }} />
                                );
                              })}
                              {activeVersions.length === 0 && <Typography variant="caption" color="text.disabled">—</Typography>}
                            </Box>
                          </TableCell>
                        )}
                        {activeColumns.includes('pillar') && (
                          <TableCell>
                            {concept.pillar_name ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: concept.pillar_color || '#999', flexShrink: 0 }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{concept.pillar_name}</Typography>
                              </Box>
                            ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                        )}
                        {activeColumns.includes('seo') && (
                          <TableCell>
                            {concept.avg_seo_score != null ? (() => {
                              const s = Math.round(Number(concept.avg_seo_score));
                              const color = s >= 80 ? 'success' : s >= 60 ? 'warning' : 'error';
                              return <Chip label={`${s}`} size="small" color={color} sx={{ height: 20, fontSize: 11, fontWeight: 600, minWidth: 36 }} />;
                            })() : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                        )}
                        {activeColumns.includes('status') && (
                          <TableCell>
                            {concept.platform_versions?.some(v => v.status === 'published') ? (
                              <Chip icon={<CheckCircleOutlineIcon sx={{ fontSize: 14 }} />} label="Live" size="small" sx={{ height: 22, fontSize: 10, bgcolor: 'rgba(129,199,132,0.15)', color: '#81C784', border: '1px solid rgba(129,199,132,0.3)' }} />
                            ) : concept.platform_versions?.some(v => v.status === 'scheduled') ? (
                              <Chip icon={<AccessTimeIcon sx={{ fontSize: 14 }} />} label="Ingepland" size="small" sx={{ height: 22, fontSize: 10, bgcolor: 'rgba(100,181,246,0.15)', color: '#64B5F6', border: '1px solid rgba(100,181,246,0.3)' }} />
                            ) : concept.platform_versions?.some(v => v.status === 'failed') ? (
                              <Chip icon={<ErrorOutlineIcon sx={{ fontSize: 14 }} />} label="Mislukt" size="small" sx={{ height: 22, fontSize: 10, bgcolor: 'rgba(229,115,115,0.15)', color: '#E57373', border: '1px solid rgba(229,115,115,0.3)' }} />
                            ) : (
                              <StatusChip status={concept.approval_status} />
                            )}
                          </TableCell>
                        )}
                        {activeColumns.includes('updated') && (
                          <TableCell>
                            <Typography variant="caption" sx={{ fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(concept.updated_at || concept.created_at).toLocaleDateString('nl-NL')}</Typography>
                          </TableCell>
                        )}
                        {activeColumns.includes('actions') && (
                          <TableCell align="right" onClick={e => e.stopPropagation()}>
                            <Box className="row-actions" sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              <Tooltip title={t('common.edit', 'Bewerken')}>
                                <IconButton size="small" onClick={() => { if (firstItemId) setSelectedItemId(firstItemId); }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                              </Tooltip>
                              <Tooltip title={t('common.delete', 'Verwijderen')}>
                                <IconButton size="small" color="error" aria-label="Verwijderen" onClick={async () => { await contentService.deleteConcept(concept.id); loadItems(); }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={conceptTotal}
              page={itemPage}
              onPageChange={(_, p) => setItemPage(p)}
              rowsPerPage={25}
              rowsPerPageOptions={[25]}
              labelRowsPerPage={t('contentStudio.rowsPerPage', 'Rijen per pagina')}
            />
          </Paper>
        </>
      )}

      {/* === TAB 4: Calendar === */}
      {tab === 4 && <ContentCalendarTab destinationId={destinationId} onEditConcept={(conceptId) => setConceptDialogId(conceptId)} />}

      {/* === TAB 5: Content Analyse === */}
      {tab === 5 && <ContentAnalyseTab destinationId={destinationId} />}

      {/* === TAB 6: Seasonal Config === */}
      {tab === 6 && <SeasonalConfigTab destinationId={destinationId} />}

      {/* === TAB 7: Social Accounts (BLOK 5) === */}
      {tab === 7 && <SocialAccountsTab destinationId={destinationId} />}

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
        isContentOnlyDest={isContentOnlyDest}
        defaultLanguage={currentDest?.defaultLanguage || 'en'}
        supportedLanguages={currentDest?.supportedLanguages || []}
      />

      <ConceptDialog
        open={!!conceptDialogId}
        onClose={() => setConceptDialogId(null)}
        conceptId={conceptDialogId}
        onUpdate={loadItems}
        destinationId={destinationId}
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

      {/* Opdracht 6: Bulk schedule dialog */}
      <Dialog open={bulkScheduleOpen} onClose={() => !bulkLoading && setBulkScheduleOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('contentStudio.bulkScheduleTitle', 'Geselecteerde concepten inplannen')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('contentStudio.bulkScheduleHelp', 'Alle niet-gepubliceerde platform versies van {{count}} geselecteerde concepten worden ingepland.', { count: selectedIds.length })}
          </Typography>
          <TextField type="datetime-local" label={t('contentStudio.scheduleAt', 'Datum & tijd')} value={bulkScheduleAt}
            onChange={e => setBulkScheduleAt(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkScheduleOpen(false)} disabled={bulkLoading}>{t('common.cancel', 'Annuleren')}</Button>
          <Button variant="contained" onClick={handleBulkScheduleConfirm} disabled={bulkLoading || !bulkScheduleAt}>
            {bulkLoading ? <CircularProgress size={16} /> : t('contentStudio.schedule', 'Inplannen')}
          </Button>
        </DialogActions>
      </Dialog>

<Snackbar
        open={!!snackMsg}
        autoHideDuration={undoCampaignIds ? 15000 : 5000}
        onClose={() => { setSnackMsg(null); setUndoCampaignIds(null); }}
        message={snackMsg}
        action={undoCampaignIds ? (
          <Button
            color="warning" size="small" variant="outlined"
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', fontWeight: 700 }}
            onClick={async () => {
              try {
                for (const cid of undoCampaignIds) {
                  await contentService.deleteConcept(cid);
                }
                setSnackMsg(`${undoCampaignIds.length} campagne-items ongedaan gemaakt`);
                setUndoCampaignIds(null);
                loadItems();
              } catch (err) {
                setSnackMsg(`Ongedaan maken mislukt: ${err.message}`);
                setUndoCampaignIds(null);
              }
            }}
          >
            Ongedaan maken
          </Button>
        ) : null}
      />


      {/* Media Sidebar */}
      {mediaSidebarOpen && (
        <Suspense fallback={null}>
          <MediaSidebarPanel
            open={mediaSidebarOpen}
            onClose={() => setMediaSidebarOpen(false)}
            destId={destinationId}
            onAddImage={(img) => {
              // Copy URL to clipboard for easy paste into content
              if (img.url) {
                navigator.clipboard?.writeText(img.url);
                setSnackMsg(t('media.sidebar.copied', 'Image URL gekopieerd — plak in je content'));
              }
            }}
          />
        </Suspense>
      )}
    </Box>
  );
}
