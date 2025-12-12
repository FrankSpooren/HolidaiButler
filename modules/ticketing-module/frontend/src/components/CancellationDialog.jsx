import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from 'react-query';
import { format, differenceInHours } from 'date-fns';
import { nl } from 'date-fns/locale';
import ticketingService from '../services/ticketingService';

const CANCELLATION_REASONS = [
  { value: 'changed_plans', label: 'Plannen gewijzigd' },
  { value: 'schedule_conflict', label: 'Conflicterend schema' },
  { value: 'health_issues', label: 'Gezondheidsproblemen' },
  { value: 'travel_issues', label: 'Reisproblemen' },
  { value: 'financial_reasons', label: 'Financiële redenen' },
  { value: 'found_alternative', label: 'Alternatief gevonden' },
  { value: 'event_concerns', label: 'Bezorgdheid over evenement' },
  { value: 'other', label: 'Anders' },
];

function CancellationDialog({ open, onClose, booking, onSuccess }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const cancelMutation = useMutation(
    () => ticketingService.cancelBooking(booking.id, {
      reason: reason === 'other' ? customReason : CANCELLATION_REASONS.find(r => r.value === reason)?.label,
    }),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['booking', booking.id]);
        queryClient.invalidateQueries(['bookings']);
        setStep(2);
        if (onSuccess) {
          onSuccess(data);
        }
      },
    }
  );

  const handleClose = () => {
    setStep(0);
    setReason('');
    setCustomReason('');
    setConfirmed(false);
    cancelMutation.reset();
    onClose();
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1 && confirmed) {
      cancelMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step > 0 && step < 2) {
      setStep(step - 1);
    }
  };

  // Calculate refund eligibility
  const eventDate = booking?.event?.startDate ? new Date(booking.event.startDate) : null;
  const hoursUntilEvent = eventDate ? differenceInHours(eventDate, new Date()) : 0;
  const cancellationDeadline = booking?.cancellationDeadline || 24;
  const canCancel = hoursUntilEvent > cancellationDeadline;
  const refundPolicy = booking?.refundPolicy || 'full';

  const getRefundAmount = () => {
    if (!canCancel) return 0;
    const totalAmount = booking?.totalAmount || 0;
    switch (refundPolicy) {
      case 'full':
        return totalAmount;
      case 'partial':
        return totalAmount * (booking?.partialRefundPercentage || 80) / 100;
      case 'none':
        return 0;
      default:
        return totalAmount;
    }
  };

  const refundAmount = getRefundAmount();

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Alert severity={canCancel ? 'warning' : 'error'} sx={{ mb: 3 }}>
              {canCancel ? (
                <>
                  <Typography variant="body2" fontWeight="bold">
                    Annulering is mogelijk
                  </Typography>
                  <Typography variant="body2">
                    Je kunt deze boeking annuleren tot {cancellationDeadline} uur voor het evenement.
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" fontWeight="bold">
                    Annulering niet meer mogelijk
                  </Typography>
                  <Typography variant="body2">
                    De annuleringstermijn van {cancellationDeadline} uur voor het evenement is verstreken.
                  </Typography>
                </>
              )}
            </Alert>

            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Boeking details
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {booking?.event?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {eventDate && format(eventDate, 'EEEE dd MMMM yyyy, HH:mm', { locale: nl })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Referentie: {booking?.reference}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Totaalbedrag:</Typography>
                <Typography variant="body1" fontWeight="bold">
                  €{booking?.totalAmount?.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 3, p: 2, bgcolor: refundAmount > 0 ? 'success.light' : 'error.light', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Terugbetaling
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Chip
                    size="small"
                    label={refundPolicy === 'full' ? 'Volledige terugbetaling' : refundPolicy === 'partial' ? 'Gedeeltelijke terugbetaling' : 'Geen terugbetaling'}
                    color={refundPolicy === 'full' ? 'success' : refundPolicy === 'partial' ? 'warning' : 'error'}
                  />
                </Box>
                <Typography variant="h6" color={refundAmount > 0 ? 'success.dark' : 'error.dark'}>
                  €{refundAmount.toFixed(2)}
                </Typography>
              </Box>
              {refundPolicy === 'partial' && (
                <Typography variant="caption" color="text.secondary">
                  {booking?.partialRefundPercentage || 80}% van het totaalbedrag
                </Typography>
              )}
            </Box>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Reden voor annulering</InputLabel>
              <Select
                value={reason}
                label="Reden voor annulering"
                onChange={(e) => setReason(e.target.value)}
                disabled={!canCancel}
              >
                {CANCELLATION_REASONS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {reason === 'other' && (
              <TextField
                fullWidth
                label="Geef een reden op"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                multiline
                rows={2}
                disabled={!canCancel}
              />
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Box textAlign="center" sx={{ mb: 3 }}>
              <WarningIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Weet je zeker dat je wilt annuleren?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Deze actie kan niet ongedaan worden gemaakt.
              </Typography>
            </Box>

            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Annulering overzicht
              </Typography>
              <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2">Evenement:</Typography>
                <Typography variant="body2" fontWeight="bold">{booking?.event?.name}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2">Reden:</Typography>
                <Typography variant="body2">
                  {reason === 'other' ? customReason : CANCELLATION_REASONS.find(r => r.value === reason)?.label}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Terugbetaling:</Typography>
                <Typography variant="body1" fontWeight="bold" color="success.main">
                  €{refundAmount.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Na annulering ontvang je binnen 5-10 werkdagen een terugbetaling op je originele betaalmethode.
              </Typography>
            </Alert>

            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: confirmed ? 'primary.main' : 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main' },
              }}
              onClick={() => setConfirmed(!confirmed)}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: confirmed ? 'primary.main' : 'grey.400',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: confirmed ? 'primary.main' : 'transparent',
                  }}
                >
                  {confirmed && <SuccessIcon sx={{ fontSize: 16, color: 'white' }} />}
                </Box>
                <Typography variant="body2">
                  Ik begrijp dat mijn boeking wordt geannuleerd en dat ik €{refundAmount.toFixed(2)} terugkrijg.
                </Typography>
              </Box>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box textAlign="center">
            {cancelMutation.isSuccess ? (
              <>
                <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Boeking geannuleerd
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Je boeking is succesvol geannuleerd.
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="success.dark">
                    Een terugbetaling van €{refundAmount.toFixed(2)} wordt binnen 5-10 werkdagen verwerkt.
                  </Typography>
                </Box>
              </>
            ) : cancelMutation.isError ? (
              <>
                <CancelIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Annulering mislukt
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Er is iets misgegaan bij het annuleren van je boeking.
                </Typography>
                <Alert severity="error">
                  {cancelMutation.error?.message || 'Probeer het later opnieuw.'}
                </Alert>
              </>
            ) : null}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CancelIcon color="error" />
          Boeking annuleren
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3, pt: 1 }}>
          <Step>
            <StepLabel>Details</StepLabel>
          </Step>
          <Step>
            <StepLabel>Bevestigen</StepLabel>
          </Step>
          <Step>
            <StepLabel>Voltooid</StepLabel>
          </Step>
        </Stepper>

        {cancelMutation.isLoading ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Boeking annuleren...</Typography>
          </Box>
        ) : (
          renderStepContent()
        )}
      </DialogContent>

      <DialogActions>
        {step < 2 && (
          <>
            <Button onClick={handleClose}>
              Annuleren
            </Button>
            {step > 0 && (
              <Button onClick={handleBack}>
                Terug
              </Button>
            )}
            <Button
              variant="contained"
              color={step === 1 ? 'error' : 'primary'}
              onClick={handleNext}
              disabled={
                (step === 0 && (!reason || !canCancel)) ||
                (step === 1 && !confirmed) ||
                cancelMutation.isLoading
              }
            >
              {step === 0 ? 'Volgende' : 'Bevestig annulering'}
            </Button>
          </>
        )}
        {step === 2 && (
          <Button variant="contained" onClick={handleClose}>
            Sluiten
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default CancellationDialog;
