import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function MobileTipEditor() {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
      <Typography variant="body2" color="text.secondary">
        {t('pages.blockTypes.mobile_tip_info', 'Toont een dagelijkse tip (POI of event) op basis van de onboarding-interesses van de bezoeker. Wordt automatisch ververst elke 24 uur.')}
      </Typography>
    </Box>
  );
}
