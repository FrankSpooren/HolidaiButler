import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  IconButton,
  Card,
  CardMedia,
  CardActions
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { poiAPI, uploadAPI } from '../../services/api';
import { toast } from 'react-toastify';

export default function POIForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [images, setImages] = useState([]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      category: '',
      subcategory: '',
      description: '',
      'location.city': '',
      'location.region': '',
      'location.country': '',
      'location.address': '',
      'location.coordinates.lat': '',
      'location.coordinates.lng': '',
      'contact.phone': '',
      'contact.email': '',
      'contact.website': '',
      'pricing.category': '',
      status: 'pending'
    }
  });

  // Load POI data if editing
  useEffect(() => {
    if (isEdit) {
      loadPOI();
    }
  }, [id]);

  const loadPOI = async () => {
    setLoading(true);
    try {
      const response = await poiAPI.getById(id);
      const poi = response.data.poi;

      reset({
        name: poi.name || '',
        category: poi.category || '',
        subcategory: poi.subcategory || '',
        description: poi.description || '',
        'location.city': poi.location?.city || '',
        'location.region': poi.location?.region || '',
        'location.country': poi.location?.country || '',
        'location.address': poi.location?.address || '',
        'location.coordinates.lat': poi.location?.coordinates?.[1] || '',
        'location.coordinates.lng': poi.location?.coordinates?.[0] || '',
        'contact.phone': poi.contact?.phone || '',
        'contact.email': poi.contact?.email || '',
        'contact.website': poi.contact?.website || '',
        'pricing.category': poi.pricing?.category || '',
        status: poi.status || 'pending'
      });

      setImages(poi.images || []);
    } catch (error) {
      toast.error('Failed to load POI');
      navigate('/pois');
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    setUploadingImages(true);

    try {
      const uploadedImages = [];

      for (const file of files) {
        const response = await uploadAPI.uploadFile(file, 'pois');
        uploadedImages.push({
          url: response.data.url,
          filename: response.data.filename,
          type: 'photo',
          verified: true
        });
      }

      setImages([...images, ...uploadedImages]);
      toast.success(`${files.length} image(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  // Handle image delete
  const handleImageDelete = async (index) => {
    const image = images[index];

    try {
      if (image.filename) {
        await uploadAPI.deleteFile('pois', image.filename);
      }

      const newImages = images.filter((_, i) => i !== index);
      setImages(newImages);
      toast.success('Image deleted');
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  // Handle form submit
  const onSubmit = async (data) => {
    setLoading(true);

    try {
      // Transform flat form data to nested structure
      const poiData = {
        name: data.name,
        category: data.category,
        subcategory: data.subcategory,
        description: data.description,
        location: {
          city: data['location.city'],
          region: data['location.region'],
          country: data['location.country'],
          address: data['location.address'],
          coordinates: {
            type: 'Point',
            coordinates: [
              parseFloat(data['location.coordinates.lng']) || 0,
              parseFloat(data['location.coordinates.lat']) || 0
            ]
          }
        },
        contact: {
          phone: data['contact.phone'],
          email: data['contact.email'],
          website: data['contact.website']
        },
        pricing: {
          category: data['pricing.category']
        },
        images,
        status: data.status
      };

      if (isEdit) {
        await poiAPI.update(id, poiData);
        toast.success('POI updated successfully');
      } else {
        await poiAPI.create(poiData);
        toast.success('POI created successfully');
      }

      navigate('/pois');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save POI');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'restaurant',
    'attraction',
    'hotel',
    'activity',
    'shopping',
    'nightlife',
    'museum',
    'park',
    'beach',
    'other'
  ];

  const priceCategories = ['€', '€€', '€€€', '€€€€'];

  const countries = ['NL', 'BE', 'DE', 'FR', 'ES', 'IT', 'GB', 'US'];

  if (loading && isEdit) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          {isEdit ? 'Edit POI' : 'Create New POI'}
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
          <Tab label="Basic Information" />
          <Tab label="Location & Contact" />
          <Tab label="Images" />
          <Tab label="Additional Details" />
        </Tabs>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Tab 0: Basic Information */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="POI Name"
                      required
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="category"
                  control={control}
                  rules={{ required: 'Category is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth required error={!!errors.category}>
                      <InputLabel>Category</InputLabel>
                      <Select {...field} label="Category">
                        {categories.map(cat => (
                          <MenuItem key={cat} value={cat} sx={{ textTransform: 'capitalize' }}>
                            {cat}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="subcategory"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Subcategory" />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  rules={{ required: 'Description is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Description"
                      multiline
                      rows={4}
                      required
                      error={!!errors.description}
                      helperText={errors.description?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="pricing.category"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Price Range</InputLabel>
                      <Select {...field} label="Price Range">
                        <MenuItem value="">Not specified</MenuItem>
                        {priceCategories.map(price => (
                          <MenuItem key={price} value={price}>{price}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status">
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Location & Contact */}
          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Location</Typography>
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="location.address"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Street Address" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="location.city"
                  control={control}
                  rules={{ required: 'City is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="City"
                      required
                      error={!!errors['location.city']}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="location.region"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Region/State" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="location.country"
                  control={control}
                  rules={{ required: 'Country is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth required>
                      <InputLabel>Country</InputLabel>
                      <Select {...field} label="Country">
                        {countries.map(country => (
                          <MenuItem key={country} value={country}>{country}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="location.coordinates.lat"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Latitude" type="number" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="location.coordinates.lng"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Longitude" type="number" />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Contact</Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="contact.phone"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Phone" type="tel" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="contact.email"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Email" type="email" />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="contact.website"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Website" type="url" />
                  )}
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 2: Images */}
          {tabValue === 2 && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={uploadingImages ? <CircularProgress size={20} /> : <UploadIcon />}
                  disabled={uploadingImages}
                >
                  Upload Images
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>
              </Box>

              <Grid container spacing={2}>
                {images.length === 0 ? (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      No images uploaded yet. Click the button above to upload images.
                    </Alert>
                  </Grid>
                ) : (
                  images.map((image, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card>
                        <CardMedia
                          component="img"
                          height="200"
                          image={image.url}
                          alt={`POI image ${index + 1}`}
                        />
                        <CardActions>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleImageDelete(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            </Box>
          )}

          {/* Tab 3: Additional Details */}
          {tabValue === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="info">
                  Additional features like opening hours, amenities, and multilingual content
                  will be available in the next version.
                </Alert>
              </Grid>
            </Grid>
          )}

          {/* Action Buttons */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => navigate('/pois')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEdit ? 'Update POI' : 'Create POI')}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
