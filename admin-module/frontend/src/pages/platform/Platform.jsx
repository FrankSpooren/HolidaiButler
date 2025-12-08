import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Image as ImageIcon,
  TextFields as FontIcon,
  Save as SaveIcon,
  Upload as UploadIcon,
  ColorLens as ColorLensIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Language as LanguageIcon,
  Settings as SettingsIcon,
  ToggleOn as FeatureIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  YouTube as YouTubeIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { platformAPI } from '../../services/api';

// Default platform config for development
const defaultConfig = {
  branding: {
    logo: { url: '', filename: '' },
    favicon: { url: '', filename: '' },
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#9c27b0',
      background: '#ffffff',
      text: '#333333'
    },
    fonts: {
      primary: 'Inter',
      secondary: 'Roboto',
      heading: 'Montserrat'
    }
  },
  contact: {
    email: { general: 'info@holidaibutler.com', support: 'support@holidaibutler.com', sales: 'sales@holidaibutler.com' },
    phone: { main: '+34 900 123 456', support: '+34 900 123 457', international: '+34 900 123 458' },
    address: { street: 'Avenida del Mar 100', city: 'Calpe', state: 'Alicante', zipCode: '03710', country: 'Spain' },
    social: { facebook: '', twitter: '', instagram: '', linkedin: '', youtube: '' },
    website: 'https://holidaibutler.com'
  },
  settings: {
    languages: {
      available: [
        { code: 'en', name: 'English', enabled: true },
        { code: 'es', name: 'Español', enabled: true },
        { code: 'nl', name: 'Nederlands', enabled: true },
        { code: 'de', name: 'Deutsch', enabled: true }
      ],
      default: 'en'
    },
    currency: { default: 'EUR', supported: ['EUR', 'USD', 'GBP'] },
    timezone: 'Europe/Madrid',
    dateFormat: 'DD/MM/YYYY'
  },
  features: {
    chat: { enabled: true, maxMessagesPerDay: 100 },
    booking: { enabled: true, requiresApproval: false },
    reviews: { enabled: true, moderationRequired: true },
    social: { allowSharing: true, platforms: ['facebook', 'twitter', 'whatsapp'] }
  }
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`platform-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Raleway', 'Ubuntu', 'Nunito', 'Merriweather', 'Playfair Display'
];

export default function Platform() {
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await platformAPI.getConfig();
      if (response.success && response.data?.config) {
        setConfig({ ...defaultConfig, ...response.data.config });
      }
    } catch (error) {
      console.warn('Platform API not available, using default config');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const updateConfig = (section, field, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      if (field.includes('.')) {
        const parts = field.split('.');
        let obj = newConfig[section];
        for (let i = 0; i < parts.length - 1; i++) {
          obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
      } else {
        newConfig[section][field] = value;
      }
      return newConfig;
    });
    setHasChanges(true);
  };

  const handleSave = async (section) => {
    setSaving(true);
    try {
      let response;
      switch (section) {
        case 'branding':
          response = await platformAPI.updateBranding(config.branding);
          break;
        case 'contact':
          response = await platformAPI.updateContact(config.contact);
          break;
        case 'settings':
          response = await platformAPI.updateSettings(config.settings);
          break;
        case 'features':
          response = await platformAPI.updateFeatures(config.features);
          break;
        default:
          break;
      }
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} saved successfully`);
      setHasChanges(false);
    } catch (error) {
      toast.error(`Failed to save ${section}. Changes stored locally.`);
      // Store locally for development
      localStorage.setItem(`platform_${section}`, JSON.stringify(config[section]));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Platform Configuration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Customize branding, contact information, and platform settings
      </Typography>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<PaletteIcon />} label="Branding" iconPosition="start" />
          <Tab icon={<EmailIcon />} label="Contact" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="Settings" iconPosition="start" />
          <Tab icon={<FeatureIcon />} label="Features" iconPosition="start" />
        </Tabs>

        {/* Branding Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Logo Upload */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ImageIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Logo</Typography>
                    </Box>
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 4,
                        textAlign: 'center',
                        bgcolor: 'background.default'
                      }}
                    >
                      {config.branding.logo?.url ? (
                        <img
                          src={config.branding.logo.url}
                          alt="Logo"
                          style={{ maxWidth: '200px', maxHeight: '100px' }}
                        />
                      ) : (
                        <Typography color="text.secondary">
                          No logo uploaded
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<UploadIcon />}
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      Upload Logo
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Favicon Upload */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ImageIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Favicon</Typography>
                    </Box>
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 4,
                        textAlign: 'center',
                        bgcolor: 'background.default'
                      }}
                    >
                      {config.branding.favicon?.url ? (
                        <img
                          src={config.branding.favicon.url}
                          alt="Favicon"
                          style={{ width: '32px', height: '32px' }}
                        />
                      ) : (
                        <Typography color="text.secondary">
                          No favicon uploaded
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<UploadIcon />}
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      Upload Favicon
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Colors */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <ColorLensIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Brand Colors</Typography>
                    </Box>
                    <Grid container spacing={2}>
                      {Object.entries(config.branding.colors || {}).map(([key, value]) => (
                        <Grid item xs={6} sm={4} md={2.4} key={key}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Box
                              sx={{
                                width: 60,
                                height: 60,
                                borderRadius: 2,
                                bgcolor: value,
                                mx: 'auto',
                                mb: 1,
                                border: '2px solid',
                                borderColor: 'divider',
                                cursor: 'pointer'
                              }}
                            />
                            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                              {key}
                            </Typography>
                            <TextField
                              size="small"
                              value={value}
                              onChange={(e) => updateConfig('branding', `colors.${key}`, e.target.value)}
                              sx={{ mt: 0.5 }}
                              inputProps={{ style: { textAlign: 'center', fontSize: '0.75rem' } }}
                            />
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Fonts */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <FontIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Typography</Typography>
                    </Box>
                    <Grid container spacing={2}>
                      {Object.entries(config.branding.fonts || {}).map(([key, value]) => (
                        <Grid item xs={12} sm={4} key={key}>
                          <FormControl fullWidth>
                            <InputLabel sx={{ textTransform: 'capitalize' }}>{key} Font</InputLabel>
                            <Select
                              value={value}
                              label={`${key} Font`}
                              onChange={(e) => updateConfig('branding', `fonts.${key}`, e.target.value)}
                            >
                              {FONT_OPTIONS.map((font) => (
                                <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                                  {font}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={() => handleSave('branding')}
                  disabled={saving}
                >
                  Save Branding
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Contact Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Email */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Email Addresses</Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="General Email"
                          value={config.contact.email?.general || ''}
                          onChange={(e) => updateConfig('contact', 'email.general', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Support Email"
                          value={config.contact.email?.support || ''}
                          onChange={(e) => updateConfig('contact', 'email.support', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Sales Email"
                          value={config.contact.email?.sales || ''}
                          onChange={(e) => updateConfig('contact', 'email.sales', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Phone */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PhoneIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Phone Numbers</Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Main Phone"
                          value={config.contact.phone?.main || ''}
                          onChange={(e) => updateConfig('contact', 'phone.main', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Support Phone"
                          value={config.contact.phone?.support || ''}
                          onChange={(e) => updateConfig('contact', 'phone.support', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="International"
                          value={config.contact.phone?.international || ''}
                          onChange={(e) => updateConfig('contact', 'phone.international', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Address */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Address</Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Street"
                          value={config.contact.address?.street || ''}
                          onChange={(e) => updateConfig('contact', 'address.street', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="City"
                          value={config.contact.address?.city || ''}
                          onChange={(e) => updateConfig('contact', 'address.city', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="State/Province"
                          value={config.contact.address?.state || ''}
                          onChange={(e) => updateConfig('contact', 'address.state', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Zip Code"
                          value={config.contact.address?.zipCode || ''}
                          onChange={(e) => updateConfig('contact', 'address.zipCode', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Country"
                          value={config.contact.address?.country || ''}
                          onChange={(e) => updateConfig('contact', 'address.country', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Social Media */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <InstagramIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Social Media</Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Facebook"
                          value={config.contact.social?.facebook || ''}
                          onChange={(e) => updateConfig('contact', 'social.facebook', e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start"><FacebookIcon /></InputAdornment>
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Instagram"
                          value={config.contact.social?.instagram || ''}
                          onChange={(e) => updateConfig('contact', 'social.instagram', e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start"><InstagramIcon /></InputAdornment>
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Twitter/X"
                          value={config.contact.social?.twitter || ''}
                          onChange={(e) => updateConfig('contact', 'social.twitter', e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start"><TwitterIcon /></InputAdornment>
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="LinkedIn"
                          value={config.contact.social?.linkedin || ''}
                          onChange={(e) => updateConfig('contact', 'social.linkedin', e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start"><LinkedInIcon /></InputAdornment>
                          }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={() => handleSave('contact')}
                  disabled={saving}
                >
                  Save Contact Info
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Languages */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <LanguageIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Languages</Typography>
                    </Box>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Default Language</InputLabel>
                      <Select
                        value={config.settings.languages?.default || 'en'}
                        label="Default Language"
                        onChange={(e) => updateConfig('settings', 'languages.default', e.target.value)}
                      >
                        {config.settings.languages?.available?.map((lang) => (
                          <MenuItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Available Languages</Typography>
                    <List dense>
                      {config.settings.languages?.available?.map((lang, idx) => (
                        <ListItem key={lang.code} disableGutters>
                          <ListItemText primary={lang.name} secondary={lang.code.toUpperCase()} />
                          <ListItemSecondaryAction>
                            <Switch
                              checked={lang.enabled}
                              onChange={(e) => {
                                const newLangs = [...config.settings.languages.available];
                                newLangs[idx].enabled = e.target.checked;
                                updateConfig('settings', 'languages.available', newLangs);
                              }}
                              color="primary"
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Currency & Timezone */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Regional Settings</Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Default Currency</InputLabel>
                          <Select
                            value={config.settings.currency?.default || 'EUR'}
                            label="Default Currency"
                            onChange={(e) => updateConfig('settings', 'currency.default', e.target.value)}
                          >
                            <MenuItem value="EUR">EUR - Euro</MenuItem>
                            <MenuItem value="USD">USD - US Dollar</MenuItem>
                            <MenuItem value="GBP">GBP - British Pound</MenuItem>
                            <MenuItem value="CHF">CHF - Swiss Franc</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Timezone</InputLabel>
                          <Select
                            value={config.settings.timezone || 'Europe/Madrid'}
                            label="Timezone"
                            onChange={(e) => updateConfig('settings', 'timezone', e.target.value)}
                          >
                            <MenuItem value="Europe/Madrid">Europe/Madrid (CET)</MenuItem>
                            <MenuItem value="Europe/London">Europe/London (GMT)</MenuItem>
                            <MenuItem value="Europe/Amsterdam">Europe/Amsterdam (CET)</MenuItem>
                            <MenuItem value="Europe/Berlin">Europe/Berlin (CET)</MenuItem>
                            <MenuItem value="America/New_York">America/New York (EST)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Date Format</InputLabel>
                          <Select
                            value={config.settings.dateFormat || 'DD/MM/YYYY'}
                            label="Date Format"
                            onChange={(e) => updateConfig('settings', 'dateFormat', e.target.value)}
                          >
                            <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (European)</MenuItem>
                            <MenuItem value="MM/DD/YYYY">MM/DD/YYYY (US)</MenuItem>
                            <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={() => handleSave('settings')}
                  disabled={saving}
                >
                  Save Settings
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Features Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Chat Feature */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">AI Chat</Typography>
                      <Switch
                        checked={config.features.chat?.enabled || false}
                        onChange={(e) => updateConfig('features', 'chat.enabled', e.target.checked)}
                        color="primary"
                      />
                    </Box>
                    <TextField
                      fullWidth
                      type="number"
                      label="Max Messages Per Day"
                      value={config.features.chat?.maxMessagesPerDay || 100}
                      onChange={(e) => updateConfig('features', 'chat.maxMessagesPerDay', parseInt(e.target.value))}
                      disabled={!config.features.chat?.enabled}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Booking Feature */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">Bookings</Typography>
                      <Switch
                        checked={config.features.booking?.enabled || false}
                        onChange={(e) => updateConfig('features', 'booking.enabled', e.target.checked)}
                        color="primary"
                      />
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.features.booking?.requiresApproval || false}
                          onChange={(e) => updateConfig('features', 'booking.requiresApproval', e.target.checked)}
                          disabled={!config.features.booking?.enabled}
                        />
                      }
                      label="Require Admin Approval"
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Reviews Feature */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">Reviews</Typography>
                      <Switch
                        checked={config.features.reviews?.enabled || false}
                        onChange={(e) => updateConfig('features', 'reviews.enabled', e.target.checked)}
                        color="primary"
                      />
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.features.reviews?.moderationRequired || false}
                          onChange={(e) => updateConfig('features', 'reviews.moderationRequired', e.target.checked)}
                          disabled={!config.features.reviews?.enabled}
                        />
                      }
                      label="Require Moderation"
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Social Sharing Feature */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">Social Sharing</Typography>
                      <Switch
                        checked={config.features.social?.allowSharing || false}
                        onChange={(e) => updateConfig('features', 'social.allowSharing', e.target.checked)}
                        color="primary"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {['facebook', 'twitter', 'whatsapp', 'linkedin', 'email'].map((platform) => (
                        <Chip
                          key={platform}
                          label={platform}
                          color={config.features.social?.platforms?.includes(platform) ? 'primary' : 'default'}
                          onClick={() => {
                            const platforms = config.features.social?.platforms || [];
                            const newPlatforms = platforms.includes(platform)
                              ? platforms.filter(p => p !== platform)
                              : [...platforms, platform];
                            updateConfig('features', 'social.platforms', newPlatforms);
                          }}
                          disabled={!config.features.social?.allowSharing}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={() => handleSave('features')}
                  disabled={saving}
                >
                  Save Features
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {hasChanges && (
        <Alert severity="info" sx={{ mt: 3 }}>
          You have unsaved changes
        </Alert>
      )}
    </Box>
  );
}
