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
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Send as SendIcon,
  QrCodeScanner as ScannerIcon,
  CheckCircle as ValidIcon,
  SwapHoriz as TransferIcon
} from '@mui/icons-material';
import { ticketsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const statusColors = {
  pending: 'warning',
  active: 'success',
  used: 'info',
  expired: 'default',
  cancelled: 'error',
  transferred: 'secondary',
  confirmed: 'success'  // Added for fallback data
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

export default function TicketList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const canEdit = hasPermission('tickets.edit');
  const canCreate = hasPermission('tickets.create');

  useEffect(() => {
    fetchTickets();
  }, [page, rowsPerPage, search, statusFilter, typeFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter })
      };

      const response = await ticketsAPI.getAll(params);

      if (response.success) {
        // Handle both API response format and fallback data format
        const ticketsList = response.data?.tickets || response.tickets || [];
        const totalCount = response.data?.pagination?.total || response.total || ticketsList.length;
        setTickets(ticketsList);
        setTotal(totalCount);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateTicket = async () => {
    if (!scanInput.trim()) return;

    try {
      const response = await ticketsAPI.validate(scanInput.trim());

      if (response.success) {
        setValidationResult(response.data);
        if (response.data.validation.canBeUsed) {
          setSuccess('Ticket is valid and can be used');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ticket validation failed');
      setValidationResult(null);
    }
  };

  const handleUseTicket = async () => {
    if (!validationResult?.ticket) return;

    try {
      const response = await ticketsAPI.use(validationResult.ticket._id, {
        scanTime: new Date(),
        location: 'Admin Panel'
      });

      if (response.success) {
        setSuccess('Ticket marked as used successfully');
        setScanInput('');
        setValidationResult(null);
        fetchTickets();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to use ticket');
    }
  };

  const handleCancelTicket = async (ticket) => {
    try {
      const response = await ticketsAPI.cancel(ticket._id || ticket.id);

      if (response.success) {
        setSuccess('Ticket cancelled successfully');
        fetchTickets();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel ticket');
    }
  };

  const handleResendTicket = async (ticket) => {
    try {
      const response = await ticketsAPI.resend?.(ticket._id || ticket.id, 'email');

      if (response?.success) {
        setSuccess('Ticket resent successfully');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend ticket');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Tickets
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ScannerIcon />}
            onClick={() => setScannerOpen(true)}
          >
            Scan Ticket
          </Button>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/tickets/new')}
            >
              Create Ticket
            </Button>
          )}
        </Stack>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            placeholder="Search by ticket number, holder name..."
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
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="used">Used</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
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
              <TableCell>Ticket #</TableCell>
              <TableCell>Holder</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Purchase Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    No tickets found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const ticketId = ticket._id || ticket.id;
                const ticketNumber = ticket.ticketNumber || ticket.ticketCode;
                const holderName = ticket.holder?.firstName
                  ? `${ticket.holder.firstName} ${ticket.holder.lastName}`
                  : ticket.customerName;
                const holderEmail = ticket.holder?.email || ticket.customerEmail;
                const ticketType = ticket.type || 'general';
                const eventTitle = ticket.event?.title || ticket.eventTitle || ticket.poi?.name || '-';
                const price = ticket.pricing?.finalPrice ?? ticket.totalPrice ?? 0;

                return (
                  <TableRow key={ticketId} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {ticketNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {holderName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {holderEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={typeLabels[ticketType] || ticketType}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {eventTitle}
                    </TableCell>
                    <TableCell>€{typeof price === 'number' ? price.toFixed(2) : price}</TableCell>
                    <TableCell>{formatDate(ticket.purchaseDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={ticket.status}
                        size="small"
                        color={statusColors[ticket.status] || 'default'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Actions">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setSelectedTicket(ticket);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

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
      </TableContainer>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {canEdit && (
          <MenuItem onClick={() => navigate(`/tickets/edit/${selectedTicket?._id || selectedTicket?.id}`)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {canEdit && selectedTicket?.status === 'active' && (
          <MenuItem
            onClick={() => {
              handleResendTicket(selectedTicket);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <SendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Resend Ticket</ListItemText>
          </MenuItem>
        )}
        {canEdit && !['used', 'cancelled'].includes(selectedTicket?.status) && (
          <MenuItem
            onClick={() => {
              handleCancelTicket(selectedTicket);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <CancelIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Cancel Ticket</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Scanner Dialog */}
      <Dialog
        open={scannerOpen}
        onClose={() => {
          setScannerOpen(false);
          setScanInput('');
          setValidationResult(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ticket Scanner</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Ticket Number or QR Code"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleValidateTicket();
              }}
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ScannerIcon />
                  </InputAdornment>
                )
              }}
            />

            {validationResult && (
              <Card variant="outlined">
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        {validationResult.validation.canBeUsed ? (
                          <ValidIcon color="success" />
                        ) : (
                          <CancelIcon color="error" />
                        )}
                        <Typography variant="h6">
                          {validationResult.validation.message}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography color="text.secondary" variant="caption">
                        Ticket Number
                      </Typography>
                      <Typography variant="body2">
                        {validationResult.ticket.ticketNumber}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography color="text.secondary" variant="caption">
                        Holder
                      </Typography>
                      <Typography variant="body2">
                        {validationResult.ticket.holder?.firstName}{' '}
                        {validationResult.ticket.holder?.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography color="text.secondary" variant="caption">
                        Type
                      </Typography>
                      <Typography variant="body2">
                        {typeLabels[validationResult.ticket.type]}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography color="text.secondary" variant="caption">
                        Status
                      </Typography>
                      <Chip
                        label={validationResult.ticket.status}
                        size="small"
                        color={statusColors[validationResult.ticket.status]}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setScannerOpen(false);
            setScanInput('');
            setValidationResult(null);
          }}>
            Close
          </Button>
          {!validationResult && (
            <Button onClick={handleValidateTicket} variant="contained">
              Validate
            </Button>
          )}
          {validationResult?.validation.canBeUsed && (
            <Button onClick={handleUseTicket} variant="contained" color="success">
              Use Ticket
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
