import { Card, CardContent, Typography, List, ListItemButton, ListItemIcon, ListItemText, Chip } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PlaceIcon from '@mui/icons-material/Place';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LINKS = [
  { key: 'agents', path: '/agents', icon: SmartToyIcon, label: 'Agents Dashboard' },
  { key: 'pois', path: '/pois', icon: PlaceIcon, label: 'POI Management' }
];

export default function QuickLinks() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          {t('dashboard.quickLinks')}
        </Typography>
        <List disablePadding>
          {LINKS.map(({ key, path, icon: Icon, label }) => (
            <ListItemButton key={key} onClick={() => navigate(path)} sx={{ borderRadius: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}><Icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={label} />
              <Chip label={t('common.comingSoon')} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            </ListItemButton>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
