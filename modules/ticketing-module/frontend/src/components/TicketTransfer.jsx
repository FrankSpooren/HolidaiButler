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
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import {
  SwapHoriz as TransferIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from 'react-query';
import ticketingService from '../services/ticketingService';

function TicketTransfer({ open, onClose, ticket, onSuccess }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [recipientData, setRecipientData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    emailConfirm: '',
  });
  const [errors, setErrors] = useState({});

  const transferMutation = useMutation(
    () => ticketingService.transferTicket(ticket.id, {
      recipientFirstName: recipientData.firstName,
      recipientLastName: recipientData.lastName,
      recipientEmail: recipientData.email,
    }),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['ticket', ticket.id]);
        queryClient.invalidateQueries(['tickets']);
        setStep(2);
        if (onSuccess) {
          onSuccess(data);
        }
      },
    }
  );

  const handleClose = () => {
    setStep(0);
    setRecipientData({
      firstName: '',
      lastName: '',
      email: '',
      emailConfirm: '',
    });
    setErrors({});
    transferMutation.reset();
    onClose();
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!recipientData.firstName.trim()) {
      newErrors.firstName = 'Voornaam is verplicht';
    }
    if (!recipientData.lastName.trim()) {
      newErrors.lastName = 'Achternaam is verplicht';
    }
    if (!recipientData.email.trim()) {
      newErrors.email = 'E-mailadres is verplicht';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientData.email)) {
      newErrors.email = 'Ongeldig e-mailadres';
    }
    if (recipientData.email !== recipientData.emailConfirm) {
      newErrors.emailConfirm = 'E-mailadressen komen niet overeen';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 0) {
      if (validateStep1()) {
        setStep(1);
      }
    } else if (step === 1) {
      transferMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step > 0 && step < 2) {
      setStep(step - 1);
    }
  };

  const handleInputChange = (field) => (e) => {
    setRecipientData({
      ...recipientData,
      [field]: e.target.value,
    });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  // Check if ticket can be transferred
  const canTransfer = ticket &&
    ticket.status === 'active' &&
    !ticket.isTransferred &&
    !ticket.isUsed;

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Je staat op het punt om dit ticket over te dragen aan iemand anders.
                Na de overdracht heb je zelf geen toegang meer tot dit ticket.
              </Typography>
            </Alert>

            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Ticket details
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {ticket?.ticketType?.name || ticket?.productName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ticket nummer: {ticket?.ticketNumber}
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  Huidige houder: {ticket?.holderName || 'Onbekend'}
                </Typography>
              </Box>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Nieuwe tickethouder
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Voornaam"
                  value={recipientData.firstName}
                  onChange={handleInputChange('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Achternaam"
                  value={recipientData.lastName}
                  onChange={handleInputChange('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="E-mailadres"
                  type="email"
                  value={recipientData.email}
                  onChange={handleInputChange('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bevestig e-mailadres"
                  type="email"
                  value={recipientData.emailConfirm}
                  onChange={handleInputChange('emailConfirm')}
                  error={!!errors.emailConfirm}
                  helperText={errors.emailConfirm}
                  required
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Box textAlign="center" sx={{ mb: 3 }}>
              <WarningIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Bevestig overdracht
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Controleer de gegevens en bevestig de overdracht.
              </Typography>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={5}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Van
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="action" />
                    <Typography variant="body2">
                      {ticket?.holderName || 'Jij'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={2} display="flex" alignItems="center" justifyContent="center">
                  <TransferIcon color="primary" />
                </Grid>
                <Grid item xs={5}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Naar
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="primary" />
                    <Typography variant="body2" fontWeight="bold">
                      {recipientData.firstName} {recipientData.lastName}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {recipientData.email}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Ticket
                </Typography>
                <Chip
                  label={ticket?.ticketNumber}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Paper>

            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Let op:</strong> Na bevestiging wordt het ticket direct overgedragen.
                De nieuwe houder ontvangt een e-mail met het ticket.
                Je kunt deze actie niet ongedaan maken.
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box textAlign="center">
            {transferMutation.isSuccess ? (
              <>
                <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Ticket overgedragen!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Het ticket is succesvol overgedragen aan {recipientData.firstName} {recipientData.lastName}.
                </Typography>
                <Alert severity="success">
                  <Typography variant="body2">
                    Er is een e-mail verstuurd naar {recipientData.email} met het ticket en alle instructies.
                  </Typography>
                </Alert>
              </>
            ) : transferMutation.isError ? (
              <>
                <WarningIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Overdracht mislukt
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Er is iets misgegaan bij het overdragen van het ticket.
                </Typography>
                <Alert severity="error">
                  {transferMutation.error?.message || 'Probeer het later opnieuw.'}
                </Alert>
              </>
            ) : null}
          </Box>
        );

      default:
        return null;
    }
  };

  if (!canTransfer && ticket) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Ticket overdragen</DialogTitle>
        <DialogContent>
          <Alert severity="error">
            <Typography variant="body2" fontWeight="bold">
              Dit ticket kan niet worden overgedragen
            </Typography>
            <Typography variant="body2">
              {ticket.isUsed && 'Dit ticket is al gebruikt.'}
              {ticket.isTransferred && 'Dit ticket is al eerder overgedragen.'}
              {ticket.status !== 'active' && 'Dit ticket is niet meer actief.'}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Sluiten</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <TransferIcon color="primary" />
          Ticket overdragen
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3, pt: 1 }}>
          <Step>
            <StepLabel>Ontvanger</StepLabel>
          </Step>
          <Step>
            <StepLabel>Bevestigen</StepLabel>
          </Step>
          <Step>
            <StepLabel>Voltooid</StepLabel>
          </Step>
        </Stepper>

        {transferMutation.isLoading ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Ticket overdragen...</Typography>
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
              onClick={handleNext}
              disabled={transferMutation.isLoading}
            >
              {step === 0 ? 'Volgende' : 'Bevestig overdracht'}
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

export default TicketTransfer;
