import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Lock as LockIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AdyenCheckoutComponent from '../components/AdyenCheckout';
import paymentService from '../services/paymentService';
import ticketingService from '../services/ticketingService';
import useBookingStore from '../utils/bookingStore';

function Payment() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [sessionData, setSessionData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    currentEvent,
    selectedTickets,
    visitorInfo,
    getTotalTickets,
    getGrandTotal,
    setBookingId,
    setPaymentSession,
  } = useBookingStore();

  // Create payment session mutation
  const createSessionMutation = useMutation(
    (paymentData) => paymentService.createPaymentSession(paymentData),
    {
      onSuccess: (data) => {
        console.log('Payment session created:', data);
        setSessionData(data.data);
        setPaymentSession(data.data);
      },
      onError: (error) => {
        console.error('Error creating payment session:', error);
        toast.error('Fout bij het aanmaken van betaalsessie');
      },
    }
  );

  // Create booking mutation
  const createBookingMutation = useMutation(
    (bookingData) => ticketingService.createBooking(bookingData),
    {
      onSuccess: (data) => {
        console.log('Booking created:', data);
        setBookingId(data.data.id);
        toast.success('Boeking succesvol aangemaakt!');
        navigate(`/booking/confirmation/${data.data.id}`);
      },
      onError: (error) => {
        console.error('Error creating booking:', error);
        toast.error('Fout bij het aanmaken van de boeking');
        setIsProcessing(false);
      },
    }
  );

  // Initialize payment session on mount
  useEffect(() => {
    if (!currentEvent || !visitorInfo || getTotalTickets() === 0) {
      navigate('/');
      return;
    }

    // Create payment session
    const amountInCents = Math.round(getGrandTotal() * 100);

    createSessionMutation.mutate({
      amount: amountInCents,
      currency: 'EUR',
      reference: `BOOKING-${Date.now()}`,
      returnUrl: `${window.location.origin}/booking/confirmation`,
      countryCode: 'NL',
      shopperLocale: 'nl-NL',
      shopperEmail: visitorInfo.email,
      shopperName: {
        firstName: visitorInfo.firstName,
        lastName: visitorInfo.lastName,
      },
      lineItems: selectedTickets.map((ticket) => ({
        description: ticket.name,
        quantity: ticket.quantity,
        amountIncludingTax: Math.round(ticket.price * ticket.quantity * 100),
      })),
    });
  }, []);

  const handlePaymentComplete = async (paymentResult) => {
    console.log('Payment complete, creating booking...', paymentResult);
    setIsProcessing(true);

    try {
      // Prepare booking data
      const bookingData = {
        eventId: currentEvent.id,
        customerInfo: {
          firstName: visitorInfo.firstName,
          lastName: visitorInfo.lastName,
          email: visitorInfo.email,
          phone: visitorInfo.phone,
        },
        tickets: selectedTickets.map((ticket) => ({
          ticketTypeId: ticket.ticketTypeId,
          quantity: ticket.quantity,
        })),
        paymentReference: paymentResult.pspReference || sessionData.id,
        paymentStatus: paymentResult.resultCode,
        totalAmount: getGrandTotal(),
      };

      // Create the booking
      await createBookingMutation.mutateAsync(bookingData);
    } catch (error) {
      console.error('Error in payment completion:', error);
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    setIsProcessing(false);
    toast.error(error.message || 'Betaling mislukt. Probeer het opnieuw.');
  };

  if (!currentEvent || !visitorInfo || getTotalTickets() === 0) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
        disabled={isProcessing}
      >
        {t('common.back')}
      </Button>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <LockIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h5">
                {t('payment.title')}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('payment.secure')}
            </Typography>

            <Divider sx={{ my: 3 }} />

            {createSessionMutation.isLoading && (
              <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 400 }}>
                <CircularProgress />
              </Box>
            )}

            {createSessionMutation.error && (
              <Alert severity="error">
                Fout bij het laden van betaalopties. Probeer het opnieuw.
              </Alert>
            )}

            {sessionData && !isProcessing && (
              <AdyenCheckoutComponent
                sessionData={sessionData}
                onPaymentComplete={handlePaymentComplete}
                onPaymentError={handlePaymentError}
              />
            )}

            {isProcessing && (
              <Box textAlign="center" py={4}>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('payment.processing')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Even geduld, uw bestelling wordt verwerkt...
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 16 }}>
            <Typography variant="h6" gutterBottom>
              Bestelling overzicht
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              {currentEvent.name}
            </Typography>

            <List dense>
              {selectedTickets.map((ticket) => (
                <ListItem key={ticket.ticketTypeId} disableGutters>
                  <ListItemText
                    primary={`${ticket.quantity}x ${ticket.name}`}
                    secondary={`€${ticket.price.toFixed(2)} per stuk`}
                  />
                  <Typography variant="body2">
                    €{(ticket.price * ticket.quantity).toFixed(2)}
                  </Typography>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Box display="flex" justifyContent="space-between" sx={{ mb: 3 }}>
              <Typography variant="h6">{t('common.total')}</Typography>
              <Typography variant="h6" color="primary">
                €{getGrandTotal().toFixed(2)}
              </Typography>
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              Contact gegevens
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {visitorInfo.firstName} {visitorInfo.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {visitorInfo.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {visitorInfo.phone}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Payment;
