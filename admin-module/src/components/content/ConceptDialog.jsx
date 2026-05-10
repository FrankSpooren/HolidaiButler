/**
 * ConceptDialog — Enterprise 2-panel content concept editor
 * Left panel (60%): Image section + platform tabs + body editor + translations
 * Right panel (40%): Acties, Kwaliteit (SEO+Brand), Preview, Performance, Info
 * Opdracht 1+2+3: Volledig rechter paneel met werkende acties, scores, preview
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogActions, DialogContent,
  Box, Typography, Button, IconButton, Tabs, Tab, Chip, TextField,
  Alert, CircularProgress, Tooltip, Divider, Menu, MenuItem,
  Paper, InputAdornment, LinearProgress, Snackbar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PublishIcon from '@mui/icons-material/Publish';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import AnimatedScoreChip from '../common/AnimatedScoreChip.jsx';
import TranslateIcon from '@mui/icons-material/Translate';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PinterestIcon from '@mui/icons-material/Pinterest';
import LanguageIcon from '@mui/icons-material/Language';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService.js';
import brandProfileService from '../../api/brandProfileService.js';
import ContentImageSection from './ContentImageSection.jsx';
import PlatformPreview from './PlatformPreview.jsx';
import RichTextField from '../blocks/fields/RichTextField.jsx';

// ─── Platform Config (official MUI icons) ───────────────────
const PLATFORM_CONFIG = {
  website:   { Icon: LanguageIcon,   color: '#5E8B7E', label: 'Website',   maxChars: 50000 },
  facebook:  { Icon: FacebookIcon,   color: '#1877F2', label: 'Facebook',  maxChars: 500 },
  instagram: { Icon: InstagramIcon,  color: '#E4405F', label: 'Instagram', maxChars: 2200 },
  linkedin:  { Icon: LinkedInIcon,   color: '#0A66C2', label: 'LinkedIn',  maxChars: 3000 },
  x:         { Icon: TwitterIcon,    color: '#000000', label: 'X',         maxChars: 280 },
  tiktok:    { Icon: MusicNoteIcon,  color: '#000000', label: 'TikTok',    maxChars: 2200 },
  youtube:   { Icon: YouTubeIcon,    color: '#FF0000', label: 'YouTube',   maxChars: 5000 },
  pinterest: { Icon: PinterestIcon,  color: '#BD081C', label: 'Pinterest', maxChars: 500 },
};

const STATUS_COLORS = {
  draft: 'default', pending_review: 'info', approved: 'success',
  scheduled: 'warning', published: 'success', failed: 'error',
  rejected: 'error', deleted: 'default', generated: 'primary',
  publishing: 'primary',
};

const CONTENT_TYPE_LABELS = {
  social_post: 'Social Post', blog: 'Blog', video_script: 'Video Script', newsletter: 'Newsletter',
};

const ALL_LANGS = ['en', 'nl', 'de', 'es', 'fr'];

// Emoji categories for tourism content creation
const EMOJI_CATEGORIES = {
  'Actief': ['🚴', '🏊', '🤿', '🏄', '🎾', '⛳', '🏃', '🧗', '🚣', '🏓'],
  'Strand': ['🏖️', '🌊', '☀️', '🐚', '🩱', '🏝️', '🌅', '⛱️', '🦀', '🐠'],
  'Natuur': ['🌺', '🌿', '🦅', '🏔️', '🌸', '🦋', '🌳', '🌻', '🐬', '🌄'],
  'Cultuur': ['🏛️', '🎭', '🎨', '🎪', '📸', '🏰', '🎼', '🎤', '🎹', '🖼️'],
  'Recreatief': ['🎢', '🎡', '🎠', '🕺', '💃', '🎬', '🎯', '🧩', '🎵', '🪂'],
  'Eten & Drinken': ['🍽️', '🥘', '🍷', '🍺', '☕', '🥐', '🍹', '🧀', '🍕', '🍦'],
  'Shopping': ['🛍️', '👗', '💎', '🎁', '🧴', '👒', '🕶️', '👜', '🛒', '✨'],
  'Praktisch': ['🚕', '🚂', '🚌', '🗺️', '📍', '🔭', '📅', '💡', '📱', '🅿️'],
  'Gezondheid': ['♿', '🏥', '💊', '🧑‍⚕️', '🦷', '🩺', '🆘', '❤️‍🩹', '🧘', '💆'],
};

const BEST_TIME_DEFAULTS = {
  instagram: { best: 'Dinsdag 11:00', alt: ['Donderdag 14:00', 'Zaterdag 10:00'] },
  facebook:  { best: 'Woensdag 11:00', alt: ['Vrijdag 13:00', 'Zaterdag 12:00'] },
  linkedin:  { best: 'Dinsdag 10:00', alt: ['Woensdag 12:00', 'Donderdag 09:00'] },
  x:         { best: 'Maandag 09:00', alt: ['Woensdag 12:00', 'Vrijdag 15:00'] },
  tiktok:    { best: 'Dinsdag 19:00', alt: ['Donderdag 20:00', 'Zaterdag 11:00'] },
  youtube:   { best: 'Zaterdag 10:00', alt: ['Woensdag 17:00', 'Vrijdag 14:00'] },
  pinterest: { best: 'Zaterdag 14:00', alt: ['Zondag 11:00', 'Vrijdag 15:00'] },
};

// Helper: clean em-dashes and AI artifacts from display text
function cleanBodyForDisplay(text) {
  if (!text) return '';
  let clean = text;
  // Em-dashes → comma
  clean = clean.replace(/\s*—\s*/g, ', ');
  // En-dashes → hyphen
  clean = clean.replace(/\s*–\s*/g, ' - ');
  // Strip AI instruction brackets
  clean = clean.replace(/\[(?:Link in Bio|Image(?:\s+recommendation)?:\s*[^\]]*)\]/gi, '');
  // Fix trailing truncation
  clean = clean.replace(/,?\s*and\s+\w*\.{3}\s*$/, '.');
  clean = clean.replace(/[,\s]+\.{3}\s*$/, '.');
  clean = clean.replace(/\s+\w{1,4}\.{3}\s*$/, '.');
  return clean.trim();
}

// AI editorial patterns that should NOT be published — must be highlighted for user review
const EDITORIAL_PATTERNS = [
  // Bracketed instructions
  /\[[^\]]*(?:Link in Bio|Image|Visual|Photo|Suggested|CTA|Insert|Add)[^\]]*\]/gi,
  // Unbracketed common AI instructions
  /Link in bio[^.!?\n]*/gi,
  /(?:^|\n)\s*(?:Image suggestion|Suggested image|Visual suggestion|Photo recommendation|Image recommendation)[:\s][^\n]*/gi,
  /(?:^|\n)\s*\((?:Image|Photo|Visual|Picture)[^)]*\)\s*$/gim,
  // Scene markers from video scripts
  /\[SCENE:[^\]]*\]/gi,
];

// Helper: render body with highlighted AI editorial instructions
function renderBodyWithHighlights(text) {
  if (!text) return null;
  const cleaned = cleanBodyForDisplay(text);

  // Build a combined pattern that matches ALL editorial fragments
  const combined = new RegExp(
    '(' + EDITORIAL_PATTERNS.map(p => p.source).join('|') + '|\\[[^\\]]+\\])',
    'gi'
  );

  const parts = cleaned.split(combined).filter(Boolean);
  return parts.map((part, i) => {
    // Check if this part matches any editorial pattern
    const isEditorial = EDITORIAL_PATTERNS.some(p => {
      p.lastIndex = 0; // reset regex state
      return p.test(part);
    }) || /^\[.+\]$/.test(part);

    if (isEditorial) {
      return (
        <span key={i} style={{
          backgroundColor: '#FFF3CD', color: '#856404', padding: '2px 6px',
          borderRadius: 4, fontSize: '0.85em', fontWeight: 500,
          border: '1px solid #FFEEBA',
        }} title="Redactionele opmerking — verwijderen vóór publicatie">
          ⚠️ {part.trim()}
        </span>
      );
    }
    return part;
  });
}

