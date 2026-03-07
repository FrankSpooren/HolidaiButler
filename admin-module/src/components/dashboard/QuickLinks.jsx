import { Card, CardContent, Typography, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PlaceIcon from '@mui/icons-material/Place';
import RateReviewIcon from '@mui/icons-material/RateReview';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import PaletteIcon from '@mui/icons-material/Palette';
import ArticleIcon from '@mui/icons-material/Article';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../stores/authStore.js';

const LINKS = [
  { key: 'agents', path: '/agents', icon: SmartToyIcon },
  { key: 'pois', path: '/pois', icon: PlaceIcon },
  { key: 'reviews', path: '/reviews', icon: RateReviewIcon },
  { key: 'media', path: '/media', icon: PermMediaIcon, requiredRole: 'platform_admin' },
  { key: 'branding', path: '/branding', icon: PaletteIcon, requiredRole: 'platform_admin' },
  { key: 'pages', path: '/pages', icon: ArticleIcon, requiredRole: 'platform_admin' },
  { key: 'analytics', path: '/analytics', icon: BarChartIcon },
  { key: 'settings', path: '/settings', icon: SettingsIcon }
];

export default function QuickLinks() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);

  const visibleLinks = LINKS.filter(link =>
    !link.requiredRole || user?.role === link.requiredRole
  );

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
              <ListItemText primary={t(`dashboard.links.${key}`)} />
            </ListItemButton>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
