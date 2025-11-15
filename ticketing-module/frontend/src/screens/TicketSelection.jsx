import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Divider,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ArrowBack as BackIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import ticketingService from '../services/ticketingService';
import useBookingStore from '../utils/bookingStore';

function TicketSelection() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    currentEvent,
    selectedTickets,
    addTicket,
    removeTicket,
    setTicketQuantity,
    getTotalPrice,
    getTotalTickets,
    getServiceFee,
    getVAT,
    getGrandTotal,
  } = useBookingStore();

  const { data: event, isLoading: eventLoading } = useQuery(
    ['event', eventId],
    () => ticketingService.getEvent(eventId),
    { enabled: !currentEvent }
  );

  const { data: ticketTypesData, isLoading: ticketTypesLoading } = useQuery(
    ['ticketTypes', eventId],
    () => ticketingService.getTicketTypes(eventId)
  );

  const { data: availability } = useQuery(
    ['availability', eventId],
    () => ticketingService.getEventAvailability(eventId),
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  const currentEventData = currentEvent || event?.data;
  const ticketTypes = ticketTypesData?.data || [];

  const getTicketQuantity = (ticketTypeId) => {
    const ticket = selectedTickets.find((t) => t.ticketTypeId === ticketTypeId);
    return ticket?.quantity || 0;
  };

  const getAvailableQuantity = (ticketTypeId) => {
    const ticketType = ticketTypes.find((t) => t.id === ticketTypeId);
    return ticketType?.availableQuantity || 0;
  };

  const handleContinue = () => {
    if (getTotalTickets() === 0) {
      return;
    }
    navigate('/booking/visitor-info');
  };

  if (eventLoading || ticketTypesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!currentEventData) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Event niet gevonden</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 3 }}
      >
        {t('common.back')}
      </Button>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              {currentEventData.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {format(new Date(currentEventData.startDate), 'EEEE dd MMMM yyyy, HH:mm', {
                locale: nl,
              })}
            </Typography>
            {currentEventData.location && (
              <Typography variant="body2" color="text.secondary">
                {currentEventData.location}
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              {t('tickets.selectTickets')}
            </Typography>

            {ticketTypes.length === 0 ? (
              <Alert severity="info">Geen tickets beschikbaar</Alert>
            ) : (
              <Box>
                {ticketTypes.map((ticketType) => {
                  const quantity = getTicketQuantity(ticketType.id);
                  const available = getAvailableQuantity(ticketType.id);
                  const isAvailable = available > 0;

                  return (
                    <Card
                      key={ticketType.id}
                      sx={{
                        mb: 2,
                        bgcolor: !isAvailable ? 'action.disabledBackground' : 'background.paper',
                      }}
                    >
                      <CardContent>
                        <Grid container alignItems="center" spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="h6">{ticketType.name}</Typography>
                            {ticketType.description && (
                              <Typography variant="body2" color="text.secondary">
                                {ticketType.description}
                              </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {available} {t('tickets.available')}
                            </Typography>
                          </Grid>

                          <Grid item xs={12} sm={3}>
                            <Typography variant="h6" color="primary">
                              €{ticketType.price.toFixed(2)}
                            </Typography>
                          </Grid>

                          <Grid item xs={12} sm={3}>
                            {isAvailable ? (
                              <Box display="flex" alignItems="center" justifyContent="flex-end">
                                <IconButton
                                  onClick={() => removeTicket(ticketType.id)}
                                  disabled={quantity === 0}
                                  size="small"
                                >
                                  <RemoveIcon />
                                </IconButton>
                                <Typography sx={{ mx: 2, minWidth: 30, textAlign: 'center' }}>
                                  {quantity}
                                </Typography>
                                <IconButton
                                  onClick={() => addTicket(ticketType)}
                                  disabled={quantity >= available}
                                  size="small"
                                >
                                  <AddIcon />
                                </IconButton>
                              </Box>
                            ) : (
                              <Typography color="error" align="right">
                                {t('tickets.soldOut')}
                              </Typography>
                            )}
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 16 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <CartIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Bestelling</Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {selectedTickets.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                Geen tickets geselecteerd
              </Typography>
            ) : (
              <Box>
                {selectedTickets.map((ticket) => (
                  <Box key={ticket.ticketTypeId} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">
                        {ticket.quantity}x {ticket.name}
                      </Typography>
                      <Typography variant="body2">
                        €{(ticket.price * ticket.quantity).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                ))}

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2">{t('tickets.subtotal')}</Typography>
                  <Typography variant="body2">€{getTotalPrice().toFixed(2)}</Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2">{t('tickets.fees')}</Typography>
                  <Typography variant="body2">€{getServiceFee().toFixed(2)}</Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="body2">{t('tickets.vat')} (21%)</Typography>
                  <Typography variant="body2">€{getVAT().toFixed(2)}</Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Typography variant="h6">{t('common.total')}</Typography>
                  <Typography variant="h6" color="primary">
                    €{getGrandTotal().toFixed(2)}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleContinue}
                  disabled={getTotalTickets() === 0}
                >
                  {t('common.continue')}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default TicketSelection;
