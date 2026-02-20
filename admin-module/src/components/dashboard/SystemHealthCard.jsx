import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatUptime } from '../../utils/formatters.js';

const STATUS_COLORS = {
  healthy: 'success',
  degraded: 'warning',
  unhealthy: 'error'
};

function StatusBadge({ label, status }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2">{label}</Typography>
      <Chip
        label={t(`dashboard.${status}`) || status}
        size="small"
        color={STATUS_COLORS[status] || 'default'}
        sx={{ height: 22, fontSize: '0.75rem' }}
      />
    </Box>
  );
}

export default function SystemHealthCard({ health }) {
  const { t } = useTranslation();
  const checks = health?.data?.checks || {};

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
          {t('dashboard.systemHealth')}
        </Typography>

        <StatusBadge label="MySQL" status={checks.mysql?.status || 'unhealthy'} />
        <StatusBadge label="MongoDB" status={checks.mongodb?.status || 'unhealthy'} />
        <StatusBadge label="Redis" status={checks.redis?.status || 'unhealthy'} />
        <StatusBadge label="BullMQ" status={checks.bullmq?.status || 'unhealthy'} />

        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">{t('dashboard.uptime')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatUptime(checks.uptime?.uptimeHours)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
