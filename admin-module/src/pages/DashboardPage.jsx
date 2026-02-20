import { Grid, Typography, Box, Skeleton } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useTranslation } from 'react-i18next';
import { useDashboardKPIs, useSystemHealth } from '../hooks/useDashboard.js';
import useAuthStore from '../stores/authStore.js';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import DestinationCard from '../components/dashboard/DestinationCard.jsx';
import SystemHealthCard from '../components/dashboard/SystemHealthCard.jsx';
import QuickLinks from '../components/dashboard/QuickLinks.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { DESTINATIONS } from '../utils/destinations.js';
import { formatDate } from '../utils/formatters.js';

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const { data: kpis, isLoading: kpisLoading, error: kpisError, refetch: refetchKpis } = useDashboardKPIs();
  const { data: health, isLoading: healthLoading } = useSystemHealth();

  const destinations = kpis?.data?.destinations || {};
  const platform = kpis?.data?.platform || {};

  return (
    <Box>
      {/* Welcome */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('dashboard.welcome')}, {user?.name?.split(' ')[0] || 'Admin'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {kpis?.data?.timestamp ? formatDate(kpis.data.timestamp) : ''}
        </Typography>
      </Box>

      {kpisError && <ErrorBanner onRetry={refetchKpis} />}

      {/* Destination cards */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
        {t('dashboard.destinations')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {DESTINATIONS.map(d => (
          <Grid item xs={12} md={6} key={d.code}>
            {kpisLoading ? (
              <Skeleton variant="rounded" height={120} />
            ) : (
              <DestinationCard
                name={d.name}
                flag={d.flag}
                color={d.color}
                pois={destinations[d.code]?.pois}
                reviews={destinations[d.code]?.reviews}
              />
            )}
          </Grid>
        ))}
      </Grid>

      {/* Platform KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {kpisLoading ? <Skeleton variant="rounded" height={90} /> : (
            <KpiCard icon={PeopleIcon} label={t('dashboard.totalUsers')} value={platform.totalUsers} color="#1976d2" />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {kpisLoading ? <Skeleton variant="rounded" height={90} /> : (
            <KpiCard icon={ChatIcon} label={t('dashboard.chatSessions')} value={platform.chatbotSessions7d} color="#7c3aed" />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {kpisLoading ? <Skeleton variant="rounded" height={90} /> : (
            <KpiCard icon={SmartToyIcon} label={t('dashboard.activeAgents')} value={platform.totalAgents} color="#059669" />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {kpisLoading ? <Skeleton variant="rounded" height={90} /> : (
            <KpiCard icon={ScheduleIcon} label={t('dashboard.scheduledJobs')} value={platform.scheduledJobs} color="#d97706" />
          )}
        </Grid>
      </Grid>

      {/* System Health + Quick Links */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          {healthLoading ? <Skeleton variant="rounded" height={200} /> : (
            <SystemHealthCard health={health} />
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <QuickLinks />
        </Grid>
      </Grid>
    </Box>
  );
}
