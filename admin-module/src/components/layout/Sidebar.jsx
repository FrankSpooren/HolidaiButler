import { useLocation, useNavigate } from 'react-router-dom';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PlaceIcon from '@mui/icons-material/Place';
import StarIcon from '@mui/icons-material/Star';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useTranslation } from 'react-i18next';
import { SIDEBAR_STYLES } from '../../theme.js';
import useAuthStore from '../../stores/authStore.js';

const MENU_ITEMS = [
  { key: 'dashboard', path: '/dashboard', icon: DashboardIcon },
  { key: 'agents', path: '/agents', icon: SmartToyIcon },
  { key: 'pois', path: '/pois', icon: PlaceIcon },
  { key: 'reviews', path: '/reviews', icon: StarIcon },
  { key: 'analytics', path: '/analytics', icon: BarChartIcon },
  { key: 'settings', path: '/settings', icon: SettingsIcon },
  { key: 'issues', path: '/issues', icon: BugReportIcon },
  { key: 'users', path: '/users', icon: PeopleIcon, requiredRole: 'platform_admin' }
];

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const visibleItems = MENU_ITEMS.filter(item => {
    if (!item.requiredRole) return true;
    return user?.role === item.requiredRole;
  });

  return (
    <Box sx={{
      width: SIDEBAR_STYLES.width,
      minHeight: '100vh',
      bgcolor: SIDEBAR_STYLES.bg,
      color: SIDEBAR_STYLES.text,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
          HolidaiButler
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Admin Portal
        </Typography>
      </Box>

      <List sx={{ flex: 1, pt: 1 }}>
        {visibleItems.map(({ key, path, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <ListItemButton
              key={key}
              onClick={() => navigate(path)}
              sx={{
                mx: 1, borderRadius: 1, mb: 0.3,
                bgcolor: isActive ? SIDEBAR_STYLES.activeBg : 'transparent',
                color: isActive ? SIDEBAR_STYLES.activeText : SIDEBAR_STYLES.text,
                '&:hover': { bgcolor: SIDEBAR_STYLES.hoverBg }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t(`nav.${key}`)} primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
          v1.1.0
        </Typography>
      </Box>
    </Box>
  );
}
