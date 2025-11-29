import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Stack,
  Tabs,
  Tab,
  Alert,
  Chip,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { eventsAPI } from '../../services/api';

const categories = [
  'music', 'arts_culture', 'sports', 'food_drink', 'nightlife',
  'festivals', 'markets', 'workshops', 'tours', 'exhibitions',
  'theater', 'cinema', 'conferences', 'kids_family', 'outdoor', 'other'
];

const languages = ['en', 'es', 'de', 'fr', 'nl'];

export default function EventForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  const [formData, setFormData] = useState({
    title: { en: '', es: '', de: '', fr: '', nl: '' },
    description: { en: '', es: '', de: '', fr: '', nl: '' },
    category: 'music',
    startDate: '',
    endDate: '',
    timeOfDay: 'evening',
    location: {
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      coordinates: { latitude: 0, longitude: 0 }
    },
    organizer: {
      name: '',
      email: '',
      phone: '',
      website: ''
    },
    contact: {
      email: '',
      phone: '',
      website: ''
    },
    isFree: true,
    priceRange: { min: 0, max: 0 },
    capacity: { total: 0, available: 0 },
    images: [],
    tags: [],
    status: 'draft'
  });

  const [newTag, setNewTag] = useState('');
  const [newImage, setNewImage] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getById(id);
      if (response.success) {
        setFormData(response.data.event);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event');
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
        response = await eventsAPI.update(id, formData);
      } else {
        response = await eventsAPI.create(formData);
      }

      if (response.success) {
        setSuccess(isEdit ? 'Event updated successfully' : 'Event created successfully');
        setTimeout(() => navigate('/events'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleMultiLangChange = (field, lang, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value
      }
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const addImage = () => {
    if (newImage.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, { url: newImage.trim(), alt: '' }]
      }));
      setNewImage('');
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  if (loading && isEdit) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading event...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/events')}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          {isEdit ? 'Edit Event' : 'Create Event'}
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
        <Paper sx={{ mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Basic Info" />
            <Tab label="Location" />
            <Tab label="Details" />
            <Tab label="Media & Tags" />
          </Tabs>
        </Paper>

        <Paper sx={{ p: 3 }}>
          {/* Tab 0: Basic Info */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Title (Multi-language)
                </Typography>
                {languages.map(lang => (
                  <TextField
                    key={lang}
                    fullWidth
                    label={`Title (${lang.toUpperCase()})`}
                    value={formData.title[lang] || ''}
                    onChange={(e) => handleMultiLangChange('title', lang, e.target.value)}
                    margin="normal"
                    required={lang === 'en'}
                  />
                ))}
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Description (Multi-language)
                </Typography>
                {languages.map(lang => (
                  <TextField
                    key={lang}
                    fullWidth
                    multiline
                    rows={4}
                    label={`Description (${lang.toUpperCase()})`}
                    value={formData.description[lang] || ''}
                    onChange={(e) => handleMultiLangChange('description', lang, e.target.value)}
                    margin="normal"
                    required={lang === 'en'}
                  />
                ))}
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  required
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>
                      {cat.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={formData.startDate?.split('T')[0] || ''}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  value={formData.endDate?.split('T')[0] || ''}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Time of Day"
                  value={formData.timeOfDay || 'evening'}
                  onChange={(e) => handleChange('timeOfDay', e.target.value)}
                >
                  <MenuItem value="morning">Morning</MenuItem>
                  <MenuItem value="afternoon">Afternoon</MenuItem>
                  <MenuItem value="evening">Evening</MenuItem>
                  <MenuItem value="night">Night</MenuItem>
                  <MenuItem value="all_day">All Day</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Location */}
          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location Name"
                  value={formData.location?.name || ''}
                  onChange={(e) => handleNestedChange('location', 'name', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.location?.address || ''}
                  onChange={(e) => handleNestedChange('location', 'address', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.location?.city || ''}
                  onChange={(e) => handleNestedChange('location', 'city', e.target.value)}
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="State/Province"
                  value={formData.location?.state || ''}
                  onChange={(e) => handleNestedChange('location', 'state', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.location?.country || ''}
                  onChange={(e) => handleNestedChange('location', 'country', e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Organizer Information
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Organizer Name"
                  value={formData.organizer?.name || ''}
                  onChange={(e) => handleNestedChange('organizer', 'name', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Organizer Email"
                  type="email"
                  value={formData.organizer?.email || ''}
                  onChange={(e) => handleNestedChange('organizer', 'email', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Organizer Phone"
                  value={formData.organizer?.phone || ''}
                  onChange={(e) => handleNestedChange('organizer', 'phone', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Organizer Website"
                  value={formData.organizer?.website || ''}
                  onChange={(e) => handleNestedChange('organizer', 'website', e.target.value)}
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 2: Details */}
          {tabValue === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Is Free?"
                  value={formData.isFree}
                  onChange={(e) => handleChange('isFree', e.target.value === 'true')}
                >
                  <MenuItem value={true}>Yes - Free Event</MenuItem>
                  <MenuItem value={false}>No - Paid Event</MenuItem>
                </TextField>
              </Grid>

              {!formData.isFree && (
                <>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Min Price"
                      value={formData.priceRange?.min || 0}
                      onChange={(e) => handleNestedChange('priceRange', 'min', parseFloat(e.target.value))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">€</InputAdornment>
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Max Price"
                      value={formData.priceRange?.max || 0}
                      onChange={(e) => handleNestedChange('priceRange', 'max', parseFloat(e.target.value))}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">€</InputAdornment>
                      }}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Capacity"
                  value={formData.capacity?.total || 0}
                  onChange={(e) => handleNestedChange('capacity', 'total', parseInt(e.target.value))}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  type="email"
                  value={formData.contact?.email || ''}
                  onChange={(e) => handleNestedChange('contact', 'email', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={formData.contact?.phone || ''}
                  onChange={(e) => handleNestedChange('contact', 'phone', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Website"
                  value={formData.contact?.website || ''}
                  onChange={(e) => handleNestedChange('contact', 'website', e.target.value)}
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 3: Media & Tags */}
          {tabValue === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Images
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Image URL"
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addImage}
                  >
                    Add
                  </Button>
                </Stack>
                <Stack spacing={1}>
                  {formData.images?.map((img, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1
                      }}
                    >
                      <Typography sx={{ flex: 1 }} noWrap>
                        {img.url}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeImage(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Tags
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Add Tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addTag}
                  >
                    Add
                  </Button>
                </Stack>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {formData.tags?.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => removeTag(tag)}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          )}

          {/* Action Buttons */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/events')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
            </Button>
          </Box>
        </Paper>
      </form>
    </Box>
  );
}
