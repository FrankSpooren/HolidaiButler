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
  TableSortLabel,
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
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  Stack,
  Divider,
  Rating,
  useTheme,
  useMediaQuery
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
  Refresh as RefreshIcon,
  Restaurant as RestaurantIcon,
  TableRestaurant as TableIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  BookOnline as BookingIcon,
  Store as StoreIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { reservationAPI, restaurantAPI } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useLanguage();

  // Main view: 0 = Reservations, 1 = Restaurants
  const [mainView, setMainView] = useState(0);

  // Reservation state
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

  // Restaurant state
  const [restaurantPage, setRestaurantPage] = useState(0);
  const [restaurantRowsPerPage, setRestaurantRowsPerPage] = useState(10);
  const [restaurantTotalCount, setRestaurantTotalCount] = useState(0);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [restaurantAnchorEl, setRestaurantAnchorEl] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restaurantLoading, setRestaurantLoading] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (mainView === 0) {
      fetchReservations();
    }
  }, [page, rowsPerPage, searchQuery, statusFilter, restaurantFilter, dateFilter, mainView]);

  useEffect(() => {
    if (mainView === 1) {
      fetchRestaurantList();
    }
  }, [restaurantPage, restaurantRowsPerPage, restaurantSearch, mainView, sortBy, sortDirection]);

  const fetchRestaurants = async () => {
    try {
      const response = await restaurantAPI.getAll({ limit: 100 });
      setRestaurants(response.data?.restaurants || response.restaurants || []);
    } catch (err) {
      console.error('Failed to load restaurants', err);
    }
  };

  const fetchRestaurantList = async () => {
    try {
      setRestaurantLoading(true);
      const response = await restaurantAPI.getAll({
        page: restaurantPage + 1,
        limit: restaurantRowsPerPage,
        search: restaurantSearch || undefined
      });
      setRestaurants(response.data?.restaurants || response.restaurants || []);
      setRestaurantTotalCount(response.data?.total || response.total || 0);
    } catch (err) {
      setError('Failed to load restaurants');
      console.error(err);
    } finally {
      setRestaurantLoading(false);
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
      setReservations(response.data?.reservations || response.reservations || []);
      setTotalCount(response.data?.total || response.total || 0);

      if (response.data?.stats || response.stats) {
        setStats(response.data?.stats || response.stats);
      }
    } catch (err) {
      setError('Failed to load reservations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reservation handlers
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
      await reservationAPI.updateStatus(selectedReservation.id || selectedReservation._id, newStatus);
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

  // Restaurant handlers
  const handleRestaurantMenuOpen = (event, restaurant) => {
    setRestaurantAnchorEl(event.currentTarget);
    setSelectedRestaurant(restaurant);
  };

  const handleRestaurantMenuClose = () => {
    setRestaurantAnchorEl(null);
    setSelectedRestaurant(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleRestaurantMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRestaurant) return;

    try {
      await restaurantAPI.delete(selectedRestaurant.id);
      toast.success('Restaurant deleted successfully');
      fetchRestaurantList();
      setDeleteDialogOpen(false);
      setSelectedRestaurant(null);
    } catch (err) {
      toast.error('Failed to delete restaurant');
    }
  };

  const handleSort = (columnId) => {
    const newDirection = sortBy === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(columnId);
    setSortDirection(newDirection);
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

  // Sort restaurants
  const sortedRestaurants = [...restaurants].sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  // Mobile card view for reservations
  const ReservationMobileCard = ({ reservation }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {reservation.guest?.first_name} {reservation.guest?.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reservation.restaurant?.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={STATUS_LABELS[reservation.status]}
              color={STATUS_COLORS[reservation.status]}
              size="small"
            />
            <IconButton size="small" onClick={(e) => handleMenuOpen(e, reservation)}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Typography variant="body2">
            <strong>Date:</strong> {formatDate(reservation.reservation_date)}
          </Typography>
          <Typography variant="body2">
            <strong>Time:</strong> {formatTime(reservation.reservation_time)}
          </Typography>
          <Typography variant="body2">
            <strong>Party:</strong> {reservation.party_size}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );

  // Mobile card view for restaurants
  const RestaurantMobileCard = ({ restaurant }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {restaurant.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {restaurant.city}, {restaurant.country}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={restaurant.is_active ? 'Active' : 'Inactive'}
              color={restaurant.is_active ? 'success' : 'default'}
              size="small"
            />
            <IconButton size="small" onClick={(e) => handleRestaurantMenuOpen(e, restaurant)}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Typography variant="body2">
            <strong>Cuisine:</strong> {restaurant.cuisine_type || '-'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TableIcon fontSize="small" />
            <Typography variant="body2">{restaurant.table_count || 0} tables</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {mainView === 0 ? (t?.nav?.reservations || 'Reservations') : (t?.nav?.restaurants || 'Restaurants')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mainView === 0
              ? 'Manage restaurant reservations and bookings'
              : 'Manage restaurants and their settings'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={mainView === 0 ? fetchReservations : fetchRestaurantList}
          >
            {t?.actions?.refresh || 'Refresh'}
          </Button>
          {mainView === 0 ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/reservations/bookings/create')}
            >
              New Reservation
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/reservations/restaurants/create')}
            >
              Add Restaurant
            </Button>
          )}
        </Box>
      </Box>

      {/* Main View Toggle */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={mainView}
          onChange={(e, v) => setMainView(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<BookingIcon />}
            iconPosition="start"
            label={t?.nav?.reservations || 'Reservations'}
          />
          <Tab
            icon={<StoreIcon />}
            iconPosition="start"
            label={t?.nav?.restaurants || 'Restaurants'}
          />
        </Tabs>
      </Paper>

      {/* Reservations View */}
      {mainView === 0 && (
        <>
          {/* Status Tabs */}
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

          {/* Filters */}
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
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
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

          {/* Reservations Table/Cards */}
          {isMobile ? (
            <Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : reservations.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <BookingIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    No reservations found for the selected criteria.
                  </Typography>
                </Paper>
              ) : (
                <>
                  {reservations.map((reservation) => (
                    <ReservationMobileCard key={reservation.id || reservation._id} reservation={reservation} />
                  ))}
                  <Paper>
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
                      rowsPerPageOptions={[10, 25, 50]}
                    />
                  </Paper>
                </>
              )}
            </Box>
          ) : (
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
                          <TableRow key={reservation.id || reservation._id} hover>
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
          )}
        </>
      )}

      {/* Restaurants View */}
      {mainView === 1 && (
        <>
          {/* Search */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search restaurants..."
              value={restaurantSearch}
              onChange={(e) => setRestaurantSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              size="small"
            />
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Restaurants Table/Cards */}
          {isMobile ? (
            <Box>
              {restaurantLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : sortedRestaurants.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <StoreIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    No restaurants found. Add your first restaurant to get started.
                  </Typography>
                </Paper>
              ) : (
                <>
                  {sortedRestaurants.map((restaurant) => (
                    <RestaurantMobileCard key={restaurant.id} restaurant={restaurant} />
                  ))}
                  <Paper>
                    <TablePagination
                      component="div"
                      count={restaurantTotalCount}
                      page={restaurantPage}
                      onPageChange={(e, p) => setRestaurantPage(p)}
                      rowsPerPage={restaurantRowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setRestaurantRowsPerPage(parseInt(e.target.value, 10));
                        setRestaurantPage(0);
                      }}
                      rowsPerPageOptions={[10, 25, 50]}
                    />
                  </Paper>
                </>
              )}
            </Box>
          ) : (
            <TableContainer component={Paper}>
              {restaurantLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'name'}
                            direction={sortBy === 'name' ? sortDirection : 'asc'}
                            onClick={() => handleSort('name')}
                          >
                            Name
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'city'}
                            direction={sortBy === 'city' ? sortDirection : 'asc'}
                            onClick={() => handleSort('city')}
                          >
                            Location
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'cuisine_type'}
                            direction={sortBy === 'cuisine_type' ? sortDirection : 'asc'}
                            onClick={() => handleSort('cuisine_type')}
                          >
                            Cuisine
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>Tables</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedRestaurants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography color="text.secondary" sx={{ py: 4 }}>
                              No restaurants found. Add your first restaurant to get started.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedRestaurants.map((restaurant) => (
                          <TableRow key={restaurant.id} hover>
                            <TableCell>
                              <Typography fontWeight="medium">{restaurant.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {restaurant.email}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {restaurant.city}, {restaurant.country}
                            </TableCell>
                            <TableCell>{restaurant.cuisine_type || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                icon={<TableIcon />}
                                label={restaurant.table_count || 0}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={restaurant.is_active ? 'Active' : 'Inactive'}
                                color={restaurant.is_active ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={(e) => handleRestaurantMenuOpen(e, restaurant)}
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
                    count={restaurantTotalCount}
                    page={restaurantPage}
                    onPageChange={(e, p) => setRestaurantPage(p)}
                    rowsPerPage={restaurantRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRestaurantRowsPerPage(parseInt(e.target.value, 10));
                      setRestaurantPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                  />
                </>
              )}
            </TableContainer>
          )}
        </>
      )}

      {/* Reservation Context Menu */}
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

      {/* Restaurant Context Menu */}
      <Menu
        anchorEl={restaurantAnchorEl}
        open={Boolean(restaurantAnchorEl)}
        onClose={handleRestaurantMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/reservations/restaurants/${selectedRestaurant?.id}`);
          handleRestaurantMenuClose();
        }}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/reservations/restaurants/edit/${selectedRestaurant?.id}`);
          handleRestaurantMenuClose();
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/reservations/restaurants/${selectedRestaurant?.id}/tables`);
          handleRestaurantMenuClose();
        }}>
          <TableIcon fontSize="small" sx={{ mr: 1 }} />
          Manage Tables
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Restaurant</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedRestaurant?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
