import { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CircularProgress, FormControl, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tabs, Tab, TablePagination,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { useAnalyticsOverview, useAnalyticsItems, useAnalyticsPlatforms } from '../hooks/useContent.js';

const PLATFORM_ICONS = { facebook: FacebookIcon, instagram: InstagramIcon, linkedin: LinkedInIcon, website: LanguageIcon };
const PLATFORM_COLORS = { facebook: '#1877f2', instagram: '#e4405f', linkedin: '#0a66c2', website: '#4caf50' };
const TYPE_COLORS = { blog: '#2196f3', social_post: '#e4405f', video_script: '#ff9800' };

function GrowthChip({ value }) {
  if (!value) return null;
  const positive = value > 0;
  return (
    <Chip
      size="small"
      icon={positive ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardIcon sx={{ fontSize: 14 }} />}
      label={`${positive ? '+' : ''}${value}%`}
      sx={{
        bgcolor: positive ? 'success.main' : 'error.main',
        color: '#fff',
        fontWeight: 600,
        fontSize: 11,
        height: 22,
        '& .MuiChip-icon': { color: '#fff' },
      }}
    />
  );
}

export default function ContentAnalyseTab({ destinationId }) {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  const [subTab, setSubTab] = useState(0);
  const [itemsPage, setItemsPage] = useState(0);
  const [sortBy, setSortBy] = useState('engagement');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: overviewData, isLoading: loadingOverview } = useAnalyticsOverview(destinationId, { days });
  const { data: itemsData, isLoading: loadingItems } = useAnalyticsItems(destinationId, {
    days, limit: 10, offset: itemsPage * 10, sort_by: sortBy, content_type: typeFilter || undefined,
  });
  const { data: platformsData, isLoading: loadingPlatforms } = useAnalyticsPlatforms(destinationId, { days });

  const summary = overviewData?.data?.summary || {};
  const timeSeries = overviewData?.data?.time_series || [];
  const byPlatform = overviewData?.data?.by_platform || [];
  const byType = overviewData?.data?.by_type || [];
  const topContent = overviewData?.data?.top_content || [];
  const analyticsItems = itemsData?.data?.items || [];
  const itemsTotal = itemsData?.data?.total || 0;
  const platforms = platformsData?.data?.platforms || [];

  const isLoading = loadingOverview || loadingItems || loadingPlatforms;

  const kpis = [
    { key: 'views', label: t('contentStudio.analyse.views', 'Weergaven'), value: summary.total_views || 0, growth: summary.growth_views, icon: VisibilityIcon, color: '#2196f3' },
    { key: 'clicks', label: t('contentStudio.analyse.clicks', 'Klikken'), value: summary.total_clicks || 0, growth: summary.growth_clicks, icon: TouchAppIcon, color: '#ff9800' },
    { key: 'engagement', label: t('contentStudio.analyse.engagement', 'Engagement'), value: summary.total_engagement || 0, growth: summary.growth_engagement, icon: PeopleIcon, color: '#4caf50' },
    { key: 'reach', label: t('contentStudio.analyse.reach', 'Bereik'), value: summary.total_reach || 0, growth: summary.growth_reach, icon: TrendingUpIcon, color: '#9c27b0' },
  ];

  const typePieData = byType.map(t => ({
    name: t.content_type,
    value: Number(t.total_engagement) || 0,
    color: TYPE_COLORS[t.content_type] || '#999',
  }));

  const platformPieData = byPlatform.map(p => ({
    name: p.platform,
    value: Number(p.total_views) || 0,
    color: PLATFORM_COLORS[p.platform] || '#999',
  }));

  return (
    <Box>
      {/* Period selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ minHeight: 36 }}>
          <Tab label={t('contentStudio.analyse.overview', 'Overzicht')} sx={{ minHeight: 36, py: 0.5 }} />
          <Tab label={t('contentStudio.analyse.perItem', 'Per Item')} sx={{ minHeight: 36, py: 0.5 }} />
          <Tab label={t('contentStudio.analyse.platformCompare', 'Platformen')} sx={{ minHeight: 36, py: 0.5 }} />
        </Tabs>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={days} onChange={e => setDays(e.target.value)}>
            <MenuItem value={7}>7 {t('contentStudio.analyse.days', 'dagen')}</MenuItem>
            <MenuItem value={30}>30 {t('contentStudio.analyse.days', 'dagen')}</MenuItem>
            <MenuItem value={90}>90 {t('contentStudio.analyse.days', 'dagen')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* KPI Cards (always visible) */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {kpis.map(kpi => (
              <Grid item xs={6} md={3} key={kpi.key}>
                <Card variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ bgcolor: kpi.color + '20', borderRadius: 1, p: 1, display: 'flex' }}>
                      <kpi.icon sx={{ color: kpi.color }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h5" fontWeight={600}>{kpi.value.toLocaleString('nl-NL')}</Typography>
                        <GrowthChip value={kpi.growth} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* === Sub-tab: Overview === */}
          {subTab === 0 && (
            <>
              {/* Time-series chart */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  {t('contentStudio.analyse.overTime', 'Prestaties over tijd')}
                </Typography>
                {timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={d => d?.substring(5, 10)} />
                      <YAxis />
                      <RTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="views" name={t('contentStudio.analyse.views', 'Weergaven')} stroke="#2196f3" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="clicks" name={t('contentStudio.analyse.clicks', 'Klikken')} stroke="#ff9800" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="engagement" name={t('contentStudio.analyse.engagement', 'Engagement')} stroke="#4caf50" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    {t('contentStudio.analyse.noData', 'Nog geen analytics data beschikbaar.')}
                  </Typography>
                )}
              </Paper>

              {/* Platform breakdown + Content type analysis */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={7}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      {t('contentStudio.analyse.byPlatform', 'Per platform')}
                    </Typography>
                    {byPlatform.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={byPlatform}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="platform" />
                          <YAxis />
                          <RTooltip />
                          <Legend />
                          <Bar dataKey="total_views" name={t('contentStudio.analyse.views', 'Weergaven')} fill="#2196f3" />
                          <Bar dataKey="total_clicks" name={t('contentStudio.analyse.clicks', 'Klikken')} fill="#ff9800" />
                          <Bar dataKey="total_engagement" name="Engagement" fill="#4caf50" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        {t('contentStudio.analyse.noData', 'Nog geen analytics data beschikbaar.')}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      {t('contentStudio.analyse.byType', 'Per content type')}
                    </Typography>
                    {typePieData.length > 0 && typePieData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={typePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                            {typePieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <RTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
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
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* Top performing content */}
              <Paper variant="outlined">
                <Box sx={{ p: 2, pb: 1 }}>
                  <Typography variant="subtitle2">
                    {t('contentStudio.analyse.topContent', 'Best presterende content')}
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('contentStudio.analyse.title', 'Titel')}</TableCell>
                        <TableCell>{t('contentStudio.analyse.type', 'Type')}</TableCell>
                        <TableCell>{t('contentStudio.analyse.platform', 'Platform')}</TableCell>
                        <TableCell align="right">{t('contentStudio.analyse.views', 'Weergaven')}</TableCell>
                        <TableCell align="right">{t('contentStudio.analyse.engagement', 'Engagement')}</TableCell>
                        <TableCell align="right">{t('contentStudio.analyse.reach', 'Bereik')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topContent.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                              {t('contentStudio.analyse.noData', 'Nog geen analytics data beschikbaar.')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : topContent.map((item, i) => {
                        const Icon = PLATFORM_ICONS[item.platform] || LanguageIcon;
                        return (
                          <TableRow key={`${item.id}-${item.platform}-${i}`}>
                            <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{item.title}</Typography></TableCell>
                            <TableCell><Chip label={item.content_type} size="small" sx={{ bgcolor: TYPE_COLORS[item.content_type] + '20', color: TYPE_COLORS[item.content_type] }} /></TableCell>
                            <TableCell><Chip icon={<Icon sx={{ fontSize: 14 }} />} label={item.platform} size="small" variant="outlined" sx={{ borderColor: PLATFORM_COLORS[item.platform] }} /></TableCell>
                            <TableCell align="right">{Number(item.views || 0).toLocaleString('nl-NL')}</TableCell>
                            <TableCell align="right">{Number(item.engagement || 0).toLocaleString('nl-NL')}</TableCell>
                            <TableCell align="right">{Number(item.reach || 0).toLocaleString('nl-NL')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}

          {/* === Sub-tab: Per Item === */}
          {subTab === 1 && (
            <Paper variant="outlined">
              <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  {t('contentStudio.analyse.allItems', 'Alle content items')}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select value={sortBy} onChange={e => { setSortBy(e.target.value); setItemsPage(0); }}>
                    <MenuItem value="engagement">Engagement</MenuItem>
                    <MenuItem value="views">{t('contentStudio.analyse.views', 'Weergaven')}</MenuItem>
                    <MenuItem value="clicks">{t('contentStudio.analyse.clicks', 'Klikken')}</MenuItem>
                    <MenuItem value="reach">{t('contentStudio.analyse.reach', 'Bereik')}</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select value={typeFilter} displayEmpty onChange={e => { setTypeFilter(e.target.value); setItemsPage(0); }}>
                    <MenuItem value="">{t('contentStudio.analyse.allTypes', 'Alle types')}</MenuItem>
                    <MenuItem value="blog">Blog</MenuItem>
                    <MenuItem value="social_post">Social Post</MenuItem>
                    <MenuItem value="video_script">Video Script</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('contentStudio.analyse.title', 'Titel')}</TableCell>
                      <TableCell>{t('contentStudio.analyse.type', 'Type')}</TableCell>
                      <TableCell>{t('contentStudio.analyse.status', 'Status')}</TableCell>
                      <TableCell align="right">{t('contentStudio.analyse.views', 'Weergaven')}</TableCell>
                      <TableCell align="right">{t('contentStudio.analyse.clicks', 'Klikken')}</TableCell>
                      <TableCell align="right">{t('contentStudio.analyse.engagement', 'Engagement')}</TableCell>
                      <TableCell align="right">{t('contentStudio.analyse.reach', 'Bereik')}</TableCell>
                      <TableCell align="right">{t('contentStudio.analyse.daysTracked', 'Dagen')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyticsItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            {t('contentStudio.analyse.noData', 'Nog geen analytics data beschikbaar.')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : analyticsItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{item.title}</Typography></TableCell>
                        <TableCell><Chip label={item.content_type} size="small" sx={{ bgcolor: (TYPE_COLORS[item.content_type] || '#999') + '20', color: TYPE_COLORS[item.content_type] || '#999' }} /></TableCell>
                        <TableCell>
                          <Chip label={item.approval_status} size="small"
                            color={item.approval_status === 'published' ? 'success' : item.approval_status === 'approved' ? 'primary' : 'default'}
                            variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{item.views.toLocaleString('nl-NL')}</TableCell>
                        <TableCell align="right">{item.clicks.toLocaleString('nl-NL')}</TableCell>
                        <TableCell align="right">{item.engagement.toLocaleString('nl-NL')}</TableCell>
                        <TableCell align="right">{item.reach.toLocaleString('nl-NL')}</TableCell>
                        <TableCell align="right">{item.days_tracked || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={itemsTotal}
                page={itemsPage}
                onPageChange={(_, p) => setItemsPage(p)}
                rowsPerPage={10}
                rowsPerPageOptions={[10]}
                labelRowsPerPage=""
              />
            </Paper>
          )}

          {/* === Sub-tab: Platform Comparison === */}
          {subTab === 2 && (
            <>
              <Paper variant="outlined" sx={{ mb: 3 }}>
                <Box sx={{ p: 2, pb: 1 }}>
                  <Typography variant="subtitle2">
                    {t('contentStudio.analyse.platformStats', 'Platform statistieken')}
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('contentStudio.analyse.platform', 'Platform')}</TableCell>
                        <TableCell align="right">{t('contentStudio.analyse.views', 'Weergaven')}</TableCell>
                        <TableCell align="right">{t('contentStudio.analyse.clicks', 'Klikken')}</TableCell>
                        <TableCell align="right">{t('contentStudio.analyse.engagement', 'Engagement')}</TableCell>
                        <TableCell align="right">{t('contentStudio.analyse.reach', 'Bereik')}</TableCell>
                        <TableCell align="right">CTR</TableCell>
                        <TableCell align="right">{t('contentStudio.analyse.engagementRate', 'Eng. Rate')}</TableCell>
                        <TableCell align="right">{t('contentStudio.analyse.itemsCount', 'Items')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {platforms.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                              {t('contentStudio.analyse.noData', 'Nog geen analytics data beschikbaar.')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : platforms.map(p => {
                        const Icon = PLATFORM_ICONS[p.platform] || LanguageIcon;
                        return (
                          <TableRow key={p.platform}>
                            <TableCell>
                              <Chip icon={<Icon sx={{ fontSize: 14 }} />} label={p.platform} size="small" variant="outlined"
                                sx={{ borderColor: PLATFORM_COLORS[p.platform], fontWeight: 600 }} />
                            </TableCell>
                            <TableCell align="right">{p.total_views.toLocaleString('nl-NL')}</TableCell>
                            <TableCell align="right">{p.total_clicks.toLocaleString('nl-NL')}</TableCell>
                            <TableCell align="right">{p.total_engagement.toLocaleString('nl-NL')}</TableCell>
                            <TableCell align="right">{p.total_reach.toLocaleString('nl-NL')}</TableCell>
                            <TableCell align="right">{p.ctr}%</TableCell>
                            <TableCell align="right">{p.engagement_rate}%</TableCell>
                            <TableCell align="right">{p.items_count}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Platform comparison bar chart — CTR + Engagement Rate */}
              {platforms.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    {t('contentStudio.analyse.rateComparison', 'CTR & Engagement Rate vergelijking')}
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={platforms}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" />
                      <YAxis unit="%" />
                      <RTooltip formatter={v => `${v}%`} />
                      <Legend />
                      <Bar dataKey="ctr" name="CTR" fill="#2196f3" />
                      <Bar dataKey="engagement_rate" name={t('contentStudio.analyse.engagementRate', 'Eng. Rate')} fill="#4caf50" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}