// ─── Emoji Picker with Category Tabs ────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  const categories = Object.keys(EMOJI_CATEGORIES);
  const [cat, setCat] = useState(0);
  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', gap: 0.3, mb: 0.5, flexWrap: 'wrap' }}>
        {categories.map((c, i) => (
          <Chip key={c} label={c} size="small" variant={cat === i ? 'filled' : 'outlined'}
            color={cat === i ? 'primary' : 'default'}
            onClick={() => setCat(i)}
            sx={{ height: 22, fontSize: 10, cursor: 'pointer' }} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', maxWidth: 320 }}>
        {EMOJI_CATEGORIES[categories[cat]].map(em => (
          <Box key={em} sx={{ cursor: 'pointer', fontSize: 22, p: 0.4, borderRadius: 0.5, '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.2)' }, transition: 'all 0.15s' }}
            onClick={() => onSelect(em)}>{em}</Box>
        ))}
      </Box>
    </Paper>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function ConceptDialog({ open, onClose, conceptId, onUpdate, destinationId, initialPlatform }) {
  const { t } = useTranslation();

  // Core state
  const [concept, setConcept] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Platform tab
  const [activeTab, setActiveTab] = useState(0);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  // Doelgroep / Persona
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [personaAnchor, setPersonaAnchor] = useState(null);

  // Body editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [originalBody, setOriginalBody] = useState(''); // track original from DB for "Aangepast" badge
  const [langTab, setLangTab] = useState('nl');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false); // unsaved changes
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wasEdited, setWasEdited] = useState(false); // content differs from original concept version



  // Translation state
  const [translating, setTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState(null);

  // AI improve state
  const [improving, setImproving] = useState(false);
  const [improveResult, setImproveResult] = useState(null);

  // A/B Variant ("Alternatief") state — Opdracht 3
  const [generatingAlt, setGeneratingAlt] = useState(false);
  const [altResult, setAltResult] = useState(null); // { original, alternative, ai_model }
  const [altError, setAltError] = useState(null);

  // Emoji picker
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const bodyRef = useRef(null);

  // Right panel — Opdracht 3
  const [seoData, setSeoData] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [brandScore, setBrandScore] = useState(null);
  const [brandScoreLoading, setBrandScoreLoading] = useState(false);
  const [hashtags, setHashtags] = useState([]);
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [perfData, setPerfData] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null); // { platform, step, detail }
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDatetime, setScheduleDatetime] = useState('');
  const [publishTarget, setPublishTarget] = useState(null); // null=all, or item id
  const [snackMsg, setSnackMsg] = useState(null); // feedback messages
  const [resolvedImages, setResolvedImages] = useState([]); // for PlatformPreview

  // Blog-modus state (Opdracht 4)
  const [blogMetaTitle, setBlogMetaTitle] = useState('');
  const [blogMetaDesc, setBlogMetaDesc] = useState('');
  const [blogSlug, setBlogSlug] = useState('');

  // Derive available languages from destination config (Fix 3)
  const LANGS = useMemo(() => {
    if (concept?.supported_languages && Array.isArray(concept.supported_languages) && concept.supported_languages.length > 0) {
      return concept.supported_languages.filter(l => ALL_LANGS.includes(l));
    }
    return ALL_LANGS;
  }, [concept?.supported_languages]);

  // Add Platform dialog (Opdracht 5)
  const [addPlatformOpen, setAddPlatformOpen] = useState(false);

  // Opdracht 10: Focus Mode state
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // null | 'saving' | 'saved'
  const autoSaveTimerRef = useRef(null);
  const [repurposing, setRepurposing] = useState(null); // platform key currently being generated

  // ─── Load Concept ───────────────────────────────────────
  const loadConcept = useCallback(async () => {
    if (!conceptId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await contentService.getConcept(conceptId);
      const conceptData = data.data || data;
      setConcept(conceptData);
      const platformItems = (conceptData.items || []).filter(i => i.approval_status !== 'deleted');
      setItems(platformItems);
      setTitleValue(conceptData.title || '');
      // Select platform tab matching initialPlatform (from calendar click), fallback to first
      if (initialPlatform && platformItems.length > 0) {
        const platformIdx = platformItems.findIndex(i => i.target_platform === initialPlatform);
        setActiveTab(platformIdx >= 0 ? platformIdx : 0);
      } else {
        setActiveTab(0);
      }
      if (conceptData.persona_id) setSelectedPersona(conceptData.persona_id);
      // Init body editor - use destination default language, not hardcoded 'en'
      if (platformItems.length > 0) {
        const firstItem = platformItems[0];
        const destLang = conceptData.default_language || firstItem.language || 'nl';
        const initBody = firstItem['body_' + destLang] || firstItem.body_nl || firstItem.body_en || '';
        setEditBody(initBody);
        setLangTab(firstItem['body_' + destLang] ? destLang : firstItem.body_nl ? 'nl' : 'en');
      }
    } catch (err) {
      setError(err.message || 'Fout bij laden concept');
      setConcept(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [conceptId]);

  const loadPersonas = useCallback(async () => {
    if (!destinationId) return;
    try {
      const data = await brandProfileService.getPersonas(destinationId);
      setPersonas(data.data || data || []);
    } catch { /* silent */ }
  }, [destinationId]);

  useEffect(() => {
    if (!open) return;
    loadConcept();
    loadPersonas();
  }, [open, conceptId, loadConcept, loadPersonas]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setConcept(null); setItems([]); setError(null);
      setEditingTitle(false); setSelectedPersona(null);
      setIsEditing(false); setDirty(false);
      setImproveResult(null); setEmojiOpen(false);
    }
  }, [open]);

  // ─── Derived ────────────────────────────────────────────
  const activeItem = items[activeTab] || null;
  const activePlatform = activeItem?.target_platform || 'website';
  const platformConfig = PLATFORM_CONFIG[activePlatform] || PLATFORM_CONFIG.website;
  const selectedPersonaObj = personas.find(p => p.id === selectedPersona) || null;
  const isBlog = concept?.content_type === 'blog' || activeItem?.content_type === 'blog' || activeItem?.target_platform === 'website';

  // Opdracht 5: Add Platform handler — repurposes activeItem into another platform
  const handleAddPlatform = async (platformKey) => {
    if (!activeItem) {
      setSnackMsg({ severity: 'warning', text: 'Geen bron-item geselecteerd' });
      return;
    }
    setRepurposing(platformKey);
    try {
      await contentService.repurposeItem(activeItem.id, [platformKey]);
      setSnackMsg({ severity: 'success', text: `${PLATFORM_CONFIG[platformKey]?.label || platformKey} versie gegenereerd` });
      setAddPlatformOpen(false);
      await loadConcept();
      if (onUpdate) onUpdate();
    } catch (e) {
      setSnackMsg({ severity: 'error', text: `Repurpose mislukt: ${e?.response?.data?.error?.message || e.message}` });
    } finally {
      setRepurposing(null);
    }
  };

  // Opdracht 5b: Delete platform handler
  const [deletingItemId, setDeletingItemId] = useState(null);
  const handleDeletePlatform = async (itemId) => {
    if (!itemId) return;
    if (!window.confirm('Weet je zeker dat je deze platform versie wilt verwijderen?')) return;
    setDeletingItemId(itemId);
    try {
      await contentService.deleteItem(itemId);
      setSnackMsg({ severity: 'success', text: 'Platform versie verwijderd' });
      setActiveTab(0);
      await loadConcept();
      if (onUpdate) onUpdate();
    } catch (e) {
      setSnackMsg({ severity: 'error', text: `Verwijderen mislukt: ${e?.response?.data?.error?.message || e.message}` });
    } finally {
      setDeletingItemId(null);
    }
  };

  // Auto-switch to last tab after items array grows from repurpose
  const prevItemsLengthRef = useRef(0);
  useEffect(() => {
    if (items.length > prevItemsLengthRef.current && prevItemsLengthRef.current > 0) {
      setActiveTab(items.length - 1);
    }
    prevItemsLengthRef.current = items.length;
  }, [items.length]);

  // Sync body editor when switching tabs or languages
  useEffect(() => {
    if (!activeItem) return;
    const rawBody = activeItem[`body_${langTab}`] || '';
    const cleaned = isBlog ? rawBody : cleanBodyForDisplay(rawBody);
    setEditBody(cleaned);
    setOriginalBody(cleaned);
    setDirty(false);
    setWasEdited(false);
    setIsEditing(isBlog); // blogs always in edit mode
    setImproveResult(null);
    // Blog SEO metadata — extract from seo_data with robust fallbacks
    if (isBlog) {
      let seoData = {};
      try { seoData = activeItem.seo_data ? (typeof activeItem.seo_data === 'string' ? JSON.parse(activeItem.seo_data) : activeItem.seo_data) : {}; } catch { seoData = {}; }
      const suggestions = seoData.seoSuggestions || {};
      // Meta title: seo_data.meta_title > seoSuggestions.meta_title > item title
      const mt = seoData.meta_title || suggestions.meta_title || activeItem.title || '';
      setBlogMetaTitle(mt.substring(0, 60));
      // Meta description: seo_data.meta_description (skip if starts with <) > seoSuggestions (skip if HTML) > auto from body
      const rawDesc = seoData.meta_description || '';
      const sugDesc = suggestions.meta_description || '';
      const bodyPlain = (activeItem.body_en || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const md = (rawDesc && !rawDesc.startsWith('<')) ? rawDesc : (sugDesc && !sugDesc.startsWith('<')) ? sugDesc : bodyPlain.substring(0, 155);
      setBlogMetaDesc(md.substring(0, 160));
      // Slug: seo_data.slug > seoSuggestions.slug > auto from title
      const rawSlug = seoData.slug || (suggestions.slug || '').replace(/^blog\//, '');
      setBlogSlug(rawSlug || (activeItem.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80));
    }
  }, [activeTab, langTab, activeItem?.id]);

  // ─── Handlers ───────────────────────────────────────────
  const handleSaveTitle = async () => {
    if (!concept || titleValue === concept.title) { setEditingTitle(false); return; }
    setSavingTitle(true);
    try {
      await contentService.updateItem(concept.id, { title: titleValue });
      setConcept(prev => ({ ...prev, title: titleValue }));
      setEditingTitle(false);
      if (onUpdate) onUpdate();
    } catch { setTitleValue(concept.title || ''); }
    finally { setSavingTitle(false); }
  };

  const handleSaveBody = async () => {
    if (!activeItem) return;
    setSaving(true);
    try {
      const updates = { [`body_${langTab}`]: editBody };
      // Blog: also save SEO metadata
      if (isBlog) {
        updates.seo_data = JSON.stringify({
          ...(activeItem.seo_data ? (typeof activeItem.seo_data === 'string' ? JSON.parse(activeItem.seo_data) : activeItem.seo_data) : {}),
          meta_title: blogMetaTitle,
          meta_description: blogMetaDesc,
          slug: blogSlug,
        });
      }
      await contentService.updateItem(activeItem.id, updates);
      setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, [`body_${langTab}`]: editBody, ...(isBlog ? { seo_data: updates.seo_data } : {}) } : i));
      setDirty(false);
      setWasEdited(editBody !== originalBody);
      if (!isBlog) setIsEditing(false);
      if (onUpdate) onUpdate();
      setSnackMsg('Opgeslagen');
    } catch (err) {
      console.error('Save failed:', err);
      setSnackMsg('Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleTranslate = async (targetLang) => {
    if (!activeItem) return;
    setTranslating(true);
    setTranslateLang(targetLang);
    try {
      await contentService.translateItem(activeItem.id, targetLang);
      // Reload item to get translated body
      const refreshed = await contentService.getItem(activeItem.id);
      const data = refreshed.data || refreshed;
      setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, ...data } : i));
      setLangTab(targetLang);
      setEditBody(data[`body_${targetLang}`] || '');
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setTranslating(false);
      setTranslateLang(null);
    }
  };

  const handleImprove = async () => {
    if (!activeItem) return;
    setImproving(true);
    setImproveResult(null);
    try {
      const r = await contentService.improveItem(activeItem.id);
      const data = r.data || r;
      setImproveResult(data);
      if (data.improved) {
        const refreshed = await contentService.getItem(activeItem.id);
        const itemData = refreshed.data || refreshed;
        setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, ...itemData } : i));
        setEditBody(cleanBodyForDisplay(itemData[`body_${langTab}`] || itemData.body_en || ''));
        // Reload SEO score to stay consistent
        await loadSeoScore(activeItem.id, activeItem.target_platform);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      setImproveResult({ improved: false, reason: err.message });
    } finally {
      setImproving(false);
    }
  };

  const handleGenerateAlternative = async () => {
    if (!activeItem) return;
    setGeneratingAlt(true);
    setAltError(null);
    setAltResult(null);
    try {
      const r = await contentService.generateAlternative(activeItem.id);
      const data = r.data || r;
      setAltResult(data);
    } catch (err) {
      setAltError(err.response?.data?.error?.message || err.message || 'Alternatief genereren mislukt');
    } finally {
      setGeneratingAlt(false);
    }
  };

  const handleUseAlternative = () => {
    if (!altResult?.alternative) return;
    setEditBody(altResult.alternative.body_en || '');
    setDirty(true);
    setIsEditing(true);
    setAltResult(null);
  };

  const handleImageUpdate = async () => {
    // Reload concept + fetch fresh item data for preview image sync
    const savedTab = activeTab; // Preserve current channel tab
    await loadConcept();
    setActiveTab(savedTab); // Restore channel tab after reload
    if (activeItem) {
      try {
        const r = await contentService.getItem(activeItem.id);
        resolveItemImages(r.data || r);
      } catch { /* silent */ }
    }
    if (onUpdate) onUpdate();
  };

  const insertEmoji = (emoji) => {
    const pos = cursorPos;
    setEditBody(prev => prev.substring(0, pos) + emoji + prev.substring(pos));
    const newPos = pos + emoji.length;
    setCursorPos(newPos);
    setDirty(true);
    setEmojiOpen(false);
    setTimeout(() => {
      const el = bodyRef.current?.querySelector('textarea');
      if (el) { el.selectionStart = newPos; el.selectionEnd = newPos; el.focus(); }
    }, 0);
  };

  // ─── Right Panel Loaders (Opdracht 3) ────────────────────
  const loadSeoScore = useCallback(async (itemId, platform) => {
    if (!itemId) return;
    setSeoLoading(true);
    try {
      const r = await contentService.getItemSeo(itemId, platform);
      setSeoData(r.data || r);
    } catch { setSeoData(null); }
    finally { setSeoLoading(false); }
  }, []);

  const loadBrandScore = useCallback(async (itemId) => {
    if (!itemId) return;
    setBrandScoreLoading(true);
    try {
      const r = await contentService.getBrandScore(itemId);
      setBrandScore(r.data || r);
    } catch { setBrandScore(null); }
    finally { setBrandScoreLoading(false); }
  }, []);

  const handleGenerateHashtags = useCallback(async () => {
    if (!activeItem) return;
    setHashtagLoading(true);
    try {
      const r = await contentService.generateHashtags(activeItem.id);
      const tags = r.data?.hashtags || r.hashtags || [];
      setHashtags(tags);
    } catch (e) { console.error('Hashtag generation failed:', e); }
    finally { setHashtagLoading(false); }
  }, [activeItem]);

  const loadPerformance = useCallback(async (itemId) => {
    if (!itemId) return;
    setPerfLoading(true);
    try {
      const r = await contentService.getPerformanceDetail(itemId);
      setPerfData(r.data || r);
    } catch { setPerfData(null); }
    finally { setPerfLoading(false); }
  }, []);

  // Resolve images for PlatformPreview.
  // Hard rule: the preview MUST show the actually-stored selection, never random
  // suggestions. We resolve every media_id format (URL, /path, "poi:N", numeric)
  // via the centralised /content/media/resolve-batch endpoint. Only if media_ids
  // is genuinely empty do we surface ONE AI suggestion as a placeholder.
  const resolveItemImages = useCallback(async (item) => {
    if (!item) { setResolvedImages([]); return; }
    // 1. Pre-resolved images on item (server-side hydrated) — trust them
    if (item.resolved_images?.length > 0) {
      setResolvedImages(item.resolved_images);
      return;
    }
    // 2. Resolve raw media_ids via backend batch resolver
    const mediaIds = item.media_ids
      ? (typeof item.media_ids === 'string' ? JSON.parse(item.media_ids) : item.media_ids)
      : [];
    if (Array.isArray(mediaIds) && mediaIds.length > 0) {
      try {
        const r = await contentService.resolveMediaBatch(mediaIds);
        // resolve-batch returns results in same order as input media_ids
        const resolved = (r.data || [])
          .filter(x => x && x.url)
          .map(x => ({ url: x.url, thumbnail: x.url, alt: x.alt || '', source: x.source }));
        if (resolved.length > 0) {
          setResolvedImages(resolved);
          return;
        }
        // All ids failed to resolve — fall through to placeholder suggestion
      } catch (err) {
        console.warn('[resolveItemImages] resolve-batch failed:', err.message);
      }
    }
    // 3. Empty media_ids → surface one AI suggestion as placeholder (clearly marked)
    try {
      const r = await contentService.suggestImages({ content_item_id: item.id });
      const imgs = (r.data || []).slice(0, 1).map(img => ({
        url: img.url || img.thumbnail,
        thumbnail: img.thumbnail || img.url,
        alt: img.poi_name || '',
        placeholder: true,
      }));
      setResolvedImages(imgs);
    } catch { setResolvedImages([]); }
  }, []);

  // Load scores + resolve images when active tab changes
  useEffect(() => {
    if (!activeItem) return;
    loadSeoScore(activeItem.id, activeItem.target_platform);
    loadBrandScore(activeItem.id);
    if (activeItem.approval_status === 'published') {
      loadPerformance(activeItem.id);
    } else {
      setPerfData(null);
    }
    resolveItemImages(activeItem);
  }, [activeTab, activeItem?.id]);

  // ─── Publish / Schedule Handlers ────────────────────────
  const handlePublishAll = async () => {
    setPublishing(true);
    let successCount = 0;
    let failCount = 0;
    try {
      const toPublish = items.filter(i => i.approval_status !== 'published');
      for (let idx = 0; idx < toPublish.length; idx++) {
        const item = toPublish[idx];
        setPublishStatus({ platform: item.target_platform, step: `${item.target_platform} publiceren (${idx + 1}/${toPublish.length})...`, detail: 'Afbeeldingen worden verwerkt' });
        try {
          await contentService.publishNow(item.id, { platform: item.target_platform });
          successCount++;
        } catch (err) {
          failCount++;
          console.error(`Publish ${item.target_platform} failed:`, err.message);
        }
      }
      await loadConcept();
      if (onUpdate) onUpdate();
      if (failCount === 0) {
        setSnackMsg(`${successCount} platform(s) succesvol gepubliceerd`);
      } else {
        setSnackMsg(`${successCount} gepubliceerd, ${failCount} mislukt — controleer social account koppelingen`);
      }
    } catch (err) {
      setSnackMsg(`Publicatie mislukt: ${err.message}`);
    } finally {
      setTimeout(() => { setPublishing(false); setPublishStatus(null); }, 1500);
    }
  };

  const handlePublishItem = async (itemId, platform) => {
    setPublishing(true);
    setPublishStatus({ platform, step: 'Verbinden met platform...', detail: null });
    try {
      // Show progress via timeout (actual API call is async)
      const statusTimer = setTimeout(() => {
        setPublishStatus(prev => prev ? { ...prev, step: 'Afbeeldingen verwerken...', detail: t('contentStudio.publish.pleaseWait', 'Even geduld a.u.b.') } : prev);
      }, 3000);
      const statusTimer2 = setTimeout(() => {
        setPublishStatus(prev => prev ? { ...prev, step: 'Bijna klaar...', detail: 'Content wordt gepubliceerd' } : prev);
      }, 10000);

      await contentService.publishNow(itemId, { platform });
      clearTimeout(statusTimer);
      clearTimeout(statusTimer2);
      setPublishStatus({ platform, step: 'Gepubliceerd!', detail: null });
      await loadConcept();
      if (onUpdate) onUpdate();
      setSnackMsg({ severity: 'success', text: `${platform} succesvol gepubliceerd` });
    } catch (err) {
      setSnackMsg({ severity: 'error', text: `Publicatie ${platform} mislukt: ${err.response?.data?.error?.message || err.message}` });
    } finally {
      setTimeout(() => { setPublishing(false); setPublishStatus(null); }, 1500);
    }
  };

  const handleRepublishItem = async (itemId, platform, forcePublish = false) => {
    setPublishing(true);
    setPublishStatus({ platform, step: 'Opnieuw publiceren...', detail: 'Status wordt gereset' });
    try {
      // Reset to draft, then publish (force_publish bypasses SEO check)
      await contentService.updateItem(itemId, { approval_status: 'approved', force_publish: forcePublish });
      setPublishStatus({ platform, step: 'Verbinden met platform...', detail: null });
      const statusTimer = setTimeout(() => {
        setPublishStatus(prev => prev ? { ...prev, step: 'Afbeeldingen verwerken...', detail: t('contentStudio.publish.pleaseWait', 'Even geduld a.u.b.') } : prev);
      }, 3000);
      await contentService.publishNow(itemId, { platform });
      clearTimeout(statusTimer);
      setPublishStatus({ platform, step: 'Gepubliceerd!', detail: null });
      await loadConcept();
      if (onUpdate) onUpdate();
      setSnackMsg({ severity: 'success', text: `${platform} opnieuw gepubliceerd` });
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      if (errCode === 'SEO_SCORE_TOO_LOW' && !forcePublish) {
        const seoScore = err.response?.data?.error?.seo_score || '?';
        if (window.confirm(`SEO-score is ${seoScore}/100 (minimum 70). Toch publiceren?`)) {
          setPublishing(false);
          setPublishStatus(null);
          return handleRepublishItem(itemId, platform, true);
        }
      }
      setSnackMsg({ severity: 'error', text: `Republish ${platform} mislukt: ${err.response?.data?.error?.message || err.message}` });
    } finally {
      setTimeout(() => { setPublishing(false); setPublishStatus(null); }, 1500);
    }
  };

  const handleScheduleAll = async () => {
    if (!scheduleDatetime) return;
    setPublishing(true);
    try {
      // Spreiding: zelfde kanaaltype krijgt +2 uur offset per extra post
      const platformCounts = {};
      const pad2 = n => String(n).padStart(2, '0');
      for (const item of items) {
        if (item.approval_status !== 'published' && item.approval_status !== 'scheduled') {
          const p = item.target_platform;
          platformCounts[p] = (platformCounts[p] || 0);
          const offsetHours = platformCounts[p] * 2; // 2 uur spreiding per duplicaat kanaal
          const baseTime = new Date(scheduleDatetime);
          baseTime.setHours(baseTime.getHours() + offsetHours);
          // Format as local time string — never use .toISOString() (converts to UTC)
          const localTime = `${baseTime.getFullYear()}-${pad2(baseTime.getMonth() + 1)}-${pad2(baseTime.getDate())} ${pad2(baseTime.getHours())}:${pad2(baseTime.getMinutes())}:00`;
          await contentService.scheduleItem(item.id, { scheduled_at: localTime, platform: p });
          platformCounts[p]++;
        }
      }
      setScheduleDialogOpen(false);
      setScheduleDatetime('');
      await loadConcept();
      if (onUpdate) onUpdate();
      setSnackMsg('Alle items ingepland (duplicaat kanalen met 2 uur spreiding)');
    } catch (err) {
      setSnackMsg(`Inplannen mislukt: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleScheduleItem = async (itemId, platform) => {
    if (!scheduleDatetime) return;
    setPublishing(true);
    try {
      await contentService.scheduleItem(itemId, { scheduled_at: scheduleDatetime, platform });
      setScheduleDialogOpen(false);
      setScheduleDatetime('');
      await loadConcept();
      if (onUpdate) onUpdate();
      setSnackMsg(`${platform} ingepland op ${new Date(scheduleDatetime).toLocaleString('nl-NL')}`);
    } catch (err) {
      setSnackMsg(`Inplannen mislukt: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const selectBestTime = (label) => {
    const dayMap = { maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6, zondag: 0 };
    const parts = label.toLowerCase().split(' ');
    if (parts.length < 2) return;
    const targetDay = dayMap[parts[0]];
    const [hh, mm] = (parts[1] || '12:00').split(':');
    if (targetDay === undefined) return;
    const now = new Date();
    let daysAhead = targetDay - now.getDay();
    if (daysAhead <= 0) daysAhead += 7;
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead, Number(hh), Number(mm || 0));
    const pad = n => String(n).padStart(2, '0');
    setScheduleDatetime(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`);
  };

  // ─── Aggregate Status ───────────────────────────────────
  const getAggregateStatus = () => {
    if (!items.length) return { label: 'Leeg', color: 'default' };
    const published = items.filter(i => i.approval_status === 'published').length;
    const scheduled = items.filter(i => i.approval_status === 'scheduled').length;
    if (published === items.length) return { label: 'Live', color: 'success' };
    if (published > 0) return { label: 'Deels live', color: 'info' };
    if (scheduled === items.length) return { label: 'Ingepland', color: 'warning' };
    if (scheduled > 0) return { label: 'Deels ingepland', color: 'warning' };
    return { label: 'Concept', color: 'default' };
  };

  // === Opdracht 10: Auto-save draft every 10s ===
  useEffect(() => {
    if (!dirty || !activeItem || !open) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        const updates = { [`body_${langTab}`]: editBody };
        await contentService.updateItem(activeItem.id, updates);
        setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, [`body_${langTab}`]: editBody } : i));
        setDirty(false);
        setWasEdited(editBody !== originalBody);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(null), 3000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setAutoSaveStatus(null);
      }
    }, 10000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [dirty, editBody, activeItem, langTab, open]);


  // === Opdracht 10: Dialog keyboard shortcuts ===
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      // F key: toggle fullscreen (only when not in input)
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
        return;
      }
      // Cmd/Ctrl+S: save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && activeItem) handleSaveBody();
        return;
      }
      // Cmd/Ctrl+Enter: save + close
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (dirty && activeItem) {
          handleSaveBody().then(() => { onClose(); });
        } else {
          onClose();
        }
        return;
      }
      // Cmd/Ctrl+P: publish (with confirm)
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        if (window.confirm('Alle platformen publiceren?')) handlePublishAll();
        return;
      }
      // Escape: close with unsaved changes warning
      if (e.key === 'Escape') {
        if (dirty) {
          if (window.confirm('Je hebt niet-opgeslagen wijzigingen. Sluiten zonder opslaan?')) {
            setDirty(false);
            onClose();
          }
        }
        // If not dirty, default Dialog Escape behavior handles close
        return;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, dirty, activeItem, handleSaveBody, onClose]);

  // === Opdracht 10: beforeunload warning ===
  useEffect(() => {
    if (!dirty || !open) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, open]);



    if (!open) return null;

  const aggStatus = getAggregateStatus();

  // Character counter
  const charCount = editBody.length;
  const charLimit = platformConfig.maxChars || 50000;






  const charPct = (charCount / charLimit) * 100;
  const charColor = charPct > 95 ? 'error' : charPct > 80 ? 'warning' : 'success';

  return (
    <Dialog open={open} onClose={() => { if (dirty) { if (window.confirm('Niet-opgeslagen wijzigingen. Sluiten?')) { setDirty(false); onClose(); } } else { onClose(); } }} maxWidth={false} fullWidth
      PaperProps={{ sx: isFullscreen
        ? { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh', m: 0, borderRadius: 0, display: 'flex', flexDirection: 'column' }
        : { width: '95vw', maxWidth: 1400, height: '90vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }
      }}>

      {/* ═══ Loading / Error ═══ */}
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><CircularProgress /></Box>
      ) : error ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <Button onClick={onClose}>{t('common.close', 'Sluiten')}</Button>
        </Box>
      ) : concept ? (
        <>
          {/* ═══ HEADER ═══ */}
          <DialogTitle sx={{ pb: 0, px: 3, pt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1, mr: 2 }}>
                {editingTitle ? (
                  <TextField value={titleValue} onChange={e => setTitleValue(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') { setTitleValue(concept.title || ''); setEditingTitle(false); } }}
                    autoFocus fullWidth variant="standard"
                    InputProps={{ sx: { fontSize: '1.25rem', fontWeight: 700 },
                      endAdornment: savingTitle ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : null }} />
                ) : (
                  <Typography variant="h6" sx={{ fontWeight: 700, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                    onClick={() => setEditingTitle(true)} title="Klik om titel te bewerken">
                    {concept.title || 'Naamloos concept'}
                    <EditIcon sx={{ fontSize: 14, ml: 0.5, opacity: 0.4, verticalAlign: 'middle' }} />
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 0.5 }}>
                  <Chip label={CONTENT_TYPE_LABELS[concept.content_type] || concept.content_type} size="small" variant="outlined" />
                  <Chip label={aggStatus.label} size="small" color={aggStatus.color} />
                  <Typography variant="caption" color="text.secondary">
                    {items.length} {items.length === 1 ? 'platform' : 'platformen'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(concept.updated_at || concept.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Typography>
                  {/* Doelgroep Selector */}
                  <Chip icon={<PeopleIcon sx={{ fontSize: 14 }} />}
                    label={selectedPersonaObj ? `${selectedPersonaObj.is_primary ? '★ ' : ''}${selectedPersonaObj.name}` : 'Doelgroep'}
                    size="small" variant={selectedPersonaObj ? 'filled' : 'outlined'} color={selectedPersonaObj ? 'primary' : 'default'}
                    onClick={e => setPersonaAnchor(e.currentTarget)} sx={{ cursor: 'pointer' }} />
                  <Menu anchorEl={personaAnchor} open={Boolean(personaAnchor)} onClose={() => setPersonaAnchor(null)}>
                    <MenuItem onClick={() => { setSelectedPersona(null); setPersonaAnchor(null); }} selected={!selectedPersona}>
                      <Typography variant="body2" color="text.secondary">Geen doelgroep</Typography>
                    </MenuItem>
                    <Divider />
                    {personas.map(p => (
                      <MenuItem key={p.id} onClick={() => { setSelectedPersona(p.id); setPersonaAnchor(null); }} selected={selectedPersona === p.id}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: p.is_primary ? 600 : 400 }}>{p.is_primary ? '★ ' : ''}{p.name}</Typography>
                          {p.age_range && <Typography variant="caption" color="text.secondary">{p.age_range}</Typography>}
                        </Box>
                      </MenuItem>
                    ))}
                    {personas.length === 0 && <MenuItem disabled><Typography variant="caption" color="text.secondary">Geen personas geconfigureerd</Typography></MenuItem>}
                  </Menu>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {/* Auto-save indicator */}
                {autoSaveStatus === 'saving' && <Chip icon={<CircularProgress size={12} />} label="Opslaan..." size="small" sx={{ height: 20, fontSize: 10 }} />}
                {autoSaveStatus === 'saved' && <Chip icon={<CloudDoneIcon sx={{ fontSize: 14 }} />} label="Opgeslagen" size="small" color="success" sx={{ height: 20, fontSize: 10 }} />}
                {dirty && !autoSaveStatus && <Chip label="Niet opgeslagen" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#FFB74D', color: '#5D4037' }} />}
                <Tooltip title={isFullscreen ? 'Verklein (F)' : 'Volledig scherm (F)'}>
                  <IconButton onClick={() => setIsFullscreen(f => !f)} size="small">
                    {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                  </IconButton>
                </Tooltip>
                <IconButton onClick={() => { if (dirty) { if (window.confirm('Niet-opgeslagen wijzigingen. Sluiten?')) { setDirty(false); onClose(); } } else { onClose(); } }} sx={{ mt: -0.5 }}><CloseIcon /></IconButton>
              </Box>
            </Box>
          </DialogTitle>

          <Divider sx={{ mt: 1 }} />

          {/* ═══ PLATFORM TABS ═══ */}
          {items.length > 0 && (
            <Tabs value={activeTab} onChange={(_, v) => { if (v < items.length) setActiveTab(v); else setAddPlatformOpen(true); }} variant="scrollable" scrollButtons="auto"
              sx={{
                px: 3, minHeight: 44, borderBottom: 1, borderColor: 'divider',
                // Opdracht 5 micro-interactie #1: smooth color transition bij tab-wissel
                '& .MuiTab-root': {
                  minHeight: 44, textTransform: 'none',
                  transition: 'color 200ms ease, background-color 200ms ease, border-bottom-color 200ms ease',
                },
                '& .MuiTabs-indicator': { transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)' },
                '@media (prefers-reduced-motion: reduce)': {
                  '& .MuiTab-root, & .MuiTabs-indicator': { transition: 'none' },
                },
              }}>
              {items.map((item, idx) => {
                const cfg = PLATFORM_CONFIG[item.target_platform] || PLATFORM_CONFIG.website;
                return (
                  <Tab key={item.id} label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <cfg.Icon sx={{ fontSize: 18, color: cfg.color }} />
                      <span>{cfg.label}</span>
                      <Chip label={item.approval_status === 'published' ? '✓' : item.approval_status === 'scheduled' ? '⏳' : item.approval_status === 'failed' ? '✗' : '—'}
                        size="small" variant={item.approval_status === 'scheduled' ? 'outlined' : 'filled'}
                        color={STATUS_COLORS[item.approval_status] || 'default'}
                        sx={{ height: 18, fontSize: 10, ml: 0.5, minWidth: 24, fontWeight: 700,
                          ...(item.approval_status === 'scheduled' ? { borderColor: '#ed6c02', color: '#ed6c02', borderWidth: 2 } : {})
                        }} />
                    </Box>
                  } sx={{ borderBottom: activeTab === idx ? `3px solid ${cfg.color}` : 'none' }} />
                );
              })}
              <Tab
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#5E8B7E' }}><AddIcon sx={{ fontSize: 16 }} /><span>Platform</span></Box>}
                sx={{ minWidth: 'auto', color: '#5E8B7E' }}
              />
            </Tabs>
          )}

          {/* ═══ 2-PANEL BODY ═══ */}
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* ─── LEFT PANEL (60%) ─── */}
            <Box sx={{ width: '60%', borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              {items.length === 0 && concept?.approval_status === 'generating' ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CircularProgress size={32} sx={{ mb: 2 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>Content wordt gegenereerd...</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Dit kan 1-3 minuten duren voor een blog post met vertalingen.</Typography>
                  <Button size="small" sx={{ mt: 2 }} onClick={loadConcept}>Ververs status</Button>
                </Box>
              ) : items.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="info">Dit concept heeft nog geen platform versies.</Alert></Box>
              ) : activeItem && isBlog ? (
                /* ═══ BLOG MODUS — TipTap WYSIWYG + SEO Metadata ═══ */
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Image Section */}
                  <ContentImageSection itemId={activeItem.id} item={activeItem} onUpdate={handleImageUpdate} />

                  {/* Blog Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LanguageIcon sx={{ fontSize: 20, color: '#5E8B7E' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Blog Editor</Typography>
                    {(() => {
                      const score = seoData?.overallScore ?? activeItem.seo_score;
                      return score != null ? (
                        <AnimatedScoreChip score={score} label={`SEO ${score}/100`} size="small"
                          color={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error'} />
                      ) : null;
                    })()}
                    {dirty && <Chip label="Niet opgeslagen" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#FFB74D', color: '#5D4037' }} />}
                    <Box sx={{ flex: 1 }} />
                    <Button variant="contained" size="small" startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
                      onClick={handleSaveBody} disabled={saving || !dirty}>Opslaan</Button>
                    <Tooltip title="AI Herschrijven">
                      <IconButton size="small" onClick={handleImprove} disabled={improving || generatingAlt}>
                        {improving ? <CircularProgress size={16} /> : <AutoAwesomeIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Alternatief genereren (andere invalshoek)">
                      <IconButton size="small" onClick={handleGenerateAlternative} disabled={improving || generatingAlt}>
                        {generatingAlt ? <CircularProgress size={16} /> : <ShuffleIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {improveResult && (
                    <Alert severity={improveResult.improved ? 'success' : 'info'} onClose={() => setImproveResult(null)} sx={{ py: 0.5 }}>
                      {improveResult.improved
                        ? `Content verbeterd! Score: ${improveResult.original_score || '?'} → ${seoData?.overallScore || improveResult.final_score || '?'}/100`
                        : `Niet verbeterd: ${improveResult.reason || 'Score was al hoog genoeg'}`}
                    </Alert>
                  )}

                  {/* TipTap Rich Text Editor */}
                  <RichTextField
                    value={editBody}
                    onChange={val => { setEditBody(val); setDirty(true); }}
                    placeholder="Begin met schrijven..."
                    sx={{ '& .ProseMirror': { minHeight: 300 } }}
                  />

                  {/* Word counter */}
                  {(() => {
                    const text = editBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    const wordCount = text ? text.split(/\s+/).length : 0;
                    const pct = Math.min(100, (wordCount / 1500) * 100);
                    const color = wordCount >= 800 && wordCount <= 1500 ? 'success' : wordCount >= 500 ? 'warning' : 'error';
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={pct} color={color} sx={{ flex: 1, height: 4, borderRadius: 2 }} />
                        <Typography variant="caption" color={`${color}.main`} sx={{ fontWeight: 600, minWidth: 90, textAlign: 'right' }}>
                          {wordCount} woorden {wordCount >= 800 && wordCount <= 1500 ? '✓' : `(${wordCount < 800 ? 'min 800' : 'max 1500'})`}
                        </Typography>
                      </Box>
                    );
                  })()}

                  {/* Heading Outline */}
                  {(() => {
                    const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
                    const headings = [];
                    let match;
                    while ((match = headingRegex.exec(editBody)) !== null) {
                      headings.push({ level: Number(match[1]), text: match[2].replace(/<[^>]+>/g, '') });
                    }
                    return headings.length > 0 ? (
                      <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>Heading Structuur</Typography>
                        {headings.map((h, i) => (
                          <Typography key={i} variant="caption" sx={{ display: 'block', pl: h.level === 3 ? 2 : 0, color: 'text.secondary' }}>
                            {h.level === 2 ? 'H2' : '  H3'} — {h.text}
                          </Typography>
                        ))}
                      </Paper>
                    ) : null;
                  })()}

                  <Divider />

                  {/* SEO Metadata Panel */}
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>SEO Metadata</Typography>
                    <TextField label="Meta Title" value={blogMetaTitle} onChange={e => { setBlogMetaTitle(e.target.value); setDirty(true); }}
                      fullWidth size="small" sx={{ mb: 1.5 }}
                      helperText={`${blogMetaTitle.length}/60 tekens ${blogMetaTitle.length > 60 ? '(te lang)' : ''}`}
                      error={blogMetaTitle.length > 60} />
                    <TextField label="Meta Description" value={blogMetaDesc} onChange={e => { setBlogMetaDesc(e.target.value); setDirty(true); }}
                      fullWidth size="small" multiline rows={2} sx={{ mb: 1.5 }}
                      helperText={`${blogMetaDesc.length}/160 tekens ${blogMetaDesc.length > 160 ? '(te lang)' : ''}`}
                      error={blogMetaDesc.length > 160} />
                    <TextField label="URL Slug" value={blogSlug} onChange={e => { setBlogSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); setDirty(true); }}
                      fullWidth size="small"
                      helperText={`calpetrip.com/blog/${blogSlug}`} />
                  </Paper>

                  {/* Language tabs for blog */}
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>Vertalingen</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {LANGS.map(lang => {
                        const hasBody = !!activeItem[`body_${lang}`];
                        const isActive = langTab === lang;
                        return (
                          <Chip key={lang} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            {lang.toUpperCase()} {hasBody ? <CheckIcon sx={{ fontSize: 12 }} /> : null}
                          </Box>} size="small" variant={isActive ? 'filled' : hasBody ? 'filled' : 'outlined'}
                            color={isActive ? 'primary' : hasBody ? 'success' : 'default'}
                            onClick={() => hasBody && setLangTab(lang)}
                            sx={{ height: 26, fontSize: 11, cursor: hasBody ? 'pointer' : 'default', fontWeight: isActive ? 700 : 400 }} />
                        );
                      })}
                    </Box>
                    {LANGS.filter(l => !activeItem[`body_${l}`]).length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TranslateIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Vertaal naar:</Typography>
                        {LANGS.filter(l => !activeItem[`body_${l}`]).map(l => (
                          <Chip key={l} label={l.toUpperCase()} size="small" variant="outlined"
                            icon={<TranslateIcon sx={{ fontSize: 12 }} />} onClick={() => handleTranslate(l)}
                            disabled={translating} sx={{ height: 22, fontSize: 10, cursor: 'pointer' }} />
                        ))}
                      </Box>
                    )}
                  </Paper>
                </Box>

              ) : activeItem ? (
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>

                  {/* ── Image Section ── */}
                  <ContentImageSection
                    itemId={activeItem.id}
                    item={activeItem}
                    onUpdate={handleImageUpdate}
                  />

                  {/* ── Platform Header + Action Buttons ── */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: platformConfig.color, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <platformConfig.Icon sx={{ fontSize: 18, color: '#fff' }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{platformConfig.label}</Typography>
                    {(() => {
                      // Single source of truth: live seoData > stored seo_score
                      const score = seoData?.overallScore ?? activeItem.seo_score;
                      return score != null ? (
                        <AnimatedScoreChip score={score} label={`SEO ${score}/100`} size="small"
                          color={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error'} />
                      ) : null;
                    })()}
                    {(dirty || wasEdited) && (
                      <Chip label={dirty ? 'Niet opgeslagen' : 'Aangepast'} size="small"
                        sx={{ height: 20, fontSize: 10, bgcolor: dirty ? '#FFB74D' : '#FDD835', color: '#5D4037' }} />
                    )}
                    <Box sx={{ flex: 1 }} />
                    {/* Action buttons */}
                    <Tooltip title={isEditing ? 'Sluiten' : 'Bewerken'}>
                      <IconButton size="small" color={isEditing ? 'primary' : 'default'}
                        onClick={() => { if (isEditing && dirty) { handleSaveBody(); } else { setIsEditing(!isEditing); } }}>
                        {isEditing ? <SaveIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="AI Herschrijven">
                      <IconButton size="small" onClick={handleImprove} disabled={improving || generatingAlt}>
                        {improving ? <CircularProgress size={16} /> : <AutoAwesomeIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Alternatief genereren (andere invalshoek)">
                      <IconButton size="small" onClick={handleGenerateAlternative} disabled={improving || generatingAlt}>
                        {generatingAlt ? <CircularProgress size={16} /> : <ShuffleIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Emoji">
                      <IconButton size="small" onClick={() => setEmojiOpen(!emojiOpen)}>
                        <InsertEmoticonIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Emoji Picker with Categories */}
                  {emojiOpen && (
                    <EmojiPicker onSelect={insertEmoji} onClose={() => setEmojiOpen(false)} />
                  )}

                  {/* AI Improve Result */}
                  {improveResult && (
                    <Alert severity={improveResult.improved ? 'success' : 'info'} onClose={() => setImproveResult(null)} sx={{ py: 0.5 }}>
                      {improveResult.improved
                        ? `Content verbeterd! Score: ${improveResult.original_score || '?'} → ${seoData?.overallScore || improveResult.final_score || improveResult.seo_score || '?'}/100`
                        : `Niet verbeterd: ${improveResult.reason || 'Score was al hoog genoeg'}`}
                    </Alert>
                  )}

                  {/* ── Body Editor / Viewer ── */}
                  {isEditing ? (
                    <Box ref={bodyRef}>
                      <TextField
                        multiline fullWidth minRows={10} maxRows={20}
                        value={editBody}
                        onChange={e => { setEditBody(e.target.value); setDirty(true); }}
                        onSelect={e => setCursorPos(e.target.selectionStart)}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6,
                            borderLeft: `4px solid ${platformConfig.color}`,
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button variant="contained" size="small" startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
                          onClick={handleSaveBody} disabled={saving || !dirty}>
                          Opslaan
                        </Button>
                        <Button size="small" onClick={() => { setIsEditing(false); setEditBody(activeItem[`body_${langTab}`] || ''); setDirty(false); }}>
                          Annuleren
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, borderLeft: `4px solid ${platformConfig.color}`,
                      minHeight: 120, whiteSpace: isBlog ? 'normal' : 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.6,
                      maxHeight: 350, overflowY: 'auto', cursor: 'pointer',
                      '& h2': { fontSize: '1.25rem', fontWeight: 700, mt: 2, mb: 1 },
                      '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 1.5, mb: 0.5 },
                      '& p': { mb: 1 },
                      '& a': { color: 'primary.main', textDecoration: 'underline' },
                      '& strong': { fontWeight: 600 },
                    }}
                      onClick={() => setIsEditing(true)} title="Klik om te bewerken">
                      {editBody ? (
                        isBlog && editBody.includes('<')
                          ? <div dangerouslySetInnerHTML={{ __html: editBody }} />
                          : renderBodyWithHighlights(editBody)
                      ) : (
                        <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Geen content beschikbaar, klik om te bewerken
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Character Counter Bar */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={Math.min(100, charPct)} color={charColor}
                      sx={{ flex: 1, height: 4, borderRadius: 2 }} />
                    <Typography variant="caption" color={`${charColor}.main`} sx={{ fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                      {charCount}/{charLimit}
                    </Typography>
                  </Box>

                  {/* ── Language / Translation Tabs ── */}
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>Vertalingen</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {LANGS.map(lang => {
                        const hasBody = !!activeItem[`body_${lang}`];
                        const isActive = langTab === lang;
                        const isTranslatingThis = translating && translateLang === lang;
                        return (
                          <Chip
                            key={lang}
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                {lang.toUpperCase()}
                                {isTranslatingThis ? <CircularProgress size={10} /> : hasBody ? <CheckIcon sx={{ fontSize: 12 }} /> : null}
                              </Box>
                            }
                            size="small"
                            variant={isActive ? 'filled' : hasBody ? 'filled' : 'outlined'}
                            color={isActive ? 'primary' : hasBody ? 'success' : 'default'}
                            onClick={() => {
                              if (hasBody) {
                                setLangTab(lang);
                              }
                            }}
                            sx={{
                              height: 26, fontSize: 11, cursor: hasBody ? 'pointer' : 'default',
                              fontWeight: isActive ? 700 : 400,
                              border: isActive ? '2px solid' : undefined,
                              borderColor: isActive ? 'primary.main' : undefined,
                            }}
                          />
                        );
                      })}
                    </Box>

                    {/* Translate missing languages */}
                    {LANGS.filter(l => !activeItem[`body_${l}`]).length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TranslateIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Vertaal naar:</Typography>
                        {LANGS.filter(l => !activeItem[`body_${l}`]).map(l => (
                          <Chip key={l} label={l.toUpperCase()} size="small" variant="outlined"
                            icon={<TranslateIcon sx={{ fontSize: 12 }} />}
                            onClick={() => handleTranslate(l)}
                            disabled={translating}
                            sx={{ height: 22, fontSize: 10, cursor: 'pointer' }} />
                        ))}
                      </Box>
                    )}
                  </Paper>

                  {/* Published / Error info */}
                  {activeItem.published_at && (
                    <Alert severity="success" sx={{ py: 0.5 }}>
                      Gepubliceerd op {new Date(activeItem.published_at).toLocaleString('nl-NL')}
                      {activeItem.publish_url && <Button size="small" href={activeItem.publish_url} target="_blank" sx={{ ml: 1 }}>Bekijk post</Button>}
                    </Alert>
                  )}
                  {activeItem.approval_status === 'failed' && activeItem.publish_error && (
                    <Alert severity="error" sx={{ py: 0.5 }}>Publicatie mislukt: {activeItem.publish_error}</Alert>
                  )}
                </Box>
              ) : null}
            </Box>

            {/* ─── RIGHT PANEL (40%) ─── */}
            <Box sx={{ width: '40%', display: 'flex', flexDirection: 'column', overflow: 'auto', bgcolor: 'grey.50' }}>
              <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* ══ ACTIES SECTIE ══ */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PublishIcon sx={{ fontSize: 18 }} /> Acties
                  </Typography>

                  {/* Publish status indicator */}
                  {publishing && publishStatus && (
                    <Alert severity="info" icon={<CircularProgress size={16} />} sx={{ mb: 1.5, py: 0.5, '& .MuiAlert-message': { width: '100%' } }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>{publishStatus.step}</Typography>
                      {publishStatus.detail && (
                        <Typography variant="caption" color="text.secondary">{publishStatus.detail}</Typography>
                      )}
                      <LinearProgress sx={{ mt: 0.5, borderRadius: 1 }} />
                    </Alert>
                  )}

                  {/* Batch actions */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                    <Button variant="contained" size="small" startIcon={publishing ? <CircularProgress size={14} /> : <PublishIcon />}
                      onClick={handlePublishAll} disabled={publishing || items.every(i => i.approval_status === 'published')} fullWidth>
                      Publiceer alle
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<ScheduleIcon />}
                      onClick={() => { setPublishTarget(null); setScheduleDialogOpen(true); }}
                      disabled={publishing} fullWidth>
                      Plan alle in
                    </Button>
                  </Box>

                  {/* Hashtag generation */}
                  {activeItem && (
                    <Box sx={{ mb: 1.5 }}>
                      <Button variant="outlined" size="small" fullWidth
                        startIcon={hashtagLoading ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
                        onClick={handleGenerateHashtags} disabled={hashtagLoading}>
                        {hashtagLoading ? 'Hashtags genereren...' : 'Auto Hashtags'}
                      </Button>
                      {hashtags.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {hashtags.map((tag, i) => (
                            <Chip key={i} label={tag} size="small" sx={{ fontSize: 10, height: 20, cursor: 'pointer' }}
                              onClick={() => {
                                navigator.clipboard.writeText(hashtags.join(' '));
                              }} />
                          ))}
                          <Chip label="Kopieer alle" size="small" color="primary" sx={{ fontSize: 10, height: 20, cursor: 'pointer' }}
                            onClick={() => navigator.clipboard.writeText(hashtags.join(' '))} />
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Per-platform actions */}
                  {items.map(it => {
                    const cfg = PLATFORM_CONFIG[it.target_platform] || PLATFORM_CONFIG.website;
                    const isPublished = it.approval_status === 'published';
                    const isScheduled = it.approval_status === 'scheduled';
                    return (
                      <Box key={it.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.75, borderTop: 1, borderColor: 'divider' }}>
                        <cfg.Icon sx={{ fontSize: 16, color: cfg.color }} />
                        <Typography variant="caption" sx={{ flex: 1, fontWeight: activeItem?.id === it.id ? 600 : 400 }}>{cfg.label}</Typography>
                        {!isPublished && !isScheduled && (
                          <>
                            <Tooltip title="Nu publiceren">
                              <IconButton size="small" color="success" onClick={() => handlePublishItem(it.id, it.target_platform)} disabled={publishing}>
                                <PublishIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Inplannen">
                              <IconButton size="small" onClick={() => { setPublishTarget(it.id); setScheduleDialogOpen(true); }} disabled={publishing}>
                                <ScheduleIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {isPublished && (
                          <>
                            <Tooltip title="Opnieuw publiceren">
                              <IconButton size="small" color="primary" onClick={() => handleRepublishItem(it.id, it.target_platform)} disabled={publishing}>
                                <RefreshIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Herplannen">
                              <IconButton size="small" onClick={() => { setPublishTarget(it.id); setScheduleDialogOpen(true); }} disabled={publishing}>
                                <ScheduleIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Chip
                          icon={isScheduled ? <ScheduleIcon sx={{ fontSize: '12px !important' }} /> : undefined}
                          label={isPublished ? 'Live' : isScheduled ? 'Gepland' : it.approval_status === 'failed' ? 'Mislukt' : it.approval_status}
                          size="small" variant={isScheduled ? 'outlined' : 'filled'}
                          color={STATUS_COLORS[it.approval_status] || 'default'}
                          sx={{ height: 20, fontSize: 10, fontWeight: 600,
                            ...(isScheduled ? { borderColor: '#ed6c02', color: '#ed6c02', '& .MuiChip-icon': { color: '#ed6c02' } } : {})
                          }} />
                        {items.length > 1 && (
                          <Tooltip title="Platform versie verwijderen">
                            <IconButton size="small" color="error" onClick={() => handleDeletePlatform(it.id)} disabled={deletingItemId === it.id || isPublished}>
                              {deletingItemId === it.id ? <CircularProgress size={12} /> : <DeleteIcon sx={{ fontSize: 14 }} />}
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    );
                  })}
                </Paper>

                {/* ══ KWALITEIT SECTIE ══ */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <BarChartIcon sx={{ fontSize: 18 }} /> Kwaliteit
                    </Typography>
                    <Tooltip title="Heranalyse">
                      <IconButton size="small" onClick={() => { if (activeItem) { loadSeoScore(activeItem.id, activeItem.target_platform); loadBrandScore(activeItem.id); } }}
                        disabled={seoLoading || brandScoreLoading}>
                        <RefreshIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* SEO / Social Score */}
                  {seoLoading ? (
                    <Box sx={{ textAlign: 'center', py: 1 }}><CircularProgress size={20} /></Box>
                  ) : seoData ? (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700,
                          color: (seoData.overallScore || 0) >= 70 ? 'success.main' : (seoData.overallScore || 0) >= 50 ? 'warning.main' : 'error.main' }}>
                          {seoData.overallScore || 0}
                        </Typography>
                        <Box>
                          <Typography variant="body2" color="text.secondary">/ 100</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activeItem ? `${platformConfig.label} Score` : 'Social Score'}
                          </Typography>
                        </Box>
                      </Box>

                      {(seoData.overallScore || 0) < 70 && (
                        <Alert severity="warning" sx={{ mb: 1, py: 0, '& .MuiAlert-message': { fontSize: 11, width: '100%' } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span>SEO-score {seoData.overallScore}/100 (min. 70)</span>
                            {activeItem && (
                              <Button size="small" variant="text" color="warning"
                                sx={{ fontSize: 10, minWidth: 'auto', py: 0, px: 0.5, ml: 1, textTransform: 'none' }}
                                onClick={() => handlePublishItem(activeItem.id, activeItem.target_platform)}
                                disabled={publishing}>
                                Toch publiceren
                              </Button>
                            )}
                          </Box>
                        </Alert>
                      )}

                      {/* Checks Breakdown */}
                      {(seoData.checks || []).slice(0, 6).map((check, i) => (
                        <Box key={i} sx={{ mb: 0.8 }}>
                          <Tooltip title={check.details || ''} placement="left" arrow>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
                            <Typography variant="caption" sx={{ fontSize: 10 }}>{check.name}</Typography>
                            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600 }}>{check.score}/{check.maxScore}</Typography>
                          </Box>
                          </Tooltip>
                          <LinearProgress variant="determinate" value={(check.score / (check.maxScore || 1)) * 100}
                            color={check.score >= check.maxScore ? 'success' : check.score >= check.maxScore * 0.6 ? 'warning' : 'error'}
                            sx={{ height: 3, borderRadius: 2 }} />
                        </Box>
                      ))}
                    </Box>
                  ) : activeItem ? (
                    <Button size="small" onClick={() => loadSeoScore(activeItem.id, activeItem.target_platform)} startIcon={<BarChartIcon />}>
                      Score laden
                    </Button>
                  ) : null}

                  <Divider sx={{ my: 1.5 }} />

                  {/* Brand Score */}
                  {brandScoreLoading ? (
                    <Box sx={{ textAlign: 'center', py: 1 }}><CircularProgress size={20} /></Box>
                  ) : brandScore ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700,
                          color: (brandScore.score || 0) >= 70 ? 'success.main' : (brandScore.score || 0) >= 50 ? 'warning.main' : 'error.main' }}>
                          {brandScore.score || 0}
                        </Typography>
                        <Box>
                          <Typography variant="body2" color="text.secondary">/ 100</Typography>
                          <Typography variant="caption" color="text.secondary">Brand Score</Typography>
                        </Box>
                      </Box>

                      {brandScore.tone_match !== undefined && (
                        <Box sx={{ mb: 0.8 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" sx={{ fontSize: 10 }}>Tone Match</Typography>
                            <Typography variant="caption" sx={{ fontSize: 10 }}>{Math.round(brandScore.tone_match)}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={brandScore.tone_match || 0}
                            color={brandScore.tone_match >= 70 ? 'success' : 'warning'} sx={{ height: 4, borderRadius: 2 }} />
                        </Box>
                      )}

                      {brandScore.vocabulary_match !== undefined && (
                        <Box sx={{ mb: 0.8 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" sx={{ fontSize: 10 }}>Woordenschat</Typography>
                            <Typography variant="caption" sx={{ fontSize: 10 }}>{Math.round(brandScore.vocabulary_match)}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={brandScore.vocabulary_match || 0}
                            color={brandScore.vocabulary_match >= 70 ? 'success' : 'warning'} sx={{ height: 4, borderRadius: 2 }} />
                        </Box>
                      )}

                      {/* Verbeterpunten: altijd tonen als score < 95. Bij geen suggesties van API, generieke hint */}
                      {(brandScore.score || 0) < 95 && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 10 }}>Verbeterpunten:</Typography>
                          {brandScore.suggestions?.length > 0 ? (
                            brandScore.suggestions.map((s, i) => (
                              <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, fontSize: 10 }}>
                                • {s}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, fontSize: 10 }}>
                              • Gebruik het AI Herschrijven om de toon beter af te stemmen op je merkprofiel
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  ) : activeItem ? (
                    <Button size="small" onClick={() => loadBrandScore(activeItem.id)} startIcon={<AutoAwesomeIcon />}>
                      Brand Score laden
                    </Button>
                  ) : null}
                </Paper>

                {/* ══ PREVIEW SECTIE ══ */}
                {activeItem && isBlog ? (
                  /* Blog: website preview */
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <VisibilityIcon sx={{ fontSize: 18 }} /> Website Preview
                    </Typography>
                    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: '#fff' }}>
                      <Typography variant="caption" color="primary.main" sx={{ display: 'block', mb: 0.5 }}>
                        calpetrip.com/blog/{blogSlug || 'slug'}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, mb: 0.5, color: '#1a0dab' }}>
                        {blogMetaTitle || concept?.title || 'Blog titel'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                        {blogMetaDesc || 'Meta description verschijnt hier in zoekresultaten...'}
                      </Typography>
                    </Box>
                  </Paper>
                ) : activeItem && activeItem.target_platform !== 'website' ? (
                  /* Social: platform preview */
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <VisibilityIcon sx={{ fontSize: 18 }} /> Preview
                    </Typography>
                    <PlatformPreview
                      content={{ ...activeItem, resolved_images: resolvedImages }}
                      targetPlatform={activeItem.target_platform}
                      selectedLanguage={langTab}
                      availablePlatforms={items.map(i => i.target_platform).filter((v, i, a) => a.indexOf(v) === i)}
                      destinationName={concept?.destination_name || concept?.destination_code || ''}
                      onPlatformChange={(platform) => {
                        const idx = items.findIndex(i => i.target_platform === platform);
                        if (idx >= 0) setActiveTab(idx);
                      }}
                      onRepurpose={() => setAddPlatformOpen(true)}
                    />
                  </Paper>
                ) : null}

                {/* ══ PERFORMANCE DATA (na publicatie) ══ */}
                {activeItem?.approval_status === 'published' && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TrendingUpIcon sx={{ fontSize: 18 }} /> Performance
                    </Typography>
                    {perfLoading ? (
                      <CircularProgress size={20} />
                    ) : perfData ? (
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{perfData.reach?.toLocaleString() || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">Bereik</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{perfData.engagement?.toLocaleString() || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">Engagement</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{perfData.clicks?.toLocaleString() || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">Clicks</Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">Nog geen performance data beschikbaar</Typography>
                    )}
                    {activeItem.published_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Gepubliceerd: {new Date(activeItem.published_at).toLocaleString('nl-NL')}
                      </Typography>
                    )}
                  </Paper>
                )}

                {/* ══ INFO SECTIE ══ */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Info</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {concept.ai_model && <Typography variant="caption" color="text.secondary">AI Model: {concept.ai_model}</Typography>}
                    {concept.content_pillar && <Typography variant="caption" color="text.secondary">Pillar: {concept.content_pillar}</Typography>}
                    {concept.keywords && <Typography variant="caption" color="text.secondary">Keywords: {Array.isArray(concept.keywords) ? concept.keywords.join(', ') : concept.keywords}</Typography>}
                    <Typography variant="caption" color="text.secondary">Aangemaakt: {new Date(concept.created_at).toLocaleString('nl-NL')}</Typography>
                    {selectedPersonaObj && <Typography variant="caption" color="text.secondary">Doelgroep: {selectedPersonaObj.name}</Typography>}
                    {activeItem?.ai_model && <Typography variant="caption" color="text.secondary">Platform AI: {activeItem.ai_model}</Typography>}
                  </Box>
                </Paper>
              </Box>
            </Box>
          </Box>

          {/* ═══ FOOTER ═══ */}
          <Divider />
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button onClick={onClose} color="inherit">{t('common.close', 'Sluiten')}</Button>
          </DialogActions>

          {/* ═══ SCHEDULE DIALOG ═══ */}
          <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Inplannen</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {publishTarget ? 'Plan dit platform-item in op een specifiek tijdstip.' : 'Plan alle platform-versies tegelijk in.'}
              </Typography>

              {/* Best Time Suggestions */}
              {activeItem?.target_platform && activeItem.target_platform !== 'website' && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
                    Aanbevolen tijdstippen ({platformConfig.label}):
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(() => {
                      const defaults = BEST_TIME_DEFAULTS[activeItem.target_platform] || BEST_TIME_DEFAULTS.instagram;
                      // HH:MM uit scheduleDatetime (datetime-local format: YYYY-MM-DDTHH:MM)
                      const selectedHm = scheduleDatetime ? scheduleDatetime.slice(11, 16) : null;
                      // Extract HH:MM uit chip label "Dinsdag 11:00" → "11:00"
                      const extractHm = (label) => {
                        const m = label.match(/(\d{1,2}):(\d{2})/);
                        return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
                      };
                      const times = [defaults.best, ...defaults.alt];
                      const timesHm = times.map(extractHm);
                      const hasMatch = selectedHm && timesHm.includes(selectedHm);
                      return times.map((t, i) => {
                        const isSelected = hasMatch ? (timesHm[i] === selectedHm) : (i === 0 && !selectedHm);
                        return (
                          <Chip key={i} label={t} color={isSelected ? 'success' : 'default'} size="small"
                            variant={isSelected ? 'filled' : 'outlined'}
                            onClick={() => selectBestTime(t)} sx={{ cursor: 'pointer' }} />
                        );
                      });
                    })()}
                  </Box>
                </Box>
              )}

              <TextField type="datetime-local" label="Datum en tijd" value={scheduleDatetime}
                onChange={e => setScheduleDatetime(e.target.value)}
                InputLabelProps={{ shrink: true }} fullWidth size="small" sx={{ mb: 2 }} />

              <Button variant="contained" fullWidth startIcon={publishing ? <CircularProgress size={14} /> : <ScheduleIcon />}
                onClick={() => publishTarget ? handleScheduleItem(publishTarget, activeItem?.target_platform) : handleScheduleAll()}
                disabled={publishing || !scheduleDatetime}>
                {publishTarget ? 'Dit item inplannen' : 'Alle items inplannen'}
              </Button>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setScheduleDialogOpen(false)}>Annuleren</Button>
            </DialogActions>
          </Dialog>
        </>
      ) : null}

      {/* Opdracht 5: Add Platform Dialog */}
      <Dialog open={addPlatformOpen} onClose={() => !repurposing && setAddPlatformOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Platform toevoegen</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Kies een platform. AI genereert een nieuwe versie op basis van het huidige actieve item
            ({activeItem ? (PLATFORM_CONFIG[activeItem.target_platform]?.label || activeItem.target_platform) : '—'}).
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
              const exists = items.some(it => it.target_platform === key);
              const isLoading = repurposing === key;
              return (
                <Button
                  key={key}
                  variant="outlined"
                  disabled={exists || !!repurposing || !activeItem}
                  onClick={() => handleAddPlatform(key)}
                  startIcon={isLoading ? <CircularProgress size={16} /> : <cfg.Icon sx={{ color: cfg.color }} />}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', borderColor: exists ? 'divider' : cfg.color, color: exists ? 'text.disabled' : 'text.primary' }}
                >
                  {cfg.label}{exists ? ' ✓' : ''}
                </Button>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPlatformOpen(false)} disabled={!!repurposing}>Sluiten</Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar open={!!snackMsg} autoHideDuration={6000} onClose={() => setSnackMsg(null)} message={typeof snackMsg === 'string' ? snackMsg : snackMsg?.text} />

      {/* A/B Variant Split-View Dialog — Opdracht 3 */}
      <Dialog open={!!altResult || !!altError} onClose={() => { setAltResult(null); setAltError(null); }} maxWidth={false} fullWidth PaperProps={{ sx: { width: '95vw', maxWidth: 1400, height: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShuffleIcon color="primary" />
          Alternatief vergelijken
          {altResult?.ai_model && (
            <Chip label={altResult.ai_model} size="small" sx={{ ml: 1, fontSize: 10 }} />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {altError && <Alert severity="error" sx={{ mb: 2 }}>{altError}</Alert>}
          {altResult && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Origineel
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.5, mb: 1, fontSize: '1rem', fontWeight: 600 }}>
                  {altResult.original?.title}
                </Typography>
                <Box
                  sx={{
                    fontSize: '0.85rem', lineHeight: 1.6, color: 'text.primary',
                    maxHeight: '65vh', overflow: 'auto',
                    '& p': { mb: 1 },
                  }}
                  dangerouslySetInnerHTML={{ __html: altResult.original?.body_en || '' }}
                />
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(94,139,126,0.06)', borderColor: 'primary.main' }}>
                <Typography variant="overline" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  Alternatief (andere invalshoek)
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.5, mb: 1, fontSize: '1rem', fontWeight: 600 }}>
                  {altResult.alternative?.title}
                </Typography>
                <Box
                  sx={{
                    fontSize: '0.85rem', lineHeight: 1.6, color: 'text.primary',
                    maxHeight: '65vh', overflow: 'auto',
                    '& p': { mb: 1 },
                  }}
                  dangerouslySetInnerHTML={{ __html: altResult.alternative?.body_en || '' }}
                />
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAltResult(null); setAltError(null); }}>Annuleren</Button>
          <Button onClick={() => { setAltResult(null); }} disabled={!altResult}>Gebruik origineel</Button>
          <Button onClick={handleUseAlternative} variant="contained" disabled={!altResult?.alternative}>
            Gebruik alternatief
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
