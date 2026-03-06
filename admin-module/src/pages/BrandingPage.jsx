import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Alert, Snackbar,
  Tabs, Tab, Skeleton, Divider, MenuItem, Select, FormControl, InputLabel,
  IconButton, Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTranslation } from 'react-i18next';
import { useBrandingDestinations, useUpdateDestinationBranding, useUploadBrandingLogo } from '../hooks/useBrandingEditor.js';
import { translateTexts } from '../api/translationService.js';

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

function ColorField({ label, value, onChange }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <Box
        sx={{
          width: 36, height: 36, borderRadius: 1, border: '1px solid #ccc',
          bgcolor: value || '#ffffff', cursor: 'pointer', flexShrink: 0
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

export default function BrandingPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useBrandingDestinations();
  const updateMut = useUpdateDestinationBranding();
  const uploadMut = useUploadBrandingLogo();
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState({});
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [translating, setTranslating] = useState(false);

  const destinations = data?.data?.destinations?.filter(d => d.isActive) || [];
  const activeDest = destinations[activeTab];

  // Initialize form when destination loads
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
          body: b.fonts?.body || 'Inter'
        },
        logo: b.logo || '',
        logoUrl: b.logoUrl || '',
        payoff: b.payoff || { nl: '', en: '', de: '', es: '' },
        chatbotName: b.chatbotName || '',
        brandName: b.brandName || activeDest.displayName || '',
        style: {
          borderRadius: b.style?.borderRadius || '8px',
          buttonStyle: b.style?.buttonStyle || 'rounded'
        },
        socialLinks: b.socialLinks || activeDest.socialLinks || {
          instagram: '', facebook: '', tiktok: '', youtube: '', twitter: '', linkedin: ''
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
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={updateMut.isPending}
        >
          {updateMut.isPending ? t('branding.saving') : t('branding.save')}
        </Button>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        {destinations.map((d, i) => (
          <Tab key={d.id} label={d.displayName} value={i} />
        ))}
      </Tabs>

      {activeDest && form.colors && (
        <Grid container spacing={3}>
          {/* Colors */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  {t('branding.colorsSection')}
                </Typography>
                {COLOR_FIELDS.map(cf => (
                  <ColorField
                    key={cf.key}
                    label={t(cf.label)}
                    value={form.colors[cf.key]}
                    onChange={val => updateColor(cf.key, val)}
                  />
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Fonts + Style */}
          <Grid item xs={12} md={6}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  {t('branding.fontsSection')}
                </Typography>
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
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  {t('branding.styleSection')}
                </Typography>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>{t('branding.borderRadius')}</InputLabel>
                  <Select
                    value={form.style?.borderRadius || '8px'}
                    label={t('branding.borderRadius')}
                    onChange={e => setForm(prev => ({ ...prev, style: { ...prev.style, borderRadius: e.target.value } }))}
                  >
                    {BORDER_RADIUS_OPTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                </FormControl>
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
              </CardContent>
            </Card>
          </Grid>

          {/* Logo + Brand */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  {t('branding.logoSection')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {form.logo && (
                    <Box
                      component="img"
                      src={form.logo.startsWith('http') ? form.logo : `${import.meta.env.VITE_API_URL || ''}${form.logo}`}
                      alt="Logo"
                      sx={{ height: 48, maxWidth: 200 }}
                    />
                  )}
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
              </CardContent>
            </Card>
          </Grid>

          {/* Payoff per language */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  {t('branding.payoffSection')}
                </Typography>
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
              </CardContent>
            </Card>
          </Grid>

          {/* Social Links (V.6.9) */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  {t('branding.socialLinksSection')}
                </Typography>
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
              </CardContent>
            </Card>
          </Grid>

          {/* Preview panel */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  {t('branding.preview')}
                </Typography>
                <Box
                  sx={{
                    p: 3, borderRadius: form.style?.borderRadius || '8px',
                    bgcolor: form.colors?.background || '#fff',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, pb: 2, borderBottom: '1px solid #e5e7eb' }}>
                    <Typography sx={{ fontFamily: form.fonts?.heading, fontWeight: 700, fontSize: '1.25rem', color: form.colors?.primary }}>
                      {form.brandName || activeDest.displayName}
                    </Typography>
                    <Typography sx={{ fontFamily: form.fonts?.body, fontSize: '0.875rem', color: form.colors?.textMuted }}>
                      {form.payoff?.en || ''}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip label="Explore" sx={{ bgcolor: form.colors?.primary, color: '#fff', fontFamily: form.fonts?.body }} />
                    <Chip label="Events" variant="outlined" sx={{ borderColor: form.colors?.secondary, color: form.colors?.secondary }} />
                    <Chip label="Contact" variant="outlined" sx={{ borderColor: form.colors?.text, color: form.colors?.text }} />
                  </Box>
                  <Typography sx={{ fontFamily: form.fonts?.heading, fontWeight: 700, color: form.colors?.text, mb: 1 }}>
                    {t('branding.previewHeading')}
                  </Typography>
                  <Typography sx={{ fontFamily: form.fonts?.body, color: form.colors?.textMuted, fontSize: '0.875rem' }}>
                    {t('branding.previewBody')}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      mt: 2, bgcolor: form.colors?.accent || form.colors?.primary,
                      borderRadius: form.style?.buttonStyle === 'pill' ? '999px' : form.style?.buttonStyle === 'square' ? '0px' : form.style?.borderRadius,
                      textTransform: 'none'
                    }}
                  >
                    {t('branding.previewButton')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

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
