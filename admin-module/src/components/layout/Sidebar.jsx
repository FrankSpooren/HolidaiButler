import { useLocation, useNavigate } from 'react-router-dom';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PlaceIcon from '@mui/icons-material/Place';
import StarIcon from '@mui/icons-material/Star';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import BugReportIcon from '@mui/icons-material/BugReport';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PaletteIcon from '@mui/icons-material/Palette';
import ArticleIcon from '@mui/icons-material/Article';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { SIDEBAR_STYLES } from '../../theme.js';
import useAuthStore from '../../stores/authStore.js';

const MENU_SECTIONS = [
  {
    label: 'nav.section_overview',
    items: [
      { key: 'dashboard', path: '/dashboard', icon: DashboardIcon },
      { key: 'agents', path: '/agents', icon: SmartToyIcon },
      { key: 'issues', path: '/issues', icon: BugReportIcon },
    ]
  },
  {
    label: 'nav.section_content',
    items: [
      { key: 'pois', path: '/pois', icon: PlaceIcon },
      { key: 'reviews', path: '/reviews', icon: StarIcon },
      { key: 'media', path: '/media', icon: PermMediaIcon, requiredRole: 'platform_admin' },
      { key: 'contentStudio', path: '/content-studio', icon: AutoAwesomeIcon, requiredRole: 'platform_admin' },
    ]
  },
  {
    label: 'nav.section_commerce',
    items: [
      { key: 'commerce', path: '/commerce', icon: ShoppingCartIcon, allowedRoles: ['platform_admin', 'poi_owner'] },
      { key: 'partners', path: '/partners', icon: HandshakeIcon, requiredRole: 'platform_admin' },
      { key: 'financial', path: '/financial', icon: AccountBalanceIcon, allowedRoles: ['platform_admin', 'poi_owner'] },
      { key: 'intermediary', path: '/intermediary', icon: SwapHorizIcon, allowedRoles: ['platform_admin', 'poi_owner'] },
    ]
  },
  {
    label: 'nav.section_platform',
    items: [
      { key: 'branding', path: '/branding', icon: PaletteIcon, requiredRole: 'platform_admin' },
      { key: 'pages', path: '/pages', icon: ArticleIcon, requiredRole: 'platform_admin' },
      { key: 'navigation', path: '/navigation', icon: MenuOpenIcon, requiredRole: 'platform_admin' },
      { key: 'onboarding', path: '/onboarding', icon: AddCircleOutlineIcon, requiredRole: 'platform_admin' },
    ]
  },
  {
    label: 'nav.section_system',
    items: [
      { key: 'analytics', path: '/analytics', icon: BarChartIcon },
      { key: 'settings', path: '/settings', icon: SettingsIcon },
      { key: 'users', path: '/users', icon: PeopleIcon, requiredRole: 'platform_admin' },
    ]
  },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const isItemVisible = (item) => {
    if (item.allowedRoles) return item.allowedRoles.includes(user?.role);
    if (!item.requiredRole) return true;
    return user?.role === item.requiredRole;
  };

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

      <List sx={{ flex: 1, pt: 0.5, overflowY: 'auto' }}>
        {MENU_SECTIONS.map((section, sectionIdx) => {
          const visibleItems = section.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;

          return (
            <Box key={section.label}>
              {sectionIdx > 0 && (
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mx: 2, my: 0.5 }} />
              )}
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  px: 2.5,
                  pt: sectionIdx === 0 ? 1 : 1.5,
                  pb: 0.5,
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                }}
              >
                {t(section.label)}
              </Typography>

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
            </Box>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
          v3.25.0
        </Typography>
      </Box>
    </Box>
  );
}
