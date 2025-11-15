import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as ValidIcon,
  Cancel as InvalidIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import QRCode from 'qrcode.react';
import ticketingService from '../services/ticketingService';

function TicketView() {
  const { ticketId } = useParams();

  const { data: ticket, isLoading, error } = useQuery(
    ['ticket', ticketId],
    () => ticketingService.getTicket(ticketId),
    { enabled: !!ticketId }
  );

  const handleDownload = async () => {
    try {
      const blob = await ticketingService.downloadTicket(ticketId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ticket.data.ticketNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading ticket:', error);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !ticket?.data) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Ticket niet gevonden.</Alert>
      </Container>
    );
  }

  const ticketData = ticket.data;
  const event = ticketData.event;
  const isValid = ticketData.status === 'valid' || ticketData.status === 'active';

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box textAlign="center" mb={3}>
          {isValid ? (
            <ValidIcon sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
          ) : (
            <InvalidIcon sx={{ fontSize: 60, color: 'error.main', mb: 1 }} />
          )}
          <Typography variant="h5" gutterBottom>
            {isValid ? 'Geldig Ticket' : 'Ongeldig Ticket'}
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {event?.name}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {event &&
                format(new Date(event.startDate), 'EEEE dd MMMM yyyy', { locale: nl })}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {event && format(new Date(event.startDate), 'HH:mm', { locale: nl })} uur
            </Typography>
            {event?.location && (
              <Typography variant="body2" color="text.secondary">
                {event.location}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Ticket Type
            </Typography>
            <Typography variant="body1">{ticketData.ticketType?.name}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Ticket Nummer
            </Typography>
            <Typography variant="body1">{ticketData.ticketNumber}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Prijs
            </Typography>
            <Typography variant="body1">€{ticketData.price?.toFixed(2)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <Typography variant="body1" color={isValid ? 'success.main' : 'error.main'}>
              {ticketData.status === 'used' ? 'Gebruikt' : isValid ? 'Geldig' : 'Ongeldig'}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box textAlign="center" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Scan deze QR code bij de ingang
          </Typography>
          <Box
            sx={{
              display: 'inline-block',
              p: 2,
              bgcolor: 'white',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mt: 2,
            }}
          >
            <QRCode
              value={ticketData.qrCode || ticketData.validationCode || ticketId}
              size={200}
              level="H"
            />
          </Box>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Validatie code: {ticketData.validationCode}
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          sx={{ mb: 2 }}
        >
          Download PDF
        </Button>

        <Alert severity="info">
          <Typography variant="body2">
            Bewaar dit ticket en toon het bij de ingang. Screenshot of uitprinten is ook toegestaan.
          </Typography>
        </Alert>

        {ticketData.booking?.customerInfo && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Naam
            </Typography>
            <Typography variant="body2">
              {ticketData.booking.customerInfo.firstName}{' '}
              {ticketData.booking.customerInfo.lastName}
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default TicketView;
