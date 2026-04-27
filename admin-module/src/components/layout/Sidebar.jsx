import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, Tooltip, IconButton, Chip } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PlaceIcon from '@mui/icons-material/Place';
import StarIcon from '@mui/icons-material/Star';
import BarChartIcon from '@mui/icons-material/BarChart';
import InsightsIcon from '@mui/icons-material/Insights';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PaletteIcon from '@mui/icons-material/Palette';
import ArticleIcon from '@mui/icons-material/Article';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SourceIcon from '@mui/icons-material/Source';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import ShareIcon from '@mui/icons-material/Share';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { SIDEBAR_STYLES } from '../../theme.js';
import useAuthStore from '../../stores/authStore.js';
import useDestinationStore from '../../stores/destinationStore.js';
import { isStudioMode } from '../../utils/studioMode.js';
import client from '../../api/client.js';

const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH = SIDEBAR_STYLES.width || 240;
const TEAL = '#02C39A';
const STORAGE_KEY = 'hb-sidebar-collapsed';

/**
 * Unified navigation sections — same structure on admin + studio.
 * Admin-only sections (DATA & POI, COMMERCE, WEBSITE) hide via feature flags.
 * Content Studio tab items navigate to /content-studio?tab=X + dispatch CustomEvent.
 * CustomEvent handler in ContentStudioPage adds +1 (Overview offset).
 */
