import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function LoadingSpinner({ message }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">{message || t('common.loading')}</Typography>
    </Box>
  );
}
