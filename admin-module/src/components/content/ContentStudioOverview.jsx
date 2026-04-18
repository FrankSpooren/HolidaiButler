import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Chip, Skeleton, Alert, Divider } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import client from '../../api/client.js';
import { tokens } from '../../theme/tokens.js';

function KpiCard({ icon: Icon, iconColor, label, value, subtext, action, onAction, loading }) {
  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Skeleton variant="circular" width={36} height={36} sx={{ mb: 1.5 }} />
          <Skeleton width="40%" height={14} sx={{ mb: 1 }} />
          <Skeleton width="30%" height={36} sx={{ mb: 0.5 }} />
          <Skeleton width="60%" height={14} />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card sx={{ height: '100%', transition: tokens.motion.fast, '&:hover': { boxShadow: tokens.shadow.md } }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: tokens.radius.md, bgcolor: iconColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon sx={{ fontSize: 20, color: iconColor }} />
          </Box>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, mt: 0.5, color: 'text.primary' }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
          {subtext}
        </Typography>
        {action && (
          <Button size="small" onClick={onAction} endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            sx={{ mt: 1.5, textTransform: 'none', fontSize: '0.75rem', color: tokens.brand.teal, p: 0, minWidth: 0, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
          >
            {action}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AttentionItem({ icon: Icon, color, text, count }) {
  if (!count) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, px: 0.5 }}>
      <Icon sx={{ fontSize: 18, color }} />
      <Typography variant="body2" sx={{ fontSize: '0.8rem', flex: 1 }}>{text}</Typography>
      <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: color + '18', color }} />
    </Box>
  );
}

function TopContentItem({ item, rank }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { border: 'none' } }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.disabled', width: 20, textAlign: 'center' }}>{rank}</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
          <Chip label={item.content_type === 'social_post' ? 'Social' : item.content_type === 'blog' ? 'Blog' : item.content_type} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
          {item.target_platform && <Chip label={item.target_platform} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />}
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{parseInt(item.total_reach || 0).toLocaleString()} bereik</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled', display: 'block' }}>{parseInt(item.total_engagement || 0).toLocaleString()} engagement</Typography>
      </Box>
    </Box>
  );
}

const DIRECTION_COLORS = { breakout: '#d32f2f', rising: '#2e7d32', stable: '#1565c0', declining: '#ef6c00' };
const DIRECTION_LABELS = { breakout: 'Breakout', rising: 'Rising', stable: 'Stable', declining: 'Declining' };

function Top25Item({ item, rank }) {
  const dirColor = DIRECTION_COLORS[item.trend_direction] || DIRECTION_COLORS.stable;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { border: 'none' } }}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.disabled', width: 18, textAlign: 'center' }}>{rank}</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.keyword}</Typography>
      </Box>
      <Chip label={DIRECTION_LABELS[item.trend_direction] || item.trend_direction} size="small"
        sx={{ height: 18, fontSize: '0.58rem', bgcolor: dirColor + '18', color: dirColor, fontWeight: 600 }} />
      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', minWidth: 40, textAlign: 'right' }}>
        {parseInt(item.search_volume || 0).toLocaleString()}
      </Typography>
    </Box>
  );
}

