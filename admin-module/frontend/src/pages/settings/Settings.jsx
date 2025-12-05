import { useState } from 'react';
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
import { useLanguage, LANGUAGES, defaultSettings } from '../../contexts/LanguageContext';

export default function Settings() {
  const { settings, updateSettings, t } = useLanguage();
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field, value) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    // Dispatch custom event to notify App.jsx about the change
    window.dispatchEvent(new Event('settingsChanged'));
    setHasChanges(false);
    toast.success(t.settings.saved);
  };

  const handleReset = () => {
    setLocalSettings(defaultSettings);
    updateSettings(defaultSettings);
    window.dispatchEvent(new Event('settingsChanged'));
    setHasChanges(false);
    toast.info(t.settings.resetted);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        {t.settings.title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t.settings.subtitle}
      </Typography>

      <Grid container spacing={3}>
        {/* Language Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LanguageIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  {t.settings.language}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t.settings.languageDesc}
              </Typography>

              <FormControl fullWidth>
                <InputLabel>{t.settings.language}</InputLabel>
                <Select
                  value={localSettings.language}
                  label={t.settings.language}
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
                  {t.settings.notifications}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t.settings.notificationsDesc}
              </Typography>

              <List disablePadding>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={t.settings.emailNotifications}
                    secondary={t.settings.emailNotificationsDesc}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={localSettings.emailNotifications}
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
                    primary={t.settings.pushNotifications}
                    secondary={t.settings.pushNotificationsDesc}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={localSettings.pushNotifications}
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
                    primary={t.settings.bookingAlerts}
                    secondary={t.settings.bookingAlertsDesc}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={localSettings.bookingAlerts}
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
                  {t.settings.appearance}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t.settings.appearanceDesc}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.darkMode}
                          onChange={(e) => handleChange('darkMode', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">{t.settings.darkMode}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t.settings.darkModeDesc}
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
                          checked={localSettings.compactMode}
                          onChange={(e) => handleChange('compactMode', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">{t.settings.compactMode}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t.settings.compactModeDesc}
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
              {t.settings.reset}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasChanges}
            >
              {t.settings.save}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {hasChanges && (
        <Alert severity="info" sx={{ mt: 3 }}>
          {t.labels?.warning || 'You have unsaved changes'}
        </Alert>
      )}
    </Box>
  );
}
