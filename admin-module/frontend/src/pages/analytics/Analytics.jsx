import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  Place as PlaceIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { poiAPI, usersAPI } from '../../services/api';
import { toast } from 'react-toastify';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Stats
  const [poiStats, setPOIStats] = useState(null);
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [poiResponse, userResponse] = await Promise.all([
        poiAPI.getStats(),
        usersAPI.getStats()
      ]);

      setPOIStats(poiResponse.data);
      setUserStats(userResponse.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Stat Card Component
  const StatCard = ({ title, value, change, icon, color, trend }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`,
              color: color
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trend === 'up' ? (
                <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20 }} />
              ) : (
                <TrendingDownIcon sx={{ color: 'error.main', fontSize: 20 }} />
              )}
              <Typography variant="caption" color={trend === 'up' ? 'success.main' : 'error.main'}>
                {change}
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {value?.toLocaleString() || 0}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
        Analytics & Reports
      </Typography>

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total POIs"
            value={poiStats?.overview?.total}
            change="+12%"
            icon={<PlaceIcon sx={{ fontSize: 32 }} />}
            color="#667eea"
            trend="up"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active POIs"
            value={poiStats?.overview?.active}
            change="+8%"
            icon={<StarIcon sx={{ fontSize: 32 }} />}
            color="#4caf50"
            trend="up"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Views"
            value={poiStats?.overview?.totalViews}
            change="+24%"
            icon={<VisibilityIcon sx={{ fontSize: 32 }} />}
            color="#2196f3"
            trend="up"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={userStats?.overview?.total}
            change="+5%"
            icon={<PeopleIcon sx={{ fontSize: 32 }} />}
            color="#ff9800"
            trend="up"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="POI Analytics" />
          <Tab label="User Analytics" />
          <Tab label="Performance" />
        </Tabs>
      </Paper>

      {/* POI Analytics Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* POI by Category */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                POIs by Category
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={poiStats?.byCategory || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ _id, count }) => `${_id}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="_id"
                  >
                    {poiStats?.byCategory?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* POI Status Overview */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                POI Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Active', value: poiStats?.overview?.active || 0, fill: '#4caf50' },
                    { name: 'Pending', value: poiStats?.overview?.pending || 0, fill: '#ff9800' },
                    { name: 'Inactive', value: poiStats?.overview?.inactive || 0, fill: '#f44336' },
                    { name: 'Needs Review', value: poiStats?.overview?.needsReview || 0, fill: '#2196f3' }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Top Categories */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Top Categories
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                      <TableCell>Distribution</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {poiStats?.byCategory?.map((cat) => {
                      const percentage = ((cat.count / poiStats?.overview?.total) * 100).toFixed(1);
                      return (
                        <TableRow key={cat._id}>
                          <TableCell>
                            <Chip
                              label={cat._id || 'Uncategorized'}
                              size="small"
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold">{cat.count}</Typography>
                          </TableCell>
                          <TableCell align="right">{percentage}%</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={parseFloat(percentage)}
                                sx={{ flex: 1, height: 8, borderRadius: 4 }}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quick Statistics
              </Typography>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {poiStats?.overview?.avgRating?.toFixed(1) || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Rating
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" fontWeight="bold">
                      {poiStats?.overview?.totalBookings?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Bookings
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" fontWeight="bold">
                      {poiStats?.overview?.needsReview || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Needs Review
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main" fontWeight="bold">
                      {poiStats?.overview?.totalViews?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Views
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* User Analytics Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          {/* User by Role */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Users by Role
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={userStats?.byRole || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ _id, count }) => `${_id?.replace('_', ' ')}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="_id"
                  >
                    {userStats?.byRole?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* User Status */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                User Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Active', value: userStats?.overview?.active || 0, fill: '#4caf50' },
                    { name: 'Pending', value: userStats?.overview?.pending || 0, fill: '#ff9800' },
                    { name: 'Suspended', value: userStats?.overview?.suspended || 0, fill: '#f44336' }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Recent Logins */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent User Activity
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Last Login</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userStats?.recentLogins?.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                              {user.profile?.firstName?.[0]}{user.profile?.lastName?.[0]}
                            </Avatar>
                            <Typography>
                              {user.profile?.firstName} {user.profile?.lastName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.security?.lastLogin
                            ? new Date(user.security.lastLogin).toLocaleString()
                            : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Performance Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                System Performance Metrics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Performance monitoring and detailed analytics coming soon...
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