const MENU_SECTIONS = [
  // WORKSPACE
  {
    label: 'nav.section_workspace',
    items: [
      { key: 'dashboard', path: '/dashboard', icon: DashboardIcon, adminOnly: true },
      { key: 'overview', path: '/content-studio', tab: 'overview', icon: AutoAwesomeIcon, allowedRoles: ['platform_admin', 'destination_admin'], studioOnly: true },
    ]
  },
  // CONTENT
  {
    label: 'nav.section_content',
    items: [
      { key: 'bronnen', path: '/content-studio', tab: 'bronnen', tabIndex: 0, icon: SourceIcon, badgeKey: 'sources', allowedRoles: ['platform_admin', 'destination_admin'] },
      { key: 'ideeen', path: '/content-studio', tab: 'suggesties', tabIndex: 1, icon: LightbulbIcon, badgeKey: 'ideas', allowedRoles: ['platform_admin', 'destination_admin'] },
      { key: 'contentItems', path: '/content-studio', tab: 'items', tabIndex: 2, icon: EditNoteIcon, badgeKey: 'drafts', allowedRoles: ['platform_admin', 'destination_admin'] },
      { key: 'kalender', path: '/content-studio', tab: 'kalender', tabIndex: 3, icon: CalendarMonthIcon, badgeKey: 'gaps', allowedRoles: ['platform_admin', 'destination_admin'] },
      { key: 'media', path: '/media', icon: PermMediaIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
    ]
  },
  // DATA & POI
  {
    label: 'nav.section_data',
    items: [
      { key: 'pois', path: '/pois', icon: PlaceIcon, visible: (ff) => ff.hasPOI !== false },
      { key: 'reviews', path: '/reviews', icon: StarIcon, visible: (ff) => ff.hasPOI !== false },
    ]
  },
  // COMMERCE
  {
    label: 'nav.section_commerce',
    items: [
      { key: 'commerce', path: '/commerce', icon: ShoppingCartIcon, allowedRoles: ['platform_admin', 'destination_admin', 'poi_owner'], visible: (ff) => ff.hasCommerce === true || ff.hasTicketing === true || ff.commerce === true || ff.ticketing === true },
      { key: 'partners', path: '/partners', icon: HandshakeIcon, allowedRoles: ['platform_admin', 'destination_admin'], visible: (ff) => ff.hasPartners === true || ff.partners === true },
      { key: 'financial', path: '/financial', icon: AccountBalanceIcon, allowedRoles: ['platform_admin', 'destination_admin', 'poi_owner'], visible: (ff) => ff.hasFinancial === true || ff.financial === true },
      { key: 'intermediary', path: '/intermediary', icon: SwapHorizIcon, allowedRoles: ['platform_admin', 'destination_admin', 'poi_owner'], visible: (ff) => ff.hasIntermediary === true || ff.intermediary === true },
    ]
  },
  // WEBSITE
  {
    label: 'nav.section_website',
    items: [
      { key: 'pagesNav', path: '/pages', icon: ArticleIcon, allowedRoles: ['platform_admin', 'destination_admin'], visible: (ff) => ff.hasPages !== false },
    ]
  },
  // INTELLIGENTIE
  {
    label: 'nav.section_intelligence',
    items: [
      { key: 'analytics', path: '/analytics', icon: InsightsIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
      { key: 'merkProfiel', path: '/branding', icon: PaletteIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
      { key: 'seizoenen', path: '/content-studio', tab: 'seizoenen', tabIndex: 5, icon: WbSunnyIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
    ]
  },
  // BEHEER
  {
    label: 'nav.section_management',
    items: [
      { key: 'socialAccounts', path: '/content-studio', tab: 'social', tabIndex: 6, icon: ShareIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
      { key: 'agentsSystem', path: '/agents', icon: SmartToyIcon, requiredRole: 'platform_admin' },
      { key: 'onboarding', path: '/onboarding', icon: AddCircleOutlineIcon, requiredRole: 'platform_admin' },
      { key: 'settings', path: '/settings', icon: SettingsIcon, requiredRole: 'platform_admin' },
      { key: 'users', path: '/users', icon: PeopleIcon, requiredRole: 'platform_admin' },
    ]
  },
];

/**
 * Hook to fetch sidebar badge counts.
 */
function useSidebarBadges(destinationId) {
  const [badges, setBadges] = useState({});

  useEffect(() => {
    if (!destinationId) return;
    let cancelled = false;

    const fetchBadges = async () => {
      try {
        const res = await client.get('/content/studio/sidebar-badges', {
          headers: { 'X-Destination-ID': destinationId }
        });
        if (!cancelled && res.data?.success) {
          setBadges(res.data.data || {});
        }
      } catch {
        // Silent fail — badges are non-critical
      }
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [destinationId]);

  return badges;
}

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore(s => s.user);
  const selectedFF = useDestinationStore(s => s.getSelectedFeatureFlags());
  const selectedDest = useDestinationStore(s => s.selectedDestination);
  const allDestinations = useDestinationStore(s => s.destinations);
  const studioMode = isStudioMode();

  // Collapse state with localStorage persistence
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      window.dispatchEvent(new CustomEvent('hb:sidebar-collapse', { detail: next }));
      return next;
    });
  }, []);

  // Badge counts
  const destId = selectedDest && selectedDest !== 'all' ? selectedDest : null;
  const badges = useSidebarBadges(destId);

  // Determine effective feature flags
  let featureFlags = selectedFF;
  if (Object.keys(featureFlags).length === 0 && user?.role !== 'platform_admin' && user?.allowed_destinations?.length > 0) {
    const userDest = allDestinations.find(d => user.allowed_destinations.includes(d.code));
    if (userDest?.featureFlags) {
      featureFlags = userDest.featureFlags;
    }
  }

  const isItemVisible = (item) => {
    // Studio/Admin mode filtering
    if (item.studioOnly && !studioMode) return false;
    if (item.adminOnly && studioMode) return false;
    if (item.allowedRoles && !item.allowedRoles.includes(user?.role)) return false;
    if (item.requiredRole && user?.role !== item.requiredRole) return false;
    if (item.visible && Object.keys(featureFlags).length > 0) {
      if (!item.visible(featureFlags)) return false;
    }
    return true;
  };

  // Active state detection — supports tab-based navigation
  const isActive = (item) => {
    if (item.tab) {
      if (location.pathname !== '/content-studio') return false;
      const currentTab = searchParams.get('tab');
      if (item.tab === 'overview') return !currentTab || currentTab === 'overview';
      return currentTab === item.tab;
    }
    return location.pathname === item.path;
  };

  // Navigate handler — dispatches CustomEvent for Content Studio tabs
  const handleNavigate = (item) => {
    if (item.tab && item.tab !== 'overview') {
      navigate('/content-studio?tab=' + item.tab);
      if (item.tabIndex != null) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hb:content-studio-tab', { detail: item.tabIndex }));
        }, 100);
      }
    } else if (item.tab === 'overview') {
      navigate('/content-studio');
    } else {
      navigate(item.path);
    }
  };

  const currentWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <Box sx={{
      width: currentWidth,
      minHeight: '100vh',
      bgcolor: SIDEBAR_STYLES.bg,
      color: SIDEBAR_STYLES.text,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 200ms ease',
      overflow: 'hidden',
    }}>
      {/* Brand header */}
      <Box sx={{
        p: collapsed ? 1 : 2.5,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: 56,
      }}>
        {!collapsed && (
          studioMode ? (
            <Box>
              <Box sx={{ display: 'inline-flex', alignItems: 'baseline', mb: 0.25 }}>
                <Box component="span" sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#FFFFFF' }}>Publi</Box>
                <Box component="span" sx={{ fontWeight: 900, fontSize: '1.15rem', color: TEAL }}>Q</Box>
                <Box component="span" sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#FFFFFF' }}>io</Box>
              </Box>
              <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.5)' }}>
                AI Content Studio
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
                HolidaiButler
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Admin Portal
              </Typography>
            </Box>
          )
        )}
        <Tooltip title={collapsed ? t('nav.expand') : t('nav.collapse')} placement="right">
          <IconButton
            onClick={toggleCollapse}
            size="small"
            sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}
          >
            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Navigation list */}
      <List sx={{ flex: 1, pt: 0.5, overflowY: 'auto', overflowX: 'hidden' }}>
        {MENU_SECTIONS.map((section, sectionIdx) => {
          const visibleItems = section.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;

          return (
            <Box key={section.label}>
              {sectionIdx > 0 && (
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mx: collapsed ? 0.5 : 2, my: 0.5 }} />
              )}
              {!collapsed && (
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
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t(section.label)}
                </Typography>
              )}

              {visibleItems.map((item) => {
                const { key, icon: Icon, badgeKey } = item;
                const active = isActive(item);
                const badgeCount = badgeKey ? (badges[badgeKey] || 0) : 0;
                const label = t(`nav.${key}`);

                const button = (
                  <ListItemButton
                    key={key}
                    onClick={() => handleNavigate(item)}
                    sx={{
                      mx: collapsed ? 0.5 : 1,
                      borderRadius: 1,
                      mb: 0.3,
                      py: collapsed ? 1 : 0.6,
                      px: collapsed ? 1 : 1.5,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderLeft: active ? `3px solid ${TEAL}` : '3px solid transparent',
                      bgcolor: active ? 'rgba(2, 195, 154, 0.10)' : 'transparent',
                      color: active ? TEAL : SIDEBAR_STYLES.text,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                      transition: 'background-color 150ms ease, border-color 150ms ease',
                    }}
                  >
                    <ListItemIcon sx={{
                      color: active ? TEAL : 'inherit',
                      minWidth: collapsed ? 0 : 36,
                      justifyContent: 'center',
                    }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    {!collapsed && (
                      <>
                        <ListItemText
                          primary={label}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: active ? 600 : 400,
                            whiteSpace: 'nowrap',
                          }}
                        />
                        {badgeCount > 0 && (
                          <Chip
                            label={badgeCount}
                            size="small"
                            sx={{
                              height: 20,
                              minWidth: 20,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              bgcolor: 'rgba(2, 195, 154, 0.15)',
                              color: TEAL,
                              '& .MuiChip-label': { px: 0.6 },
                            }}
                          />
                        )}
                      </>
                    )}
                  </ListItemButton>
                );

                if (collapsed) {
                  const tooltipLabel = badgeCount > 0 ? `${label} (${badgeCount})` : label;
                  return (
                    <Tooltip key={key} title={tooltipLabel} placement="right" arrow>
                      {button}
                    </Tooltip>
                  );
                }

                return <Box key={key}>{button}</Box>;
              })}
            </Box>
          );
        })}
      </List>

      {/* Footer */}
      <Box sx={{
        p: collapsed ? 1 : 2,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        textAlign: collapsed ? 'center' : 'left',
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>
          {collapsed ? 'v3.34' : 'v3.34.0'}
        </Typography>
      </Box>
    </Box>
  );
}
