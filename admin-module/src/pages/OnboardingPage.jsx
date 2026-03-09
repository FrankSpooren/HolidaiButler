import { useState } from 'react';
import {
  Box, Typography, Stepper, Step, StepLabel, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel,
  Checkbox, Alert, Paper, Grid, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from 'react-i18next';
import client from '../api/client.js';

const STEPS_NL = ['Basis', 'Branding', 'Modules', 'Navigatie', 'Pagina\'s'];
const STEPS_EN = ['Basics', 'Branding', 'Modules', 'Navigation', 'Pages'];

const TIMEZONE_OPTIONS = [
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Brussels',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
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
  { key: 'chatbot', label: 'AI Chatbot', description: 'RAG-powered chatbot voor bezoekers' },
  { key: 'agenda', label: 'Agenda / Events', description: 'Evenementenkalender uit agenda tabel' },
  { key: 'ticketing', label: 'Ticketing', description: 'Ticket verkoop via Adyen' },
  { key: 'reservations', label: 'Reserveringen', description: 'Reserveringssysteem voor POIs' },
  { key: 'commerce', label: 'Commerce Dashboard', description: 'Omzet en transactie dashboard' },
];

const INITIAL_FORM = {
  // Step 1: Basics
  name: '',
  slug: '',
  domains: [''],
  language: 'nl',
  timezone: 'Europe/Amsterdam',
  // Step 2: Branding
  primaryColor: '#7FA594',
  secondaryColor: '#5E8B7E',
  payoff: '',
  // Step 3: Modules
  featureFlags: {
    chatbot: true,
    agenda: true,
    ticketing: false,
    reservations: false,
    commerce: false,
  },
  // Step 4: Navigation
  navItems: [...DEFAULT_NAV_ITEMS],
  // Step 5: Pages
  pages: PAGE_TEMPLATES.map(p => ({ ...p })),
};

export default function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const isNL = i18n.language === 'nl';
  const steps = isNL ? STEPS_NL : STEPS_EN;

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [snackbar, setSnackbar] = useState('');

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => setActiveStep(prev => prev + 1);
  const handleBack = () => setActiveStep(prev => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        domains: form.domains.filter(d => d.trim()),
        language: form.language,
        timezone: form.timezone,
        branding: {
          colors: {
            primary: form.primaryColor,
            secondary: form.secondaryColor,
          },
          payoff: { [form.language]: form.payoff },
        },
        featureFlags: form.featureFlags,
        navigation: form.navItems,
        pages: form.pages.filter(p => p.checked).map(p => p.slug),
      };

      const { data } = await client.post('/onboarding/create', payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Onboarding mislukt');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0: return form.name.trim() && form.slug.trim();
      case 1: return form.primaryColor;
      case 2: return true;
      case 3: return form.navItems.length > 0;
      case 4: return form.pages.some(p => p.checked);
      default: return true;
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0: return renderBasics();
      case 1: return renderBranding();
      case 2: return renderModules();
      case 3: return renderNavigation();
      case 4: return renderPages();
      default: return null;
    }
  };

  // Step 1: Basics
  const renderBasics = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth label={t('onboarding.name')} value={form.name}
          onChange={e => {
            updateField('name', e.target.value);
            if (!form.slug || form.slug === slugify(form.name)) {
              updateField('slug', slugify(e.target.value));
            }
          }}
          helperText={t('onboarding.nameHelper')}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth label={t('onboarding.slug')} value={form.slug}
          onChange={e => updateField('slug', slugify(e.target.value))}
          helperText={t('onboarding.slugHelper')}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('onboarding.domains')}</Typography>
        {form.domains.map((domain, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              fullWidth size="small" placeholder="example.com"
              value={domain}
              onChange={e => {
                const newDomains = [...form.domains];
                newDomains[i] = e.target.value;
                updateField('domains', newDomains);
              }}
            />
            {form.domains.length > 1 && (
              <IconButton size="small" onClick={() => {
                updateField('domains', form.domains.filter((_, idx) => idx !== i));
              }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => updateField('domains', [...form.domains, ''])}>
          {t('onboarding.addDomain')}
        </Button>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>{t('onboarding.language')}</InputLabel>
          <Select value={form.language} label={t('onboarding.language')}
            onChange={e => updateField('language', e.target.value)}>
            {LANGUAGE_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>{t('onboarding.timezone')}</InputLabel>
          <Select value={form.timezone} label={t('onboarding.timezone')}
            onChange={e => updateField('timezone', e.target.value)}>
            {TIMEZONE_OPTIONS.map(tz => (
              <MenuItem key={tz} value={tz}>{tz}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  // Step 2: Branding
  const renderBranding = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('onboarding.primaryColor')}</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <input type="color" value={form.primaryColor}
            onChange={e => updateField('primaryColor', e.target.value)}
            style={{ width: 60, height: 40, border: 'none', cursor: 'pointer' }}
          />
          <TextField size="small" value={form.primaryColor}
            onChange={e => updateField('primaryColor', e.target.value)}
            sx={{ width: 120 }}
          />
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('onboarding.secondaryColor')}</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <input type="color" value={form.secondaryColor}
            onChange={e => updateField('secondaryColor', e.target.value)}
            style={{ width: 60, height: 40, border: 'none', cursor: 'pointer' }}
          />
          <TextField size="small" value={form.secondaryColor}
            onChange={e => updateField('secondaryColor', e.target.value)}
            sx={{ width: 120 }}
          />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth label={t('onboarding.payoff')} value={form.payoff}
          onChange={e => updateField('payoff', e.target.value)}
          helperText={t('onboarding.payoffHelper')}
        />
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

  // Step 3: Modules
  const renderModules = () => (
    <FormGroup>
      {MODULE_FLAGS.map(mod => (
        <FormControlLabel
          key={mod.key}
          control={
            <Checkbox
              checked={form.featureFlags[mod.key] || false}
              onChange={e => updateField('featureFlags', { ...form.featureFlags, [mod.key]: e.target.checked })}
            />
          }
          label={
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{mod.label}</Typography>
              <Typography variant="body2" color="text.secondary">{mod.description}</Typography>
            </Box>
          }
          sx={{ mb: 2, alignItems: 'flex-start', '& .MuiCheckbox-root': { mt: -0.5 } }}
        />
      ))}
    </FormGroup>
  );

  // Step 4: Navigation
  const renderNavigation = () => (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('onboarding.navHelper')}
      </Typography>
      {form.navItems.map((item, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <Chip label={i + 1} size="small" sx={{ minWidth: 28 }} />
          <TextField size="small" value={item.label} label="Label"
            onChange={e => {
              const items = [...form.navItems];
              items[i] = { ...items[i], label: e.target.value };
              updateField('navItems', items);
            }}
            sx={{ flex: 1 }}
          />
          <TextField size="small" value={item.slug} label="Slug"
            onChange={e => {
              const items = [...form.navItems];
              items[i] = { ...items[i], slug: e.target.value };
              updateField('navItems', items);
            }}
            sx={{ flex: 1 }}
          />
          <IconButton size="small" onClick={() => {
            updateField('navItems', form.navItems.filter((_, idx) => idx !== i));
          }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={() => {
        updateField('navItems', [...form.navItems, { label: '', slug: '', order: form.navItems.length + 1 }]);
      }}>
        {t('onboarding.addNavItem')}
      </Button>
    </Box>
  );

  // Step 5: Pages
  const renderPages = () => (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('onboarding.pagesHelper')}
      </Typography>
      <FormGroup>
        {form.pages.map((page, i) => (
          <FormControlLabel
            key={page.slug}
            control={
              <Checkbox
                checked={page.checked}
                onChange={e => {
                  const pages = [...form.pages];
                  pages[i] = { ...pages[i], checked: e.target.checked };
                  updateField('pages', pages);
                }}
              />
            }
            label={
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{page.label}</Typography>
                <Typography variant="body2" color="text.secondary">{page.description}</Typography>
              </Box>
            }
            sx={{ mb: 1.5, alignItems: 'flex-start', '& .MuiCheckbox-root': { mt: -0.5 } }}
          />
        ))}
      </FormGroup>
    </Box>
  );

  // Result dialog with DNS instructions
  if (result) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="h6">{t('onboarding.success')}</Typography>
          <Typography variant="body2">
            Destination <strong>{form.name}</strong> (ID: {result.destination_id}) {t('onboarding.created')}
          </Typography>
        </Alert>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{t('onboarding.dnsTitle')}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>{t('onboarding.dnsStep1')}</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: 13, mb: 2, position: 'relative' }}>
            {form.domains.filter(d => d.trim()).map(domain => (
              <Box key={domain}>{domain} → A Record → 91.98.71.87</Box>
            ))}
            <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4 }}
              onClick={() => {
                navigator.clipboard.writeText(form.domains.filter(d => d.trim()).map(d => `${d} → A Record → 91.98.71.87`).join('\n'));
                setSnackbar('Gekopieerd!');
              }}>
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

        <Button variant="contained" onClick={() => {
          setResult(null);
          setActiveStep(0);
          setForm(INITIAL_FORM);
        }}>
          {t('onboarding.createAnother')}
        </Button>

        <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar('')}
          message={snackbar} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        {t('onboarding.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        {t('onboarding.subtitle')}
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ p: 4, mb: 3 }}>
        {renderStep()}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button disabled={activeStep === 0} onClick={handleBack} startIcon={<ArrowBackIcon />}>
          {t('common.back')}
        </Button>

        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext} disabled={!canProceed()}
            endIcon={<ArrowForwardIcon />}>
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
