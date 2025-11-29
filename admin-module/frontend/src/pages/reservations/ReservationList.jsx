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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
  EventSeat as SeatIcon,
  CheckCircle as CompleteIcon,
  Block as NoShowIcon
} from '@mui/icons-material';
import { reservationsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  seated: 'primary',
  completed: 'success',
  cancelled: 'error',
  no_show: 'default'
};

export default function ReservationList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [tabValue, setTabValue] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: null });

  const canEdit = hasPermission('reservations.edit');
  const canCreate = hasPermission('reservations.create');

  useEffect(() => {
    fetchReservations();
  }, [page, rowsPerPage, search, statusFilter, dateFilter, tabValue]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (tabValue === 0) {
        // Today's reservations
        response = await reservationsAPI.getToday({ status: statusFilter });
      } else {
        // All reservations
        const params = {
          page: page + 1,
          limit: rowsPerPage,
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter }),
          ...(dateFilter && { date: dateFilter })
        };
        response = await reservationsAPI.getAll(params);
      }

      if (response.success) {
        if (tabValue === 0) {
          setReservations(response.data.reservations);
          setTotal(response.data.reservations.length);
        } else {
          setReservations(response.data.reservations);
          setTotal(response.data.pagination.total);
        }
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setError(err.response?.data?.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type) => {
    try {
      let response;
      switch (type) {
        case 'confirm':
          response = await reservationsAPI.confirm(selectedReservation._id);
          break;
        case 'seat':
          response = await reservationsAPI.seat(selectedReservation._id, {
            tableNumber: selectedReservation.table?.number,
            seatedAt: new Date()
          });
          break;
        case 'complete':
          response = await reservationsAPI.complete(selectedReservation._id, {
            total: 0,
            tip: 0
          });
          break;
        case 'cancel':
          response = await reservationsAPI.cancel(
            selectedReservation._id,
            'Cancelled by admin',
            'admin'
          );
          break;
        case 'no_show':
          response = await reservationsAPI.noShow(selectedReservation._id, 'No show');
          break;
      }

      if (response.success) {
        fetchReservations();
        setActionDialog({ open: false, type: null });
        setSelectedReservation(null);
      }
    } catch (err) {
      console.error(`Error ${type} reservation:`, err);
      setError(err.response?.data?.message || `Failed to ${type} reservation`);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Reservations
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/reservations/new')}
          >
            New Reservation
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Today" />
          <Tab label="All Reservations" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            placeholder="Search by name, email, phone..."
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
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="seated">Seated</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
            <MenuItem value="no_show">No Show</MenuItem>
          </TextField>
          {tabValue === 1 && (
            <TextField
              type="date"
              label="Date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Reservation #</TableCell>
              <TableCell>Guest</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Party Size</TableCell>
              <TableCell>Table</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : reservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    No reservations found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              reservations.map((reservation) => (
                <TableRow key={reservation._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {reservation.reservationNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">
                        {reservation.guest?.firstName} {reservation.guest?.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {reservation.guest?.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {formatDate(reservation.date)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {reservation.time}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{reservation.partySize}</TableCell>
                  <TableCell>{reservation.table?.number || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={reservation.status.replace('_', ' ')}
                      size="small"
                      color={statusColors[reservation.status]}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Actions">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedReservation(reservation);
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
        {canEdit && selectedReservation?.status === 'pending' && (
          <MenuItem
            onClick={() => {
              setActionDialog({ open: true, type: 'confirm' });
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Confirm</ListItemText>
          </MenuItem>
        )}
        {canEdit && selectedReservation?.status === 'confirmed' && (
          <MenuItem
            onClick={() => {
              setActionDialog({ open: true, type: 'seat' });
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <SeatIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mark as Seated</ListItemText>
          </MenuItem>
        )}
        {canEdit && selectedReservation?.status === 'seated' && (
          <MenuItem
            onClick={() => {
              setActionDialog({ open: true, type: 'complete' });
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <CompleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Complete</ListItemText>
          </MenuItem>
        )}
        {canEdit && !['completed', 'cancelled', 'no_show'].includes(selectedReservation?.status) && (
          <MenuItem
            onClick={() => {
              setActionDialog({ open: true, type: 'cancel' });
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <CancelIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Cancel</ListItemText>
          </MenuItem>
        )}
        {canEdit && !['completed', 'cancelled', 'no_show'].includes(selectedReservation?.status) && (
          <MenuItem
            onClick={() => {
              setActionDialog({ open: true, type: 'no_show' });
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <NoShowIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText>Mark as No Show</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, type: null })}>
        <DialogTitle>
          {actionDialog.type === 'confirm' && 'Confirm Reservation'}
          {actionDialog.type === 'seat' && 'Mark as Seated'}
          {actionDialog.type === 'complete' && 'Complete Reservation'}
          {actionDialog.type === 'cancel' && 'Cancel Reservation'}
          {actionDialog.type === 'no_show' && 'Mark as No Show'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {actionDialog.type} this reservation?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, type: null })}>
            Cancel
          </Button>
          <Button
            onClick={() => handleAction(actionDialog.type)}
            variant="contained"
            color={actionDialog.type === 'cancel' ? 'error' : 'primary'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
