import { useState, useEffect } from 'react';
import {
  Box, Typography, Stepper, Step, StepLabel, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel,
  Checkbox, Alert, Paper, Grid, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Snackbar, Radio, RadioGroup,
  Card, CardContent, CardActionArea, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PublicIcon from '@mui/icons-material/Public';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client.js';
import { BRANDING_TEMPLATES } from '../utils/brandingTemplates.js';

// Steps per destination type
const STEPS_TOURISM = { nl: ['Basis', 'Branding', 'Modules', 'Navigatie', 'Pagina\'s'], en: ['Basics', 'Branding', 'Modules', 'Navigation', 'Pages'] };
const STEPS_CONTENT_ONLY = { nl: ['Basis', 'Branding', 'Content Configuratie', 'Bevestiging'], en: ['Basics', 'Branding', 'Content Configuration', 'Confirmation'] };

const TIMEZONE_OPTIONS = [
  'Europe/Amsterdam', 'Europe/Madrid', 'Europe/Brussels',
  'Europe/Berlin', 'Europe/London', 'Europe/Paris',
];

const LANGUAGE_OPTIONS = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

const DEFAULT_NAV_ITEMS = [
  { label: 'Home', slug: 'home', order: 1 },
  { label: 'Explore', slug: 'explore', order: 2 },
  { label: 'Restaurants', slug: 'restaurants', order: 3 },
  { label: 'Events', slug: 'events', order: 4 },
  { label: 'Contact', slug: 'contact', order: 5 },
  { label: 'About', slug: 'about', order: 6 },
];

const PAGE_TEMPLATES = [
  { slug: 'home', label: 'Homepage', description: 'Hero + POI grid + Events', checked: true },
  { slug: 'explore', label: 'Explore', description: 'POI grid met filters', checked: true },
  { slug: 'restaurants', label: 'Restaurants', description: 'POI grid (Food & Drinks)', checked: true },
  { slug: 'events', label: 'Events', description: 'Evenementenkalender', checked: true },
  { slug: 'contact', label: 'Contact', description: 'Contactformulier + kaart', checked: true },
  { slug: 'about', label: 'Over ons', description: 'Rich text + afbeeldingen', checked: true },
];

const MODULE_FLAGS = [
  { key: 'pois', label: 'POI Database', description: 'Points of Interest (Food & Drinks, Cultuur & Historie, Actief, Natuur, etc.)' },
  { key: 'chatbot', label: 'AI Chatbot', description: 'RAG-powered chatbot voor bezoekers' },
  { key: 'agenda', label: 'Agenda / Events', description: 'Evenementenkalender uit agenda tabel' },
  { key: 'ticketing', label: 'Ticketing', description: 'Ticket verkoop via Adyen' },
  { key: 'reservations', label: 'Reserveringen', description: 'Reserveringssysteem voor POIs' },
  { key: 'commerce', label: 'Commerce Dashboard', description: 'Omzet en transactie dashboard' },
  { key: 'aiContent', label: 'AI Content Generatie', description: 'Automatische content generatie met Mistral AI' },
];

const SOCIAL_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: '📘' },
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { key: 'x', label: 'X (Twitter)', icon: '🐦' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵' },
  { key: 'pinterest', label: 'Pinterest', icon: '📌' },
  { key: 'youtube', label: 'YouTube', icon: '🎬' },
];

const INITIAL_FORM = {
  destinationType: 'tourism',
  name: '', slug: '', domains: [''], language: 'nl', timezone: 'Europe/Amsterdam',
  primaryColor: '#7FA594', secondaryColor: '#5E8B7E', payoff: '',
  featureFlags: { pois: true, chatbot: true, agenda: true, ticketing: false, reservations: false, commerce: false, aiContent: false },
  navItems: [...DEFAULT_NAV_ITEMS],
  pages: PAGE_TEMPLATES.map(p => ({ ...p })),
  // Content-only specific
  tonePreset: 'professional',
  socialPlatforms: { facebook: true, instagram: true, linkedin: true, x: false, tiktok: false, pinterest: false, youtube: false },
  targetLanguages: ['nl', 'en'],
  contactPerson: '',
  contactEmail: '',
};

