import { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Chip, Box, IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../stores/authStore.js';
import useDestinationStore from '../../stores/destinationStore.js';
import useThemeStore from '../../stores/themeStore.js';
import DestinationSwitcher from './DestinationSwitcher.jsx';
import NotificationsCenter from './NotificationsCenter.jsx';
import { SIDEBAR_STYLES } from '../../theme.js';
import { isStudioMode } from '../../utils/studioMode.js';

export default function Header({ onMenuToggle }) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { selectedDestination, setDestination } = useDestinationStore();
  const { mode, toggleMode } = useThemeStore();
  const studioMode = isStudioMode();

  const [helpAnchor, setHelpAnchor] = useState(null);

  const handleReopenOnboarding = () => {
    setHelpAnchor(null);
    window.dispatchEvent(new CustomEvent('hb:onboarding-reopen'));
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        ml: { md: `${SIDEBAR_STYLES.width}px` },
        width: { md: `calc(100% - ${SIDEBAR_STYLES.width}px)` },
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton onClick={onMenuToggle} sx={{ display: { md: 'none' } }} aria-label="Menu openen">
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
          {studioMode ? 'Content Studio' : t('app.brand')} <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>{studioMode ? '' : t('app.title')}</Typography>
        </Typography>

        <Box sx={{ flex: 1 }} />

        <DestinationSwitcher value={selectedDestination} onChange={setDestination} />

        <NotificationsCenter />

        <Tooltip title={t('header.help', 'Help')}>
          <IconButton onClick={(e) => setHelpAnchor(e.currentTarget)} size="small" color="inherit">
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={helpAnchor} open={!!helpAnchor} onClose={() => setHelpAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <MenuItem onClick={handleReopenOnboarding}>
            <ListItemIcon><RocketLaunchIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('header.reopenSetup', 'Setup checklist heropenen')}</ListItemText>
          </MenuItem>
        </Menu>

        <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
          <IconButton onClick={toggleMode} size="small" color="inherit">
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{user?.name || user?.email}</Typography>
          <Chip label={user?.role} size="small" color="primary" variant="outlined" />
          <Button size="small" startIcon={<LogoutIcon />} onClick={logout} color="inherit">
            {t('auth.logout')}
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
