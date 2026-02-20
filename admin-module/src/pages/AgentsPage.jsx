import { Box, Typography, Paper } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useTranslation } from 'react-i18next';

export default function AgentsPage() {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 400 }}>
        <SmartToyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Agents Dashboard
        </Typography>
        <Typography color="text.secondary">
          {t('common.comingSoon')} — Fase 8C-1
        </Typography>
      </Paper>
    </Box>
  );
}
