import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  IconButton,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Send as SendIcon,
  SwapHoriz as TransferIcon,
  QrCode2 as QrCodeIcon,
  CheckCircle as ValidIcon,
  Block as InvalidIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { ticketsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const statusColors = {
  pending: 'warning',
  active: 'success',
  used: 'info',
  expired: 'default',
  cancelled: 'error',
  transferred: 'secondary'
};

const typeLabels = {
  general: 'General',
  vip: 'VIP',
  earlybird: 'Early Bird',
  student: 'Student',
  senior: 'Senior',
  group: 'Group',
  family: 'Family'
};

export default function TicketDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasPermission } = useAuthStore();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [cancelDialog, setCancelDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');

  const canEdit = hasPermission('tickets.edit');
  const canDelete = hasPermission('tickets.delete');

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ticketsAPI.getById(id);

      if (response.success) {
        setTicket(response.data.ticket);
      }
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      const response = await ticketsAPI.cancel(
        id,
        'Cancelled by admin',
        'admin',
        { refund: false }
      );

      if (response.success) {
        setSuccess('Ticket cancelled successfully');
        setCancelDialog(false);
        fetchTicket();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel ticket');
    }
  };

  const handleResend = async () => {
    try {
      const response = await ticketsAPI.resend(id, 'email');

      if (response.success) {
        setSuccess('Ticket resent successfully');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend ticket');
    }
  };

  const handleTransfer = async () => {
    if (!transferEmail.trim()) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const response = await ticketsAPI.transfer(id, {
        newHolderEmail: transferEmail,
        reason: 'Admin transfer',
        notifyNewHolder: true
      });

      if (response.success) {
        setSuccess('Ticket transferred successfully');
        setTransferDialog(false);
        setTransferEmail('');
        fetchTicket();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to transfer ticket');
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `€${(amount || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (error && !ticket) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Ticket not found</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/tickets')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Ticket #{ticket.ticketNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {typeLabels[ticket.type] || ticket.type}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={2}>
          {canEdit && ticket.status === 'active' && (
            <Button
              variant="outlined"
              startIcon={<SendIcon />}
              onClick={handleResend}
            >
              Resend
            </Button>
          )}
          {canEdit && ticket.status === 'active' && (
            <Button
              variant="outlined"
              startIcon={<TransferIcon />}
              onClick={() => setTransferDialog(true)}
            >
              Transfer
            </Button>
          )}
          {canEdit && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/tickets/edit/${id}`)}
            >
              Edit
            </Button>
          )}
          {canDelete && !['used', 'cancelled'].includes(ticket.status) && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setCancelDialog(true)}
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

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Status Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {ticket.status === 'active' ? (
                  <ValidIcon color="success" />
                ) : (
                  <InvalidIcon color="error" />
                )}
                <Typography variant="h6">
                  <Chip
                    label={ticket.status}
                    size="small"
                    color={statusColors[ticket.status]}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6">{formatCurrency(ticket.pricing?.finalPrice)}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Price
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6">{formatDate(ticket.purchaseDate).split(',')[0]}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Purchase Date
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <QrCodeIcon color="primary" />
                <Typography variant="h6">{ticket.qrCode ? 'Yes' : 'No'}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                QR Code
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={6}>
          {/* Holder Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Holder Information
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1">
                  {ticket.holder?.firstName} {ticket.holder?.lastName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {ticket.holder?.email}
                </Typography>
              </Box>
              {ticket.holder?.phone && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">
                    {ticket.holder?.phone}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Event/POI Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {ticket.event ? 'Event' : 'POI'} Information
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {ticket.event ? 'Event' : 'POI'} Name
                </Typography>
                <Typography variant="body1">
                  {ticket.event ? (
                    <Link to={`/events/${ticket.event._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {ticket.event.title?.en || ticket.event.title || '-'}
                    </Link>
                  ) : ticket.poi ? (
                    <Link to={`/pois/${ticket.poi._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {ticket.poi.name?.en || ticket.poi.name || '-'}
                    </Link>
                  ) : '-'}
                </Typography>
              </Box>
              {ticket.event?.date && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Event Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(ticket.event.date)}
                  </Typography>
                </Box>
              )}
              {ticket.event?.location && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1">
                    {ticket.event.location.venue}, {ticket.event.location.city}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Pricing Breakdown */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pricing Breakdown
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Base Price</Typography>
                <Typography>{formatCurrency(ticket.pricing?.basePrice)}</Typography>
              </Box>
              {ticket.pricing?.tax > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Tax</Typography>
                  <Typography>{formatCurrency(ticket.pricing?.tax)}</Typography>
                </Box>
              )}
              {ticket.pricing?.fees > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Fees</Typography>
                  <Typography>{formatCurrency(ticket.pricing?.fees)}</Typography>
                </Box>
              )}
              {ticket.pricing?.discount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="success.main">Discount</Typography>
                  <Typography color="success.main">-{formatCurrency(ticket.pricing?.discount)}</Typography>
                </Box>
              )}
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">{formatCurrency(ticket.pricing?.finalPrice)}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={6}>
          {/* Validity Period */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Validity Period
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Valid From
                </Typography>
                <Typography variant="body1">
                  {formatDate(ticket.validity?.from)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Valid To
                </Typography>
                <Typography variant="body1">
                  {formatDate(ticket.validity?.to)}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Access Control */}
          {ticket.access && (ticket.access.areas?.length > 0 || ticket.access.restrictions) && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Access Control
              </Typography>
              <Stack spacing={2}>
                {ticket.access.areas?.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Access Areas
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {ticket.access.areas.map((area, index) => (
                        <Chip key={index} label={area} size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
                {ticket.access.restrictions && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Restrictions
                    </Typography>
                    <Typography variant="body1">
                      {ticket.access.restrictions}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          )}

          {/* Usage History */}
          {ticket.usage && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Usage History
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Used At
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(ticket.usage.usedAt)}
                  </Typography>
                </Box>
                {ticket.usage.location && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body1">
                      {ticket.usage.location}
                    </Typography>
                  </Box>
                )}
                {ticket.usage.scannedBy && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Scanned By
                    </Typography>
                    <Typography variant="body1">
                      {ticket.usage.scannedBy}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          )}

          {/* Transfer History */}
          {ticket.transferHistory && ticket.transferHistory.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Transfer History
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>From</TableCell>
                      <TableCell>To</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ticket.transferHistory.map((transfer, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(transfer.date)}</TableCell>
                        <TableCell>{transfer.from?.email || '-'}</TableCell>
                        <TableCell>{transfer.to?.email || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
        <DialogTitle>Cancel Ticket</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this ticket? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>
            No, Keep It
          </Button>
          <Button onClick={handleCancel} color="error" variant="contained">
            Yes, Cancel Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onClose={() => setTransferDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter the email address of the new ticket holder:
          </Typography>
          <TextField
            fullWidth
            type="email"
            label="New Holder Email"
            value={transferEmail}
            onChange={(e) => setTransferEmail(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} variant="contained">
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
