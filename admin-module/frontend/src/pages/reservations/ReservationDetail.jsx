import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  IconButton,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Check as ConfirmIcon,
  EventSeat as SeatIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  Block as NoShowIcon
} from '@mui/icons-material';
import { reservationsAPI } from '../../services/api';

export default function ReservationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: null });
  const [noteDialog, setNoteDialog] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchReservation();
  }, [id]);

  const fetchReservation = async () => {
    try {
      setLoading(true);
      const response = await reservationsAPI.getById(id);
      if (response.success) {
        setReservation(response.data.reservation);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type) => {
    try {
      let response;
      switch (type) {
        case 'confirm':
          response = await reservationsAPI.confirm(id);
          break;
        case 'seat':
          response = await reservationsAPI.seat(id, {
            tableNumber: reservation.table?.number,
            seatedAt: new Date()
          });
          break;
        case 'complete':
          response = await reservationsAPI.complete(id, {
            total: 0,
            tip: 0
          });
          break;
        case 'cancel':
          response = await reservationsAPI.cancel(id, 'Cancelled by admin', 'admin');
          break;
        case 'no_show':
          response = await reservationsAPI.noShow(id, 'No show');
          break;
      }

      if (response.success) {
        fetchReservation();
        setActionDialog({ open: false, type: null });
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${type} reservation`);
    }
  };

  const handleAddNote = async () => {
    try {
      const response = await reservationsAPI.addNote(id, note);
      if (response.success) {
        setNote('');
        setNoteDialog(false);
        fetchReservation();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add note');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading reservation...</Typography>
      </Box>
    );
  }

  if (!reservation) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Reservation not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/reservations')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Reservation #{reservation.reservationNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reservation.guest?.firstName} {reservation.guest?.lastName}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          {reservation.status === 'pending' && (
            <Button
              variant="outlined"
              startIcon={<ConfirmIcon />}
              onClick={() => setActionDialog({ open: true, type: 'confirm' })}
            >
              Confirm
            </Button>
          )}
          {reservation.status === 'confirmed' && (
            <Button
              variant="outlined"
              startIcon={<SeatIcon />}
              onClick={() => setActionDialog({ open: true, type: 'seat' })}
            >
              Seat
            </Button>
          )}
          {reservation.status === 'seated' && (
            <Button
              variant="outlined"
              color="success"
              startIcon={<CompleteIcon />}
              onClick={() => setActionDialog({ open: true, type: 'complete' })}
            >
              Complete
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/reservations/edit/${reservation._id}`)}
          >
            Edit
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Status Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  label={reservation.status}
                  color={
                    reservation.status === 'confirmed' ? 'info' :
                    reservation.status === 'completed' ? 'success' :
                    reservation.status === 'cancelled' ? 'error' :
                    'warning'
                  }
                  sx={{ textTransform: 'capitalize' }}
                />
                <Typography variant="body2" color="text.secondary">
                  Created: {formatDate(reservation.createdAt)}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Guest Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Guest Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1">
                  {reservation.guest?.firstName} {reservation.guest?.lastName}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {reservation.guest?.email}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1">
                  {reservation.guest?.phone}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Reservation Details */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Reservation Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Date
                </Typography>
                <Typography variant="body1">
                  {formatDate(reservation.date)}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Time
                </Typography>
                <Typography variant="body1">
                  {reservation.time}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Party Size
                </Typography>
                <Typography variant="body1">
                  {reservation.partySize} guests
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body1">
                  {reservation.duration} minutes
                </Typography>
              </Grid>

              {reservation.table?.number && (
                <>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Table
                    </Typography>
                    <Typography variant="body1">
                      {reservation.table.number}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Area
                    </Typography>
                    <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                      {reservation.table.area}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Special Requests */}
        {reservation.specialRequests && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Special Requests
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                {reservation.specialRequests.occasion && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">
                      Occasion
                    </Typography>
                    <Typography variant="body1">
                      {reservation.specialRequests.occasion}
                    </Typography>
                  </Grid>
                )}

                {reservation.specialRequests.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">
                      {reservation.specialRequests.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Admin Notes */}
        {reservation.adminNotes && reservation.adminNotes.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Admin Notes
                </Typography>
                <Button size="small" onClick={() => setNoteDialog(true)}>
                  Add Note
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                {reservation.adminNotes.map((note, index) => (
                  <Box key={index} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2">{note.note}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(note.createdAt)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        )}
      </Grid>

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

      {/* Note Dialog */}
      <Dialog open={noteDialog} onClose={() => setNoteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Admin Note</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter note..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(false)}>Cancel</Button>
          <Button onClick={handleAddNote} variant="contained" disabled={!note.trim()}>
            Add Note
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
