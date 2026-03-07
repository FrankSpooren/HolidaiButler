import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Alert, Snackbar,
  Tabs, Tab, Skeleton, Divider, MenuItem, Select, FormControl, InputLabel,
  IconButton, Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import TranslateIcon from '@mui/icons-material/Translate';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
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

const BUTTON_VARIANTS = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'outline', label: 'Outline' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'link', label: 'Link' }
];

const FOOTER_COLUMN_TYPES = ['brand', 'navigation', 'contact', 'social', 'newsletter', 'custom'];

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
          buttonStyle: b.style?.buttonStyle || 'rounded'
        },
        socialLinks: b.socialLinks || activeDest.socialLinks || {
          instagram: '', facebook: '', tiktok: '', youtube: '', twitter: '', linkedin: ''
        },
        favicon: b.favicon || '',
        navicon: b.navicon || '',
        buttons: b.buttons || {
          primary: { bg: '', text: '#ffffff', borderRadius: '8px', hoverBg: '' },
          secondary: { bg: '', text: '#ffffff', borderRadius: '8px', hoverBg: '' },
          outline: { bg: 'transparent', text: '', borderColor: '', borderRadius: '8px', hoverBg: '' },
          ghost: { bg: 'transparent', text: '', borderRadius: '8px', hoverBg: '' },
          link: { text: '', hoverText: '' }
        },
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
        brandVisuals: b.brandVisuals || []
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

          {/* Favicon & Navicon (Wave 2 — W2.3) */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  Favicon & Navigation Icon
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Favicon (32x32 PNG/ICO)</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {form.favicon && (
                        <Box component="img" src={form.favicon.startsWith('http') ? form.favicon : `${import.meta.env.VITE_API_URL || ''}${form.favicon}`}
                          alt="Favicon" sx={{ width: 32, height: 32, border: '1px solid #e5e7eb', borderRadius: 0.5 }} />
                      )}
                      <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon />} disabled={uploadMut.isPending}>
                        Upload
                        <input type="file" hidden accept="image/png,image/x-icon,image/svg+xml" onChange={e => handleIconUpload(e, 'favicon')} />
                      </Button>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>Navigation Icon (180x180 PNG)</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {form.navicon && (
                        <Box component="img" src={form.navicon.startsWith('http') ? form.navicon : `${import.meta.env.VITE_API_URL || ''}${form.navicon}`}
                          alt="Navicon" sx={{ width: 40, height: 40, border: '1px solid #e5e7eb', borderRadius: 1 }} />
                      )}
                      <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon />} disabled={uploadMut.isPending}>
                        Upload
                        <input type="file" hidden accept="image/png" onChange={e => handleIconUpload(e, 'navicon')} />
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Privacy URL */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  Privacy
                </Typography>
                <TextField
                  fullWidth size="small" label="Privacy Policy URL"
                  value={form.privacyPolicyUrl || ''}
                  onChange={e => setForm(prev => ({ ...prev, privacyPolicyUrl: e.target.value }))}
                  placeholder="https://example.com/privacy"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Brand Visuals (Wave 3 — W3.3) */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  Brand Visuals (Hero Images)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Upload 3-5 hero images for quick use in Hero blocks. Recommended: 1920x800px or larger.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  {(form.brandVisuals || []).map((img, i) => (
                    <Box key={i} sx={{ position: 'relative', width: 200, height: 100, borderRadius: 1, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                      <Box component="img" src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL || ''}${img}`}
                        alt={`Visual ${i + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                      Add Visual
                      <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const formData = new FormData();
                          formData.append('image', file);
                          const apiUrl = import.meta.env.VITE_API_URL || '';
                          const token = localStorage.getItem('admin_token');
                          const resp = await fetch(`${apiUrl}/api/v1/admin-portal/blocks/upload-image`, {
                            method: 'POST', body: formData,
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          const data = await resp.json();
                          if (data.success) {
                            setForm(prev => ({ ...prev, brandVisuals: [...(prev.brandVisuals || []), data.data.url] }));
                            setSnack({ open: true, message: 'Visual uploaded', severity: 'success' });
                          }
                        } catch (err) {
                          setSnack({ open: true, message: err.message, severity: 'error' });
                        }
                        e.target.value = '';
                      }} />
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Button Styles (Wave 2 — W2.7) */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  Button Styles
                </Typography>
                <Grid container spacing={2}>
                  {BUTTON_VARIANTS.map(({ key, label }) => {
                    const btn = form.buttons?.[key] || {};
                    return (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <Box sx={{ p: 1.5, bgcolor: '#fafafa', borderRadius: 1 }}>
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
              </CardContent>
            </Card>
          </Grid>

          {/* Footer Config (Wave 2 — W2.8) */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  Footer Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth size="small" label="Copyright Text"
                      value={form.footer?.copyright || ''}
                      onChange={e => updateFooter('copyright', e.target.value)}
                      placeholder={`\u00A9 ${new Date().getFullYear()} Your Brand`}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Show Newsletter</InputLabel>
                      <Select
                        value={form.footer?.showNewsletter ? 'yes' : 'no'}
                        label="Show Newsletter"
                        onChange={e => updateFooter('showNewsletter', e.target.value === 'yes')}
                      >
                        <MenuItem value="yes">Yes</MenuItem>
                        <MenuItem value="no">No</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Show Social</InputLabel>
                      <Select
                        value={form.footer?.showSocial !== false ? 'yes' : 'no'}
                        label="Show Social"
                        onChange={e => updateFooter('showSocial', e.target.value === 'yes')}
                      >
                        <MenuItem value="yes">Yes</MenuItem>
                        <MenuItem value="no">No</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Footer Columns</Typography>
                    <Grid container spacing={1}>
                      {(form.footer?.columns || []).map((col, i) => (
                        <Grid item xs={12} sm={4} key={i}>
                          <Box sx={{ p: 1, bgcolor: '#fafafa', borderRadius: 1 }}>
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
                                {FOOTER_COLUMN_TYPES.map(t => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
                              </Select>
                            </FormControl>
                            <TextField
                              size="small" fullWidth label="Title"
                              value={col.title || ''}
                              onChange={e => {
                                const cols = [...(form.footer?.columns || [])];
                                cols[i] = { ...cols[i], title: e.target.value };
                                updateFooter('columns', cols);
                              }}
                            />
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Typography Hierarchy (Wave 1) */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
                  {t('branding.typographySection', 'Typography Hierarchy')}
                </Typography>
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
                    <Box key={key} sx={{ mb: 2, p: 1.5, bgcolor: '#fafafa', borderRadius: 1 }}>
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
