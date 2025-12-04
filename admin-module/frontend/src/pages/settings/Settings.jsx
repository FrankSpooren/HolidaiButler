import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Language as LanguageIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  Email as EmailIcon,
  Save as SaveIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

// Language options
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

// Translations for Settings page
const translations = {
  en: {
    title: 'Settings',
    subtitle: 'Configure your application preferences',
    language: 'Language & Region',
    languageDesc: 'Select your preferred language',
    notifications: 'Notifications',
    notificationsDesc: 'Manage notification preferences',
    emailNotifications: 'Email Notifications',
    emailNotificationsDesc: 'Receive updates via email',
    pushNotifications: 'Push Notifications',
    pushNotificationsDesc: 'Browser push notifications',
    bookingAlerts: 'Booking Alerts',
    bookingAlertsDesc: 'Alerts for new reservations',
    appearance: 'Appearance',
    appearanceDesc: 'Customize the look and feel',
    darkMode: 'Dark Mode',
    darkModeDesc: 'Use dark theme',
    compactMode: 'Compact Mode',
    compactModeDesc: 'Reduce spacing in lists',
    save: 'Save Settings',
    reset: 'Reset to Default',
    saved: 'Settings saved successfully',
    resetted: 'Settings reset to default'
  },
  es: {
    title: 'Configuración',
    subtitle: 'Configure sus preferencias de aplicación',
    language: 'Idioma y Región',
    languageDesc: 'Seleccione su idioma preferido',
    notifications: 'Notificaciones',
    notificationsDesc: 'Gestione las preferencias de notificación',
    emailNotifications: 'Notificaciones por Email',
    emailNotificationsDesc: 'Recibir actualizaciones por email',
    pushNotifications: 'Notificaciones Push',
    pushNotificationsDesc: 'Notificaciones del navegador',
    bookingAlerts: 'Alertas de Reservas',
    bookingAlertsDesc: 'Alertas para nuevas reservas',
    appearance: 'Apariencia',
    appearanceDesc: 'Personalice el aspecto visual',
    darkMode: 'Modo Oscuro',
    darkModeDesc: 'Usar tema oscuro',
    compactMode: 'Modo Compacto',
    compactModeDesc: 'Reducir espaciado en listas',
    save: 'Guardar Configuración',
    reset: 'Restablecer por Defecto',
    saved: 'Configuración guardada correctamente',
    resetted: 'Configuración restablecida'
  },
  nl: {
    title: 'Instellingen',
    subtitle: 'Configureer uw applicatievoorkeuren',
    language: 'Taal & Regio',
    languageDesc: 'Selecteer uw voorkeurstaal',
    notifications: 'Meldingen',
    notificationsDesc: 'Beheer meldingsvoorkeuren',
    emailNotifications: 'E-mailmeldingen',
    emailNotificationsDesc: 'Ontvang updates via e-mail',
    pushNotifications: 'Push Meldingen',
    pushNotificationsDesc: 'Browser pushmeldingen',
    bookingAlerts: 'Boekingswaarschuwingen',
    bookingAlertsDesc: 'Waarschuwingen voor nieuwe reserveringen',
    appearance: 'Weergave',
    appearanceDesc: 'Pas het uiterlijk aan',
    darkMode: 'Donkere Modus',
    darkModeDesc: 'Gebruik donker thema',
    compactMode: 'Compacte Modus',
    compactModeDesc: 'Verminder ruimte in lijsten',
    save: 'Instellingen Opslaan',
    reset: 'Standaardwaarden Herstellen',
    saved: 'Instellingen succesvol opgeslagen',
    resetted: 'Instellingen hersteld naar standaard'
  },
  de: {
    title: 'Einstellungen',
    subtitle: 'Konfigurieren Sie Ihre Anwendungseinstellungen',
    language: 'Sprache & Region',
    languageDesc: 'Wählen Sie Ihre bevorzugte Sprache',
    notifications: 'Benachrichtigungen',
    notificationsDesc: 'Verwalten Sie die Benachrichtigungseinstellungen',
    emailNotifications: 'E-Mail-Benachrichtigungen',
    emailNotificationsDesc: 'Erhalten Sie Updates per E-Mail',
    pushNotifications: 'Push-Benachrichtigungen',
    pushNotificationsDesc: 'Browser-Push-Benachrichtigungen',
    bookingAlerts: 'Buchungsbenachrichtigungen',
    bookingAlertsDesc: 'Benachrichtigungen für neue Reservierungen',
    appearance: 'Erscheinungsbild',
    appearanceDesc: 'Passen Sie das Aussehen an',
    darkMode: 'Dunkler Modus',
    darkModeDesc: 'Dunkles Design verwenden',
    compactMode: 'Kompakter Modus',
    compactModeDesc: 'Abstände in Listen reduzieren',
    save: 'Einstellungen Speichern',
    reset: 'Auf Standard Zurücksetzen',
    saved: 'Einstellungen erfolgreich gespeichert',
    resetted: 'Einstellungen auf Standard zurückgesetzt'
  }
};

const defaultSettings = {
  language: 'en',
  emailNotifications: true,
  pushNotifications: false,
  bookingAlerts: true,
  darkMode: false,
  compactMode: false
};

export default function Settings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('adminSettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [hasChanges, setHasChanges] = useState(false);

  const t = translations[settings.language] || translations.en;

  useEffect(() => {
    const saved = localStorage.getItem('adminSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    setHasChanges(false);
    toast.success(t.saved);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.setItem('adminSettings', JSON.stringify(defaultSettings));
    setHasChanges(false);
    toast.info(t.resetted);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        {t.title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t.subtitle}
      </Typography>

      <Grid container spacing={3}>
        {/* Language Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LanguageIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  {t.language}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t.languageDesc}
              </Typography>

              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={settings.language}
                  label="Language"
                  onChange={(e) => handleChange('language', e.target.value)}
                >
                  {LANGUAGES.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                        {lang.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  {t.notifications}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t.notificationsDesc}
              </Typography>

              <List disablePadding>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={t.emailNotifications}
                    secondary={t.emailNotificationsDesc}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem disableGutters>
                  <ListItemIcon>
                    <NotificationsIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={t.pushNotifications}
                    secondary={t.pushNotificationsDesc}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.pushNotifications}
                      onChange={(e) => handleChange('pushNotifications', e.target.checked)}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem disableGutters>
                  <ListItemIcon>
                    <NotificationsIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={t.bookingAlerts}
                    secondary={t.bookingAlertsDesc}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.bookingAlerts}
                      onChange={(e) => handleChange('bookingAlerts', e.target.checked)}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Appearance Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DarkModeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  {t.appearance}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t.appearanceDesc}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.darkMode}
                          onChange={(e) => handleChange('darkMode', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">{t.darkMode}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t.darkModeDesc}
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                      labelPlacement="start"
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.compactMode}
                          onChange={(e) => handleChange('compactMode', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">{t.compactMode}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t.compactModeDesc}
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                      labelPlacement="start"
                    />
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleReset}
            >
              {t.reset}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasChanges}
            >
              {t.save}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {hasChanges && (
        <Alert severity="info" sx={{ mt: 3 }}>
          You have unsaved changes
        </Alert>
      )}
    </Box>
  );
}
