/**
 * Reset Password Page
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { Box, TextField, Button, Typography, Link, Alert, InputAdornment, IconButton } from '@mui/material';
import { Lock as LockIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import useAuthStore from '../../store/authStore';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const result = await resetPassword(token, formData.password);
    if (result.success) {
      navigate('/login');
    } else {
      setError(result.error || 'Failed to reset password');
    }
  };

  if (!token) {
    return (
      <Box textAlign="center">
        <Typography variant="h5" fontWeight={600} gutterBottom>Invalid Link</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This password reset link is invalid or has expired.
        </Typography>
        <Link component={RouterLink} to="/forgot-password">Request a new link</Link>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" fontWeight={600} textAlign="center" gutterBottom>Reset Password</Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
        Enter your new password below
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        fullWidth
        label="New Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleChange}
        required
        InputProps={{
          startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
          endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>
        }}
        sx={{ mb: 2 }}
      />

      <TextField fullWidth label="Confirm Password" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} required sx={{ mb: 3 }} />

      <Button type="submit" fullWidth variant="contained" size="large" disabled={isLoading}>
        {isLoading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </Box>
  );
};

export default ResetPassword;
