import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as ConfirmIcon,
  Cancel as CancelIcon,
  EventSeat as SeatIcon,
  Done as CompleteIcon,
  DoNotDisturb as NoShowIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { reservationAPI, restaurantAPI } from '../../services/api';

const STATUS_COLORS = {
  pending: 'warning',
  confirmed: 'info',
  seated: 'primary',
  completed: 'success',
  cancelled: 'default',
  no_show: 'error'
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  seated: 'Seated',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show'
};

export default function ReservationList() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [restaurantFilter, setRestaurantFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, seated: 0 });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [page, rowsPerPage, searchQuery, statusFilter, restaurantFilter, dateFilter]);

  const fetchRestaurants = async () => {
    try {
      const response = await restaurantAPI.getAll({ limit: 100 });
      setRestaurants(response.data?.restaurants || []);
    } catch (err) {
      console.error('Failed to load restaurants', err);
    }
  };

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        restaurant_id: restaurantFilter || undefined,
        date: dateFilter || undefined
      };

      const response = await reservationAPI.getAll(params);
      setReservations(response.data?.reservations || []);
      setTotalCount(response.data?.total || 0);

      // Update stats
      if (response.data?.stats) {
        setStats(response.data.stats);
      }
    } catch (err) {
      setError('Failed to load reservations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, reservation) => {
    setAnchorEl(event.currentTarget);
    setSelectedReservation(reservation);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReservation(null);
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedReservation) return;

    try {
      await reservationAPI.updateStatus(selectedReservation.id, newStatus);
      toast.success(`Reservation ${newStatus}`);
      fetchReservations();
    } catch (err) {
      toast.error('Failed to update reservation');
    }
    handleMenuClose();
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    const statuses = ['all', 'pending', 'confirmed', 'seated', 'completed', 'cancelled'];
    setStatusFilter(statuses[newValue]);
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Reservations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage restaurant reservations and bookings
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReservations}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/reservations/bookings/create')}
          >
            New Reservation
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="All" />
          <Tab label={<Badge badgeContent={stats.pending} color="warning">Pending</Badge>} />
          <Tab label={<Badge badgeContent={stats.confirmed} color="info">Confirmed</Badge>} />
          <Tab label={<Badge badgeContent={stats.seated} color="primary">Seated</Badge>} />
          <Tab label="Completed" />
          <Tab label="Cancelled" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder="Search by name, email, reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Restaurant</InputLabel>
              <Select
                value={restaurantFilter}
                onChange={(e) => setRestaurantFilter(e.target.value)}
                label="Restaurant"
              >
                <MenuItem value="">All Restaurants</MenuItem>
                {restaurants.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearchQuery('');
                setRestaurantFilter('');
                setDateFilter(new Date().toISOString().split('T')[0]);
                setStatusFilter('all');
                setTabValue(0);
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Guest</TableCell>
                  <TableCell>Restaurant</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Party</TableCell>
                  <TableCell>Table</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No reservations found for the selected criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reservations.map((reservation) => (
                    <TableRow key={reservation.id} hover>
                      <TableCell>
                        <Typography fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
                          {reservation.reservation_reference}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {reservation.guest?.first_name} {reservation.guest?.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {reservation.guest?.phone || reservation.guest?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>{reservation.restaurant?.name}</TableCell>
                      <TableCell>{formatDate(reservation.reservation_date)}</TableCell>
                      <TableCell>{formatTime(reservation.reservation_time)}</TableCell>
                      <TableCell>{reservation.party_size} guests</TableCell>
                      <TableCell>
                        {reservation.table?.table_number || (
                          <Chip label="Unassigned" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[reservation.status]}
                          color={STATUS_COLORS[reservation.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, reservation)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(e, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedReservation?.status === 'pending' && (
          <MenuItem onClick={() => handleStatusChange('confirmed')}>
            <ConfirmIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
            Confirm
          </MenuItem>
        )}
        {(selectedReservation?.status === 'pending' || selectedReservation?.status === 'confirmed') && (
          <MenuItem onClick={() => handleStatusChange('seated')}>
            <SeatIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
            Seat Guest
          </MenuItem>
        )}
        {selectedReservation?.status === 'seated' && (
          <MenuItem onClick={() => handleStatusChange('completed')}>
            <CompleteIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
            Complete
          </MenuItem>
        )}
        {selectedReservation?.status !== 'cancelled' && selectedReservation?.status !== 'completed' && (
          <>
            <MenuItem onClick={() => handleStatusChange('no_show')} sx={{ color: 'error.main' }}>
              <NoShowIcon fontSize="small" sx={{ mr: 1 }} />
              Mark No Show
            </MenuItem>
            <MenuItem onClick={() => handleStatusChange('cancelled')} sx={{ color: 'error.main' }}>
              <CancelIcon fontSize="small" sx={{ mr: 1 }} />
              Cancel
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
}
