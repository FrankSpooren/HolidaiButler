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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  OutlinedInput,
  Autocomplete
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { ticketsAPI, eventsAPI, poisAPI } from '../../services/api';

const ticketTypes = [
  { value: 'general', label: 'General' },
  { value: 'vip', label: 'VIP' },
  { value: 'earlybird', label: 'Early Bird' },
  { value: 'student', label: 'Student' },
  { value: 'senior', label: 'Senior' },
  { value: 'group', label: 'Group' },
  { value: 'family', label: 'Family' }
];

const accessAreas = [
  'General Admission',
  'VIP Lounge',
  'Backstage',
  'Premium Seating',
  'Standing Area',
  'Balcony',
  'Front Row',
  'Side Stage'
];

export default function TicketForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [events, setEvents] = useState([]);
  const [pois, setPois] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [formData, setFormData] = useState({
    type: 'general',
    holder: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    event: null,
    poi: null,
    linkedType: 'event', // 'event' or 'poi'
    pricing: {
      basePrice: 0,
      tax: 0,
      fees: 0,
      discount: 0,
      finalPrice: 0
    },
    purchaseDate: new Date().toISOString().split('T')[0],
    validity: {
      from: '',
      to: ''
    },
    access: {
      areas: [],
      restrictions: ''
    },
    status: 'pending'
  });

  useEffect(() => {
    fetchOptions();
    if (isEdit) {
      fetchTicket();
    }
  }, [id]);

  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);
      const [eventsRes, poisRes] = await Promise.all([
        eventsAPI.getAll({ limit: 100, status: 'published' }),
        poisAPI.getAll({ limit: 100, status: 'active' })
      ]);

      if (eventsRes.success) {
        setEvents(eventsRes.data.events);
      }
      if (poisRes.success) {
        setPois(poisRes.data.pois);
      }
    } catch (err) {
      console.error('Error fetching options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await ticketsAPI.getById(id);
      if (response.success) {
        const ticket = response.data.ticket;
        setFormData({
          type: ticket.type || 'general',
          holder: ticket.holder || { firstName: '', lastName: '', email: '', phone: '' },
          event: ticket.event?._id || null,
          poi: ticket.poi?._id || null,
          linkedType: ticket.event ? 'event' : 'poi',
          pricing: ticket.pricing || { basePrice: 0, tax: 0, fees: 0, discount: 0, finalPrice: 0 },
          purchaseDate: ticket.purchaseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          validity: {
            from: ticket.validity?.from?.split('T')[0] || '',
            to: ticket.validity?.to?.split('T')[0] || ''
          },
          access: ticket.access || { areas: [], restrictions: '' },
          status: ticket.status || 'pending'
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalPrice = (basePrice, tax, fees, discount) => {
    const subtotal = parseFloat(basePrice) || 0;
    const taxAmount = parseFloat(tax) || 0;
    const feesAmount = parseFloat(fees) || 0;
    const discountAmount = parseFloat(discount) || 0;

    return Math.max(0, subtotal + taxAmount + feesAmount - discountAmount);
  };

  const handlePricingChange = (field, value) => {
    const newPricing = {
      ...formData.pricing,
      [field]: parseFloat(value) || 0
    };

    newPricing.finalPrice = calculateFinalPrice(
      newPricing.basePrice,
      newPricing.tax,
      newPricing.fees,
      newPricing.discount
    );

    setFormData(prev => ({
      ...prev,
      pricing: newPricing
    }));
  };

  const handleHolderChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      holder: {
        ...prev.holder,
        [field]: value
      }
    }));
  };

  const handleValidityChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      validity: {
        ...prev.validity,
        [field]: value
      }
    }));
  };

  const handleAccessChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      access: {
        ...prev.access,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.holder.firstName || !formData.holder.lastName || !formData.holder.email) {
      setError('Please fill in all required holder information');
      return;
    }

    if (formData.linkedType === 'event' && !formData.event) {
      setError('Please select an event');
      return;
    }

    if (formData.linkedType === 'poi' && !formData.poi) {
      setError('Please select a POI');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        type: formData.type,
        holder: formData.holder,
        ...(formData.linkedType === 'event' ? { event: formData.event } : { poi: formData.poi }),
        pricing: formData.pricing,
        purchaseDate: formData.purchaseDate,
        validity: formData.validity,
        access: formData.access,
        status: formData.status
      };

      let response;
      if (isEdit) {
        response = await ticketsAPI.update(id, payload);
      } else {
        response = await ticketsAPI.create(payload);
      }

      if (response.success) {
        setSuccess(isEdit ? 'Ticket updated successfully' : 'Ticket created successfully');
        setTimeout(() => navigate('/tickets'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/tickets')}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          {isEdit ? 'Edit Ticket' : 'New Ticket'}
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
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ticket Information
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Ticket Type"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                required
              >
                {ticketTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Linked To"
                value={formData.linkedType}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  linkedType: e.target.value,
                  event: null,
                  poi: null
                }))}
                required
              >
                <MenuItem value="event">Event</MenuItem>
                <MenuItem value="poi">POI / Attraction</MenuItem>
              </TextField>
            </Grid>

            {formData.linkedType === 'event' && (
              <Grid item xs={12}>
                <Autocomplete
                  options={events}
                  getOptionLabel={(option) => option.title?.en || option.title || ''}
                  value={events.find(e => e._id === formData.event) || null}
                  onChange={(e, newValue) => setFormData(prev => ({ ...prev, event: newValue?._id || null }))}
                  loading={loadingOptions}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Event"
                      required
                    />
                  )}
                />
              </Grid>
            )}

            {formData.linkedType === 'poi' && (
              <Grid item xs={12}>
                <Autocomplete
                  options={pois}
                  getOptionLabel={(option) => option.name?.en || option.name || ''}
                  value={pois.find(p => p._id === formData.poi) || null}
                  onChange={(e, newValue) => setFormData(prev => ({ ...prev, poi: newValue?._id || null }))}
                  loading={loadingOptions}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select POI / Attraction"
                      required
                    />
                  )}
                />
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="used">Used</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Purchase Date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Holder Information
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.holder.firstName}
                onChange={(e) => handleHolderChange('firstName', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.holder.lastName}
                onChange={(e) => handleHolderChange('lastName', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="Email"
                value={formData.holder.email}
                onChange={(e) => handleHolderChange('email', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.holder.phone}
                onChange={(e) => handleHolderChange('phone', e.target.value)}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pricing
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Base Price (€)"
                value={formData.pricing.basePrice}
                onChange={(e) => handlePricingChange('basePrice', e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Tax (€)"
                value={formData.pricing.tax}
                onChange={(e) => handlePricingChange('tax', e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Fees (€)"
                value={formData.pricing.fees}
                onChange={(e) => handlePricingChange('fees', e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Discount (€)"
                value={formData.pricing.discount}
                onChange={(e) => handlePricingChange('discount', e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="h6" color="primary">
                  Final Price: €{formData.pricing.finalPrice.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Validity Period
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Valid From"
                value={formData.validity.from}
                onChange={(e) => handleValidityChange('from', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Valid To"
                value={formData.validity.to}
                onChange={(e) => handleValidityChange('to', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Access Control
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Access Areas</InputLabel>
                <Select
                  multiple
                  value={formData.access.areas}
                  onChange={(e) => handleAccessChange('areas', e.target.value)}
                  input={<OutlinedInput label="Access Areas" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {accessAreas.map((area) => (
                    <MenuItem key={area} value={area}>
                      {area}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Restrictions / Special Notes"
                value={formData.access.restrictions}
                onChange={(e) => handleAccessChange('restrictions', e.target.value)}
                placeholder="Any access restrictions or special requirements..."
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/tickets')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
          >
            {loading ? 'Saving...' : isEdit ? 'Update Ticket' : 'Create Ticket'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
