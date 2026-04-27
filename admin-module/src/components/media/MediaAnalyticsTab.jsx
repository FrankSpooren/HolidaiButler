import { useState } from 'react';
import {
  Box, Typography, Stack, Alert, Chip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Skeleton, Tooltip, IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client.js';

function StatCard({ icon, title, value, subtitle, color = 'primary.main', loading }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 180 }}>
      {loading ? (
        <Skeleton variant="rectangular" height={60} />
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{ color }}>{icon}</Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{title}</Typography>
          </Box>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </>
      )}
    </Paper>
  );
}

export default function MediaAnalyticsTab({ destId }) {
  const { t } = useTranslation();

  // Content Gaps
  const { data: gapsData, isLoading: gapsLoading, refetch: refetchGaps } = useQuery({
    queryKey: ['media-content-gaps', destId],
    queryFn: () => client.get('/media/content-gaps', { params: { destinationId: destId, limit: 15 } }).then(r => r.data),
    enabled: !!destId,
    staleTime: 60000,
  });

  // Readiness Report
  const { data: readyData, isLoading: readyLoading } = useQuery({
    queryKey: ['media-readiness', destId],
    queryFn: () => client.get('/media/readiness', { params: { destinationId: destId, days: 7 } }).then(r => r.data),
    enabled: !!destId,
    staleTime: 60000,
  });

  // Top Performers
  const { data: topData, isLoading: topLoading } = useQuery({
    queryKey: ['media-top-performers', destId],
    queryFn: () => client.get('/media/top-performers', { params: { destinationId: destId, limit: 10, days: 90 } }).then(r => r.data),
    enabled: !!destId,
    staleTime: 60000,
  });

  // Revenue Top
  const { data: revData, isLoading: revLoading } = useQuery({
    queryKey: ['media-revenue-top', destId],
    queryFn: () => client.get('/media/revenue-top', { params: { destinationId: destId, limit: 10 } }).then(r => r.data),
    enabled: !!destId,
    staleTime: 60000,
  });

  const gaps = gapsData?.data || [];
  const readiness = readyData?.data || {};
  const topPerformers = topData?.data || [];
  const revenueTop = revData?.data || [];

  const anyLoading = gapsLoading || readyLoading || topLoading || revLoading;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          {t('media.analytics.title', 'Media Analytics')}
        </Typography>
        <IconButton onClick={() => refetchGaps()} size="small" title="Vernieuwen">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <StatCard
          icon={<WarningAmberIcon />}
          title={t('media.analytics.contentGaps', 'Content Gaps')}
          value={gaps.length || 0}
          subtitle={t('media.analytics.poisMissingMedia', 'POIs met ontbrekende media')}
          color="warning.main"
          loading={gapsLoading}
        />
        <StatCard
          icon={<TrendingUpIcon />}
          title={t('media.analytics.readinessScore', 'Readiness Score')}
          value={readiness.overall_score ? readiness.overall_score + '%' : '--'}
          subtitle={t('media.analytics.next7days', 'Komende 7 dagen')}
          color="success.main"
          loading={readyLoading}
        />
        <StatCard
          icon={<EmojiEventsIcon />}
          title={t('media.analytics.topPerformers', 'Top Performers')}
          value={topPerformers.length || 0}
          subtitle={t('media.analytics.last90days', 'Laatste 90 dagen')}
          color="primary.main"
          loading={topLoading}
        />
        <StatCard
          icon={<AttachMoneyIcon />}
          title={t('media.analytics.revenueMedia', 'Revenue Media')}
          value={revenueTop.length || 0}
          subtitle={t('media.analytics.mediaWithRevenue', 'Items met omzet-attributie')}
          color="info.main"
          loading={revLoading}
        />
      </Box>

      {/* Content Gaps Table */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>
            {t('media.analytics.contentGapsTitle', 'Content Gaps — POIs met ontbrekende afbeeldingen')}
          </Typography>
        </Box>
        {gapsLoading ? (
          <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={200} /></Box>
        ) : gaps.length === 0 ? (
          <Alert severity="success" sx={{ m: 2 }}>
            {t('media.analytics.noGaps', 'Geen content gaps gevonden. Alle POIs hebben voldoende media.')}
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('media.analytics.poiName', 'POI')}</TableCell>
                  <TableCell>{t('media.analytics.category', 'Categorie')}</TableCell>
                  <TableCell align="right">{t('media.analytics.queries', 'Queries')}</TableCell>
                  <TableCell align="right">{t('media.analytics.noMatch', 'Geen match')}</TableCell>
                  <TableCell align="right">{t('media.analytics.gapPct', 'Gap %')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gaps.map((row, i) => (
                  <TableRow key={row.poi_id || i} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{row.poi_name || 'POI #' + row.poi_id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={row.category || '—'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">{row.query_count}</TableCell>
                    <TableCell align="right">
                      <Typography color="error.main" fontWeight={600}>{row.no_match_count}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        <LinearProgress
                          variant="determinate"
                          value={Number(row.gap_percentage) || 0}
                          color={Number(row.gap_percentage) > 50 ? 'error' : 'warning'}
                          sx={{ width: 60, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" fontWeight={600}>{row.gap_percentage}%</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Readiness Report */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon color="success" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>
            {t('media.analytics.readinessTitle', 'Content Readiness')}
          </Typography>
        </Box>
        {readyLoading ? (
          <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={120} /></Box>
        ) : !readiness || Object.keys(readiness).length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            {t('media.analytics.noReadiness', 'Geen readiness data beschikbaar.')}
          </Alert>
        ) : (
          <Box sx={{ p: 2 }}>
            {readiness.overall_score !== undefined && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('media.analytics.overallReadiness', 'Algemene content readiness')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={readiness.overall_score || 0}
                    color={readiness.overall_score > 70 ? 'success' : readiness.overall_score > 40 ? 'warning' : 'error'}
                    sx={{ flex: 1, height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="h6" fontWeight={700}>{readiness.overall_score}%</Typography>
                </Box>
              </Box>
            )}
            {readiness.categories && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(readiness.categories || {}).map(([cat, score]) => (
                  <Chip key={cat} label={cat + ': ' + score + '%'} size="small"
                    color={score > 70 ? 'success' : score > 40 ? 'warning' : 'error'}
                    variant="outlined" />
                ))}
              </Box>
            )}
            {readiness.timeline && Array.isArray(readiness.timeline) && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {readiness.timeline.map((day, i) => (
                  <Tooltip key={i} title={day.date + ': ' + (day.items_ready || 0) + ' items ready'}>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: day.items_ready > 3 ? 'success.main' : day.items_ready > 0 ? 'warning.main' : 'error.main',
                      color: 'white', fontSize: '0.7rem', fontWeight: 700,
                    }}>
                      {day.items_ready || 0}
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Top Performers */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>
            {t('media.analytics.topPerformersTitle', 'Top Performers — Laatste 90 dagen')}
          </Typography>
        </Box>
        {topLoading ? (
          <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={200} /></Box>
        ) : topPerformers.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            {t('media.analytics.noTopPerformers', 'Nog geen performance data beschikbaar.')}
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('media.analytics.media', 'Media')}</TableCell>
                  <TableCell align="right">{t('media.analytics.uses', 'Gebruikt')}</TableCell>
                  <TableCell align="right">{t('media.analytics.score', 'Score')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topPerformers.map((item, i) => (
                  <TableRow key={item.id || i} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {i < 3 && <EmojiEventsIcon sx={{ fontSize: 16, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32' }} />}
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 250 }}>
                          {item.original_name || item.filename || 'Media #' + item.id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{item.usage_count || item.total_uses || 0}</TableCell>
                    <TableCell align="right">
                      <Chip label={item.performance_score || item.score || 0}
                        size="small" color={item.performance_score > 70 ? 'success' : 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Revenue Attribution */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachMoneyIcon color="info" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>
            {t('media.analytics.revenueTitle', 'Revenue Attribution — Media met omzet')}
          </Typography>
        </Box>
        {revLoading ? (
          <Box sx={{ p: 2 }}><Skeleton variant="rectangular" height={200} /></Box>
        ) : revenueTop.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            {t('media.analytics.noRevenue', 'Nog geen omzet-attributie data beschikbaar. Revenue tracking wordt automatisch opgebouwd bij commerce-activiteit.')}
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('media.analytics.media', 'Media')}</TableCell>
                  <TableCell align="right">{t('media.analytics.revenue', 'Omzet')}</TableCell>
                  <TableCell align="right">{t('media.analytics.bookings', 'Boekingen')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {revenueTop.map((item, i) => (
                  <TableRow key={item.id || i} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 250 }}>
                        {item.original_name || item.filename || 'Media #' + item.id}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600}>
                        {((item.revenue_cents || item.total_revenue_cents || 0) / 100).toFixed(2)} EUR
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{item.bookings || item.total_bookings || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
