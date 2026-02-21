import { AppBar, Toolbar, Typography, Button, Chip, Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../stores/authStore.js';
import useDestinationStore from '../../stores/destinationStore.js';
import DestinationSelector from './DestinationSelector.jsx';
import { SIDEBAR_STYLES } from '../../theme.js';

export default function Header({ onMenuToggle }) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { selectedDestination, setDestination } = useDestinationStore();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        ml: { md: `${SIDEBAR_STYLES.width}px` },
        width: { md: `calc(100% - ${SIDEBAR_STYLES.width}px)` },
        bgcolor: '#fff',
        color: '#1e293b',
        borderBottom: '1px solid #e2e8f0'
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton onClick={onMenuToggle} sx={{ display: { md: 'none' } }}>
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
          {t('app.brand')} <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>{t('app.title')}</Typography>
        </Typography>

        <Box sx={{ flex: 1 }} />

        <DestinationSelector value={selectedDestination} onChange={setDestination} />

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
