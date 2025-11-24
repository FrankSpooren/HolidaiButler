/**
 * Forgot Password Page
 */

import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, TextField, Button, Typography, Link, Alert, InputAdornment } from '@mui/material';
import { Email as EmailIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import useAuthStore from '../../store/authStore';

const ForgotPassword = () => {
  const { forgotPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await forgotPassword(email);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || 'Failed to send reset email');
    }
  };

  if (submitted) {
    return (
      <Box textAlign="center">
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Check Your Email
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          We've sent password reset instructions to {email}
        </Typography>
        <Link component={RouterLink} to="/login" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <ArrowBackIcon fontSize="small" /> Back to Sign In
        </Link>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" fontWeight={600} textAlign="center" gutterBottom>
        Forgot Password?
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
        Enter your email and we'll send you reset instructions
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        fullWidth
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          )
        }}
        sx={{ mb: 3 }}
      />

      <Button type="submit" fullWidth variant="contained" size="large" disabled={isLoading} sx={{ mb: 2 }}>
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </Button>

      <Typography variant="body2" textAlign="center">
        <Link component={RouterLink} to="/login" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <ArrowBackIcon fontSize="small" /> Back to Sign In
        </Link>
      </Typography>
    </Box>
  );
};

export default ForgotPassword;
