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
  Avatar,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  EventNote as ReservationIcon,
  Star as VIPIcon,
  Note as NoteIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { guestAPI } from '../../services/api';

const GUEST_TAGS = {
  vip: { label: 'VIP', color: 'warning' },
  regular: { label: 'Regular', color: 'primary' },
  new: { label: 'New', color: 'info' },
  blacklisted: { label: 'Blacklisted', color: 'error' },
  special_occasion: { label: 'Special Occasion', color: 'secondary' }
};

export default function GuestList() {
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [guestHistory, setGuestHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, [page, rowsPerPage, searchQuery]);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const response = await guestAPI.getAll({
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery || undefined
      });
      setGuests(response.data?.guests || []);
      setTotalCount(response.data?.total || 0);
    } catch (err) {
      setError('Failed to load guests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, guest) => {
    setAnchorEl(event.currentTarget);
    setSelectedGuest(guest);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = async () => {
    if (!selectedGuest) return;

    setDetailDialog(true);
    setHistoryLoading(true);
    handleMenuClose();

    try {
      const response = await guestAPI.getHistory(selectedGuest.id);
      setGuestHistory(response.data?.reservations || []);
    } catch (err) {
      toast.error('Failed to load guest history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGuest) return;

    try {
      await guestAPI.delete(selectedGuest.id);
      toast.success('Guest deleted successfully');
      fetchGuests();
    } catch (err) {
      toast.error('Failed to delete guest');
    }
    handleMenuClose();
  };

  const handleToggleVIP = async () => {
    if (!selectedGuest) return;

    try {
      const currentTags = selectedGuest.tags || [];
      const isVIP = currentTags.includes('vip');
      const newTags = isVIP
        ? currentTags.filter(t => t !== 'vip')
        : [...currentTags, 'vip'];

      await guestAPI.updateTags(selectedGuest.id, newTags);
      toast.success(isVIP ? 'VIP status removed' : 'Guest marked as VIP');
      fetchGuests();
    } catch (err) {
      toast.error('Failed to update guest');
    }
    handleMenuClose();
  };

  const getInitials = (guest) => {
    return `${guest.first_name?.[0] || ''}${guest.last_name?.[0] || ''}`.toUpperCase();
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Guest CRM
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/reservations/guests/create')}
        >
          Add Guest
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by name, email, or phone..."
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
                  <TableCell>Guest</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Total Visits</TableCell>
                  <TableCell>No Shows</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Last Visit</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {guests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No guests found. Guests are created when making reservations.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  guests.map((guest) => (
                    <TableRow key={guest.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {getInitials(guest)}
                          </Avatar>
                          <Box>
                            <Typography fontWeight="medium">
                              {guest.first_name} {guest.last_name}
                              {guest.tags?.includes('vip') && (
                                <VIPIcon sx={{ ml: 1, fontSize: 16, color: 'warning.main' }} />
                              )}
                            </Typography>
                            {guest.preferred_language && (
                              <Typography variant="caption" color="text.secondary">
                                Language: {guest.preferred_language}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{guest.email}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {guest.phone}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={guest.total_visits || 0}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={guest.no_show_count || 0}
                          size="small"
                          color={guest.no_show_count > 2 ? 'error' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {(guest.tags || []).slice(0, 3).map((tag) => (
                            <Chip
                              key={tag}
                              label={GUEST_TAGS[tag]?.label || tag}
                              size="small"
                              color={GUEST_TAGS[tag]?.color || 'default'}
                            />
                          ))}
                          {(guest.tags?.length || 0) > 3 && (
                            <Chip
                              label={`+${guest.tags.length - 3}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{formatDate(guest.last_visit)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, guest)}
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
        <MenuItem onClick={handleViewDetails}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} />
          View History
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/reservations/guests/edit/${selectedGuest?.id}`);
          handleMenuClose();
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleToggleVIP}>
          <VIPIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
          {selectedGuest?.tags?.includes('vip') ? 'Remove VIP' : 'Mark as VIP'}
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/reservations/bookings/create?guest=${selectedGuest?.id}`);
          handleMenuClose();
        }}>
          <ReservationIcon fontSize="small" sx={{ mr: 1 }} />
          New Reservation
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Guest Detail Dialog */}
      <Dialog
        open={detailDialog}
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Guest History: {selectedGuest?.first_name} {selectedGuest?.last_name}
        </DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : guestHistory.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No reservation history found.
            </Typography>
          ) : (
            <List>
              {guestHistory.map((reservation, index) => (
                <Box key={reservation.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight="medium">
                            {reservation.restaurant?.name}
                          </Typography>
                          <Chip
                            label={reservation.status}
                            size="small"
                            color={
                              reservation.status === 'completed' ? 'success' :
                              reservation.status === 'cancelled' ? 'error' :
                              reservation.status === 'no_show' ? 'error' : 'default'
                            }
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          {formatDate(reservation.reservation_date)} at {reservation.reservation_time?.substring(0, 5)}
                          {' - '}{reservation.party_size} guests
                          {reservation.special_requests && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              Notes: {reservation.special_requests}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              navigate(`/reservations/bookings/create?guest=${selectedGuest?.id}`);
              setDetailDialog(false);
            }}
          >
            New Reservation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
