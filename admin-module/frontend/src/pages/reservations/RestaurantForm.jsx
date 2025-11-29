import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
  Alert,
  Autocomplete,
  Chip
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { restaurantAPI } from '../../services/api';

const CUISINE_TYPES = [
  'Italian', 'French', 'Japanese', 'Chinese', 'Mexican', 'Indian',
  'Thai', 'Mediterranean', 'American', 'Spanish', 'Greek', 'Vietnamese',
  'Korean', 'Middle Eastern', 'Fusion', 'Seafood', 'Steakhouse', 'Vegetarian'
];

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function RestaurantForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Netherlands',
    cuisine_type: '',
    price_range: 2,
    default_reservation_duration: 90,
    min_party_size: 1,
    max_party_size: 12,
    advance_booking_days: 30,
    cancellation_hours: 24,
    is_active: true,
    accepts_walkins: true,
    requires_deposit: false,
    deposit_amount: 0,
    operating_hours: {}
  });

  useEffect(() => {
    if (isEditMode) {
      fetchRestaurant();
    } else {
      // Initialize default operating hours
      const defaultHours = {};
      DAYS_OF_WEEK.forEach(day => {
        defaultHours[day] = {
          is_open: day !== 'monday',
          open_time: '12:00',
          close_time: '22:00',
          last_reservation: '21:00'
        };
      });
      setFormData(prev => ({ ...prev, operating_hours: defaultHours }));
    }
  }, [id]);

  const fetchRestaurant = async () => {
    try {
      setLoading(true);
      const response = await restaurantAPI.getById(id);
      const restaurant = response.data;
      setFormData({
        ...restaurant,
        operating_hours: restaurant.operating_hours || {}
      });
    } catch (err) {
      setError('Failed to load restaurant');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: {
          ...prev.operating_hours[day],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isEditMode) {
        await restaurantAPI.update(id, formData);
        toast.success('Restaurant updated successfully');
      } else {
        await restaurantAPI.create(formData);
        toast.success('Restaurant created successfully');
      }
      navigate('/reservations/restaurants');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save restaurant');
      toast.error('Failed to save restaurant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/reservations/restaurants')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" fontWeight="bold">
          {isEditMode ? 'Edit Restaurant' : 'Add Restaurant'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Restaurant Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={CUISINE_TYPES}
                value={formData.cuisine_type}
                onChange={(e, value) => setFormData(prev => ({ ...prev, cuisine_type: value }))}
                renderInput={(params) => (
                  <TextField {...params} label="Cuisine Type" />
                )}
                freeSolo
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Website"
                name="website"
                value={formData.website}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Address
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 1"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 2"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="State/Province"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Postal Code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Reservation Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Default Duration (minutes)"
                name="default_reservation_duration"
                type="number"
                value={formData.default_reservation_duration}
                onChange={handleChange}
                inputProps={{ min: 30, max: 300, step: 15 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Min Party Size"
                name="min_party_size"
                type="number"
                value={formData.min_party_size}
                onChange={handleChange}
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Max Party Size"
                name="max_party_size"
                type="number"
                value={formData.max_party_size}
                onChange={handleChange}
                inputProps={{ min: 1, max: 50 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Advance Booking Days"
                name="advance_booking_days"
                type="number"
                value={formData.advance_booking_days}
                onChange={handleChange}
                inputProps={{ min: 1, max: 365 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Cancellation Notice (hours)"
                name="cancellation_hours"
                type="number"
                value={formData.cancellation_hours}
                onChange={handleChange}
                inputProps={{ min: 0, max: 168 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Price Range (1-4)"
                name="price_range"
                type="number"
                value={formData.price_range}
                onChange={handleChange}
                inputProps={{ min: 1, max: 4 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                    />
                  }
                  label="Active"
                />
                <FormControlLabel
                  control={
                    <Switch
                      name="accepts_walkins"
                      checked={formData.accepts_walkins}
                      onChange={handleChange}
                    />
                  }
                  label="Accept Walk-ins"
                />
                <FormControlLabel
                  control={
                    <Switch
                      name="requires_deposit"
                      checked={formData.requires_deposit}
                      onChange={handleChange}
                    />
                  }
                  label="Require Deposit"
                />
              </Box>
            </Grid>
            {formData.requires_deposit && (
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Deposit Amount"
                  name="deposit_amount"
                  type="number"
                  value={formData.deposit_amount}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
            )}
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Operating Hours
          </Typography>
          <Grid container spacing={2}>
            {DAYS_OF_WEEK.map((day) => (
              <Grid item xs={12} key={day}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.operating_hours[day]?.is_open || false}
                        onChange={(e) => handleHoursChange(day, 'is_open', e.target.checked)}
                      />
                    }
                    label={day.charAt(0).toUpperCase() + day.slice(1)}
                    sx={{ width: 120 }}
                  />
                  {formData.operating_hours[day]?.is_open && (
                    <>
                      <TextField
                        label="Open"
                        type="time"
                        value={formData.operating_hours[day]?.open_time || '12:00'}
                        onChange={(e) => handleHoursChange(day, 'open_time', e.target.value)}
                        size="small"
                        sx={{ width: 130 }}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="Close"
                        type="time"
                        value={formData.operating_hours[day]?.close_time || '22:00'}
                        onChange={(e) => handleHoursChange(day, 'close_time', e.target.value)}
                        size="small"
                        sx={{ width: 130 }}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="Last Reservation"
                        type="time"
                        value={formData.operating_hours[day]?.last_reservation || '21:00'}
                        onChange={(e) => handleHoursChange(day, 'last_reservation', e.target.value)}
                        size="small"
                        sx={{ width: 150 }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/reservations/restaurants')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Saving...' : (isEditMode ? 'Update Restaurant' : 'Create Restaurant')}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
