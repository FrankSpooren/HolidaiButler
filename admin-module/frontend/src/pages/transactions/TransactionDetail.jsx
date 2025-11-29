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
  TextField,
  InputAdornment,
  Badge
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  AttachMoney as RefundIcon,
  Report as DisputeIcon,
  Check as ApproveIcon,
  AccountBalance as ReconcileIcon,
  Warning as WarningIcon,
  CreditCard as CardIcon
} from '@mui/icons-material';
import { transactionsAPI } from '../../services/api';

export default function TransactionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refundDialog, setRefundDialog] = useState({ open: false, amount: 0, reason: '' });

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const response = await transactionsAPI.getById(id);
      if (response.success) {
        setTransaction(response.data.transaction);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    try {
      const response = await transactionsAPI.refund(
        id,
        refundDialog.amount,
        refundDialog.reason,
        transaction.paymentMethod
      );

      if (response.success) {
        fetchTransaction();
        setRefundDialog({ open: false, amount: 0, reason: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process refund');
    }
  };

  const handleApproveReview = async () => {
    try {
      const response = await transactionsAPI.approveReview(id, 'Approved after manual review');
      if (response.success) {
        fetchTransaction();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve transaction');
    }
  };

  const handleReconcile = async () => {
    try {
      const response = await transactionsAPI.reconcile(
        id,
        `BATCH-${new Date().getTime()}`,
        new Date()
      );

      if (response.success) {
        fetchTransaction();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reconcile transaction');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `€${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading transaction...</Typography>
      </Box>
    );
  }

  if (!transaction) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Transaction not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/transactions')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Transaction #{transaction.transactionNumber}
            </Typography>
            {transaction.externalTransactionId && (
              <Typography variant="body2" color="text.secondary">
                External ID: {transaction.externalTransactionId}
              </Typography>
            )}
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          {transaction.fraudCheck?.requiresReview && (
            <Button
              variant="outlined"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={handleApproveReview}
            >
              Approve Review
            </Button>
          )}
          {transaction.status === 'completed' && !transaction.refund?.amount && (
            <Button
              variant="outlined"
              startIcon={<RefundIcon />}
              onClick={() => setRefundDialog({
                open: true,
                amount: transaction.amount?.total || 0,
                reason: ''
              })}
            >
              Refund
            </Button>
          )}
          {transaction.status === 'completed' && !transaction.reconciliation?.isReconciled && (
            <Button
              variant="outlined"
              startIcon={<ReconcileIcon />}
              onClick={handleReconcile}
            >
              Reconcile
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
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Typography variant="h6">
                <Chip
                  label={transaction.status.replace('_', ' ')}
                  color={
                    transaction.status === 'completed' ? 'success' :
                    transaction.status === 'failed' ? 'error' :
                    transaction.status === 'disputed' ? 'error' :
                    'warning'
                  }
                  sx={{ textTransform: 'capitalize' }}
                />
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Amount
              </Typography>
              <Typography variant="h6">
                {formatCurrency(transaction.amount?.total || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Type
              </Typography>
              <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                {transaction.type}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Method
              </Typography>
              <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                {transaction.paymentMethod?.replace('_', ' ')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Fraud Alert */}
        {transaction.fraudCheck?.requiresReview && (
          <Grid item xs={12}>
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="subtitle2">
                This transaction requires fraud review
              </Typography>
              <Typography variant="body2">
                Risk Level: <strong>{transaction.fraudCheck.riskLevel}</strong> (Score: {transaction.fraudCheck.riskScore}/100)
              </Typography>
              {transaction.fraudCheck.flags && transaction.fraudCheck.flags.length > 0 && (
                <Typography variant="body2">
                  Flags: {transaction.fraudCheck.flags.join(', ')}
                </Typography>
              )}
            </Alert>
          </Grid>
        )}

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
                  {transaction.customer?.name}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {transaction.customer?.email}
                </Typography>
              </Grid>

              {transaction.customer?.phone && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">
                    {transaction.customer.phone}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Payment Details */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <CardIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Payment Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Provider
                </Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                  {transaction.provider?.name}
                </Typography>
              </Grid>

              {transaction.card && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Card
                    </Typography>
                    <Typography variant="body1">
                      {transaction.card.brand} •••• {transaction.card.last4}
                    </Typography>
                  </Grid>

                  {transaction.card.country && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Card Country
                      </Typography>
                      <Typography variant="body1">
                        {transaction.card.country}
                      </Typography>
                    </Grid>
                  )}
                </>
              )}

              {transaction.provider?.paymentIntentId && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Payment Intent ID
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {transaction.provider.paymentIntentId}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Amount Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Amount Breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Subtotal</Typography>
                <Typography>{formatCurrency(transaction.amount?.subtotal || 0)}</Typography>
              </Box>

              {transaction.amount?.tax > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Tax ({transaction.amount?.taxRate}%)</Typography>
                  <Typography>{formatCurrency(transaction.amount.tax)}</Typography>
                </Box>
              )}

              {transaction.amount?.serviceFee > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Service Fee</Typography>
                  <Typography>{formatCurrency(transaction.amount.serviceFee)}</Typography>
                </Box>
              )}

              {transaction.amount?.processingFee > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Processing Fee</Typography>
                  <Typography>{formatCurrency(transaction.amount.processingFee)}</Typography>
                </Box>
              )}

              {transaction.amount?.discount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                  <Typography>Discount</Typography>
                  <Typography>-{formatCurrency(transaction.amount.discount)}</Typography>
                </Box>
              )}

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">
                  {formatCurrency(transaction.amount?.total || 0)}
                </Typography>
              </Box>

              {transaction.refund?.amount > 0 && (
                <>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'warning.main' }}>
                    <Typography>Refunded</Typography>
                    <Typography>-{formatCurrency(transaction.refund.amount)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Net Amount</Typography>
                    <Typography variant="h6">
                      {formatCurrency((transaction.amount?.total || 0) - transaction.refund.amount)}
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Timeline */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Timeline
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
              {transaction.timestamps?.initiated && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Initiated
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(transaction.timestamps.initiated)}
                  </Typography>
                </Box>
              )}

              {transaction.timestamps?.authorized && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Authorized
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(transaction.timestamps.authorized)}
                  </Typography>
                </Box>
              )}

              {transaction.timestamps?.completed && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Completed
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(transaction.timestamps.completed)}
                  </Typography>
                </Box>
              )}

              {transaction.timestamps?.refunded && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Refunded
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(transaction.timestamps.refunded)}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Refund Information */}
        {transaction.refund && transaction.refund.amount > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Refund Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(transaction.refund.amount)}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1">
                    <Chip
                      label={transaction.refund.status}
                      size="small"
                      color={transaction.refund.status === 'completed' ? 'success' : 'warning'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    Reason
                  </Typography>
                  <Typography variant="body1">
                    {transaction.refund.reason || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Dispute Information */}
        {transaction.dispute?.isDisputed && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <DisputeIcon sx={{ verticalAlign: 'middle', mr: 1 }} color="error" />
                Dispute Information
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1">
                    <Chip
                      label={transaction.dispute.status}
                      size="small"
                      color="error"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    Disputed At
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(transaction.dispute.disputedAt)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Reason
                  </Typography>
                  <Typography variant="body1">
                    {transaction.dispute.reason || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Reconciliation */}
        {transaction.reconciliation?.isReconciled && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Reconciliation
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    Batch ID
                  </Typography>
                  <Typography variant="body1">
                    {transaction.reconciliation.batchId}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    Reconciled At
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(transaction.reconciliation.reconciledAt)}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    Settlement Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(transaction.reconciliation.settlementDate)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>

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
