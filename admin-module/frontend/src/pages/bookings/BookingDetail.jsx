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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Check as ConfirmIcon,
  Cancel as CancelIcon,
  Send as ResendIcon,
  CheckCircle as CompleteIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { bookingsAPI } from '../../services/api';

export default function BookingDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getById(id);
      if (response.success) {
        setBooking(response.data.booking);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      const response = await bookingsAPI.confirm(id, booking.payment?.transactionId);
      if (response.success) {
        fetchBooking();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm booking');
    }
  };

  const handleComplete = async () => {
    try {
      const response = await bookingsAPI.complete(id);
      if (response.success) {
        fetchBooking();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete booking');
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        const response = await bookingsAPI.cancel(id, 'Cancelled by admin', 'admin', 0);
        if (response.success) {
          fetchBooking();
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to cancel booking');
      }
    }
  };

  const handleResendConfirmation = async () => {
    try {
      const response = await bookingsAPI.resendConfirmation(id);
      if (response.success) {
        alert('Confirmation resent successfully');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend confirmation');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `€${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading booking...</Typography>
      </Box>
    );
  }

  if (!booking) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Booking not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/bookings')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Booking #{booking.bookingNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Confirmation: {booking.confirmationCode}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          {booking.status === 'pending' && (
            <Button
              variant="outlined"
              startIcon={<ConfirmIcon />}
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          )}
          {booking.status === 'confirmed' && (
            <>
              <Button
                variant="outlined"
                startIcon={<ResendIcon />}
                onClick={handleResendConfirmation}
              >
                Resend
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<CompleteIcon />}
                onClick={handleComplete}
              >
                Complete
              </Button>
            </>
          )}
          {!['completed', 'cancelled'].includes(booking.status) && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Status Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Booking Status
              </Typography>
              <Typography variant="h6">
                <Chip
                  label={booking.status}
                  color={
                    booking.status === 'confirmed' ? 'info' :
                    booking.status === 'completed' ? 'success' :
                    booking.status === 'cancelled' ? 'error' :
                    'warning'
                  }
                  sx={{ textTransform: 'capitalize' }}
                />
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Payment Status
              </Typography>
              <Typography variant="h6">
                <Chip
                  label={booking.payment?.status || 'pending'}
                  color={
                    booking.payment?.status === 'completed' ? 'success' :
                    booking.payment?.status === 'failed' ? 'error' :
                    'warning'
                  }
                  sx={{ textTransform: 'capitalize' }}
                />
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total Amount
              </Typography>
              <Typography variant="h6">
                {formatCurrency(booking.pricing?.total || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Customer Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1">
                  {booking.customer?.firstName} {booking.customer?.lastName}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {booking.customer?.email}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1">
                  {booking.customer?.phone || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Visit Details */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Visit Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Type
                </Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                  {booking.type?.replace('_', ' ')}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Visit Date
                </Typography>
                <Typography variant="body1">
                  {booking.visitDetails?.date ? formatDate(booking.visitDetails.date) : 'N/A'}
                </Typography>
              </Grid>

              {booking.visitDetails?.time && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Time
                  </Typography>
                  <Typography variant="body1">
                    {booking.visitDetails.time}
                  </Typography>
                </Grid>
              )}

              {booking.visitDetails?.participants && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Participants
                  </Typography>
                  <Typography variant="body1">
                    {booking.visitDetails.participants.adults} adults
                    {booking.visitDetails.participants.children > 0 &&
                      `, ${booking.visitDetails.participants.children} children`
                    }
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Booking Items */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Booking Items
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {booking.items?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {item.event?.title || item.poi?.name || item.name || 'Item'}
                      </TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>
                        {item.type?.replace('_', ' ')}
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.price * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Pricing Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pricing Breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Subtotal</Typography>
                <Typography>{formatCurrency(booking.pricing?.subtotal || 0)}</Typography>
              </Box>

              {booking.pricing?.tax > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Tax ({booking.pricing?.taxRate}%)</Typography>
                  <Typography>{formatCurrency(booking.pricing.tax)}</Typography>
                </Box>
              )}

              {booking.pricing?.serviceFee > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Service Fee</Typography>
                  <Typography>{formatCurrency(booking.pricing.serviceFee)}</Typography>
                </Box>
              )}

              {booking.pricing?.discount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                  <Typography>Discount</Typography>
                  <Typography>-{formatCurrency(booking.pricing.discount)}</Typography>
                </Box>
              )}

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">
                  {formatCurrency(booking.pricing?.total || 0)}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Payment Information */}
        {booking.payment && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <PaymentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Payment Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1">
                    <Chip
                      label={booking.payment.status}
                      size="small"
                      color={booking.payment.status === 'completed' ? 'success' : 'warning'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Typography>
                </Grid>

                {booking.payment.method && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Payment Method
                    </Typography>
                    <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                      {booking.payment.method.replace('_', ' ')}
                    </Typography>
                  </Grid>
                )}

                {booking.payment.transactionId && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Transaction ID
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ cursor: 'pointer', color: 'primary.main' }}
                      onClick={() => navigate(`/transactions/${booking.payment.transactionId}`)}
                    >
                      View Transaction
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Special Requests */}
        {booking.specialRequests && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Special Requests
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">
                {booking.specialRequests}
              </Typography>
            </Paper>
          </Grid>
        )}

        {/* Admin Notes */}
        {booking.adminNotes && booking.adminNotes.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Admin Notes
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                {booking.adminNotes.map((note, index) => (
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
    </Box>
  );
}