export default function ContentStudioOverview({ onNavigateTab, destinationId }) {
  const [data, setData] = useState(null);
  const [top25, setTop25] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOverview() {
      try {
        setLoading(true);
        setError(null);
        const [overviewRes, top25Res] = await Promise.all([
          client.get('/content/studio/overview', { headers: { 'X-Destination-ID': destinationId } }),
          client.get('/content/sources/top25?limit=10', { headers: { 'X-Destination-ID': destinationId } }).catch(() => null),
        ]);
        if (overviewRes.data.success) setData(overviewRes.data.data);
        else setError(overviewRes.data.error?.message);
        if (top25Res?.data?.success) setTop25(top25Res.data.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, [destinationId]);

  const hasAttention = data && (data.attention.drafts > 0 || data.attention.pendingReview > 0 || data.attention.failedPublishes > 0);
  const hasTopContent = data && data.topContent && data.topContent.length > 0;
  const top25Items = top25?.sections?.zoektermen?.items?.slice(0, 10) || [];

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={CalendarTodayIcon} iconColor={tokens.brand.teal} label="Vandaag" value={loading ? '-' : data?.today?.scheduled || 0}
            subtext={loading ? '' : (data?.today?.published || 0) + ' gepubliceerd'} action="Kalender" onAction={() => onNavigateTab && onNavigateTab(3)} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={ScheduleIcon} iconColor={tokens.semantic.info} label="Deze week" value={loading ? '-' : data?.thisWeek?.scheduled || 0}
            subtext={loading ? '' : (data?.thisWeek?.published || 0) + ' gepubliceerd'} action="Bekijk" onAction={() => onNavigateTab && onNavigateTab(2)} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={EventBusyIcon} iconColor={data?.gaps?.count > 3 ? tokens.semantic.warning : tokens.semantic.success} label="Gaps" value={loading ? '-' : data?.gaps?.count || 0}
            subtext={loading ? '' : 'werkdagen zonder content'} action="Kalender" onAction={() => onNavigateTab && onNavigateTab(3)} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={AutoAwesomeIcon} iconColor={tokens.brand.teal} label="AI suggesties" value={loading ? '-' : data?.suggestions?.pending || 0}
            subtext={loading ? '' : 'nieuwe suggesties'} action="Bekijk suggesties" onAction={() => onNavigateTab && onNavigateTab(1)} loading={loading} />
        </Grid>
      </Grid>

      {/* Middle row: Attention + Top Content */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={hasTopContent ? 5 : 12}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon sx={{ fontSize: 18, color: tokens.semantic.warning }} /> Aandachtspunten
              </Typography>
              {loading ? (
                <Box><Skeleton height={32} sx={{ mb: 0.5 }} /><Skeleton height={32} sx={{ mb: 0.5 }} /><Skeleton height={32} /></Box>
              ) : hasAttention ? (
                <Box>
                  <AttentionItem icon={EditNoteIcon} color={tokens.semantic.info} text="Concepten in draft" count={data.attention.drafts} />
                  <AttentionItem icon={ScheduleIcon} color={tokens.semantic.warning} text="Wachten op review" count={data.attention.pendingReview} />
                  <AttentionItem icon={ErrorOutlineIcon} color={tokens.semantic.error} text="Publicaties mislukt (7d)" count={data.attention.failedPublishes} />
                </Box>
              ) : (
                <Box sx={{ py: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>Alles op orde</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        {hasTopContent && (
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon sx={{ fontSize: 18, color: tokens.brand.teal }} /> Top content (30 dagen)
                  </Typography>
                  <Button size="small" onClick={() => onNavigateTab && onNavigateTab(2)} sx={{ textTransform: 'none', fontSize: '0.7rem', color: tokens.brand.teal }}>Alle items</Button>
                </Box>
                {data.topContent.map((item, i) => <TopContentItem key={item.id} item={item} rank={i + 1} />)}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Content Top 25 */}
      {top25Items.length > 0 && (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WhatshotIcon sx={{ fontSize: 18, color: tokens.brand.gold }} /> Content Top 10 — Direct starten
              </Typography>
              <Button size="small" onClick={() => onNavigateTab && onNavigateTab(0, 0)} endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                sx={{ textTransform: 'none', fontSize: '0.7rem', color: tokens.brand.teal }}
              >
                Volledig overzicht
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                {top25Items.slice(0, 5).map((item, i) => <Top25Item key={i} item={item} rank={i + 1} />)}
              </Grid>
              <Grid item xs={12} md={6}>
                {top25Items.slice(5, 10).map((item, i) => <Top25Item key={i + 5} item={item} rank={i + 6} />)}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !data?.thisWeek?.scheduled && !data?.suggestions?.pending && !hasTopContent && top25Items.length === 0 && (
        <Card sx={{ mt: 2, textAlign: 'center', py: 4 }}>
          <CardContent>
            <AutoAwesomeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Nog geen content</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Start met het genereren van suggesties of maak een nieuw concept.</Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" onClick={() => onNavigateTab && onNavigateTab(1)} sx={{ textTransform: 'none', bgcolor: tokens.brand.teal, '&:hover': { bgcolor: '#029e7d' } }}>Genereer suggesties</Button>
              <Button variant="outlined" onClick={() => onNavigateTab && onNavigateTab(2)} sx={{ textTransform: 'none', borderColor: tokens.brand.teal, color: tokens.brand.teal }}>Nieuw concept</Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
