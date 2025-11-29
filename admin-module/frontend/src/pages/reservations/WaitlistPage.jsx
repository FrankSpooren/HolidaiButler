import { useState, useEffect } from 'react';
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
  IconButton,
  Chip,
  TextField,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Notifications as NotifyIcon,
  SwapVert as ConvertIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { waitlistAPI, restaurantAPI } from '../../services/api';

export default function WaitlistPage() {
  const [waitlist, setWaitlist] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [addDialog, setAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    party_size: 2,
    notes: ''
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchWaitlist();
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const response = await restaurantAPI.getAll({ limit: 100 });
      const list = response.data?.restaurants || [];
      setRestaurants(list);
      if (list.length > 0) {
        setSelectedRestaurant(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load restaurants', err);
    }
  };

  const fetchWaitlist = async () => {
    if (!selectedRestaurant) return;

    try {
      setLoading(true);
      const response = await waitlistAPI.getAll(selectedRestaurant, { status: 'waiting' });
      setWaitlist(response.data?.waitlist || []);
    } catch (err) {
      setError('Failed to load waitlist');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWaitlist = async () => {
    try {
      await waitlistAPI.add(selectedRestaurant, newEntry);
      toast.success('Added to waitlist');
      setAddDialog(false);
      setNewEntry({
        guest_name: '',
        guest_phone: '',
        guest_email: '',
        party_size: 2,
        notes: ''
      });
      fetchWaitlist();
    } catch (err) {
      toast.error('Failed to add to waitlist');
    }
  };

  const handleNotify = async (id) => {
    try {
      await waitlistAPI.notify(selectedRestaurant, id);
      toast.success('Guest notified');
      fetchWaitlist();
    } catch (err) {
      toast.error('Failed to notify guest');
    }
  };

  const handleRemove = async (id) => {
    try {
      await waitlistAPI.remove(selectedRestaurant, id);
      toast.success('Removed from waitlist');
      fetchWaitlist();
    } catch (err) {
      toast.error('Failed to remove from waitlist');
    }
  };

  const handleConvert = async (id) => {
    try {
      await waitlistAPI.convertToReservation(selectedRestaurant, id, {
        reservation_date: new Date().toISOString().split('T')[0],
        reservation_time: new Date().toTimeString().split(' ')[0].substring(0, 5)
      });
      toast.success('Converted to reservation');
      fetchWaitlist();
    } catch (err) {
      toast.error('Failed to convert to reservation');
    }
  };

  const getWaitTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins}m`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'warning';
      case 'notified': return 'info';
      case 'seated': return 'success';
      case 'cancelled': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Waitlist Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchWaitlist}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialog(true)}
            disabled={!selectedRestaurant}
          >
            Add to Waitlist
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Restaurant</InputLabel>
              <Select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                label="Restaurant"
              >
                {restaurants.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip
                icon={<TimeIcon />}
                label={`${waitlist.length} waiting`}
                color="warning"
                variant="outlined"
              />
              <Chip
                label={`Avg wait: ${waitlist.length > 0 ? '~15 min' : '-'}`}
                variant="outlined"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!selectedRestaurant ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Please select a restaurant to view the waitlist.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Position</TableCell>
                  <TableCell>Guest</TableCell>
                  <TableCell>Party Size</TableCell>
                  <TableCell>Wait Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {waitlist.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No one is currently on the waitlist.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  waitlist.map((entry, index) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>
                        <Badge badgeContent={index + 1} color="primary">
                          <Box sx={{ width: 24 }} />
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {entry.guest_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.guest_phone}
                        </Typography>
                      </TableCell>
                      <TableCell>{entry.party_size} guests</TableCell>
                      <TableCell>
                        <Chip
                          icon={<TimeIcon />}
                          label={getWaitTime(entry.created_at)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.status}
                          size="small"
                          color={getStatusColor(entry.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                          {entry.notes || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleNotify(entry.id)}
                          title="Notify Guest"
                          color="primary"
                        >
                          <NotifyIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleConvert(entry.id)}
                          title="Convert to Reservation"
                          color="success"
                        >
                          <ConvertIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRemove(entry.id)}
                          title="Remove"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      )}

      {/* Add to Waitlist Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add to Waitlist</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Guest Name"
                value={newEntry.guest_name}
                onChange={(e) => setNewEntry({ ...newEntry, guest_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newEntry.guest_phone}
                onChange={(e) => setNewEntry({ ...newEntry, guest_phone: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newEntry.guest_email}
                onChange={(e) => setNewEntry({ ...newEntry, guest_email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Party Size"
                type="number"
                value={newEntry.party_size}
                onChange={(e) => setNewEntry({ ...newEntry, party_size: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddToWaitlist}
            disabled={!newEntry.guest_name || !newEntry.guest_phone}
          >
            Add to Waitlist
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
