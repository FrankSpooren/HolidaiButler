import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../utils/formatters.js';

export default function DestinationCard({ name, flag, color, pois, reviews }) {
  const { t } = useTranslation();

  return (
    <Card sx={{ height: '100%', borderLeft: `4px solid ${color}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {flag} {name}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {formatNumber(pois?.total)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.pois')}
              {pois?.active != null && (
                <Chip
                  label={`${formatNumber(pois.active)} ${t('dashboard.activePois')}`}
                  size="small"
                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                  color="success"
                  variant="outlined"
                />
              )}
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {formatNumber(reviews)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.reviews')}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
