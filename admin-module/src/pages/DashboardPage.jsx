import { useState } from 'react';
import {
  Grid, Typography, Box, Skeleton, Card, CardContent, Chip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import CampaignIcon from '@mui/icons-material/Campaign';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../stores/authStore.js';
import useDestinationStore from '../stores/destinationStore.js';
import client from '../api/client.js';
import ErrorBanner from '../components/common/ErrorBanner.jsx';
import { useNavigate } from 'react-router-dom';

// Status colors for content items
const STATUS_COLORS = {
  draft: 'default', pending_review: 'info', approved: 'primary',
  scheduled: 'secondary', published: 'success', failed: 'error',
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const allDestinations = useDestinationStore(s => s.destinations);
  const isPlatformAdmin = user?.role === 'platform_admin';
  const userAllowed = user?.allowed_destinations || [];

  // Get user's destination info
  const userDest = !isPlatformAdmin && userAllowed.length > 0
    ? allDestinations.find(d => userAllowed.includes(d.code))
    : null;
  const isContentOnly = userDest?.destinationType === 'content_only';

  // Fetch action-oriented dashboard data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-actions'],
    queryFn: () => client.get('/dashboard/actions').then(r => r.data),
    staleTime: 60 * 1000, // 1 min cache
  });

  const actions = data?.data?.actions || {};
  const performance = data?.data?.performance || {};
  const recentContent = data?.data?.recentContent || [];

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.goodMorning', 'Goedemorgen') : hour < 18 ? t('dashboard.goodAfternoon', 'Goedemiddag') : t('dashboard.goodEvening', 'Goedenavond');
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Admin';

  return (
    <Box>
      {/* Welcome header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {greeting}, {firstName}!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {userDest?.name || (isPlatformAdmin ? t('dashboard.allDestinations', 'Alle bestemmingen') : '')}
          </Typography>
        </Box>
        <Tooltip title={t('common.refresh', 'Vernieuwen')}>
          <IconButton onClick={() => refetch()} size="small"><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {error && <ErrorBanner onRetry={refetch} />}

      {/* Actions Required */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        {t('dashboard.actionsRequired', 'Acties vereist')}
      </Typography>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {isLoading ? (
            <Box><Skeleton height={32} /><Skeleton height={32} /><Skeleton height={32} /></Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {actions.draftItems > 0 && (
                <ActionRow icon={<EditIcon fontSize="small" color="info" />} text={`${actions.draftItems} ${t('dashboard.draftItems', 'concept items klaar voor review')}`} onClick={() => navigate('/content-studio')} />
              )}
              {actions.pendingReviews > 0 && (
                <ActionRow icon={<EditIcon fontSize="small" color="warning" />} text={`${actions.pendingReviews} ${t('dashboard.pendingReviews', 'items wachten op goedkeuring')}`} onClick={() => navigate('/content-studio')} />
              )}
              {actions.failedPublishes > 0 && (
                <ActionRow icon={<WarningAmberIcon fontSize="small" color="error" />} text={`${actions.failedPublishes} ${t('dashboard.failedPublishes', 'publicaties mislukt')}`} onClick={() => navigate('/content-studio')} />
              )}
              {actions.expiringTokens?.length > 0 && actions.expiringTokens.map((tok, i) => (
                <ActionRow key={i} icon={<WarningAmberIcon fontSize="small" color="warning" />} text={`${tok.platform} token verloopt over ${tok.days_left} ${t('dashboard.days', 'dagen')}`} onClick={() => navigate('/content-studio')} />
              ))}
              {actions.topPerformer && (
                <ActionRow icon={<TrendingUpIcon fontSize="small" color="success" />} text={`${t('dashboard.topPerformer', 'Top performer')}: "${actions.topPerformer.title?.substring(0, 40)}" (${actions.topPerformer.total_reach || actions.topPerformer.total_engagement || 0} reach)`} onClick={() => navigate('/content-studio')} />
              )}
              {actions.trendingTopic && (
                <ActionRow icon={<TrendingUpIcon fontSize="small" color="primary" />} text={`${t('dashboard.trending', 'Trending')}: ${actions.trendingTopic.keyword}`} onClick={() => navigate('/content-studio')} />
              )}
              {!actions.draftItems && !actions.pendingReviews && !actions.failedPublishes && !actions.expiringTokens?.length && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  {t('dashboard.noActions', 'Geen openstaande acties. Alles op orde!')}
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Quick Links + Performance side by side */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
            {t('dashboard.quickActions', 'Snelkoppelingen')}
          </Typography>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
              <Button variant="contained" startIcon={<NoteAddIcon />} onClick={() => navigate('/content-studio')} fullWidth sx={{ justifyContent: 'flex-start' }}>
                {t('dashboard.newContent', 'Nieuw Content Item')}
              </Button>
              <Button variant="outlined" startIcon={<CampaignIcon />} onClick={() => navigate('/content-studio')} fullWidth sx={{ justifyContent: 'flex-start' }}>
                {t('dashboard.newCampaign', 'Nieuwe Campagne')}
              </Button>
              <Button variant="outlined" startIcon={<CalendarMonthIcon />} onClick={() => navigate('/content-studio')} fullWidth sx={{ justifyContent: 'flex-start' }}>
                {t('dashboard.viewCalendar', 'Kalender bekijken')}
              </Button>
              <Button variant="outlined" startIcon={<BarChartIcon />} onClick={() => navigate('/content-studio')} fullWidth sx={{ justifyContent: 'flex-start' }}>
                {t('dashboard.viewAnalytics', 'Analyse bekijken')}
              </Button>
              {!isContentOnly && (
                <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={() => navigate('/branding')} fullWidth sx={{ justifyContent: 'flex-start' }}>
                  {t('dashboard.brandProfile', 'Merk Profiel')}
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
            {t('dashboard.contentPerformance', 'Content prestaties (7 dagen)')}
          </Typography>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              {isLoading ? <Skeleton height={100} /> : (
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">{t('dashboard.reach', 'Bereik')}</Typography>
                    <Typography variant="h5" fontWeight={700}>{(performance.reach || 0).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">{t('dashboard.engagement', 'Engagement')}</Typography>
                    <Typography variant="h5" fontWeight={700}>{(performance.engagement || 0).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">{t('dashboard.clicks', 'Clicks')}</Typography>
                    <Typography variant="h5" fontWeight={700}>{(performance.clicks || 0).toLocaleString()}</Typography>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Content — div spacer to match gap above Snelkoppelingen */}
      <div style={{ height: 24 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
        {t('dashboard.recentContent', 'Recente content')}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
              <TableCell>{t('dashboard.title', 'Titel')}</TableCell>
              <TableCell>{t('dashboard.platform', 'Platform')}</TableCell>
              <TableCell>{t('dashboard.status', 'Status')}</TableCell>
              <TableCell>{t('dashboard.score', 'Score')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
            )) : recentContent.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">{t('dashboard.noContent', 'Nog geen content. Ga naar Content Studio om te beginnen.')}</Typography>
                  <Button size="small" variant="contained" sx={{ mt: 1 }} onClick={() => navigate('/content-studio')}>
                    {t('dashboard.goToStudio', 'Naar Content Studio')}
                  </Button>
                </TableCell>
              </TableRow>
            ) : recentContent.map(item => (
              <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate('/content-studio')}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </Typography>
                </TableCell>
                <TableCell><Chip label={item.target_platform} size="small" variant="outlined" /></TableCell>
                <TableCell><Chip label={t(`contentStudio.status.${item.approval_status}`, item.approval_status)} size="small" color={STATUS_COLORS[item.approval_status] || 'default'} /></TableCell>
                <TableCell>
                  {item.seo_score != null ? (
                    <Chip label={item.seo_score} size="small" color={item.seo_score >= 80 ? 'success' : item.seo_score >= 60 ? 'warning' : 'error'} />
                  ) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

/** Reusable action row with icon, text and click */
function ActionRow({ icon, text, onClick }) {
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, px: 1, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
      onClick={onClick}
    >
      {icon}
      <Typography variant="body2" sx={{ flex: 1 }}>{text}</Typography>
      <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: 12 }}>→</Typography>
    </Box>
  );
}
