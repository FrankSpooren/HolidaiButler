import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CompleteIcon,
  Schedule as PendingIcon,
  Sync as ProcessingIcon,
  Error as ErrorIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const REFUND_STEPS = [
  {
    key: 'initiated',
    label: 'Terugbetaling aangevraagd',
    description: 'Je annuleringsverzoek is ontvangen en de terugbetaling is gestart.',
  },
  {
    key: 'processing',
    label: 'In behandeling',
    description: 'De terugbetaling wordt verwerkt door onze betalingsprovider.',
  },
  {
    key: 'sent',
    label: 'Verstuurd naar bank',
    description: 'Het bedrag is verstuurd naar je bank of betaalmethode.',
  },
  {
    key: 'completed',
    label: 'Voltooid',
    description: 'De terugbetaling is succesvol afgerond.',
  },
];

function RefundStatus({ booking }) {
  if (!booking || booking.status !== 'cancelled') {
    return null;
  }

  const refundStatus = booking.refundStatus || 'none';
  const refundAmount = booking.refundAmount || 0;
  const refundTransactionId = booking.refundTransactionId;
  const cancelledAt = booking.cancelledAt ? new Date(booking.cancelledAt) : null;
  const refundCompletedAt = booking.refundCompletedAt ? new Date(booking.refundCompletedAt) : null;

  const getActiveStep = () => {
    switch (refundStatus) {
      case 'initiated':
        return 0;
      case 'processing':
        return 1;
      case 'sent':
        return 2;
      case 'completed':
        return 4; // All steps complete
      case 'failed':
        return -1;
      default:
        return -1;
    }
  };

  const activeStep = getActiveStep();

  const getStatusColor = () => {
    switch (refundStatus) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'none':
        return 'default';
      default:
        return 'warning';
    }
  };

  const getStatusLabel = () => {
    switch (refundStatus) {
      case 'initiated':
        return 'Gestart';
      case 'processing':
        return 'In behandeling';
      case 'sent':
        return 'Verstuurd';
      case 'completed':
        return 'Voltooid';
      case 'failed':
        return 'Mislukt';
      default:
        return 'Geen terugbetaling';
    }
  };

  if (refundStatus === 'none' || refundAmount === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Terugbetaling
        </Typography>
        <Alert severity="info">
          Voor deze boeking is geen terugbetaling beschikbaar op basis van het terugbetalingsbeleid.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Terugbetaling status
        </Typography>
        <Chip
          icon={
            refundStatus === 'completed' ? <CompleteIcon /> :
            refundStatus === 'failed' ? <ErrorIcon /> :
            <ProcessingIcon />
          }
          label={getStatusLabel()}
          color={getStatusColor()}
          size="small"
        />
      </Box>

      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Terugbetaling bedrag
          </Typography>
          <Typography variant="h5" color="success.main" fontWeight="bold">
            €{refundAmount.toFixed(2)}
          </Typography>
        </Box>
        {cancelledAt && (
          <Typography variant="caption" color="text.secondary">
            Geannuleerd op {format(cancelledAt, 'dd MMMM yyyy, HH:mm', { locale: nl })}
          </Typography>
        )}
      </Box>

      {refundStatus === 'failed' ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">
            Terugbetaling mislukt
          </Typography>
          <Typography variant="body2">
            Er is een probleem opgetreden bij het verwerken van je terugbetaling.
            Neem contact op met onze klantenservice voor hulp.
          </Typography>
        </Alert>
      ) : refundStatus !== 'completed' ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Geschatte verwerkingstijd: 5-10 werkdagen
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(activeStep + 1) * 25}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      ) : null}

      <Stepper activeStep={activeStep} orientation="vertical">
        {REFUND_STEPS.map((step, index) => (
          <Step key={step.key} completed={index < activeStep || refundStatus === 'completed'}>
            <StepLabel
              optional={
                index === 0 && cancelledAt ? (
                  <Typography variant="caption">
                    {format(cancelledAt, 'dd MMM yyyy, HH:mm', { locale: nl })}
                  </Typography>
                ) : index === REFUND_STEPS.length - 1 && refundCompletedAt ? (
                  <Typography variant="caption">
                    {format(refundCompletedAt, 'dd MMM yyyy, HH:mm', { locale: nl })}
                  </Typography>
                ) : null
              }
              StepIconProps={{
                icon: index < activeStep || refundStatus === 'completed' ? (
                  <CompleteIcon color="success" />
                ) : index === activeStep ? (
                  <ProcessingIcon color="primary" />
                ) : (
                  <PendingIcon color="disabled" />
                ),
              }}
            >
              {step.label}
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {refundTransactionId && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" alignItems="center" gap={1}>
            <BankIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              Transactie ID: {refundTransactionId}
            </Typography>
          </Box>
        </>
      )}

      {refundStatus === 'completed' && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            De terugbetaling is succesvol verwerkt en zou op je rekening moeten staan.
          </Typography>
        </Alert>
      )}
    </Paper>
  );
}

export default RefundStatus;
