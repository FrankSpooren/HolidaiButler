import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function MobileEventsEditor() {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
      <Typography variant="body2" color="text.secondary">
        {t('pages.blockTypes.mobile_events_info', 'Horizontaal scrollbare lijst van vandaag\'s evenementen. Toont automatisch categorie-emoji\'s en tijdstippen.')}
      </Typography>
    </Box>
  );
}
