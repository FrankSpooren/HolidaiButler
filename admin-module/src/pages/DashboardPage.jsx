import { useState } from 'react';
import {
  Grid, Typography, Box, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Paper,
  Card, CardContent
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WebIcon from '@mui/icons-material/Web';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InsightsIcon from '@mui/icons-material/Insights';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useDashboardKPIs, useSystemHealth } from '../hooks/useDashboard.js';
import useAuthStore from '../stores/authStore.js';
import client from '../api/client.js';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import DestinationCard from '../components/dashboard/DestinationCard.jsx';
import SystemHealthCard from '../components/dashboard/SystemHealthCard.jsx';
import QuickLinks from '../components/dashboard/QuickLinks.jsx';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { DESTINATIONS } from '../utils/destinations.js';
import { formatDate } from '../utils/formatters.js';
import { CATEGORY_COLORS } from '../utils/agents.js';

const SCHEDULED_JOBS = [
  { agent: 'De Maestro', schedule: 'Dagelijks 06:00', category: 'core', description: 'Orchestrator ochtendrun: agent health check, taak prioritering, scheduling' },
  { agent: 'De Maestro', schedule: 'Dagelijks 18:00', category: 'core', description: 'Orchestrator avondrun: dagrapportage, performance metrics, planning' },
  { agent: 'De Bode', schedule: 'Dagelijks 07:00', category: 'core', description: 'Ochtend briefing email: nachtelijke status, alerts, KPI overzicht' },
  { agent: 'De Bode', schedule: 'Dagelijks 19:00', category: 'core', description: 'Avond briefing email: dagelijkse samenvatting, voltooide taken' },
  { agent: 'De Dokter', schedule: 'Elke 4 uur', category: 'operations', description: 'Platform health: DB connectie, API response, disk usage' },
  { agent: 'De Koerier', schedule: 'Tier 1: dagelijks 06:00', category: 'operations', description: 'Content distributie top-25 POIs naar customer portals' },
  { agent: 'De Koerier', schedule: 'Tier 2: maandag 04:00', category: 'operations', description: 'Content distributie Tier 2 POIs (top-250) naar portals' },
  { agent: 'De Koerier', schedule: 'Tier 3: 1e van de maand 03:00', category: 'operations', description: 'Maandelijkse content distributie Tier 3 POIs (top-1000)' },
  { agent: 'De Koerier', schedule: 'Tier 4: kwartaal (Jan/Apr/Jul/Oct)', category: 'operations', description: 'Kwartaal content distributie overige POIs' },
  { agent: 'De Koerier', schedule: 'Review sync: dagelijks 05:00', category: 'operations', description: 'Synchronisatie nieuwe Google Reviews naar database' },
  { agent: 'Het Geheugen', schedule: 'Dagelijks 04:00', category: 'operations', description: 'ChromaDB vector store health check en document counts' },
  { agent: 'Het Geheugen', schedule: 'QnA sync: wekelijks zo 02:00', category: 'operations', description: 'QnA data synchronisatie naar ChromaDB collecties' },
  { agent: 'De Gastheer', schedule: 'Elke 2 uur', category: 'operations', description: 'Chatbot monitor: response quality, fallback rate, sessie metrics' },
  { agent: 'De Poortwachter', schedule: 'Dagelijks 03:00', category: 'operations', description: 'Security scan: rate limiting, verdachte patterns, API key validatie' },
  { agent: 'De Poortwachter', schedule: 'Retention check: maandag 02:00', category: 'operations', description: 'GDPR data retention check en verwijdering verlopen data' },
  { agent: 'De Stylist', schedule: 'Maandag 06:00', category: 'development', description: 'Wekelijkse UI/UX audit: design consistency, accessibility check' },
  { agent: 'De Corrector', schedule: 'Maandag 05:00', category: 'development', description: 'Code quality scan: linting, type checking, dependency check' },
  { agent: 'De Bewaker', schedule: 'Dagelijks 04:00', category: 'development', description: 'Security monitoring: auth logs, failed logins, permission violations' },
  { agent: 'De Bewaker', schedule: 'SSL check: dagelijks 06:00', category: 'development', description: 'SSL certificaat validatie: expiry check, chain verificatie' },
  { agent: 'De Inspecteur', schedule: 'Dagelijks 05:00', category: 'development', description: 'Test coverage analyse: unit tests, integration tests, regressions' },
  { agent: 'De Inspecteur', schedule: 'Deep scan: maandag 03:00', category: 'development', description: 'Uitgebreide code analyse: performance bottlenecks, memory leaks' },
  { agent: 'De Architect', schedule: 'Maandag 04:00', category: 'strategy', description: 'Architectuur review: schema wijzigingen, performance trends' },
  { agent: 'De Leermeester', schedule: 'Dagelijks 06:30', category: 'strategy', description: 'Analytics digest: gebruikerstrends, conversie analyse, SEO metrics' },
  { agent: 'De Leermeester', schedule: 'Pattern analyse: maandag 04:30', category: 'strategy', description: 'Wekelijkse pattern analyse: gebruikersgedrag, seizoentrends' },
  { agent: 'De Thermostaat', schedule: 'Elke 30 min', category: 'strategy', description: 'Adaptieve configuratie evaluatie en threshold monitoring' },
  { agent: 'De Weermeester', schedule: 'Dagelijks 05:30', category: 'strategy', description: 'Voorspellingsmodel update: bezoekerstrends, weer-impact analyse' },
  { agent: 'De Weermeester', schedule: 'Trend rapport: maandag 05:00', category: 'strategy', description: 'Wekelijks trend rapport: bezoekersprognose, seizoenspatronen' },
  { agent: 'De Weermeester', schedule: 'Seizoensanalyse: 1e maand 04:00', category: 'strategy', description: 'Maandelijkse seizoensanalyse: bezoekersverwachting komende maand' },
  { agent: 'Content Quality Checker', schedule: 'Maandag 05:00', category: 'monitoring', description: 'Wekelijkse content audit: completeness, consistentie, woordaantal' },
  { agent: 'Backup Health Checker', schedule: 'Dagelijks 07:30', category: 'monitoring', description: 'Backup recency check: bestandsleeftijd, disk space monitoring' },
  { agent: 'Smoke Test Runner', schedule: 'Dagelijks 07:45', category: 'monitoring', description: 'Dagelijkse smoke tests: API endpoints, frontend loads, chatbot' },
  { agent: 'Het Geheugen', schedule: 'ChromaDB snapshot: zondag 03:00', category: 'monitoring', description: 'ChromaDB state snapshot: vector counts per collectie' },
  { agent: 'De Maestro', schedule: 'Agent success rate: maandag 05:30', category: 'monitoring', description: '7-daagse agent success rate aggregatie en rapportage' },
  { agent: 'De Dokter', schedule: 'Portal health: elke 4 uur', category: 'monitoring', description: 'Frontend portal health: laadtijd, HTTP status, asset checks' },
  { agent: 'De Dokter', schedule: 'SSL expiry: dagelijks 06:00', category: 'monitoring', description: 'SSL certificaat expiry monitoring voor 5 domeinen' },
  { agent: 'De Gastheer', schedule: 'Session cleanup: dagelijks 02:00', category: 'operations', description: 'Opruimen verlopen chatbot sessies en tijdelijke data' },
  { agent: 'De Koerier', schedule: 'Content lifecycle: wekelijks wo 04:00', category: 'operations', description: 'Content lifecycle management: verouderde content detectie' },
  { agent: 'De Poortwachter', schedule: 'Consent audit: maandag 03:00', category: 'operations', description: 'GDPR consent audit: toestemmingen verificatie en rapportage' },
  { agent: 'De Bewaker', schedule: 'Vuln scan: maandag 04:00', category: 'development', description: 'Vulnerability scan: CVE database check, outdated packages' },
  { agent: 'De Corrector', schedule: 'Dep updates: maandag 05:30', category: 'development', description: 'Dependency update check: npm audit, beschikbare updates' },
  { agent: 'De Makelaar', schedule: 'Elke 15 min', category: 'operations', description: 'Intermediair monitor: stuck transacties, partner escalaties, conversie metrics' },
  { agent: 'De Makelaar', schedule: 'Review request: elke 6 uur', category: 'operations', description: 'Automatische review-verzoeken na afgeronde intermediaire transacties' },
  { agent: 'De Makelaar', schedule: 'Reminder: elk uur', category: 'operations', description: 'Herinneringen voor openstaande intermediaire transacties' },
  { agent: 'De Kassier', schedule: 'Dagelijks 06:30', category: 'operations', description: 'Financiële monitor: reconciliatie, anomaliedetectie 2σ, settlement alerts' },
  { agent: 'De Kassier', schedule: 'Auto-settlement: 1e van de maand 04:00', category: 'operations', description: 'Automatische settlement batch creatie en partner payout berekening' },
  { agent: 'De Kassier', schedule: 'Unsettled alert: maandag 08:30', category: 'operations', description: 'Alert voor niet-afgerekende transacties ouder dan 30 dagen' },
  { agent: 'De Magazijnier', schedule: 'Elke 30 min', category: 'operations', description: 'Inventory sync: Redis↔MySQL synchronisatie, stale reserveringen, low inventory alerts' },
  { agent: 'Reservation Cleanup', schedule: 'Elke 5 min', category: 'operations', description: 'Verlopen reserveringen vrijgeven en slots beschikbaar maken' },
  { agent: 'Reservation Reminders', schedule: 'Elk uur + elke 15 min', category: 'operations', description: 'Reserveringsherinneringen 24u en 1u voor aanvang' },
  { agent: 'Ticket Reservations', schedule: 'Elke minuut', category: 'operations', description: 'Verlopen ticket-reserveringen vrijgeven (Redis inventory lock)' },
  { agent: 'POI Tier Manager', schedule: 'Zondag 03:00', category: 'monitoring', description: 'Wekelijkse tier_score herberekening voor alle POIs' },
  { agent: 'Cost Controller', schedule: 'Elke 6 uur + maandag 09:00', category: 'monitoring', description: 'Kosten monitoring: API usage, storage, LLM kosten + weekrapport' },
  { agent: 'De Poortwachter', schedule: 'GDPR overdue: elke 4 uur', category: 'operations', description: 'Controle op verlopen GDPR verwijderingsverzoeken' },
  { agent: 'De Poortwachter', schedule: 'GDPR export cleanup: dagelijks 03:00', category: 'operations', description: 'Opruimen verlopen GDPR data exports' },
];

