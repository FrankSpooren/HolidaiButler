import { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, FormControl, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { usePerformanceSummary } from '../hooks/useContent.js';

const PLATFORM_ICONS = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  website: LanguageIcon,
};

const PLATFORM_COLORS = {
  facebook: '#1877f2',
  instagram: '#e4405f',
  linkedin: '#0a66c2',
  website: '#4caf50',
};

export default function ContentPerformanceTab({ destinationId }) {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);

  const { data: perfData, isLoading } = usePerformanceSummary(destinationId, { days });

  const summary = perfData?.data?.summary || {};
  const byPlatform = perfData?.data?.by_platform || [];
  const topContent = perfData?.data?.top_content || [];

  const totalViews = summary.total_views || 0;
  const totalClicks = summary.total_clicks || 0;
  const totalEngagement = summary.total_engagement || 0;
  const totalReach = summary.total_reach || 0;

  const platformPieData = byPlatform.map(p => ({
    name: p.platform,
    value: parseInt(p.total_views) || 0,
    color: PLATFORM_COLORS[p.platform] || '#999',
  }));

  return (
    <Box>
      {/* Period selector */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={days} onChange={e => setDays(e.target.value)}>
            <MenuItem value={7}>7 {t('contentStudio.performance.days', 'dagen')}</MenuItem>
            <MenuItem value={30}>30 {t('contentStudio.performance.days', 'dagen')}</MenuItem>
            <MenuItem value={90}>90 {t('contentStudio.performance.days', 'dagen')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* KPI Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: t('contentStudio.performance.views', 'Weergaven'), value: totalViews, icon: VisibilityIcon, color: '#2196f3' },
              { label: t('contentStudio.performance.clicks', 'Klikken'), value: totalClicks, icon: TouchAppIcon, color: '#ff9800' },
              { label: t('contentStudio.performance.engagement', 'Engagement'), value: totalEngagement, icon: PeopleIcon, color: '#4caf50' },
              { label: t('contentStudio.performance.reach', 'Bereik'), value: totalReach, icon: TrendingUpIcon, color: '#9c27b0' },
            ].map(kpi => (
              <Grid item xs={6} md={3} key={kpi.label}>
                <Card variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ bgcolor: kpi.color + '20', borderRadius: 1, p: 1, display: 'flex' }}>
                      <kpi.icon sx={{ color: kpi.color }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={600}>{kpi.value.toLocaleString('nl-NL')}</Typography>
                      <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Charts row */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Platform breakdown bar chart */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  {t('contentStudio.performance.byPlatform', 'Per platform')}
                </Typography>
                {byPlatform.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={byPlatform}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" />
                      <YAxis />
                      <RTooltip />
                      <Legend />
                      <Bar dataKey="total_views" name={t('contentStudio.performance.views', 'Weergaven')} fill="#2196f3" />
                      <Bar dataKey="total_clicks" name={t('contentStudio.performance.clicks', 'Klikken')} fill="#ff9800" />
                      <Bar dataKey="total_engagement" name={t('contentStudio.performance.engagement', 'Engagement')} fill="#4caf50" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    {t('contentStudio.performance.noData', 'Nog geen performance data beschikbaar.')}
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Platform distribution pie */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  {t('contentStudio.performance.distribution', 'Verdeling weergaven')}
                </Typography>
                {platformPieData.length > 0 && platformPieData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={platformPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                        {platformPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    {t('contentStudio.performance.noData', 'Nog geen performance data beschikbaar.')}
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Top performing content table */}
          <Paper variant="outlined">
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="subtitle2">
                {t('contentStudio.performance.topContent', 'Best presterende content')}
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('contentStudio.performance.title', 'Titel')}</TableCell>
                    <TableCell>{t('contentStudio.performance.platform', 'Platform')}</TableCell>
                    <TableCell align="right">{t('contentStudio.performance.views', 'Weergaven')}</TableCell>
                    <TableCell align="right">{t('contentStudio.performance.clicks', 'Klikken')}</TableCell>
                    <TableCell align="right">{t('contentStudio.performance.engagement', 'Engagement')}</TableCell>
                    <TableCell align="right">{t('contentStudio.performance.reach', 'Bereik')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topContent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('contentStudio.performance.noData', 'Nog geen performance data beschikbaar.')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : topContent.map(item => {
                    const Icon = PLATFORM_ICONS[item.platform] || LanguageIcon;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>{item.title}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<Icon sx={{ fontSize: 14 }} />}
                            label={item.platform}
                            size="small" variant="outlined"
                            sx={{ borderColor: PLATFORM_COLORS[item.platform] }}
                          />
                        </TableCell>
                        <TableCell align="right">{(item.views || 0).toLocaleString('nl-NL')}</TableCell>
                        <TableCell align="right">{(item.clicks || 0).toLocaleString('nl-NL')}</TableCell>
                        <TableCell align="right">{(item.engagement || 0).toLocaleString('nl-NL')}</TableCell>
                        <TableCell align="right">{(item.reach || 0).toLocaleString('nl-NL')}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}
