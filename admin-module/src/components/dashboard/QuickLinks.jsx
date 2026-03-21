import { Card, CardContent, Typography, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PlaceIcon from '@mui/icons-material/Place';
import RateReviewIcon from '@mui/icons-material/RateReview';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import PaletteIcon from '@mui/icons-material/Palette';
import ArticleIcon from '@mui/icons-material/Article';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../stores/authStore.js';
import useDestinationStore from '../../stores/destinationStore.js';

const LINKS = [
  { key: 'agents', path: '/agents', icon: SmartToyIcon, requiredRole: 'platform_admin' },
  { key: 'pois', path: '/pois', icon: PlaceIcon, featureCheck: (ff) => ff.hasPOI !== false },
  { key: 'reviews', path: '/reviews', icon: RateReviewIcon, featureCheck: (ff) => ff.hasPOI !== false },
  { key: 'contentStudio', path: '/content-studio', icon: AutoAwesomeIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
  { key: 'media', path: '/media', icon: PermMediaIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
  { key: 'branding', path: '/branding', icon: PaletteIcon, allowedRoles: ['platform_admin', 'destination_admin'] },
  { key: 'pages', path: '/pages', icon: ArticleIcon, allowedRoles: ['platform_admin', 'destination_admin'], featureCheck: (ff) => ff.hasPages !== false },
  { key: 'analytics', path: '/analytics', icon: BarChartIcon, featureCheck: (ff) => ff.hasPOI !== false },
  { key: 'settings', path: '/settings', icon: SettingsIcon, requiredRole: 'platform_admin' }
];

export default function QuickLinks() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const allDestinations = useDestinationStore(s => s.destinations);

  const isPlatformAdmin = user?.role === 'platform_admin';
  const userAllowed = user?.allowed_destinations || [];

  // Get feature flags for user's destination (same logic as Sidebar)
  let featureFlags = {};
  if (!isPlatformAdmin && userAllowed.length > 0) {
    const userDest = allDestinations.find(d => userAllowed.includes(d.code));
    if (userDest?.featureFlags) featureFlags = userDest.featureFlags;
  }

  const visibleLinks = LINKS.filter(link => {
    // Role check
    if (link.requiredRole && user?.role !== link.requiredRole) return false;
    if (link.allowedRoles && !link.allowedRoles.includes(user?.role)) return false;
    // Feature flag check
    if (link.featureCheck && Object.keys(featureFlags).length > 0) {
      if (!link.featureCheck(featureFlags)) return false;
    }
    return true;
  });

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          {t('dashboard.quickLinks')}
        </Typography>
        <List disablePadding>
          {visibleLinks.map(({ key, path, icon: Icon }) => (
            <ListItemButton key={key} onClick={() => navigate(path)} sx={{ borderRadius: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}><Icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t(`dashboard.links.${key}`, key)} />
            </ListItemButton>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
