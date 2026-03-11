import { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, TextField, Button, Alert, Snackbar,
  Tabs, Tab, Skeleton, MenuItem, Select, FormControl, InputLabel,
  IconButton, Chip, Accordion, AccordionSummary, AccordionDetails,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControlLabel
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import TranslateIcon from '@mui/icons-material/Translate';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import PaletteIcon from '@mui/icons-material/Palette';
import { useBrandingDestinations, useUpdateDestinationBranding, useUploadBrandingLogo } from '../hooks/useBrandingEditor.js';
import { translateTexts } from '../api/translationService.js';
import client from '../api/client.js';
import { BRANDING_TEMPLATES } from '../utils/brandingTemplates.js';
import TranslatableField from '../components/blocks/fields/TranslatableField.jsx';

const COLOR_FIELDS = [
  { key: 'primary', label: 'branding.colors.primary' },
  { key: 'secondary', label: 'branding.colors.secondary' },
  { key: 'accent', label: 'branding.colors.accent' },
  { key: 'background', label: 'branding.colors.background' },
  { key: 'surface', label: 'branding.colors.surface' },
  { key: 'text', label: 'branding.colors.text' },
  { key: 'textMuted', label: 'branding.colors.textMuted' }
];

const FONT_OPTIONS = [
  'Inter', 'Montserrat', 'Open Sans', 'Poppins', 'Roboto', 'Lato', 'Nunito',
  'Playfair Display', 'Merriweather', 'Source Sans 3', 'DM Sans', 'Outfit'
];

const BORDER_RADIUS_OPTIONS = ['0px', '4px', '8px', '12px', '16px', '24px'];
const BUTTON_STYLE_OPTIONS = ['rounded', 'pill', 'square'];

const BUTTON_VARIANTS = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'outline', label: 'Outline' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'link', label: 'Link' }
];

const FOOTER_COLUMN_TYPES = ['brand', 'navigation', 'contact', 'social', 'newsletter', 'custom'];

// Color utility helpers for auto-deriving button defaults
function hexToRgb(hex) {
  const h = hex?.replace('#', '') || '000000';
  return { r: parseInt(h.slice(0, 2), 16) || 0, g: parseInt(h.slice(2, 4), 16) || 0, b: parseInt(h.slice(4, 6), 16) || 0 };
}
function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function darkenHex(hex, amount = 0.15) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r * (1 - amount), g: g * (1 - amount), b: b * (1 - amount) });
}
function contrastColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? '#1a1a1a' : '#ffffff';
}
function deriveButtonDefaults(primary, secondary) {
  const p = primary || '#3b82f6';
  const s = secondary || '#6b7280';
  return {
    primary: { bg: p, text: contrastColor(p), borderRadius: '8px', hoverBg: darkenHex(p) },
    secondary: { bg: s, text: contrastColor(s), borderRadius: '8px', hoverBg: darkenHex(s) },
    outline: { bg: 'transparent', text: p, borderColor: p, borderRadius: '8px', hoverBg: p },
    ghost: { bg: 'transparent', text: p, borderRadius: '8px', hoverBg: '' },
    link: { text: p, hoverText: darkenHex(p) }
  };
}

// Sections that should be expanded by default
const DEFAULT_EXPANDED = ['colors', 'logo'];

function ColorField({ label, value, onChange }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <Box
        sx={{
          width: 36, height: 36, borderRadius: 1, border: '1px solid',
          borderColor: 'divider', bgcolor: value || '#ffffff', cursor: 'pointer', flexShrink: 0
        }}
        component="label"
      >
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={e => onChange(e.target.value)}
          style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
        />
      </Box>
      <TextField
        size="small"
        label={label}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        sx={{ flex: 1 }}
        placeholder="#000000"
      />
    </Box>
  );
}

/** Safely render an i18n value — if object {en,nl,...}, show the first non-empty value; if string, return as-is */
function resolveI18nDisplay(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val.en || val.nl || Object.values(val).find(v => v) || '';
  return String(val);
}

