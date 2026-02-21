import { useState } from 'react';
import {
  Grid, Typography, Box, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
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
import { CATEGORY_COLORS } from '../utils/agents.js';

const SCHEDULED_JOBS = [
  { agent: 'De Maestro', schedule: 'Dagelijks 06:00', category: 'core' },
  { agent: 'De Maestro', schedule: 'Dagelijks 18:00', category: 'core' },
  { agent: 'De Bode', schedule: 'Dagelijks 07:00', category: 'core' },
  { agent: 'De Bode', schedule: 'Dagelijks 19:00', category: 'core' },
  { agent: 'De Dokter', schedule: 'Elke 4 uur', category: 'operations' },
  { agent: 'De Koerier', schedule: 'Tier 1: dagelijks 06:00', category: 'operations' },
  { agent: 'De Koerier', schedule: 'Tier 2: maandag 04:00', category: 'operations' },
  { agent: 'De Koerier', schedule: 'Tier 3: 1e van de maand 03:00', category: 'operations' },
  { agent: 'De Koerier', schedule: 'Tier 4: kwartaal (Jan/Apr/Jul/Oct)', category: 'operations' },
  { agent: 'De Koerier', schedule: 'Review sync: dagelijks 05:00', category: 'operations' },
  { agent: 'Het Geheugen', schedule: 'Dagelijks 04:00', category: 'operations' },
  { agent: 'Het Geheugen', schedule: 'QnA sync: wekelijks zo 02:00', category: 'operations' },
  { agent: 'De Gastheer', schedule: 'Elke 2 uur', category: 'operations' },
  { agent: 'De Poortwachter', schedule: 'Dagelijks 03:00', category: 'operations' },
  { agent: 'De Poortwachter', schedule: 'Retention check: maandag 02:00', category: 'operations' },
  { agent: 'De Stylist', schedule: 'Maandag 06:00', category: 'development' },
  { agent: 'De Corrector', schedule: 'Maandag 05:00', category: 'development' },
  { agent: 'De Bewaker', schedule: 'Dagelijks 04:00', category: 'development' },
  { agent: 'De Bewaker', schedule: 'SSL check: dagelijks 06:00', category: 'development' },
  { agent: 'De Inspecteur', schedule: 'Dagelijks 05:00', category: 'development' },
  { agent: 'De Inspecteur', schedule: 'Deep scan: maandag 03:00', category: 'development' },
  { agent: 'De Architect', schedule: 'Maandag 04:00', category: 'strategy' },
  { agent: 'De Leermeester', schedule: 'Dagelijks 06:30', category: 'strategy' },
  { agent: 'De Leermeester', schedule: 'Pattern analyse: maandag 04:30', category: 'strategy' },
  { agent: 'De Thermostaat', schedule: 'Elke 30 min', category: 'strategy' },
  { agent: 'De Weermeester', schedule: 'Dagelijks 05:30', category: 'strategy' },
  { agent: 'De Weermeester', schedule: 'Trend rapport: maandag 05:00', category: 'strategy' },
  { agent: 'De Weermeester', schedule: 'Seizoensanalyse: 1e maand 04:00', category: 'strategy' },
  { agent: 'Content Quality Checker', schedule: 'Maandag 05:00', category: 'monitoring' },
  { agent: 'Backup Health Checker', schedule: 'Dagelijks 07:30', category: 'monitoring' },
  { agent: 'Smoke Test Runner', schedule: 'Dagelijks 07:45', category: 'monitoring' },
  { agent: 'Het Geheugen', schedule: 'ChromaDB snapshot: zondag 03:00', category: 'monitoring' },
  { agent: 'De Maestro', schedule: 'Agent success rate: maandag 05:30', category: 'monitoring' },
  { agent: 'De Dokter', schedule: 'Portal health: elke 4 uur', category: 'monitoring' },
  { agent: 'De Dokter', schedule: 'SSL expiry: dagelijks 06:00', category: 'monitoring' },
  { agent: 'De Gastheer', schedule: 'Session cleanup: dagelijks 02:00', category: 'operations' },
  { agent: 'De Koerier', schedule: 'Content lifecycle: wekelijks wo 04:00', category: 'operations' },
  { agent: 'De Poortwachter', schedule: 'Consent audit: maandag 03:00', category: 'operations' },
  { agent: 'De Bewaker', schedule: 'Vuln scan: maandag 04:00', category: 'development' },
  { agent: 'De Corrector', schedule: 'Dep updates: maandag 05:30', category: 'development' },
];

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const { data: kpis, isLoading: kpisLoading, error: kpisError, refetch: refetchKpis } = useDashboardKPIs();
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const [jobsOpen, setJobsOpen] = useState(false);

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
            <KpiCard
              icon={ScheduleIcon}
              label={t('dashboard.scheduledJobs')}
              value={platform.scheduledJobs}
              color="#d97706"
              onClick={() => setJobsOpen(true)}
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 }, transition: 'box-shadow 0.2s' }}
            />
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

      {/* Scheduled Jobs Dialog */}
      <ScheduledJobsDialog open={jobsOpen} onClose={() => setJobsOpen(false)} />
    </Box>
  );
}

/* ===== Scheduled Jobs Dialog ===== */
function ScheduledJobsDialog({ open, onClose }) {
  const { t } = useTranslation();
  const categories = ['core', 'operations', 'development', 'strategy', 'monitoring'];

  return (
    <Dialog open={open} maxWidth="md" fullWidth onClose={onClose}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {t('dashboard.jobsDialog.title')} ({SCHEDULED_JOBS.length})
      </DialogTitle>
      <DialogContent dividers>
        {categories.map(cat => {
          const jobs = SCHEDULED_JOBS.filter(j => j.category === cat);
          if (jobs.length === 0) return null;
          return (
            <Box key={cat} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={`${cat.charAt(0).toUpperCase() + cat.slice(1)} (${jobs.length})`}
                  size="small"
                  sx={{ bgcolor: CATEGORY_COLORS[cat] || '#607d8b', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8fafc', fontSize: '0.8rem' } }}>
                      <TableCell>{t('dashboard.jobsDialog.job')}</TableCell>
                      <TableCell>{t('dashboard.jobsDialog.schedule')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobs.map((job, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{job.agent}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{job.schedule}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('dashboard.jobsDialog.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
