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
import useDestinationStore from '../../stores/destinationStore.js';
import { isStudioMode } from '../../utils/studioMode.js';

/**
 * Menu sections with feature flag visibility checks.
 * visible(ff): function that checks featureFlags — returns true if item should be shown.
 *   When no specific destination is selected ('all'), all items show (ff is empty → defaults to true).
 */
const MENU_SECTIONS = [
  // HOME
  {
    label: 'nav.section_home',
    items: [
      { key: 'dashboard', path: '/dashboard', icon: DashboardIcon },
    ]
  },
  // CONTENT
  {
    label: 'nav.section_content',
    items: [
      { key: 'contentStudio', path: '/content-studio', icon: AutoAwesomeIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
      { key: 'media', path: '/media', icon: PermMediaIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
    ]
  },
  // DATA & POI
  {
    label: 'nav.section_data',
    items: [
      { key: 'pois', path: '/pois', icon: PlaceIcon, visible: (ff) => ff.hasPOI !== false },
      { key: 'reviews', path: '/reviews', icon: StarIcon, visible: (ff) => ff.hasPOI !== false },
      { key: 'analytics', path: '/analytics', icon: BarChartIcon, visible: (ff) => ff.hasPOI !== false },
    ]
  },
  // COMMERCE
  {
    label: 'nav.section_commerce',
    items: [
      { key: 'commerce', path: '/commerce', icon: ShoppingCartIcon, allowedRoles: ['platform_admin', 'destination_admin', 'poi_owner'], visible: (ff) => ff.hasCommerce === true || ff.hasTicketing === true },
      { key: 'partners', path: '/partners', icon: HandshakeIcon, allowedRoles: ['platform_admin', 'destination_admin'], visible: (ff) => ff.hasPartners === true },
      { key: 'financial', path: '/financial', icon: AccountBalanceIcon, allowedRoles: ['platform_admin', 'destination_admin', 'poi_owner'], visible: (ff) => ff.hasFinancial === true },
      { key: 'intermediary', path: '/intermediary', icon: SwapHorizIcon, allowedRoles: ['platform_admin', 'destination_admin', 'poi_owner'], visible: (ff) => ff.hasIntermediary === true },
    ]
  },
  // WEBSITE
  {
    label: 'nav.section_website',
    items: [
      { key: 'pagesNav', path: '/pages', icon: ArticleIcon, allowedRoles: ['platform_admin', 'destination_admin'], visible: (ff) => ff.hasPages !== false },
    ]
  },
  // CONFIGURATIE
  {
    label: 'nav.section_config',
    items: [
      { key: 'merkProfiel', path: '/branding', icon: PaletteIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
      { key: 'settings', path: '/settings', icon: SettingsIcon, requiredRole: 'platform_admin' },
      { key: 'users', path: '/users', icon: PeopleIcon, requiredRole: 'platform_admin' },
      { key: 'agentsSystem', path: '/agents', icon: SmartToyIcon, requiredRole: 'platform_admin' },
      { key: 'onboarding', path: '/onboarding', icon: AddCircleOutlineIcon, allowedRoles: ['platform_admin'] },
    ]
  },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const selectedFF = useDestinationStore(s => s.getSelectedFeatureFlags());
  const allDestinations = useDestinationStore(s => s.destinations);
  const studioMode = isStudioMode();

  // Determine effective feature flags:
  // 1. If a specific destination is selected in dropdown → use those flags
  // 2. If user is NOT platform_admin and has allowed_destinations → use flags from their first destination
  // 3. Otherwise (platform_admin with 'all') → no filtering
  let featureFlags = selectedFF;
  if (Object.keys(featureFlags).length === 0 && user?.role !== 'platform_admin' && user?.allowed_destinations?.length > 0) {
    const userDest = allDestinations.find(d => user.allowed_destinations.includes(d.code));
    if (userDest?.featureFlags) {
      featureFlags = userDest.featureFlags;
    }
  }

  const isItemVisible = (item) => {
    // RBAC check
    if (item.allowedRoles && !item.allowedRoles.includes(user?.role)) return false;
    if (item.requiredRole && user?.role !== item.requiredRole) return false;

    // Feature flag check — active when flags are available
    if (item.visible && Object.keys(featureFlags).length > 0) {
      if (!item.visible(featureFlags)) return false;
    }

    return true;
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
          {studioMode ? 'Content Studio' : 'HolidaiButler'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          {studioMode ? 'Powered by HolidaiButler' : 'Admin Portal'}
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
          v3.33.0
        </Typography>
      </Box>
    </Box>
  );
}