function BrandingAccordion({ id, title, subtitle, children, defaultExpanded }) {
  return (
    <Accordion defaultExpanded={defaultExpanded} sx={{ '&:before': { display: 'none' }, mb: 1 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

function SafeImage({ src, alt, sx, apiUrl }) {
  const [error, setError] = useState(false);
  if (!src || error) return null;
  const resolvedSrc = src.startsWith('http') ? src : `${apiUrl}${src}`;
  return <Box component="img" src={resolvedSrc} alt={alt} sx={sx} onError={() => setError(true)} />;
}

export default function BrandingPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useBrandingDestinations();
  const updateMut = useUpdateDestinationBranding();
  const uploadMut = useUploadBrandingLogo();
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState({});
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [translating, setTranslating] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || '';
  const destinations = data?.data?.destinations?.filter(d => d.isActive) || [];
  const activeDest = destinations[activeTab];

  useEffect(() => {
    if (activeDest) {
      const b = activeDest.branding || {};
      setForm({
        colors: {
          primary: b.colors?.primary || b.primary || '',
          secondary: b.colors?.secondary || b.secondary || '',
          accent: b.colors?.accent || b.accent || '',
          background: b.colors?.background || '#ffffff',
          surface: b.colors?.surface || '#ffffff',
          text: b.colors?.text || '#1a1a1a',
          textMuted: b.colors?.textMuted || '#6b7280'
        },
        fonts: {
          heading: b.fonts?.heading || 'Inter',
          body: b.fonts?.body || 'Inter',
          typography: b.fonts?.typography || {}
        },
        logo: b.logo || '',
        logoUrl: b.logoUrl || '',
        payoff: b.payoff || { nl: '', en: '', de: '', es: '' },
        chatbotName: b.chatbotName || '',
        brandName: b.brandName || activeDest.displayName || '',
        style: {
          borderRadius: b.style?.borderRadius || '8px',
          buttonStyle: b.style?.buttonStyle || 'rounded',
          spacingScale: b.style?.spacingScale || 'default',
          shadowIntensity: b.style?.shadowIntensity || 'medium',
          imageStyle: b.style?.imageStyle || 'rounded',
          headingTextTransform: b.style?.headingTextTransform || 'none'
        },
        socialLinks: b.socialLinks || activeDest.socialLinks || {
          instagram: '', facebook: '', tiktok: '', youtube: '', twitter: '', linkedin: ''
        },
        favicon: b.favicon || '',
        navicon: b.navicon || '',
        buttons: (() => {
          const derived = deriveButtonDefaults(
            b.colors?.primary || b.primary || '',
            b.colors?.secondary || b.secondary || ''
          );
          if (!b.buttons || Object.keys(b.buttons).length === 0) return derived;
          // Merge: use DB values where non-empty, fall back to derived defaults
          const merged = {};
          for (const vk of Object.keys(derived)) {
            merged[vk] = {};
            const dbBtn = b.buttons[vk] || {};
            const defBtn = derived[vk] || {};
            for (const pk of Object.keys(defBtn)) {
              merged[vk][pk] = dbBtn[pk] || defBtn[pk];
            }
          }
          return merged;
        })(),
        footer: b.footer || {
          columns: [
            { type: 'brand', title: '' },
            { type: 'navigation', title: 'Navigation' },
            { type: 'contact', title: 'Contact' }
          ],
          copyright: `\u00A9 ${new Date().getFullYear()} ${activeDest.displayName}`,
          showNewsletter: false,
          showSocial: true
        },
        privacyPolicyUrl: b.privacyPolicyUrl || '',
        brandVisuals: b.brandVisuals || [],
        chatbotConfig: b.chatbotConfig || {
          name: b.chatbotName || '',
          welcomeMessage: { en: '', nl: '', de: '', es: '' },
          quickActions: []
        },
        headerStyle: b.headerStyle || {
          variant: 'solid',
          sticky: true
        }
      });
    }
  }, [activeDest?.id]);

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({ destinationId: activeDest.id, data: form });
      setSnack({ open: true, message: t('branding.saved'), severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error?.message || err.message, severity: 'error' });
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSnack({ open: true, message: t('branding.logoTooLarge'), severity: 'warning' });
      return;
    }
    try {
      const result = await uploadMut.mutateAsync({ destination: activeDest.code, file });
      setForm(prev => ({ ...prev, logo: result.data?.logo_url || prev.logo }));
      setSnack({ open: true, message: t('branding.logoUploaded'), severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.message, severity: 'error' });
    }
  };

  const updateColor = (key, val) => {
    setForm(prev => ({ ...prev, colors: { ...prev.colors, [key]: val } }));
  };

  const updatePayoff = (lang, val) => {
    setForm(prev => ({ ...prev, payoff: { ...prev.payoff, [lang]: val } }));
  };

  const updateSocialLink = (platform, val) => {
    setForm(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [platform]: val } }));
  };

  const handleTranslatePayoff = async () => {
    const source = form.payoff?.en || form.payoff?.nl;
    if (!source) return;
    setTranslating(true);
    const sourceLang = form.payoff?.en ? 'en' : 'nl';
    const targetLangs = ['nl', 'en', 'de', 'es'].filter(l => l !== sourceLang);
    try {
      const translations = await translateTexts([{ key: 'payoff', value: source }], sourceLang, targetLangs);
      setForm(prev => ({
        ...prev,
        payoff: {
          ...prev.payoff,
          ...Object.fromEntries(targetLangs.map(l => [l, translations.payoff?.[l] || prev.payoff?.[l] || '']))
        }
      }));
      setSnack({ open: true, message: t('translate.success'), severity: 'success' });
    } catch {
      setSnack({ open: true, message: t('translate.error'), severity: 'error' });
    } finally {
      setTranslating(false);
    }
  };

  const handleIconUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      setSnack({ open: true, message: `${field} too large (max 1MB)`, severity: 'warning' });
      return;
    }
    try {
      const result = await uploadMut.mutateAsync({ destination: activeDest.code, file, field });
      setForm(prev => ({ ...prev, [field]: result.data?.logo_url || prev[field] }));
      setSnack({ open: true, message: `${field} uploaded`, severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.message, severity: 'error' });
    }
  };

  const updateChatbotConfig = (key, val) => {
    setForm(prev => ({ ...prev, chatbotConfig: { ...prev.chatbotConfig, [key]: val } }));
  };

  const updateHeaderStyle = (key, val) => {
    setForm(prev => ({ ...prev, headerStyle: { ...prev.headerStyle, [key]: val } }));
  };

  const updateButtonVariant = (variant, prop, val) => {
    setForm(prev => ({
      ...prev,
      buttons: {
        ...prev.buttons,
        [variant]: { ...prev.buttons?.[variant], [prop]: val }
      }
    }));
  };

  const updateFooter = (key, val) => {
    setForm(prev => ({ ...prev, footer: { ...prev.footer, [key]: val } }));
  };

  const applyTemplate = (template) => {
    setForm(prev => ({
      ...prev,
      colors: { ...prev.colors, ...template.values.colors },
      fonts: { ...prev.fonts, heading: template.values.fonts.heading, body: template.values.fonts.body },
      style: { ...prev.style, ...template.values.style }
    }));
    setPendingTemplate(null);
    setTemplateDialogOpen(false);
    setSnack({ open: true, message: t('branding.templateApplied', 'Template applied — remember to save!'), severity: 'info' });
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rounded" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={refetch}>{t('common.retry')}</Button>}>
          {t('common.error')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('branding.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('branding.subtitle')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PaletteIcon />}
            onClick={() => setTemplateDialogOpen(true)}
          >
            {t('branding.templates', 'Templates')}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={updateMut.isPending}
          >
            {updateMut.isPending ? t('branding.saving') : t('branding.save')}
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        {destinations.map((d, i) => (
          <Tab key={d.id} label={d.displayName} value={i} />
        ))}
      </Tabs>

      {activeDest && form.colors && (
        <Box>
          {/* === COLORS + LIVE PREVIEW (side by side, default expanded) === */}
          <BrandingAccordion
            id="colors"
            title={t('branding.colorsSection')}
            subtitle={t('branding.colorsSubtitle', '7 theme colors for your website')}
            defaultExpanded
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                {COLOR_FIELDS.map(cf => (
                  <ColorField
                    key={cf.key}
                    label={t(cf.label)}
                    value={form.colors[cf.key]}
                    onChange={val => updateColor(cf.key, val)}
                  />
                ))}
              </Grid>
              <Grid item xs={12} md={7}>
                {/* Live preview — rendered inline next to colors */}
                {(() => {
                  const btnRadius = form.style?.buttonStyle === 'pill' ? '999px' : form.style?.buttonStyle === 'square' ? '0px' : (form.style?.borderRadius || '8px');
                  const imgRadius = form.style?.imageStyle === 'square' ? '0px' : form.style?.imageStyle === 'circle' ? '50%' : (form.style?.borderRadius || '8px');
                  const shadowMap = { none: 'none', subtle: '0 1px 3px rgba(0,0,0,0.08)', medium: '0 4px 12px rgba(0,0,0,0.12)', strong: '0 8px 24px rgba(0,0,0,0.18)' };
                  const shadow = shadowMap[form.style?.shadowIntensity] || shadowMap.medium;
                  const spacingMap = { compact: 1.5, default: 2, relaxed: 3, spacious: 4 };
                  const spacing = spacingMap[form.style?.spacingScale] || 2;
                  const headingTransform = form.style?.headingTextTransform || 'none';
                  return (
                    <Box sx={{ p: 2, borderRadius: form.style?.borderRadius || '8px', bgcolor: form.colors?.background || '#fff', border: '1px solid', borderColor: 'divider', position: 'sticky', top: 16 }}>
                      {/* Header bar */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: spacing, pb: spacing, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <SafeImage src={form.logo} alt="Logo" apiUrl={apiUrl} sx={{ height: 28, maxWidth: 80 }} />
                        <Typography sx={{ fontFamily: form.fonts?.heading, fontWeight: 700, fontSize: '1rem', color: form.colors?.primary }}>
                          {form.brandName || activeDest.displayName}
                        </Typography>
                        <Typography sx={{ fontFamily: form.fonts?.body, fontSize: '0.75rem', color: form.colors?.textMuted }}>
                          {resolveI18nDisplay(form.payoff)}
                        </Typography>
                      </Box>
                      {/* Nav chips */}
                      <Box sx={{ display: 'flex', gap: 0.75, mb: spacing }}>
                        <Chip size="small" label="Explore" sx={{ bgcolor: form.colors?.primary, color: '#fff', fontFamily: form.fonts?.body, fontSize: '0.7rem' }} />
                        <Chip size="small" label="Events" variant="outlined" sx={{ borderColor: form.colors?.secondary, color: form.colors?.secondary, fontSize: '0.7rem' }} />
                        <Chip size="small" label="Contact" variant="outlined" sx={{ borderColor: form.colors?.text, color: form.colors?.text, fontSize: '0.7rem' }} />
                      </Box>
                      {/* Sample card */}
                      <Box sx={{ display: 'flex', gap: 1.5, mb: spacing }}>
                        <Box sx={{ width: 56, height: 56, flexShrink: 0, borderRadius: imgRadius, overflow: 'hidden', bgcolor: form.colors?.secondary || '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow }}>
                          <Typography sx={{ fontSize: '1.5rem', opacity: 0.4 }}>🏖️</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontFamily: form.fonts?.heading, fontWeight: 700, color: form.colors?.text, textTransform: headingTransform, fontSize: '0.85rem', mb: 0.25 }}>
                            {t('branding.previewHeading')}
                          </Typography>
                          <Typography sx={{ fontFamily: form.fonts?.body, color: form.colors?.textMuted, fontSize: '0.75rem' }}>
                            {t('branding.previewBody')}
                          </Typography>
                        </Box>
                      </Box>
                      {/* Button variants */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: spacing }}>
                        {BUTTON_VARIANTS.map(({ key, label }) => {
                          const btn = form.buttons?.[key] || {};
                          const isTransparent = key === 'ghost' || key === 'link';
                          return (
                            <Box key={key} component="span" sx={{
                              display: 'inline-block', px: 1.5, py: 0.5, fontSize: '0.7rem', fontWeight: 600,
                              borderRadius: btn.borderRadius || btnRadius,
                              bgcolor: isTransparent ? 'transparent' : (btn.bg || form.colors?.primary || '#3b82f6'),
                              color: btn.text || (key === 'outline' || isTransparent ? (form.colors?.primary || '#3b82f6') : '#fff'),
                              border: key === 'outline' ? `2px solid ${btn.borderColor || form.colors?.primary || '#3b82f6'}` : 'none',
                              textDecoration: key === 'link' ? 'underline' : 'none',
                              boxShadow: isTransparent ? 'none' : shadow,
                              cursor: 'default',
                            }}>
                              {label}
                            </Box>
                          );
                        })}
                      </Box>
                      {/* Style info */}
                      <Typography variant="caption" sx={{ color: form.colors?.textMuted, fontSize: '0.65rem' }}>
                        Shadow: {form.style?.shadowIntensity || 'medium'} · Spacing: {form.style?.spacingScale || 'default'} · Image: {form.style?.imageStyle || 'rounded'}
                      </Typography>
                    </Box>
                  );
                })()}
              </Grid>
            </Grid>
          </BrandingAccordion>

          {/* === LOGO & BRAND (default expanded) === */}
          <BrandingAccordion
            id="logo"
            title={t('branding.logoSection')}
            subtitle={t('branding.logoSubtitle', 'Logo, brand name, chatbot name and payoff')}
            defaultExpanded
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <SafeImage src={form.logo} alt="Logo" apiUrl={apiUrl} sx={{ height: 48, maxWidth: 200 }} />
                  <Button variant="outlined" component="label" startIcon={<UploadIcon />} disabled={uploadMut.isPending}>
                    {uploadMut.isPending ? t('branding.uploading') : t('branding.uploadLogo')}
                    <input type="file" hidden accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} />
                  </Button>
                </Box>
                <TextField
                  fullWidth size="small" label={t('branding.brandName')} sx={{ mb: 2 }}
                  value={form.brandName || ''}
                  onChange={e => setForm(prev => ({ ...prev, brandName: e.target.value }))}
                />
                <TextField
                  fullWidth size="small" label={t('branding.chatbotName')}
                  value={form.chatbotName || ''}
                  onChange={e => setForm(prev => ({ ...prev, chatbotName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{t('branding.payoffSection')}</Typography>
                {['nl', 'en', 'de', 'es'].map(lang => (
                  <TextField
                    key={lang}
                    fullWidth size="small" sx={{ mb: 1.5 }}
                    label={`Payoff (${lang.toUpperCase()})`}
                    value={form.payoff?.[lang] || ''}
                    onChange={e => updatePayoff(lang, e.target.value)}
                  />
                ))}
                <Button
                  size="small" variant="outlined" startIcon={<TranslateIcon />}
                  onClick={handleTranslatePayoff}
                  disabled={translating || (!form.payoff?.en && !form.payoff?.nl)}
                >
                  {translating ? t('translate.translating') : t('translate.autoTranslate')}
                </Button>
              </Grid>
            </Grid>
          </BrandingAccordion>

          {/* === TYPOGRAPHY === */}
          <BrandingAccordion
            id="typography"
            title={t('branding.typographySection', 'Typography Hierarchy')}
            subtitle={t('branding.typographySubtitle', 'Font sizes, weights and spacing for H1-H4, body, small')}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>{t('branding.headingFont')}</InputLabel>
                  <Select
                    value={form.fonts?.heading || 'Inter'}
                    label={t('branding.headingFont')}
                    onChange={e => setForm(prev => ({ ...prev, fonts: { ...prev.fonts, heading: e.target.value } }))}
                  >
                    {FONT_OPTIONS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('branding.bodyFont')}</InputLabel>
                  <Select
                    value={form.fonts?.body || 'Inter'}
                    label={t('branding.bodyFont')}
                    onChange={e => setForm(prev => ({ ...prev, fonts: { ...prev.fonts, body: e.target.value } }))}
                  >
                    {FONT_OPTIONS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              {[
                { key: 'h1', label: 'Heading 1 (H1)', defaults: { fontSize: '3rem', fontWeight: '700', letterSpacing: '-0.02em', lineHeight: '1.1' } },
                { key: 'h2', label: 'Heading 2 (H2)', defaults: { fontSize: '2.25rem', fontWeight: '700', letterSpacing: '-0.01em', lineHeight: '1.2' } },
                { key: 'h3', label: 'Heading 3 (H3)', defaults: { fontSize: '1.75rem', fontWeight: '600', letterSpacing: '0', lineHeight: '1.3' } },
                { key: 'h4', label: 'Heading 4 (H4)', defaults: { fontSize: '1.25rem', fontWeight: '600', letterSpacing: '0', lineHeight: '1.4' } },
                { key: 'body', label: 'Body', defaults: { fontSize: '1rem', fontWeight: '400', letterSpacing: '0', lineHeight: '1.6' } },
                { key: 'small', label: 'Small', defaults: { fontSize: '0.875rem', fontWeight: '400', letterSpacing: '0', lineHeight: '1.5' } }
              ].map(({ key, label, defaults }) => {
                const typo = form.fonts?.typography || {};
                const level = typo[key] || {};
                const updateTypo = (prop, val) => {
                  setForm(prev => ({
                    ...prev,
                    fonts: {
                      ...prev.fonts,
                      typography: {
                        ...prev.fonts?.typography,
                        [key]: { ...prev.fonts?.typography?.[key], [prop]: val || undefined }
                      }
                    }
                  }));
                };
                return (
                  <Box key={key} sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{label}</Typography>
                    <Box sx={{ mb: 1, fontFamily: key.startsWith('h') ? (form.fonts?.heading || 'Inter') : (form.fonts?.body || 'Inter'), fontSize: level.fontSize || defaults.fontSize, fontWeight: level.fontWeight || defaults.fontWeight, letterSpacing: level.letterSpacing || defaults.letterSpacing, lineHeight: level.lineHeight || defaults.lineHeight, color: form.colors?.text }}>
                      {key.startsWith('h') ? 'The quick brown fox' : 'The quick brown fox jumps over the lazy dog.'}
                    </Box>
                    <Grid container spacing={1}>
                      <Grid item xs={3}>
                        <TextField size="small" fullWidth label="Font Size" value={level.fontSize || ''} onChange={e => updateTypo('fontSize', e.target.value)} placeholder={defaults.fontSize} />
                      </Grid>
                      <Grid item xs={3}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Weight</InputLabel>
                          <Select value={level.fontWeight || ''} label="Weight" onChange={e => updateTypo('fontWeight', e.target.value)} displayEmpty>
                            <MenuItem value=""><em>{defaults.fontWeight}</em></MenuItem>
                            {['300', '400', '500', '600', '700', '800', '900'].map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={3}>
                        <TextField size="small" fullWidth label="Letter Spacing" value={level.letterSpacing || ''} onChange={e => updateTypo('letterSpacing', e.target.value)} placeholder={defaults.letterSpacing} />
                      </Grid>
                      <Grid item xs={3}>
                        <TextField size="small" fullWidth label="Line Height" value={level.lineHeight || ''} onChange={e => updateTypo('lineHeight', e.target.value)} placeholder={defaults.lineHeight} />
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}
            </Box>
          </BrandingAccordion>

          {/* === BUTTON STYLES + ADVANCED STYLE === */}
          <BrandingAccordion
            id="buttons"
            title={t('branding.buttonStylesSection', 'Button & Style Options')}
            subtitle={t('branding.buttonStylesSubtitle', 'Global style settings and 5 button variants')}
          >
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>{t('branding.globalStyle', 'Global Style')}</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('branding.borderRadius')}</InputLabel>
                  <Select
                    value={form.style?.borderRadius || '8px'}
                    label={t('branding.borderRadius')}
                    onChange={e => setForm(prev => ({ ...prev, style: { ...prev.style, borderRadius: e.target.value } }))}
                  >
                    {BORDER_RADIUS_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('branding.buttonStyle')}</InputLabel>
                  <Select
                    value={form.style?.buttonStyle || 'rounded'}
                    label={t('branding.buttonStyle')}
                    onChange={e => setForm(prev => ({ ...prev, style: { ...prev.style, buttonStyle: e.target.value } }))}
                  >
                    {BUTTON_STYLE_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('branding.spacingScale', 'Spacing Scale')}</InputLabel>
                  <Select
                    value={form.style?.spacingScale || 'default'}
                    label={t('branding.spacingScale', 'Spacing Scale')}
                    onChange={e => setForm(prev => ({ ...prev, style: { ...prev.style, spacingScale: e.target.value } }))}
                  >
                    <MenuItem value="compact">Compact</MenuItem>
                    <MenuItem value="default">Default</MenuItem>
                    <MenuItem value="relaxed">Relaxed</MenuItem>
                    <MenuItem value="spacious">Spacious</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('branding.shadowIntensity', 'Shadow Intensity')}</InputLabel>
                  <Select
                    value={form.style?.shadowIntensity || 'medium'}
                    label={t('branding.shadowIntensity', 'Shadow Intensity')}
                    onChange={e => setForm(prev => ({ ...prev, style: { ...prev.style, shadowIntensity: e.target.value } }))}
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="subtle">Subtle</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="strong">Strong</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('branding.imageStyle', 'Image Style')}</InputLabel>
                  <Select
                    value={form.style?.imageStyle || 'rounded'}
                    label={t('branding.imageStyle', 'Image Style')}
                    onChange={e => setForm(prev => ({ ...prev, style: { ...prev.style, imageStyle: e.target.value } }))}
                  >
                    <MenuItem value="square">Square</MenuItem>
                    <MenuItem value="rounded">Rounded</MenuItem>
                    <MenuItem value="circle">Circle</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('branding.headingTransform', 'Heading Transform')}</InputLabel>
                  <Select
                    value={form.style?.headingTextTransform || 'none'}
                    label={t('branding.headingTransform', 'Heading Transform')}
                    onChange={e => setForm(prev => ({ ...prev, style: { ...prev.style, headingTextTransform: e.target.value } }))}
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="uppercase">UPPERCASE</MenuItem>
                    <MenuItem value="capitalize">Capitalize</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>{t('branding.buttonVariants', 'Button Variants')}</Typography>
            <Grid container spacing={2}>
              {BUTTON_VARIANTS.map(({ key, label }) => {
                const btn = form.buttons?.[key] || {};
                return (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{label}</Typography>
                      {key !== 'link' ? (
                        <>
                          <ColorField label="Background" value={btn.bg} onChange={val => updateButtonVariant(key, 'bg', val)} />
                          <ColorField label="Text" value={btn.text} onChange={val => updateButtonVariant(key, 'text', val)} />
                          {key === 'outline' && (
                            <ColorField label="Border" value={btn.borderColor} onChange={val => updateButtonVariant(key, 'borderColor', val)} />
                          )}
                          <ColorField label="Hover BG" value={btn.hoverBg} onChange={val => updateButtonVariant(key, 'hoverBg', val)} />
                          <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                            <InputLabel>Border Radius</InputLabel>
                            <Select value={btn.borderRadius || '8px'} label="Border Radius" onChange={e => updateButtonVariant(key, 'borderRadius', e.target.value)}>
                              {BORDER_RADIUS_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                              <MenuItem value="999px">Pill</MenuItem>
                            </Select>
                          </FormControl>
                        </>
                      ) : (
                        <>
                          <ColorField label="Text Color" value={btn.text} onChange={val => updateButtonVariant(key, 'text', val)} />
                          <ColorField label="Hover Color" value={btn.hoverText} onChange={val => updateButtonVariant(key, 'hoverText', val)} />
                        </>
                      )}
                      {/* Live preview */}
                      <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block', px: 2, py: 0.75, fontSize: '0.8rem', fontWeight: 600,
                            borderRadius: btn.borderRadius || '8px',
                            bgcolor: key === 'link' || key === 'ghost' ? 'transparent' : (btn.bg || form.colors?.primary || '#3b82f6'),
                            color: btn.text || (key === 'outline' || key === 'ghost' || key === 'link' ? (form.colors?.primary || '#3b82f6') : '#fff'),
                            border: key === 'outline' ? `2px solid ${btn.borderColor || form.colors?.primary || '#3b82f6'}` : 'none',
                            textDecoration: key === 'link' ? 'underline' : 'none',
                            cursor: 'default'
                          }}
                        >
                          Button Preview
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </BrandingAccordion>

          {/* === SOCIAL LINKS === */}
          <BrandingAccordion
            id="social"
            title={t('branding.socialLinksSection')}
            subtitle={t('branding.socialLinksSubtitle', 'Social media profile URLs')}
          >
            <Grid container spacing={2}>
              {['instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'linkedin'].map(platform => (
                <Grid item xs={12} sm={6} key={platform}>
                  <TextField
                    fullWidth size="small"
                    label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                    value={form.socialLinks?.[platform] || ''}
                    onChange={e => updateSocialLink(platform, e.target.value)}
                    placeholder={`https://${platform}.com/...`}
                  />
                </Grid>
              ))}
            </Grid>
          </BrandingAccordion>

          {/* === FOOTER CONFIG === */}
          <BrandingAccordion
            id="footer"
            title={t('branding.footer.title', 'Footer Configuration')}
            subtitle={t('branding.footer.subtitle', 'Global footer — applies to all pages of this destination')}
          >
            <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 2 }}>
              {t('branding.footer.globalInfo', 'The footer is a global component. Changes here apply to all pages. No separate Footer block is needed.')}
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TranslatableField
                  label="Copyright Text"
                  value={form.footer?.copyright || ''}
                  onChange={val => updateFooter('copyright', val)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('branding.footer.showNewsletter')}</InputLabel>
                  <Select
                    value={form.footer?.showNewsletter ? 'yes' : 'no'}
                    label={t('branding.footer.showNewsletter')}
                    onChange={e => updateFooter('showNewsletter', e.target.value === 'yes')}
                  >
                    <MenuItem value="yes">{t('common.yes')}</MenuItem>
                    <MenuItem value="no">{t('common.no')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('branding.footer.showSocial')}</InputLabel>
                  <Select
                    value={form.footer?.showSocial !== false ? 'yes' : 'no'}
                    label={t('branding.footer.showSocial')}
                    onChange={e => updateFooter('showSocial', e.target.value === 'yes')}
                  >
                    <MenuItem value="yes">{t('common.yes')}</MenuItem>
                    <MenuItem value="no">{t('common.no')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>{t('branding.footer.columns')}</Typography>
                <Grid container spacing={1}>
                  {(form.footer?.columns || []).map((col, i) => (
                    <Grid item xs={12} sm={4} key={i}>
                      <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                          <InputLabel>Type</InputLabel>
                          <Select
                            value={col.type || 'custom'}
                            label="Type"
                            onChange={e => {
                              const cols = [...(form.footer?.columns || [])];
                              cols[i] = { ...cols[i], type: e.target.value };
                              updateFooter('columns', cols);
                            }}
                          >
                            {FOOTER_COLUMN_TYPES.map(ft => <MenuItem key={ft} value={ft}>{ft.charAt(0).toUpperCase() + ft.slice(1)}</MenuItem>)}
                          </Select>
                        </FormControl>
                        <TranslatableField
                          label="Title"
                          value={col.title || ''}
                          onChange={val => {
                            const cols = [...(form.footer?.columns || [])];
                            cols[i] = { ...cols[i], title: val };
                            updateFooter('columns', cols);
                          }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              {/* Footer wireframe */}
              <Grid item xs={12}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{t('branding.footer.wireframe', 'Footer Preview')}</Typography>
                <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'action.hover' }}>
                  <Grid container spacing={2}>
                    {(form.footer?.columns || []).map((col, i) => (
                      <Grid item xs={12} sm={4} key={i}>
                        <Box sx={{ border: '1px dashed', borderColor: 'text.disabled', borderRadius: 1, p: 1.5, minHeight: 80, textAlign: 'center' }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                            {resolveI18nDisplay(col.title) || col.type}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 0.5 }}>
                            {col.type === 'brand' && 'Logo + payoff'}
                            {col.type === 'navigation' && 'Menu links'}
                            {col.type === 'contact' && 'Address + email + phone'}
                            {col.type === 'social' && 'Social media icons'}
                            {col.type === 'newsletter' && 'Email subscribe form'}
                            {col.type === 'custom' && 'Custom content'}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'text.disabled', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled">
                      {resolveI18nDisplay(form.footer?.copyright) || `\u00A9 ${new Date().getFullYear()}`}
                      {form.footer?.showSocial !== false && ' | Social Icons'}
                      {form.footer?.showNewsletter && ' | Newsletter'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </BrandingAccordion>

          {/* === CHATBOT CONFIG === */}
          <BrandingAccordion
            id="chatbotConfig"
            title={t('branding.chatbotConfig', 'Chatbot Configuration')}
            subtitle={t('branding.chatbotConfigSubtitle', 'Customize chatbot name, welcome message and quick actions')}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth size="small" label={t('branding.chatbotName', 'Chatbot Name')}
                  value={form.chatbotConfig?.name || ''}
                  onChange={e => updateChatbotConfig('name', e.target.value)}
                  placeholder="HoliBot"
                  helperText={t('branding.chatbotNameHelper', 'e.g. Tessa, HoliBot, Wijze Warre')}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <ColorField
                  label={t('branding.chatbotColor', 'Chatbot Color')}
                  value={form.chatbotConfig?.color || form.colors?.primary || '#7FA594'}
                  onChange={val => updateChatbotConfig('color', val)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('branding.chatbotPosition', 'Position')}</InputLabel>
                  <Select
                    value={form.chatbotConfig?.position || 'bottom-right'}
                    label={t('branding.chatbotPosition', 'Position')}
                    onChange={e => updateChatbotConfig('position', e.target.value)}
                  >
                    <MenuItem value="bottom-right">{t('branding.bottomRight', 'Bottom Right')}</MenuItem>
                    <MenuItem value="bottom-left">{t('branding.bottomLeft', 'Bottom Left')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TranslatableField
                  label={t('branding.chatbotWelcome', 'Welcome Message')}
                  value={form.chatbotConfig?.welcomeMessage || { en: '', nl: '', de: '', es: '' }}
                  onChange={val => updateChatbotConfig('welcomeMessage', val)}
                  multiline rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{t('branding.quickActions', 'Quick Actions')}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  {t('branding.quickActionsHelper', 'Select which quick action buttons appear in the chatbot')}
                </Typography>
                {[
                  { id: 'program', label: t('branding.qaProgram', 'Plan my day / Programma samenstellen') },
                  { id: 'category', label: t('branding.qaCategory', 'Browse categories / Zoeken op Rubriek') },
                  { id: 'directions', label: t('branding.qaDirections', 'Route planner / Routebeschrijving') },
                  { id: 'tip', label: t('branding.qaTip', 'Tip of the Day / Tip van de Dag') },
                ].map(qa => (
                  <FormControlLabel
                    key={qa.id}
                    control={
                      <Checkbox
                        checked={(form.chatbotConfig?.quickActions || ['program', 'category', 'directions', 'tip']).includes(qa.id)}
                        onChange={e => {
                          const current = form.chatbotConfig?.quickActions || ['program', 'category', 'directions', 'tip'];
                          const updated = e.target.checked
                            ? [...current, qa.id]
                            : current.filter(id => id !== qa.id);
                          updateChatbotConfig('quickActions', updated);
                        }}
                        size="small"
                      />
                    }
                    label={qa.label}
                    sx={{ display: 'block' }}
                  />
                ))}
              </Grid>
            </Grid>
          </BrandingAccordion>

          {/* === HEADER STYLE === */}
          <BrandingAccordion
            id="headerStyle"
            title={t('branding.headerStyle', 'Header Style')}
            subtitle={t('branding.headerStyleSubtitle', 'Header appearance and behavior')}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('branding.headerVariant', 'Header Style')}</InputLabel>
                  <Select
                    value={form.headerStyle?.variant || 'solid'}
                    label={t('branding.headerVariant', 'Header Style')}
                    onChange={e => updateHeaderStyle('variant', e.target.value)}
                  >
                    <MenuItem value="solid">{t('branding.headerSolid', 'Solid (default)')}</MenuItem>
                    <MenuItem value="transparent">{t('branding.headerTransparent', 'Transparent (on hero)')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('branding.stickyHeader', 'Sticky Header')}</InputLabel>
                  <Select
                    value={form.headerStyle?.sticky !== false ? 'yes' : 'no'}
                    label={t('branding.stickyHeader', 'Sticky Header')}
                    onChange={e => updateHeaderStyle('sticky', e.target.value === 'yes')}
                  >
                    <MenuItem value="yes">{t('common.yes', 'Yes')}</MenuItem>
                    <MenuItem value="no">{t('common.no', 'No')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </BrandingAccordion>

          {/* === FAVICON & NAVICON === */}
          <BrandingAccordion
            id="favicon"
            title={t('branding.faviconSection', 'Favicon & Navigation Icon')}
            subtitle={t('branding.faviconSubtitle', 'Browser tab icon and mobile home screen icon')}
          >
            <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>Favicon (32x32 PNG/ICO)</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SafeImage src={form.favicon} alt="Favicon" apiUrl={apiUrl} sx={{ width: 32, height: 32, border: '1px solid', borderColor: 'divider', borderRadius: 0.5 }} />
                  <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon />} disabled={uploadMut.isPending}>
                    Upload
                    <input type="file" hidden accept="image/png,image/x-icon,image/svg+xml" onChange={e => handleIconUpload(e, 'favicon')} />
                  </Button>
                </Box>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>Navigation Icon (180x180 PNG)</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SafeImage src={form.navicon} alt="Navicon" apiUrl={apiUrl} sx={{ width: 40, height: 40, border: '1px solid', borderColor: 'divider', borderRadius: 1 }} />
                  <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon />} disabled={uploadMut.isPending}>
                    Upload
                    <input type="file" hidden accept="image/png" onChange={e => handleIconUpload(e, 'navicon')} />
                  </Button>
                </Box>
              </Box>
            </Box>
          </BrandingAccordion>

          {/* === BRAND VISUALS === */}
          <BrandingAccordion
            id="brandVisuals"
            title={t('branding.brandVisuals.title', 'Brand Visuals (Hero Images)')}
            subtitle={t('branding.brandVisuals.subtitle', 'Upload 3-5 hero images for quick use in Hero blocks')}
          >
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              {(form.brandVisuals || []).map((img, i) => (
                <Box key={i} sx={{ position: 'relative', width: 200, height: 100, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <SafeImage src={img} alt={`Visual ${i + 1}`} apiUrl={apiUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                    onClick={() => setForm(prev => ({ ...prev, brandVisuals: prev.brandVisuals.filter((_, j) => j !== i) }))}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              ))}
              {(form.brandVisuals || []).length < 5 && (
                <Button
                  variant="outlined"
                  component="label"
                  sx={{ width: 200, height: 100, borderStyle: 'dashed' }}
                  startIcon={<AddPhotoAlternateIcon />}
                  disabled={uploadMut.isPending}
                >
                  {t('branding.brandVisuals.addVisual')}
                  <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const formData = new FormData();
                      formData.append('image', file);
                      const { data: resData } = await client.post('/blocks/upload-image', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      });
                      if (resData.success) {
                        setForm(prev => ({ ...prev, brandVisuals: [...(prev.brandVisuals || []), resData.data.url] }));
                        setSnack({ open: true, message: t('branding.brandVisuals.uploaded'), severity: 'success' });
                      }
                    } catch (err) {
                      setSnack({ open: true, message: err.message, severity: 'error' });
                    }
                    e.target.value = '';
                  }} />
                </Button>
              )}
            </Box>
          </BrandingAccordion>

          {/* === PRIVACY === */}
          <BrandingAccordion
            id="privacy"
            title={t('branding.privacySection', 'Privacy')}
            subtitle={t('branding.privacySubtitle', 'Privacy policy URL for cookie banner and footer')}
          >
            <TextField
              fullWidth size="small" label="Privacy Policy URL"
              value={form.privacyPolicyUrl || ''}
              onChange={e => setForm(prev => ({ ...prev, privacyPolicyUrl: e.target.value }))}
              placeholder="https://example.com/privacy"
            />
          </BrandingAccordion>

          {/* Preview panel moved to Colors section (side-by-side) */}
        </Box>
      )}

      {/* Template Selector Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('branding.chooseTemplate', 'Choose a Design Template')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('branding.templateDescription', 'Select a template to apply colors, fonts and style. Your content (logo, payoff, etc.) will not be changed.')}
          </Typography>
          <Grid container spacing={2}>
            {BRANDING_TEMPLATES.map(tpl => {
              const lang = t('branding.lang') || 'en';
              return (
                <Grid item xs={12} sm={6} md={4} key={tpl.id}>
                  <Box
                    onClick={() => setPendingTemplate(tpl)}
                    sx={{
                      p: 2, borderRadius: 1, cursor: 'pointer',
                      border: pendingTemplate?.id === tpl.id ? '2px solid' : '1px solid',
                      borderColor: pendingTemplate?.id === tpl.id ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      transition: 'border-color 0.2s'
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
                      {Object.values(tpl.preview).map((color, i) => (
                        <Box key={i} sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: color }} />
                      ))}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700}>{tpl.name[lang] || tpl.name.en}</Typography>
                    <Typography variant="caption" color="text.secondary">{tpl.description[lang] || tpl.description.en}</Typography>
                    <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 0.5 }}>
                      {tpl.values.fonts.heading} / {tpl.values.fonts.body}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setTemplateDialogOpen(false); setPendingTemplate(null); }}>{t('common.cancel', 'Cancel')}</Button>
          <Button variant="contained" disabled={!pendingTemplate} onClick={() => applyTemplate(pendingTemplate)}>
            {t('branding.applyTemplate', 'Apply Template')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
