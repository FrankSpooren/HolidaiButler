import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  IconButton,
  Alert,
  MenuItem
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { reservationsAPI } from '../../services/api';

export default function ReservationForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    guest: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    date: '',
    time: '',
    partySize: 2,
    duration: 120,
    specialRequests: {
      dietary: [],
      occasion: '',
      accessibility: [],
      notes: ''
    },
    table: {
      number: '',
      area: 'main',
      features: []
    }
  });

  useEffect(() => {
    if (isEdit) {
      fetchReservation();
    }
  }, [id]);

  const fetchReservation = async () => {
    try {
      setLoading(true);
      const response = await reservationsAPI.getById(id);
      if (response.success) {
        const res = response.data.reservation;
        setFormData({
          guest: res.guest,
          date: res.date?.split('T')[0] || '',
          time: res.time || '',
          partySize: res.partySize || 2,
          duration: res.duration || 120,
          specialRequests: res.specialRequests || { dietary: [], occasion: '', accessibility: [], notes: '' },
          table: res.table || { number: '', area: 'main', features: [] }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      let response;
      if (isEdit) {
        response = await reservationsAPI.update(id, formData);
      } else {
        response = await reservationsAPI.create(formData);
      }

      if (response.success) {
        setSuccess(isEdit ? 'Reservation updated successfully' : 'Reservation created successfully');
        setTimeout(() => navigate('/reservations'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      guest: {
        ...prev.guest,
        [field]: value
      }
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTableChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      table: {
        ...prev.table,
        [field]: value
      }
    }));
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/reservations')}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          {isEdit ? 'Edit Reservation' : 'New Reservation'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Guest Information
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.guest.firstName}
                onChange={(e) => handleGuestChange('firstName', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.guest.lastName}
                onChange={(e) => handleGuestChange('lastName', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="Email"
                value={formData.guest.email}
                onChange={(e) => handleGuestChange('email', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.guest.phone}
                onChange={(e) => handleGuestChange('phone', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Reservation Details
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="time"
                label="Time"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Party Size"
                value={formData.partySize}
                onChange={(e) => handleChange('partySize', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 20 }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Duration (minutes)"
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseInt(e.target.value))}
                inputProps={{ min: 30, step: 15 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Table Assignment
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Table Number"
                value={formData.table.number}
                onChange={(e) => handleTableChange('number', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Area"
                value={formData.table.area}
                onChange={(e) => handleTableChange('area', e.target.value)}
              >
                <MenuItem value="main">Main Dining</MenuItem>
                <MenuItem value="patio">Patio</MenuItem>
                <MenuItem value="bar">Bar</MenuItem>
                <MenuItem value="private">Private Room</MenuItem>
                <MenuItem value="terrace">Terrace</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Special Requests
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Occasion"
                value={formData.specialRequests?.occasion || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  specialRequests: {
                    ...prev.specialRequests,
                    occasion: e.target.value
                  }
                }))}
                placeholder="Birthday, Anniversary, etc."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Additional Notes"
                value={formData.specialRequests?.notes || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  specialRequests: {
                    ...prev.specialRequests,
                    notes: e.target.value
                  }
                }))}
                placeholder="Any special requests or requirements..."
              />
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/reservations')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              {loading ? 'Saving...' : isEdit ? 'Update Reservation' : 'Create Reservation'}
            </Button>
          </Box>
        </Paper>
      </form>
    </Box>
  );
}