/* ===== Extended Dashboard Cards ===== */
function WebsiteStatsCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-website-stats'],
    queryFn: async () => {
      const [pages, media] = await Promise.all([
        client.get('/pages', { params: { limit: 999 } }).then(r => r.data).catch(() => null),
        client.get('/media', { params: { limit: 1 } }).then(r => r.data).catch(() => null)
      ]);
      return {
        pages: pages?.data?.pages?.length || pages?.data?.total || 0,
        media: media?.data?.total || media?.data?.files?.length || 0,
        blocks: 20
      };
    },
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) return <Skeleton variant="rounded" height={140} />;

  const stats = data || { pages: 0, media: 0, blocks: 20 };
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <WebIcon sx={{ color: '#0ea5e9' }} />
        <Typography variant="subtitle2" fontWeight={700}>{t('dashboard.websiteStats', 'Website Stats')}</Typography>
      </Box>
      <Grid container spacing={1}>
        <Grid item xs={4}>
          <Typography variant="h5" fontWeight={700} color="primary">{stats.pages}</Typography>
          <Typography variant="caption" color="text.secondary">{t('dashboard.pages', 'Pages')}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#7c3aed' }}>{stats.blocks}</Typography>
          <Typography variant="caption" color="text.secondary">{t('dashboard.blockTypes', 'Block Types')}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#059669' }}>{stats.media}</Typography>
          <Typography variant="caption" color="text.secondary">{t('dashboard.mediaFiles', 'Media Files')}</Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}

function CommerceOverviewCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-commerce'],
    queryFn: () => client.get('/commerce/dashboard').then(r => r.data).catch(() => null),
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) return <Skeleton variant="rounded" height={140} />;
  if (!data?.data) return null; // Commerce not active

  const commerce = data.data;
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <ShoppingCartIcon sx={{ color: '#d97706' }} />
        <Typography variant="subtitle2" fontWeight={700}>{t('dashboard.commerce', 'Commerce')}</Typography>
      </Box>
      <Grid container spacing={1}>
        <Grid item xs={4}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#d97706' }}>{commerce.totalTransactions || 0}</Typography>
          <Typography variant="caption" color="text.secondary">{t('dashboard.transactions', 'Transactions')}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="h5" fontWeight={700} color="primary">{commerce.totalTicketsSold || 0}</Typography>
          <Typography variant="caption" color="text.secondary">{t('dashboard.ticketsSold', 'Tickets')}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#059669' }}>{commerce.totalReservations || 0}</Typography>
          <Typography variant="caption" color="text.secondary">{t('dashboard.reservations', 'Reservations')}</Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}

function ChatbotPerformanceCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-chatbot'],
    queryFn: () => client.get('/holibot/analytics').then(r => r.data).catch(() => null),
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) return <Skeleton variant="rounded" height={140} />;
  if (!data?.data) return null;

  const stats = data.data;
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <InsightsIcon sx={{ color: '#7c3aed' }} />
        <Typography variant="subtitle2" fontWeight={700}>{t('dashboard.chatbotPerformance', 'Chatbot Performance')}</Typography>
      </Box>
      <Grid container spacing={1}>
        <Grid item xs={4}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#7c3aed' }}>{stats.totalSessions || stats.sessions7d || 0}</Typography>
          <Typography variant="caption" color="text.secondary">{t('dashboard.sessions', 'Sessions')}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="h5" fontWeight={700} color="primary">{stats.totalMessages || stats.messages7d || 0}</Typography>
          <Typography variant="caption" color="text.secondary">{t('dashboard.messages', 'Messages')}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#059669' }}>{stats.avgResponseTime ? `${stats.avgResponseTime}s` : '-'}</Typography>
          <Typography variant="caption" color="text.secondary">{t('dashboard.avgResponse', 'Avg Response')}</Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}

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
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          {healthLoading ? <Skeleton variant="rounded" height={200} /> : (
            <SystemHealthCard health={health} healthSummary={platform.healthSummary} />
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <QuickLinks />
        </Grid>
      </Grid>

      {/* Extended Stats: Website + Commerce + Chatbot */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
        {t('dashboard.extendedStats', 'Platform Insights')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <WebsiteStatsCard />
        </Grid>
        <Grid item xs={12} md={4}>
          <CommerceOverviewCard />
        </Grid>
        <Grid item xs={12} md={4}>
          <ChatbotPerformanceCard />
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
        {t('dashboard.jobsDialog.title')} — {new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })} ({SCHEDULED_JOBS.length})
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
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover', fontSize: '0.8rem' } }}>
                      <TableCell>{t('dashboard.jobsDialog.job')}</TableCell>
                      <TableCell>{t('dashboard.jobsDialog.schedule')}</TableCell>
                      <TableCell>{t('dashboard.jobsDialog.description')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobs.map((job, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{job.agent}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{job.schedule}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{job.description}</Typography>
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
