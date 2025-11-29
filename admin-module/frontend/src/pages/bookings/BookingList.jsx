import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Chip,
  Typography,
  InputAdornment,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Alert,
  Stack,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Check as ConfirmIcon,
  Cancel as CancelIcon,
  Send as ResendIcon,
  CheckCircle as CompleteIcon
} from '@mui/icons-material';
import { bookingsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'error',
  refunded: 'default',
  no_show: 'warning',
  expired: 'default'
};

const typeLabels = {
  event_ticket: 'Event Ticket',
  attraction_ticket: 'Attraction',
  tour: 'Tour',
  reservation: 'Reservation',
  package: 'Package'
};

export default function BookingList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [tabValue, setTabValue] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const canEdit = hasPermission('bookings.edit');
  const canCreate = hasPermission('bookings.create');

  useEffect(() => {
    fetchBookings();
  }, [page, rowsPerPage, search, statusFilter, typeFilter, paymentStatusFilter, tabValue]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (tabValue === 0) {
        response = await bookingsAPI.getToday({ type: typeFilter });
      } else {
        const params = {
          page: page + 1,
          limit: rowsPerPage,
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter }),
          ...(typeFilter && { type: typeFilter }),
          ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter })
        };
        response = await bookingsAPI.getAll(params);
      }

      if (response.success) {
        if (tabValue === 0) {
          setBookings(response.data.bookings);
          setTotal(response.data.bookings.length);
        } else {
          setBookings(response.data.bookings);
          setTotal(response.data.pagination.total);
        }
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (booking) => {
    try {
      const response = await bookingsAPI.confirm(booking._id, booking.payment?.transactionId);

      if (response.success) {
        setSuccess('Booking confirmed successfully');
        fetchBookings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm booking');
    }
  };

  const handleCompleteBooking = async (booking) => {
    try {
      const response = await bookingsAPI.complete(booking._id);

      if (response.success) {
        setSuccess('Booking completed successfully');
        fetchBookings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete booking');
    }
  };

  const handleCancelBooking = async (booking) => {
    try {
      const response = await bookingsAPI.cancel(
        booking._id,
        'Cancelled by admin',
        'admin',
        0
      );

      if (response.success) {
        setSuccess('Booking cancelled successfully');
        fetchBookings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const handleResendConfirmation = async (booking) => {
    try {
      const response = await bookingsAPI.resendConfirmation(booking._id);

      if (response.success) {
        setSuccess('Confirmation resent successfully');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend confirmation');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `€${amount.toFixed(2)}`;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Bookings
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            New Booking
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Today" />
          <Tab label="All Bookings" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            placeholder="Search by booking #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
          <TextField
            select
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Types</MenuItem>
            {Object.entries(typeLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
          <TextField
            select
            label="Payment"
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Booking #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Visit Date</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    No bookings found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {booking.bookingNumber}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {booking.confirmationCode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">
                        {booking.customer?.firstName} {booking.customer?.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {booking.customer?.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={typeLabels[booking.type] || booking.type}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{booking.items?.length || 0} item(s)</TableCell>
                  <TableCell>
                    {booking.visitDetails?.date
                      ? formatDate(booking.visitDetails.date)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(booking.pricing?.total || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.payment?.status || 'pending'}
                      size="small"
                      color={
                        booking.payment?.status === 'completed'
                          ? 'success'
                          : booking.payment?.status === 'failed'
                            ? 'error'
                            : 'warning'
                      }
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.status}
                      size="small"
                      color={statusColors[booking.status]}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Actions">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedBooking(booking);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {tabValue === 1 && (
          <TablePagination
            rowsPerPageOptions={[10, 20, 50]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        )}
      </TableContainer>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          navigate(`/bookings/${selectedBooking?._id}`);
          setAnchorEl(null);
        }}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>

        {canEdit && selectedBooking?.status === 'pending' && (
          <MenuItem
            onClick={() => {
              handleConfirmBooking(selectedBooking);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <ConfirmIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Confirm</ListItemText>
          </MenuItem>
        )}

        {canEdit && selectedBooking?.status === 'confirmed' && (
          <MenuItem
            onClick={() => {
              handleCompleteBooking(selectedBooking);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <CompleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mark as Completed</ListItemText>
          </MenuItem>
        )}

        {canEdit && selectedBooking?.status === 'confirmed' && (
          <MenuItem
            onClick={() => {
              handleResendConfirmation(selectedBooking);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <ResendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Resend Confirmation</ListItemText>
          </MenuItem>
        )}

        {canEdit && !['completed', 'cancelled'].includes(selectedBooking?.status) && (
          <MenuItem
            onClick={() => {
              handleCancelBooking(selectedBooking);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <CancelIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Cancel</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
