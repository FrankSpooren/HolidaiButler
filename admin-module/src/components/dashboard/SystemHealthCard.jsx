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

function CountBadge({ label, count, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2">{label}</Typography>
      <Chip
        label={count}
        size="small"
        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700, bgcolor: count > 0 ? color : '#e2e8f0', color: count > 0 ? '#fff' : 'text.secondary' }}
      />
    </Box>
  );
}

export default function SystemHealthCard({ health, healthSummary }) {
  const { t } = useTranslation();
  const checks = health?.data?.checks || {};
  const summary = healthSummary || {};

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

        {/* Agent health summary (24h) — B5: same source as daily email */}
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0' }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('dashboard.agentHealth')}
          </Typography>
          <CountBadge label={t('dashboard.errors24h')} count={summary.errors ?? 0} color="#d32f2f" />
          <CountBadge label={t('dashboard.alerts24h')} count={summary.alerts ?? 0} color="#ed6c02" />
          <CountBadge label={t('dashboard.jobs24h')} count={summary.jobs ?? 0} color="#2e7d32" />
        </Box>

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