export default function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const isNL = i18n.language === 'nl';

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [snackbar, setSnackbar] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const isContentOnly = form.destinationType === 'content_only';
  const stepsConfig = isContentOnly ? STEPS_CONTENT_ONLY : STEPS_TOURISM;
  const steps = isNL ? stepsConfig.nl : stepsConfig.en;

  // Fetch tone presets for content-only
  const { data: tonePresetsData } = useQuery({
    queryKey: ['tone-presets', isContentOnly ? 'content_only' : 'tourism'],
    queryFn: () => client.get('/content/tone-presets?destination_id=' + (isContentOnly ? '0' : '1')).then(r => r.data),
    enabled: isContentOnly,
    staleTime: 10 * 60 * 1000,
  });
  const tonePresets = tonePresetsData?.data || [];

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleNext = () => setActiveStep(prev => prev + 1);
  const handleBack = () => setActiveStep(prev => prev - 1);

  // Reset steps when switching type
  const handleTypeChange = (type) => {
    updateField('destinationType', type);
    setActiveStep(0);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const selectedPreset = isContentOnly ? tonePresets.find(p => p.id === form.tonePreset) : null;
      const payload = {
        name: form.name,
        slug: form.slug,
        domains: form.domains.filter(d => d.trim()),
        language: form.language,
        timezone: form.timezone,
        destinationType: form.destinationType,
        contactPerson: form.contactPerson || '',
        contactEmail: form.contactEmail || '',
        targetLanguages: form.targetLanguages || [],
        branding: {
          colors: { primary: form.primaryColor, secondary: form.secondaryColor },
          payoff: { [form.language]: form.payoff },
          ...(isContentOnly && selectedPreset ? {
            toneOfVoice: {
              personality: selectedPreset.personality || '',
              audience: selectedPreset.audience || '',
              brandValues: selectedPreset.brandValues || '',
              adjectives: selectedPreset.adjectives || '',
              avoidWords: selectedPreset.avoidWords || '',
              samplePhrases: selectedPreset.samplePhrases || '',
              coreKeywords: selectedPreset.coreKeywords || '',
              formalAddress: selectedPreset.formalAddress || 'je',
            }
          } : {}),
        },
        featureFlags: isContentOnly
          ? { hasContentStudio: true, hasMediaLibrary: true, hasBranding: true, hasPOI: false, hasEvents: false,
              hasTicketing: false, hasReservations: false, hasChatbot: false, hasCommerce: false,
              hasPartners: false, hasIntermediary: false, hasFinancial: false, hasPages: false,
              social_platforms: form.socialPlatforms }
          : form.featureFlags,
        navigation: isContentOnly ? [] : form.navItems,
        pages: isContentOnly ? [] : form.pages.filter(p => p.checked).map(p => p.slug),
      };

      const { data } = await client.post('/onboarding/create', payload);
      setResult(data);
    } catch (err) {
      const errMsg = err.response?.data?.error;
      setError(typeof errMsg === 'object' ? (errMsg.message || JSON.stringify(errMsg)) : (errMsg || err.message || 'Onboarding mislukt'));
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (activeStep === 0) return form.name.trim() && form.slug.trim();
    if (activeStep === 1) return form.primaryColor;
    if (isContentOnly) {
      if (activeStep === 2) return form.tonePreset; // Content config
      if (activeStep === 3) return true; // Confirmation
    } else {
      if (activeStep === 2) return true; // Modules
      if (activeStep === 3) return form.navItems.length > 0; // Navigation
      if (activeStep === 4) return form.pages.some(p => p.checked); // Pages
    }
    return true;
  };

  const isLastStep = activeStep === steps.length - 1;

  // ============================================================
  // STEP RENDERERS
  // ============================================================

  // Step 1: Basics (+ destination type)
  const renderBasics = () => (
    <Grid container spacing={3}>
      {/* Destination Type Selection */}
      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          {t('onboarding.destinationType', 'Type bestemming')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Card
            variant="outlined"
            sx={{
              flex: 1, cursor: 'pointer',
              borderColor: !isContentOnly ? 'primary.main' : 'divider',
              borderWidth: !isContentOnly ? 2 : 1,
              bgcolor: !isContentOnly ? 'primary.50' : 'background.paper',
            }}
          >
            <CardActionArea onClick={() => handleTypeChange('tourism')} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PublicIcon color={!isContentOnly ? 'primary' : 'disabled'} />
                <Typography variant="subtitle1" fontWeight={600}>
                  {t('onboarding.typeTourism', 'Toerisme Bestemming')}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t('onboarding.typeTourismDesc', 'Volledig platform: POI, Events, Chatbot, Commerce, Content Studio, Customer Portal')}
              </Typography>
            </CardActionArea>
          </Card>
          <Card
            variant="outlined"
            sx={{
              flex: 1, cursor: 'pointer',
              borderColor: isContentOnly ? 'info.main' : 'divider',
              borderWidth: isContentOnly ? 2 : 1,
              bgcolor: isContentOnly ? 'info.50' : 'background.paper',
            }}
          >
            <CardActionArea onClick={() => handleTypeChange('content_only')} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AutoAwesomeIcon color={isContentOnly ? 'info' : 'disabled'} />
                <Typography variant="subtitle1" fontWeight={600}>
                  {t('onboarding.typeContentOnly', 'Content Studio (standalone)')}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t('onboarding.typeContentOnlyDesc', 'Alleen Content Studio + Media Library + Branding. Geen POI, Events, Commerce of Customer Portal.')}
              </Typography>
            </CardActionArea>
          </Card>
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth label={isContentOnly ? t('onboarding.orgName', 'Organisatienaam') : t('onboarding.name')} value={form.name}
          onChange={e => {
            updateField('name', e.target.value);
            if (!form.slug || form.slug === slugify(form.name)) {
              updateField('slug', slugify(e.target.value));
            }
          }}
          helperText={isContentOnly ? t('onboarding.orgNameHelper', 'Naam van de organisatie/klant') : t('onboarding.nameHelper')}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth label={t('onboarding.slug')} value={form.slug}
          onChange={e => updateField('slug', slugify(e.target.value))}
          helperText={t('onboarding.slugHelper')}
        />
      </Grid>

      {!isContentOnly && (
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('onboarding.domains')}</Typography>
          {form.domains.map((domain, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField fullWidth size="small" placeholder="example.com" value={domain}
                onChange={e => { const d = [...form.domains]; d[i] = e.target.value; updateField('domains', d); }} />
              {form.domains.length > 1 && (
                <IconButton size="small" onClick={() => updateField('domains', form.domains.filter((_, idx) => idx !== i))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={() => updateField('domains', [...form.domains, ''])}>
            {t('onboarding.addDomain')}
          </Button>
        </Grid>
      )}

      {isContentOnly && (
        <>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label={t('onboarding.contactPerson', 'Contactpersoon')} value={form.contactPerson}
              onChange={e => updateField('contactPerson', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label={t('onboarding.contactEmail', 'Email contactpersoon')} value={form.contactEmail}
              onChange={e => updateField('contactEmail', e.target.value)} type="email" />
          </Grid>
        </>
      )}

      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>{t('onboarding.language')}</InputLabel>
          <Select value={form.language} label={t('onboarding.language')}
            onChange={e => updateField('language', e.target.value)}>
            {LANGUAGE_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>{t('onboarding.timezone')}</InputLabel>
          <Select value={form.timezone} label={t('onboarding.timezone')}
            onChange={e => updateField('timezone', e.target.value)}>
            {TIMEZONE_OPTIONS.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  // Step 2: Branding (shared)
  const renderBranding = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Design Template</Typography>
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
          {BRANDING_TEMPLATES.map(tpl => (
            <Box key={tpl.id} onClick={() => {
              setSelectedTemplate(tpl.id);
              updateField('primaryColor', tpl.values.colors.primary);
              updateField('secondaryColor', tpl.values.colors.secondary);
            }}
            sx={{
              p: 1.5, minWidth: 140, borderRadius: 1, cursor: 'pointer', flexShrink: 0,
              border: selectedTemplate === tpl.id ? '2px solid' : '1px solid',
              borderColor: selectedTemplate === tpl.id ? 'primary.main' : 'divider',
              '&:hover': { borderColor: 'primary.main' }, transition: 'border-color 0.2s', bgcolor: 'background.paper'
            }}>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                {Object.values(tpl.preview).map((color, i) => (
                  <Box key={i} sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: color }} />
                ))}
              </Box>
              <Typography variant="caption" fontWeight={600}>{tpl.name.en || Object.values(tpl.name)[0]}</Typography>
            </Box>
          ))}
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('onboarding.primaryColor')}</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <input type="color" value={form.primaryColor} onChange={e => updateField('primaryColor', e.target.value)}
            style={{ width: 60, height: 40, border: 'none', cursor: 'pointer' }} />
          <TextField size="small" value={form.primaryColor} onChange={e => updateField('primaryColor', e.target.value)} sx={{ width: 120 }} />
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('onboarding.secondaryColor')}</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <input type="color" value={form.secondaryColor} onChange={e => updateField('secondaryColor', e.target.value)}
            style={{ width: 60, height: 40, border: 'none', cursor: 'pointer' }} />
          <TextField size="small" value={form.secondaryColor} onChange={e => updateField('secondaryColor', e.target.value)} sx={{ width: 120 }} />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label={t('onboarding.payoff')} value={form.payoff}
          onChange={e => updateField('payoff', e.target.value)} helperText={t('onboarding.payoffHelper')} />
      </Grid>
      <Grid item xs={12}>
        <Paper sx={{ p: 3, bgcolor: form.primaryColor, color: '#fff', borderRadius: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{form.name || 'Destination Name'}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>{form.payoff || 'Your payoff here...'}</Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Box sx={{ px: 2, py: 0.5, bgcolor: '#fff', color: form.primaryColor, borderRadius: 1, fontSize: 14, fontWeight: 600 }}>Primary</Box>
            <Box sx={{ px: 2, py: 0.5, bgcolor: form.secondaryColor, color: '#fff', borderRadius: 1, fontSize: 14, fontWeight: 600 }}>Secondary</Box>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  // Step 3 (tourism): Modules
  const renderModules = () => (
    <FormGroup>
      {MODULE_FLAGS.map(mod => (
        <FormControlLabel key={mod.key}
          control={<Checkbox checked={form.featureFlags[mod.key] || false}
            onChange={e => updateField('featureFlags', { ...form.featureFlags, [mod.key]: e.target.checked })} />}
          label={<Box><Typography variant="body1" sx={{ fontWeight: 600 }}>{mod.label}</Typography>
            <Typography variant="body2" color="text.secondary">{mod.description}</Typography></Box>}
          sx={{ mb: 2, alignItems: 'flex-start', '& .MuiCheckbox-root': { mt: -0.5 } }}
        />
      ))}
    </FormGroup>
  );

  // Step 3 (content_only): Content Configuration
  const renderContentConfig = () => (
    <Grid container spacing={3}>
      {/* Tone of Voice Preset */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          {t('onboarding.tonePreset', 'Tone of Voice')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('onboarding.tonePresetHelper', 'Kies een communicatiestijl. Je kunt dit later aanpassen in Branding.')}
        </Typography>
        <RadioGroup value={form.tonePreset} onChange={e => updateField('tonePreset', e.target.value)}>
          {tonePresets.map(preset => (
            <Paper key={preset.id} variant="outlined" sx={{
              p: 2, mb: 1.5, cursor: 'pointer',
              borderColor: form.tonePreset === preset.id ? 'primary.main' : 'divider',
              borderWidth: form.tonePreset === preset.id ? 2 : 1,
            }} onClick={() => updateField('tonePreset', preset.id)}>
              <FormControlLabel value={preset.id}
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {preset.label?.[i18n.language] || preset.label?.en || preset.id}
                    </Typography>
                    {preset.personality && (
                      <Typography variant="body2" color="text.secondary">
                        {preset.personality}
                      </Typography>
                    )}
                  </Box>
                }
                sx={{ m: 0, width: '100%' }}
              />
            </Paper>
          ))}
          {tonePresets.length === 0 && (
            <Alert severity="info" sx={{ mt: 1 }}>
              {t('onboarding.tonePresetsLoading', 'Tone of Voice presets worden geladen...')}
            </Alert>
          )}
        </RadioGroup>
      </Grid>

      <Divider sx={{ width: '100%', my: 1 }} />

      {/* Social Platforms */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          {t('onboarding.socialPlatforms', 'Actieve Social Media Platformen')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('onboarding.socialPlatformsHelper', 'Selecteer de platformen waarvoor content wordt gegenereerd.')}
        </Typography>
        <FormGroup row>
          {SOCIAL_PLATFORMS.map(platform => (
            <FormControlLabel key={platform.key}
              control={<Checkbox checked={form.socialPlatforms[platform.key] || false}
                onChange={e => updateField('socialPlatforms', { ...form.socialPlatforms, [platform.key]: e.target.checked })} />}
              label={`${platform.icon} ${platform.label}`}
              sx={{ minWidth: 170 }}
            />
          ))}
        </FormGroup>
      </Grid>

      <Divider sx={{ width: '100%', my: 1 }} />

      {/* Target Languages */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          {t('onboarding.targetLanguages', 'Doeltalen voor Content')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('onboarding.targetLanguagesHelper', 'Content wordt automatisch vertaald naar deze talen.')}
        </Typography>
        <FormGroup row>
          {LANGUAGE_OPTIONS.map(lang => (
            <FormControlLabel key={lang.value}
              control={<Checkbox checked={form.targetLanguages.includes(lang.value)}
                onChange={e => {
                  const langs = e.target.checked
                    ? [...form.targetLanguages, lang.value]
                    : form.targetLanguages.filter(l => l !== lang.value);
                  updateField('targetLanguages', langs);
                }} />}
              label={lang.label}
            />
          ))}
        </FormGroup>
      </Grid>
    </Grid>
  );

  // Step 4 (tourism): Navigation
  const renderNavigation = () => (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('onboarding.navHelper')}</Typography>
      {form.navItems.map((item, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <Chip label={i + 1} size="small" sx={{ minWidth: 28 }} />
          <TextField size="small" value={item.label} label="Label"
            onChange={e => { const items = [...form.navItems]; items[i] = { ...items[i], label: e.target.value }; updateField('navItems', items); }}
            sx={{ flex: 1 }} />
          <TextField size="small" value={item.slug} label="Slug"
            onChange={e => { const items = [...form.navItems]; items[i] = { ...items[i], slug: e.target.value }; updateField('navItems', items); }}
            sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => updateField('navItems', form.navItems.filter((_, idx) => idx !== i))}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={() => updateField('navItems', [...form.navItems, { label: '', slug: '', order: form.navItems.length + 1 }])}>
        {t('onboarding.addNavItem')}
      </Button>
    </Box>
  );

  // Step 5 (tourism): Pages
  const renderPages = () => (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('onboarding.pagesHelper')}</Typography>
      <FormGroup>
        {form.pages.map((page, i) => (
          <FormControlLabel key={page.slug}
            control={<Checkbox checked={page.checked}
              onChange={e => { const pages = [...form.pages]; pages[i] = { ...pages[i], checked: e.target.checked }; updateField('pages', pages); }} />}
            label={<Box><Typography variant="body1" sx={{ fontWeight: 600 }}>{page.label}</Typography>
              <Typography variant="body2" color="text.secondary">{page.description}</Typography></Box>}
            sx={{ mb: 1.5, alignItems: 'flex-start', '& .MuiCheckbox-root': { mt: -0.5 } }}
          />
        ))}
      </FormGroup>
    </Box>
  );

  // Step 4 (content_only): Confirmation overview
  const renderConfirmation = () => {
    const selectedPreset = tonePresets.find(p => p.id === form.tonePreset);
    const activePlatforms = Object.entries(form.socialPlatforms).filter(([, v]) => v).map(([k]) => k);
    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('onboarding.confirmInfo', 'Controleer de configuratie en klik op "Activeer" om de Content Studio te activeren.')}
          </Alert>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">{t('onboarding.orgName', 'Organisatie')}</Typography>
            <Typography variant="body1" fontWeight={600}>{form.name}</Typography>
            <Typography variant="caption" color="text.secondary">{form.slug}.holidaibutler.com</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Branding</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: form.primaryColor }} />
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: form.secondaryColor }} />
              <Typography variant="body2">{form.primaryColor} / {form.secondaryColor}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Tone of Voice</Typography>
            <Typography variant="body1" fontWeight={600}>
              {selectedPreset?.label?.[i18n.language] || selectedPreset?.label?.en || form.tonePreset}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Social Platforms</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {activePlatforms.map(p => <Chip key={p} label={p} size="small" />)}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">{t('onboarding.targetLanguages', 'Doeltalen')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              {form.targetLanguages.map(l => <Chip key={l} label={LANGUAGE_OPTIONS.find(o => o.value === l)?.label || l} size="small" />)}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">{t('onboarding.type', 'Type')}</Typography>
            <Chip label="Content Studio (standalone)" color="info" size="small" icon={<AutoAwesomeIcon />} />
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderStep = () => {
    if (activeStep === 0) return renderBasics();
    if (activeStep === 1) return renderBranding();

    if (isContentOnly) {
      if (activeStep === 2) return renderContentConfig();
      if (activeStep === 3) return renderConfirmation();
    } else {
      if (activeStep === 2) return renderModules();
      if (activeStep === 3) return renderNavigation();
      if (activeStep === 4) return renderPages();
    }
    return null;
  };

  // ============================================================
  // RESULT SCREEN
  // ============================================================

  if (result) {
    const resData = result.data || result;
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="h6">{t('onboarding.success')}</Typography>
          <Typography variant="body2">
            {isContentOnly ? 'Content Studio' : 'Destination'} <strong>{form.name}</strong> (ID: {resData.destinationId || '?'}) {t('onboarding.created')}
          </Typography>
        </Alert>

        {isContentOnly ? (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Volgende stappen</Typography>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontSize: 13 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>1. Maak een admin-gebruiker aan voor de klant via <strong>Users</strong> pagina</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>2. Wijs de gebruiker toe aan destination <strong>{form.name}</strong></Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>3. De klant kan inloggen op <strong>admin.holidaibutler.com</strong></Typography>
              <Typography variant="body2">4. De klant ziet alleen: Dashboard, Content Studio, Media Library, Branding</Typography>
            </Box>
          </Paper>
        ) : (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('onboarding.dnsTitle')}</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>{t('onboarding.dnsStep1')}</Typography>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: 13, mb: 2, position: 'relative' }}>
              {form.domains.filter(d => d.trim()).map(domain => (
                <Box key={domain}>{domain} → A Record → 91.98.71.87</Box>
              ))}
              <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4 }}
                onClick={() => { navigator.clipboard.writeText(form.domains.filter(d => d.trim()).map(d => `${d} → A Record → 91.98.71.87`).join('\n')); setSnackbar('Gekopieerd!'); }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>{t('onboarding.dnsStep2')}</Typography>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: 13, mb: 2 }}>
              <Box>sudo certbot --apache -d {form.domains[0]?.trim() || 'example.com'}</Box>
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>{t('onboarding.dnsStep3')}</Typography>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: 13 }}>
              <Box>{`# Apache VHost for ${form.name}`}</Box>
              <Box>{`<VirtualHost *:443>`}</Box>
              <Box>{`  ServerName ${form.domains[0]?.trim() || 'example.com'}`}</Box>
              <Box>{`  RequestHeader set X-Destination-ID "${form.slug}"`}</Box>
              <Box>{`  ProxyPass /api/v1 http://localhost:3001/api/v1`}</Box>
              <Box>{`  ProxyPass / http://localhost:3002/`}</Box>
              <Box>{`</VirtualHost>`}</Box>
            </Box>
          </Paper>
        )}

        <Button variant="contained" onClick={() => { setResult(null); setActiveStep(0); setForm(INITIAL_FORM); }}>
          {t('onboarding.createAnother')}
        </Button>
        <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar('')} message={snackbar} />
      </Box>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        {t('onboarding.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        {isContentOnly
          ? t('onboarding.subtitleContentOnly', 'Onboard een nieuwe Content Studio klant in 4 stappen.')
          : t('onboarding.subtitle')}
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ p: 4, mb: 3 }}>
        {renderStep()}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button disabled={activeStep === 0} onClick={handleBack} startIcon={<ArrowBackIcon />}>
          {t('common.back')}
        </Button>

        {!isLastStep ? (
          <Button variant="contained" onClick={handleNext} disabled={!canProceed()} endIcon={<ArrowForwardIcon />}>
            {t('common.next')}
          </Button>
        ) : (
          <Button variant="contained" color="success" onClick={handleSubmit}
            disabled={loading || !canProceed()} startIcon={loading ? <CircularProgress size={18} /> : <RocketLaunchIcon />}>
            {t('onboarding.activate')}
          </Button>
        )}
      </Box>
    </Box>
  );
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
