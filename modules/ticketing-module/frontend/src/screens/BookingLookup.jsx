import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ticketingService from '../services/ticketingService';

function BookingLookup() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ticketingService.getBookingByReference(
        data.reference,
        data.email
      );

      if (response.data) {
        navigate(`/booking/confirmation/${response.data.id}`);
      } else {
        setError('Boeking niet gevonden. Controleer uw gegevens.');
      }
    } catch (err) {
      console.error('Error looking up booking:', err);
      setError(
        err.response?.data?.message ||
          'Boeking niet gevonden. Controleer uw referentie en e-mailadres.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Boeking opzoeken
        </Typography>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Voer uw boekingsreferentie en e-mailadres in om uw boeking op te zoeken
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            label="Boekingsreferentie"
            placeholder="bijv. BOOK-123456"
            sx={{ mb: 3 }}
            {...register('reference', {
              required: 'Referentie is verplicht',
            })}
            error={!!errors.reference}
            helperText={errors.reference?.message}
          />

          <TextField
            fullWidth
            label={t('visitor.email')}
            type="email"
            sx={{ mb: 3 }}
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

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
            disabled={loading}
          >
            {loading ? 'Zoeken...' : 'Boeking opzoeken'}
          </Button>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button onClick={() => navigate('/')} variant="text">
            Terug naar evenementen
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default BookingLookup;
