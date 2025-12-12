import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Divider,
  Alert,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import useBookingStore from '../utils/bookingStore';

function VisitorInfo() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    selectedTickets,
    visitorInfo,
    setVisitorInfo,
    getTotalTickets,
    getGrandTotal,
  } = useBookingStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: visitorInfo || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  });

  const onSubmit = (data) => {
    setVisitorInfo(data);
    navigate('/booking/payment');
  };

  if (getTotalTickets() === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">
          Geen tickets geselecteerd. Ga terug om tickets te selecteren.
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Terug naar evenementen
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        {t('common.back')}
      </Button>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('visitor.title')}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Vul uw gegevens in om de bestelling af te ronden
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('visitor.firstName')}
                {...register('firstName', {
                  required: t('visitor.required'),
                })}
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('visitor.lastName')}
                {...register('lastName', {
                  required: t('visitor.required'),
                })}
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('visitor.email')}
                type="email"
                {...register('email', {
                  required: t('visitor.required'),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t('visitor.invalidEmail'),
                  },
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('visitor.phone')}
                {...register('phone', {
                  required: t('visitor.required'),
                })}
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h6" gutterBottom>
              Overzicht
            </Typography>

            {selectedTickets.map((ticket) => (
              <Box
                key={ticket.ticketTypeId}
                display="flex"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="body2">
                  {ticket.quantity}x {ticket.name}
                </Typography>
                <Typography variant="body2">
                  €{(ticket.price * ticket.quantity).toFixed(2)}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            <Box display="flex" justifyContent="space-between">
              <Typography variant="h6">{t('common.total')}</Typography>
              <Typography variant="h6" color="primary">
                €{getGrandTotal().toFixed(2)}
              </Typography>
            </Box>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
          >
            Doorgaan naar betaling
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

export default VisitorInfo;
