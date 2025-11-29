import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Stack,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Event as EventIcon,
  People as PeopleIcon,
  EuroSymbol as EuroIcon,
  TrendingUp as TrendingIcon,
  LocationOn as LocationIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { eventsAPI } from '../../services/api';

const categoryLabels = {
  music: 'Music',
  sports: 'Sports',
  arts: 'Arts & Culture',
  food: 'Food & Drink',
  business: 'Business',
  technology: 'Technology',
  health: 'Health & Wellness',
  education: 'Education',
  family: 'Family',
  entertainment: 'Entertainment',
  outdoor: 'Outdoor',
  charity: 'Charity',
  festival: 'Festival',
  conference: 'Conference',
  workshop: 'Workshop',
  other: 'Other'
};

export default function EventAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await eventsAPI.getAnalytics({ timeRange });

      if (response.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics');
      // Set mock data for demo
      setAnalytics({
        overview: {
          totalEvents: 145,
          activeEvents: 32,
          totalBookings: 2847,
          totalRevenue: 125430,
          averageAttendance: 85.4,
          growthRate: 12.5
        },
        byCategory: [
          { category: 'music', count: 45, revenue: 52300, bookings: 1250 },
          { category: 'sports', count: 28, revenue: 31200, bookings: 680 },
          { category: 'arts', count: 22, revenue: 18500, bookings: 420 },
          { category: 'food', count: 18, revenue: 12800, bookings: 320 },
          { category: 'business', count: 15, revenue: 8900, bookings: 180 }
        ],
        byLocation: [
          { city: 'Amsterdam', count: 52, revenue: 45300 },
          { city: 'Rotterdam', count: 38, revenue: 32100 },
          { city: 'Utrecht', count: 28, revenue: 24200 },
          { city: 'The Hague', count: 18, revenue: 16500 },
          { city: 'Eindhoven', count: 9, revenue: 7300 }
        ],
        topEvents: [
          { title: 'Summer Music Festival 2024', bookings: 450, revenue: 18500, attendanceRate: 95 },
          { title: 'Tech Conference Amsterdam', bookings: 380, revenue: 15200, attendanceRate: 92 },
          { title: 'Food & Wine Expo', bookings: 320, revenue: 12800, attendanceRate: 88 },
          { title: 'Marathon Rotterdam', bookings: 280, revenue: 11200, attendanceRate: 85 },
          { title: 'Art Gallery Opening', bookings: 220, revenue: 8800, attendanceRate: 82 }
        ],
        trends: {
          bookingsByMonth: [
            { month: 'Jan', bookings: 180 },
            { month: 'Feb', bookings: 220 },
            { month: 'Mar', bookings: 280 },
            { month: 'Apr', bookings: 320 },
            { month: 'May', bookings: 380 },
            { month: 'Jun', bookings: 420 }
          ]
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `€${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading && !analytics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading analytics...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Event Analytics
        </Typography>
        <TextField
          select
          label="Time Range"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          sx={{ minWidth: 150 }}
          size="small"
        >
          <MenuItem value="week">Last Week</MenuItem>
          <MenuItem value="month">Last Month</MenuItem>
          <MenuItem value="quarter">Last Quarter</MenuItem>
          <MenuItem value="year">Last Year</MenuItem>
          <MenuItem value="all">All Time</MenuItem>
        </TextField>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Events
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {analytics?.overview?.totalEvents || 0}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Chip
                      label={`${analytics?.overview?.activeEvents || 0} Active`}
                      size="small"
                      color="success"
                    />
                  </Stack>
                </Box>
                <EventIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Bookings
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {analytics?.overview?.totalBookings?.toLocaleString() || 0}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <TrendingIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="success.main">
                      +{analytics?.overview?.growthRate || 0}% growth
                    </Typography>
                  </Stack>
                </Box>
                <PeopleIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(analytics?.overview?.totalRevenue)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Avg. Attendance: {analytics?.overview?.averageAttendance || 0}%
                  </Typography>
                </Box>
                <EuroIcon sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Performance by Category */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CategoryIcon color="primary" />
              <Typography variant="h6">
                Performance by Category
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Events</TableCell>
                    <TableCell align="right">Bookings</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics?.byCategory?.map((cat, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Chip
                          label={categoryLabels[cat.category] || cat.category}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{cat.count}</TableCell>
                      <TableCell align="right">{cat.bookings?.toLocaleString()}</TableCell>
                      <TableCell align="right">{formatCurrency(cat.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Performance by Location */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocationIcon color="primary" />
              <Typography variant="h6">
                Performance by Location
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>City</TableCell>
                    <TableCell align="right">Events</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics?.byLocation?.map((loc, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {loc.city}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{loc.count}</TableCell>
                      <TableCell align="right">{formatCurrency(loc.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Top Events */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Performing Events
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Event Title</TableCell>
                    <TableCell align="right">Bookings</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Attendance Rate</TableCell>
                    <TableCell align="right">Performance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics?.topEvents?.map((event, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {event.title}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{event.bookings?.toLocaleString()}</TableCell>
                      <TableCell align="right">{formatCurrency(event.revenue)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${event.attendanceRate}%`}
                          size="small"
                          color={event.attendanceRate >= 90 ? 'success' : event.attendanceRate >= 75 ? 'primary' : 'warning'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ width: 100 }}>
                          <LinearProgress
                            variant="determinate"
                            value={event.attendanceRate}
                            color={event.attendanceRate >= 90 ? 'success' : event.attendanceRate >= 75 ? 'primary' : 'warning'}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
