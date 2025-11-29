import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
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
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import ticketingService from '../services/ticketingService';
import useBookingStore from '../utils/bookingStore';

function BookingConfirmation() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { resetBooking } = useBookingStore();

  const { data: booking, isLoading, error } = useQuery(
    ['booking', bookingId],
    () => ticketingService.getBooking(bookingId),
    { enabled: !!bookingId }
  );

  useEffect(() => {
    // Reset booking store on mount
    // Keep the data for display but prevent double bookings
    return () => {
      // Could reset here or on navigation away
    };
  }, []);

  const handleDownloadTickets = async () => {
    try {
      // In a real implementation, this would generate a PDF with all tickets
      if (booking?.data?.tickets) {
        for (const ticket of booking.data.tickets) {
          const blob = await ticketingService.downloadTicket(ticket.id);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ticket-${ticket.ticketNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (error) {
      console.error('Error downloading tickets:', error);
    }
  };

  const handleNewBooking = () => {
    resetBooking();
    navigate('/');
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !booking?.data) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          Boeking niet gevonden. Controleer uw e-mail voor de bevestiging.
        </Alert>
        <Button onClick={handleNewBooking} sx={{ mt: 2 }}>
          Terug naar home
        </Button>
      </Container>
    );
  }

  const bookingData = booking.data;
  const event = bookingData.event;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box textAlign="center" mb={4}>
          <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            {t('booking.thankYou')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('booking.emailSent')}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('booking.reference')}
            </Typography>
            <Typography variant="h6" gutterBottom>
              {bookingData.reference}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Boekingsdatum
            </Typography>
            <Typography variant="h6" gutterBottom>
              {format(new Date(bookingData.createdAt), 'dd MMMM yyyy, HH:mm', {
                locale: nl,
              })}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Chip
              label={
                bookingData.status === 'confirmed'
                  ? 'Bevestigd'
                  : bookingData.status === 'pending'
                  ? 'In afwachting'
                  : bookingData.status
              }
              color={bookingData.status === 'confirmed' ? 'success' : 'warning'}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Evenement details
        </Typography>

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {event?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {event &&
                format(new Date(event.startDate), 'EEEE dd MMMM yyyy, HH:mm', {
                  locale: nl,
                })}
            </Typography>
            {event?.location && (
              <Typography variant="body2" color="text.secondary">
                {event.location}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Typography variant="h6" gutterBottom>
          {t('booking.orderSummary')}
        </Typography>

        <List>
          {bookingData.tickets?.map((ticket, index) => (
            <ListItem key={ticket.id} divider={index < bookingData.tickets.length - 1}>
              <ListItemText
                primary={ticket.ticketType?.name || 'Ticket'}
                secondary={`Ticket nummer: ${ticket.ticketNumber}`}
              />
              <Typography variant="body1">
                €{ticket.price?.toFixed(2) || '0.00'}
              </Typography>
            </ListItem>
          ))}
        </List>

        <Box display="flex" justifyContent="space-between" sx={{ mt: 2, mb: 3 }}>
          <Typography variant="h6">{t('common.total')}</Typography>
          <Typography variant="h6" color="primary">
            €{bookingData.totalAmount?.toFixed(2) || '0.00'}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Contact gegevens
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {bookingData.customerInfo?.firstName} {bookingData.customerInfo?.lastName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {bookingData.customerInfo?.email}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {bookingData.customerInfo?.phone}
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTickets}
              >
                {t('booking.downloadTickets')}
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={handleNewBooking}
              >
                Nieuwe boeking
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            Een bevestigingsmail met uw tickets is verstuurd naar {bookingData.customerInfo?.email}.
            Bewaar deze e-mail en toon uw tickets bij de ingang.
          </Typography>
        </Alert>
      </Paper>
    </Container>
  );
}

export default BookingConfirmation;
