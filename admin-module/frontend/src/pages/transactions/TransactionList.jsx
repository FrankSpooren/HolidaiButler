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
  TableSortLabel,
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
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  AttachMoney as RefundIcon,
  Report as DisputeIcon,
  Check as ApproveIcon,
  AccountBalance as ReconcileIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { transactionsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const statusColors = {
  pending: 'warning',
  processing: 'info',
  authorized: 'info',
  completed: 'success',
  failed: 'error',
  cancelled: 'error',
  refunded: 'default',
  partially_refunded: 'warning',
  disputed: 'error',
  expired: 'default'
};

const paymentMethodLabels = {
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  paypal: 'PayPal',
  bank_transfer: 'Bank Transfer',
  ideal: 'iDEAL',
  sepa: 'SEPA',
  cash: 'Cash',
  voucher: 'Voucher',
  wallet: 'Wallet'
};

export default function TransactionList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [refundDialog, setRefundDialog] = useState({ open: false, amount: 0, reason: '' });

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (columnId) => {
    const newDirection = sortBy === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(columnId);
    setSortDirection(newDirection);
  };

  const canEdit = hasPermission('transactions.edit');
  const canView = hasPermission('transactions.view');

  useEffect(() => {
    fetchTransactions();
    fetchPendingReviews();
  }, [page, rowsPerPage, search, statusFilter, methodFilter, typeFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(methodFilter && { paymentMethod: methodFilter }),
        ...(typeFilter && { type: typeFilter })
      };

      const response = await transactionsAPI.getAll(params);

      if (response.success) {
        // Handle both API response format and fallback data format
        setTransactions(response.data?.transactions || response.transactions || []);
        setTotal(response.data?.pagination?.total || response.total || 0);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      const response = await transactionsAPI.getPendingReviews();
      if (response.success) {
        const reviewTransactions = response.data?.transactions || response.transactions || [];
        setPendingReviewsCount(reviewTransactions.length);
      }
    } catch (err) {
      console.error('Error fetching pending reviews:', err);
    }
  };

  const handleRefund = async () => {
    try {
      const response = await transactionsAPI.refund(
        selectedTransaction._id || selectedTransaction.id,
        refundDialog.amount,
        refundDialog.reason,
        selectedTransaction.paymentMethod
      );

      if (response.success) {
        setSuccess('Refund processed successfully');
        fetchTransactions();
        setRefundDialog({ open: false, amount: 0, reason: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process refund');
    }
  };

  const handleApproveReview = async (transaction) => {
    try {
      const response = await transactionsAPI.approveReview(
        transaction._id || transaction.id,
        'Approved after manual review'
      );

      if (response.success) {
        setSuccess('Transaction approved');
        fetchTransactions();
        fetchPendingReviews();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve transaction');
    }
  };

  const handleReconcile = async (transaction) => {
    try {
      const response = await transactionsAPI.reconcile(
        transaction._id || transaction.id,
        `BATCH-${new Date().getTime()}`,
        new Date()
      );

      if (response.success) {
        setSuccess('Transaction reconciled');
        fetchTransactions();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reconcile transaction');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `€${amount.toFixed(2)}`;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Transactions
          </Typography>
          {pendingReviewsCount > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${pendingReviewsCount} pending review`}
              color="warning"
              size="small"
              sx={{ mt: 1 }}
              onClick={() => navigate('/transactions/reviews')}
            />
          )}
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={() => navigate('/transactions/reviews')}
          >
            Fraud Reviews
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/transactions/reconciliation')}
          >
            Reconciliation
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            placeholder="Search by transaction #, customer..."
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
            <MenuItem value="payment">Payment</MenuItem>
            <MenuItem value="refund">Refund</MenuItem>
            <MenuItem value="chargeback">Chargeback</MenuItem>
            <MenuItem value="adjustment">Adjustment</MenuItem>
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
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="refunded">Refunded</MenuItem>
            <MenuItem value="disputed">Disputed</MenuItem>
          </TextField>
          <TextField
            select
            label="Method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Methods</MenuItem>
            {Object.entries(paymentMethodLabels).map(([value, label]) => (
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
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'transactionNumber'}
                  direction={sortBy === 'transactionNumber' ? sortDirection : 'asc'}
                  onClick={() => handleSort('transactionNumber')}
                >
                  Transaction #
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'customer'}
                  direction={sortBy === 'customer' ? sortDirection : 'asc'}
                  onClick={() => handleSort('customer')}
                >
                  Customer
                </TableSortLabel>
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'amount'}
                  direction={sortBy === 'amount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('amount')}
                >
                  Amount
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'createdAt'}
                  direction={sortBy === 'createdAt' ? sortDirection : 'asc'}
                  onClick={() => handleSort('createdAt')}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Review</TableCell>
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
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    No transactions found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction._id || transaction.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {transaction.transactionNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">
                        {transaction.customer?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {transaction.customer?.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={transaction.type}
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {paymentMethodLabels[transaction.paymentMethod] || transaction.paymentMethod}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(transaction.amount?.total || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {formatDate(transaction.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={transaction.status.replace('_', ' ')}
                      size="small"
                      color={statusColors[transaction.status]}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {transaction.fraudCheck?.requiresReview && (
                      <Badge badgeContent="!" color="error">
                        <Chip
                          label={transaction.fraudCheck.riskLevel}
                          size="small"
                          color="warning"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Actions">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedTransaction(transaction);
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
        <MenuItem onClick={() => {
          navigate(`/transactions/${selectedTransaction?._id || selectedTransaction?.id}`);
          setAnchorEl(null);
        }}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>

        {canEdit && selectedTransaction?.status === 'completed' && !selectedTransaction?.refund?.amount && (
          <MenuItem
            onClick={() => {
              setRefundDialog({
                open: true,
                amount: selectedTransaction.amount?.total || 0,
                reason: ''
              });
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <RefundIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Process Refund</ListItemText>
          </MenuItem>
        )}

        {canEdit && selectedTransaction?.fraudCheck?.requiresReview && (
          <MenuItem
            onClick={() => {
              handleApproveReview(selectedTransaction);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <ApproveIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Approve Review</ListItemText>
          </MenuItem>
        )}

        {canEdit && selectedTransaction?.status === 'completed' && !selectedTransaction?.reconciliation?.isReconciled && (
          <MenuItem
            onClick={() => {
              handleReconcile(selectedTransaction);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <ReconcileIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Reconcile</ListItemText>
          </MenuItem>
        )}

        {selectedTransaction?.dispute?.isDisputed && (
          <MenuItem onClick={() => {
            navigate(`/transactions/${selectedTransaction._id || selectedTransaction.id}/dispute`);
            setAnchorEl(null);
          }}>
            <ListItemIcon>
              <DisputeIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>View Dispute</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Refund Dialog */}
      <Dialog
        open={refundDialog.open}
        onClose={() => setRefundDialog({ open: false, amount: 0, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Process Refund</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Refund Amount"
              type="number"
              value={refundDialog.amount}
              onChange={(e) => setRefundDialog({ ...refundDialog, amount: parseFloat(e.target.value) })}
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>
              }}
            />
            <TextField
              fullWidth
              label="Reason"
              multiline
              rows={3}
              value={refundDialog.reason}
              onChange={(e) => setRefundDialog({ ...refundDialog, reason: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog({ open: false, amount: 0, reason: '' })}>
            Cancel
          </Button>
          <Button
            onClick={handleRefund}
            variant="contained"
            color="primary"
            disabled={!refundDialog.amount || !refundDialog.reason}
          >
            Process Refund
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
