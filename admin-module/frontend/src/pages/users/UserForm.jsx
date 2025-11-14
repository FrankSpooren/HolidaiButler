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
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      language: 'en',
      role: 'editor'
    }
  });

  // Load user data if editing
  useEffect(() => {
    if (isEdit) {
      loadUser();
    }
  }, [id]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/users/${id}`);
      const user = response.data.data.user;

      reset({
        email: user.email || '',
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        phoneNumber: user.profile?.phoneNumber || '',
        language: user.profile?.language || 'en',
        role: user.role || 'editor'
      });
    } catch (error) {
      toast.error('Failed to load user');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submit
  const onSubmit = async (data) => {
    setLoading(true);

    try {
      if (isEdit) {
        // Update user
        await api.put(`/users/${id}`, {
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          language: data.language,
          role: data.role
        });
        toast.success('User updated successfully');
      } else {
        // Create user
        if (!data.password || data.password.length < 8) {
          toast.error('Password must be at least 8 characters');
          setLoading(false);
          return;
        }

        await api.post('/users', data);
        toast.success('User created successfully');
      }

      navigate('/users');
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} user`);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'platform_admin', label: 'Platform Admin', description: 'Full access to all features' },
    { value: 'poi_owner', label: 'POI Owner', description: 'Can manage own POIs' },
    { value: 'editor', label: 'Editor', description: 'Can edit all POIs and content' },
    { value: 'reviewer', label: 'Reviewer', description: 'Can approve/reject POIs' }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'de', label: 'Deutsch' },
    { value: 'fr', label: 'Français' }
  ];

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
          {isEdit ? 'Edit User' : 'Create New User'}
        </Typography>
      </Box>

      <Paper sx={{ p: 3, maxWidth: 800 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info">
                {isEdit
                  ? 'Update user information. Email cannot be changed.'
                  : 'Create a new admin user. The user will receive an email with login instructions.'}
              </Alert>
            </Grid>

            {/* Email */}
            <Grid item xs={12} md={6}>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Email"
                    type="email"
                    required
                    disabled={isEdit}
                    error={!!errors.email}
                    helperText={errors.email?.message || (isEdit ? 'Email cannot be changed' : '')}
                  />
                )}
              />
            </Grid>

            {/* Password (only for create) */}
            {!isEdit && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="password"
                  control={control}
                  rules={{
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Password"
                      type="password"
                      required
                      error={!!errors.password}
                      helperText={errors.password?.message || 'Minimum 8 characters'}
                    />
                  )}
                />
              </Grid>
            )}

            {/* First Name */}
            <Grid item xs={12} md={6}>
              <Controller
                name="firstName"
                control={control}
                rules={{ required: 'First name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="First Name"
                    required
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                  />
                )}
              />
            </Grid>

            {/* Last Name */}
            <Grid item xs={12} md={6}>
              <Controller
                name="lastName"
                control={control}
                rules={{ required: 'Last name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Last Name"
                    required
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                  />
                )}
              />
            </Grid>

            {/* Phone Number */}
            <Grid item xs={12} md={6}>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Phone Number"
                    type="tel"
                  />
                )}
              />
            </Grid>

            {/* Language */}
            <Grid item xs={12} md={6}>
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Preferred Language</InputLabel>
                    <Select {...field} label="Preferred Language">
                      {languages.map(lang => (
                        <MenuItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Role */}
            <Grid item xs={12}>
              <Controller
                name="role"
                control={control}
                rules={{ required: 'Role is required' }}
                render={({ field }) => (
                  <FormControl fullWidth required error={!!errors.role}>
                    <InputLabel>Role</InputLabel>
                    <Select {...field} label="Role">
                      {roles.map(role => (
                        <MenuItem key={role.value} value={role.value}>
                          <Box>
                            <Typography variant="body1">{role.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {role.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Role Info */}
            <Grid item xs={12}>
              <Alert severity="warning">
                <Typography variant="subtitle2" gutterBottom>
                  Role Permissions:
                </Typography>
                <Typography variant="body2">
                  • <strong>Platform Admin:</strong> Full access to all features including user management
                  <br />
                  • <strong>POI Owner:</strong> Can only manage POIs assigned to them
                  <br />
                  • <strong>Editor:</strong> Can edit all POIs and content but cannot delete or approve
                  <br />
                  • <strong>Reviewer:</strong> Can view and approve/reject POIs but cannot edit
                </Typography>
              </Alert>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => navigate('/users')}
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
              {loading ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
