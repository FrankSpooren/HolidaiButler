import { Box, Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function PlaceholderPage({ title, icon: Icon }) {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 400 }}>
        {Icon && <Icon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
        <Typography color="text.secondary">{t('common.comingSoon')}</Typography>
      </Paper>
    </Box>
  );
}
